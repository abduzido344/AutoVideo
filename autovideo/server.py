import json
import logging
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from starlette.middleware.trustedhost import TrustedHostMiddleware
from autovideo import agents, analise, chat, config, data, doctor, episode, fila, images, personagem
from autovideo.eleven import MissingKey
from autovideo.images import ImageError
from autovideo.jobs import GateError, JobStore

DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"]
SECRETS = ("ELEVENLABS_API_KEY", "OPENROUTER_API_KEY", "HIGGSFIELD_API_KEY", "OPENAI_API_KEY", "APIFY_TOKEN")
SETTINGS = ("image_provider", "image_model", "higgsfield_model", "openai_model", "max_imagens")
log = logging.getLogger("autovideo.server")


_doctor_ok: dict | None = None


def _doctor() -> dict:
    # só o sucesso fica em cache (chama npx/claude, leva segundos); uma falha é rechecada na próxima carga do
    # painel, para "Falta: claude auth" sumir depois do `claude login` sem reiniciar o serve
    global _doctor_ok
    if _doctor_ok:
        return _doctor_ok
    checks = [{"name": n, "ok": ok, "detail": d} for n, ok, d in doctor.run_checks()]
    res = {"ok": all(c["ok"] for c in checks), "checks": checks}
    if res["ok"]:
        _doctor_ok = res
    return res


class Texto(BaseModel):
    texto: str


class Mensagem(BaseModel):
    mensagem: str


class Nome(BaseModel):
    nome: str


class SeriePausa(BaseModel):
    path_rel: str
    paused: bool


class Handle(BaseModel):
    handle: str


class Postado(BaseModel):
    rede: data.Rede


def _slug(slug: str) -> data.Perfil:
    if slug not in {p.slug for p in data.list_perfis()}:
        raise HTTPException(404, "perfil não existe")
    return data.load_perfil(slug)


def _serie_path(path_rel: str) -> Path:
    base = data.perfis_dir().resolve()
    p = (base / path_rel).resolve()
    if not p.is_relative_to(base) or not (p / "serie.json").exists():
        raise HTTPException(404, "série não existe")
    return p


def _job(store: JobStore, jid: int) -> dict:
    try:
        return store.get(jid)
    except KeyError:
        raise HTTPException(404, "episódio não existe") from None


def _gate(fn, *a):
    try:
        return fn(*a)
    except GateError as e:
        raise HTTPException(409, str(e)) from e


def _agent(fn, *a):
    # mesmos códigos do chat: limite de uso é 429, saída inválida do agente é 502
    try:
        return fn(*a)
    except agents.UsageLimit as e:
        raise HTTPException(429, "Limite de uso do Claude atingido") from e
    except agents.AgentOutputError as e:
        raise HTTPException(502, str(e)) from e


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8") if p.exists() else ""


def _json(p: Path):
    try:
        return json.loads(_read(p)) if p.exists() else None
    except ValueError:
        return None  # artefato corrompido: o painel mostra vazio em vez de quebrar


def _where(job: dict) -> dict:
    # perfis/<perfil>/series/<NN>-<serie>/ep<NN>; campos None se a pasta sumiu
    ep = Path(job["project_dir"])
    out = {"perfil": fila._perfil(job), "serie": None, "n": None, "titulo": None}
    if job["recipe"] == "estilo":  # estilos/<slug>/.analise/perfil.txt: o @ do Instagram analisado
        h = _read(ep / "perfil.txt").strip()
        out["titulo"] = f"@{h}" if h else None
        return out
    try:
        out["n"] = int(ep.name[2:])
        s = data.Serie.model_validate_json(_read(ep.parent / "serie.json"))
        out["serie"] = s.titulo
        out["titulo"] = next(e.titulo for e in s.episodios if e.n == out["n"])
    except (ValueError, StopIteration):
        pass
    return out


def _url(p: Path) -> str | None:
    try:
        return "/projects/" + p.relative_to(data.perfis_dir()).as_posix() if p.exists() else None
    except ValueError:
        return None


def create_app(store: JobStore, start_worker: bool = True) -> FastAPI:
    app = FastAPI(title="AutoVideo")
    # ferramenta local: bloqueia DNS rebinding (Host) e POST cross-site vindo de outras páginas (Origin)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=LOCAL_HOSTS)

    @app.middleware("http")
    async def same_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin \
                and urlsplit(origin).netloc != request.headers.get("host"):
            return JSONResponse({"detail": "origem não permitida"}, status_code=403)
        return await call_next(request)

    @app.get("/api/doctor")
    def doctor_status():
        return _doctor()

    @app.get("/api/auth")
    def auth():
        # checagem rápida só da conta (o /api/doctor roda tudo); a janela "Conectar o Claude" consulta em loop
        try:
            return {"ok": True, "detail": doctor.claude_auth()}
        except Exception as e:  # noqa: BLE001 — sem claude no PATH também é "não conectado"
            return {"ok": False, "detail": str(e).splitlines()[0] if str(e) else type(e).__name__}

    @app.post("/api/auth/login")
    def auth_login():
        # só abre o terminal com `claude auth login`: o login é do Claude Code, o AutoVideo não implementa login
        try:
            doctor.open_login_terminal()
        except (OSError, doctor.hf.ToolError) as e:
            raise HTTPException(501, str(e)) from e
        return {"ok": True}

    @app.get("/api/config")
    def get_config():
        return {"keys": {k: bool(config.get_key(k)) for k in SECRETS}, **{k: config.setting(k) for k in SETTINGS}}

    @app.put("/api/config")
    def put_config(body: dict):
        bad = [k for k in body if k not in SECRETS + SETTINGS]
        if bad:
            raise HTTPException(400, f"chave desconhecida: {', '.join(bad)}")
        for k, v in body.items():
            if k == "max_imagens":
                ok = type(v) is int and v >= 1
            elif k == "image_provider":
                ok = v in images.PROVIDERS
            else:
                ok = isinstance(v, str)
            if not ok:
                raise HTTPException(400, f"valor inválido para {k}")
        config.save({(k.lower() if k in SECRETS else k): v for k, v in body.items()})
        return get_config()

    @app.get("/api/estilos")
    def estilos():
        return data.list_estilos()

    @app.post("/api/estilos/analisar")
    def analisar(body: Handle):
        if not config.get_key("APIFY_TOKEN"):
            raise HTTPException(400, "falta APIFY_TOKEN (salve em Configurações)")
        try:
            return {"job": analise.criar_job(store, body.handle)}
        except ValueError as e:
            raise HTTPException(422, str(e)) from e

    @app.get("/api/estilos/{slug}")
    def estilo(slug: str):
        if slug not in {e["slug"] for e in data.list_estilos()}:
            raise HTTPException(404, "estilo não existe")
        md, est = data.load_estilo(slug)
        return {"md": md, "json": est.model_dump(mode="json")}

    @app.get("/api/perfis")
    def perfis():
        return data.list_perfis()

    @app.post("/api/perfis")
    def new_perfil(body: Nome):
        if not body.nome.strip():
            raise HTTPException(422, "nome vazio")
        return data.create_perfil(body.nome.strip())

    @app.get("/api/perfis/{slug}")
    def perfil(slug: str):
        p = _slug(slug)
        root = data.perfis_dir() / slug
        series = []
        for path, s in data.series(slug):
            eps = []
            for e in s.episodios:
                try:
                    j = store.get(e.job) if e.job is not None else None
                except KeyError:  # job apagado do jobs.db: o episódio aparece sem status
                    j = None
                eps.append({"n": e.n, "titulo": e.titulo, "job": e.job,
                            "status": j and j["status"], "stage": j and j["stage"]})
            series.append({"path_rel": path.relative_to(data.perfis_dir()).as_posix(), "serie": s, "episodios": eps})
        return {"perfil": p, "ideias": data.load_ideias(slug), "series": series, "personagens": data.personagens(slug),
                "universo": {"mundo": _read(root / "universo" / "mundo.md"),
                             "historico": _read(root / "universo" / "historico.md")}}

    @app.put("/api/perfis/{slug}")
    def put_perfil(slug: str, body: dict):
        # ponytail: merge raso (agenda/contas vão inteiras); o painel manda o objeto completo
        try:
            p = data.Perfil.model_validate({**_slug(slug).model_dump(), **body, "slug": slug})
        except ValidationError as e:
            raise HTTPException(422, str(e)) from e
        if p.estilo not in {e["slug"] for e in data.list_estilos()}:
            raise HTTPException(400, f"estilo {p.estilo!r} não existe")
        if body.get("ativo") is True and (motivo := data.ready(slug, p.estilo)):
            raise HTTPException(409, f"perfil ainda não pode ser ativado: {motivo}")
        data.save_perfil(p)
        return p

    def _personagem(slug: str, p: str) -> None:
        _slug(slug)
        if p not in {c["slug"] for c in data.personagens(slug)}:
            raise HTTPException(404, "personagem não existe")

    @app.post("/api/perfis/{slug}/personagens/{p}/folha")
    def folha(slug: str, p: str):
        _personagem(slug, p)
        try:
            personagem.gerar_folha(slug, p)
        except MissingKey as e:
            raise HTTPException(400, str(e)) from e
        except (KeyError, ValueError) as e:  # perfil/estilo sumiu ou inválido, sem ficha: sem caminhos na mensagem
            raise HTTPException(409, str(e) if isinstance(e, ValueError) and "ficha" in str(e) else "perfil, estilo ou ficha inválidos") from e
        except ImageError as e:
            raise HTTPException(502, f"não consegui gerar a folha: {e}") from e
        except OSError as e:
            raise HTTPException(502, "não consegui gravar a folha") from e
        return {"ok": True}

    @app.post("/api/perfis/{slug}/personagens/{p}/aprovar")
    def aprovar_personagem(slug: str, p: str):
        _personagem(slug, p)
        try:
            personagem.aprovar_folha(slug, p)
        except ValueError as e:
            raise HTTPException(409, str(e)) from e
        return {"ok": True}

    @app.put("/api/perfis/{slug}/universo/mundo")
    def put_mundo(slug: str, body: Texto):
        _slug(slug)
        data._write(data.perfis_dir() / slug / "universo" / "mundo.md", body.texto)
        return {"ok": True}

    @app.post("/api/perfis/{slug}/ideias")
    def add_ideia(slug: str, body: Texto):
        _slug(slug)
        return data.add_ideia(slug, body.texto)

    @app.delete("/api/perfis/{slug}/ideias/{iid}")
    def del_ideia(slug: str, iid: str):
        _slug(slug)
        data.save_ideias(slug, [i for i in data.load_ideias(slug) if i.id != iid])
        return {"ok": True}

    @app.post("/api/perfis/{slug}/gerar")
    def gerar(slug: str):
        _slug(slug)
        if fila.is_paused(time.time()):
            raise HTTPException(409, "a fila está pausada")
        if any(fila._perfil(j) == slug and j["status"] in fila.BUSY for j in store.list()):
            raise HTTPException(409, "este perfil já tem um episódio em andamento, na fila, em revisão ou com falha")
        if motivo := data.ready(slug):
            raise HTTPException(409, f"perfil ainda não pode gerar: {motivo}")
        fila.request_force(slug)  # quem roda é o fila.loop: dois Showrunners em paralelo, não
        return {"ok": True}

    def _chat_kind(kind: str, slug: str) -> None:
        if kind not in ("onboarding", "estilo"):
            raise HTTPException(404, "conversa não existe")
        if kind == "onboarding":
            _slug(slug)

    @app.get("/api/chat/{kind}/{slug}")
    def chat_history(kind: str, slug: str):
        _chat_kind(kind, slug)
        return chat.history(kind, slug)

    @app.post("/api/chat/{kind}/{slug}")
    def chat_send(kind: str, slug: str, body: Mensagem):
        _chat_kind(kind, slug)
        if not body.mensagem.strip():
            raise HTTPException(422, "mensagem vazia")
        try:
            return chat.send(kind, slug, body.mensagem)
        except agents.UsageLimit as e:
            raise HTTPException(429, "Limite de uso do Claude atingido") from e
        except agents.AgentOutputError as e:
            raise HTTPException(502, str(e)) from e

    @app.get("/api/fila")
    def get_fila():
        return {**fila.state(), "jobs": [{**j, **_where(j)} for j in store.list()]}

    @app.post("/api/fila/pausar")
    def pausar():
        fila.pause()
        return {"ok": True}

    @app.post("/api/fila/continuar")
    def continuar():
        fila.resume()
        return {"ok": True}

    @app.post("/api/series/pausar")
    def pausar_serie(body: SeriePausa):
        fila.set_series_paused(_serie_path(body.path_rel), body.paused)
        return {"ok": True}

    @app.get("/api/episodios/{jid}")
    def get_episodio(jid: int):
        job = _job(store, jid)
        ep = Path(job["project_dir"])
        decisions = []
        raw = (ep / "decisions.log").read_bytes().decode("utf-8", "replace") if (ep / "decisions.log").exists() else ""
        for ln in raw.splitlines():
            try:
                decisions.append(json.loads(ln))
            except ValueError:
                pass  # linha truncada por kill no meio da escrita
        w = _where(job)
        postado = []
        try:
            postado = next(e.postado for e in data.Serie.model_validate_json(_read(ep.parent / "serie.json")).episodios if e.n == w["n"])
        except (ValueError, StopIteration):
            pass  # sem série/episódio: nada postado
        aprovado = w["n"] is not None and fila._approved(ep.parent, w["n"])
        return {"job": job, **w, "postado": postado, "aprovado": aprovado, "roteiro": _read(ep / "roteiro.md"), "episodio": _json(ep / "episodio.json"),
                "cenas": _json(ep / "cenas.json"), "revisao": _json(ep / "revisao.json"),
                "ajustes": _read(ep / "ajustes.md"), "decisions": decisions,
                "final": _url(ep / "out" / "final.mp4"), "capa": _url(ep / "out" / "capa.jpg")}

    @app.post("/api/episodios/{jid}/aprovar")
    def aprovar(jid: int):
        _job(store, jid)
        _gate(episode.approve, store, jid)
        return {"ok": True}

    @app.post("/api/episodios/{jid}/ajustar")
    def ajustar(jid: int, body: Texto):
        _job(store, jid)
        _agent(_gate, episode.adjust, store, jid, body.texto)
        return {"ok": True}

    @app.post("/api/episodios/{jid}/descartar")
    def descartar(jid: int):
        _job(store, jid)
        _agent(_gate, episode.discard, store, jid)
        return {"ok": True}

    @app.post("/api/episodios/{jid}/retomar")
    def retomar(jid: int):
        _job(store, jid)
        if not store.resume(jid):
            raise HTTPException(409, f"episódio {jid} não está com falha")
        return {"ok": True}

    @app.post("/api/episodios/{jid}/postado")
    def postado(jid: int, body: Postado):
        job = _job(store, jid)
        w = _where(job)
        if job["recipe"] != "episodio" or w["titulo"] is None:
            raise HTTPException(404, "episódio ou série não existe")
        ep = Path(job["project_dir"])
        if not fila._approved(ep.parent, w["n"]):
            raise HTTPException(409, "o episódio ainda não foi aprovado")
        with data.SERIE_LOCK:
            s = data.Serie.model_validate_json(_read(ep.parent / "serie.json"))
            ref = next(e for e in s.episodios if e.n == w["n"])
            if body.rede not in ref.postado:
                ref.postado.append(body.rede)
                data.save_serie(ep.parent, s)
        return {"ok": True, "postado": ref.postado}

    if start_worker:
        threading.Thread(target=fila.loop, args=(store,), daemon=True, name="fila").start()
    data.perfis_dir().mkdir(parents=True, exist_ok=True)
    # só perfis/: home() tem config.json (chaves), jobs.db e fila.json que não podem sair pela rede
    app.mount("/projects", StaticFiles(directory=data.perfis_dir()), name="projects")
    if DIST.exists():
        app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
    return app
