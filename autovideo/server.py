import json
import logging
import shutil
import tempfile
import threading
import time
from pathlib import Path, PureWindowsPath
from urllib.parse import urlsplit
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from starlette.middleware.trustedhost import TrustedHostMiddleware
from autovideo import doctor, pipeline
from autovideo.jobs import GateError, JobStore, approve, run_job, stage_done
from autovideo.timeline import Timeline
from autovideo.recipes import list_recipes, load_recipe

DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"]
log = logging.getLogger("autovideo.server")
BAD_NAME_CHARS = set('<>:"|?*\x00')


class Feedback(BaseModel):
    feedback: str


def _run_one(store: JobStore) -> bool:
    job = store.claim_next()  # atômico: CLI e servidor nunca executam o mesmo job
    if not job:
        return False
    try:
        run_job(store, job["id"], pipeline.STAGES, pipeline.make_ctx)
    except Exception as e:  # noqa: BLE001 — um job quebrado não pode matar o worker nem ficar preso em in_progress
        log.exception("job %s falhou", job["id"])
        try:
            store.set(job["id"], status="failed", error=f"{type(e).__name__}: {e}")
        except Exception:  # noqa: BLE001
            log.exception("não consegui marcar o job %s como failed", job["id"])
    return True


def _worker(store: JobStore) -> None:
    while True:
        try:
            if _run_one(store):
                continue
        except Exception:  # noqa: BLE001 — o loop nunca morre (ex.: banco travado)
            log.exception("erro no worker")
        time.sleep(2)


def _gate(fn, *a) -> dict:
    try:
        fn(*a)
    except KeyError as e:
        raise HTTPException(404, str(e.args[0])) from e
    except GateError as e:
        raise HTTPException(409, str(e)) from e
    return {"ok": True}


def _clean_name(raw: str | None) -> str:
    # PureWindowsPath separa tanto "/" quanto "\": só o basename sobrevive; acentos e espaços ficam
    name = PureWindowsPath(raw or "").name
    if name in ("", ".", "..") or BAD_NAME_CHARS & set(name):
        raise HTTPException(400, f"nome de arquivo inválido: {raw!r}")
    return name


def _json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):  # ausente ou malformado (worker pode estar escrevendo)
        return None


def _jsonl(path: Path) -> list[dict]:
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:  # última linha pode estar sendo escrita pelo worker
            pass
    return out


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


def _recipe_info(rid: str) -> dict:
    r = load_recipe(rid)
    return {"id": r.id, "title": r.title, "mode": r.mode, "aspect": r.aspect,
            "captions": {"enabled": r.captions.enabled, "component": r.captions.component},
            "pacing": {"max_gap": r.pacing.max_gap}, "audio": {"lufs": r.audio.lufs}}


def _timeline(root: Path) -> dict | None:
    data = _json(root / "timeline.json")
    try:
        Timeline.model_validate(data)
    except ValidationError:
        return None
    return data


def _transcript(root: Path) -> dict | None:
    words = _json(root / "analysis/words.json")
    if not words:  # ausente, malformado ou montagem (lista vazia)
        return None
    summary = _json(root / "analysis/summary.json") or {}
    return {"words": [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in words],
            "fillers": summary.get("filler_candidates", [])}


def create_app(store: JobStore, start_worker: bool = True) -> FastAPI:
    app = FastAPI(title="AutoVideo")
    home = pipeline.home()
    home.mkdir(parents=True, exist_ok=True)
    # ferramenta local: bloqueia DNS rebinding (Host) e POST cross-site vindo de outras páginas (Origin)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=LOCAL_HOSTS)

    @app.middleware("http")
    async def same_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin \
                and urlsplit(origin).netloc != request.headers.get("host"):
            return JSONResponse({"detail": "origem não permitida"}, status_code=403)
        return await call_next(request)

    if start_worker:
        store.fail_stale()  # antes da thread: job in_progress de antes do restart vira failed ("interrompido")
        threading.Thread(target=_worker, args=(store,), daemon=True).start()

    @app.get("/api/recipes")
    def recipes():
        return list_recipes()

    @app.get("/api/stages")
    def stages():
        return [name for name, _, _ in pipeline.STAGES]

    @app.get("/api/recipe-info")
    def recipe_info():
        out = []
        for rid in list_recipes():
            try:
                out.append(_recipe_info(rid))
            except Exception as e:  # uma receita quebrada não pode esvaziar a home
                log.warning("receita %s inválida: %s", rid, e)
        return out

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

    @app.get("/api/jobs")
    def jobs():
        return store.list()

    @app.get("/api/jobs/{jid}")
    def job(jid: int):
        try:
            j = store.get(jid)
        except KeyError as e:
            raise HTTPException(404, str(e.args[0])) from e
        root = Path(j["project_dir"])
        brief, post, log = root / "brief.md", root / "out/post.json", root / "decisions.log"
        try:
            j["rel"] = root.resolve().relative_to(home.resolve()).as_posix()
        except ValueError:  # projeto fora do AUTOVIDEO_HOME atual
            j["rel"] = None
        manifest = _json(root / "input/manifest.json") or {}
        script = root / "script.md"
        j["files"] = {
            "brief": brief.read_text(encoding="utf-8") if brief.exists() else None,
            "post": _json(post),
            # etapa render concluída (review.json + marcador); final.mp4 sozinho pode ser de um render anterior
            "has_final": stage_done(root, "render", "out/review.json") and (root / "out/final.mp4").exists(),
            "decisions": _jsonl(log) if log.exists() else [],
            "preview": next((v["clean"] for v in manifest.get("videos", []) if (root / v["clean"]).exists()), None)
            if stage_done(root, "clean", "input/clean.ok") else None,
            "aspect": manifest.get("aspect"),
            "transcript": _transcript(root),
            "timeline": _timeline(root),
            "review": _json(root / "out/review.json"),
            "script": script.read_text(encoding="utf-8") if script.exists() else None,
        }
        return j

    @app.post("/api/jobs")
    def create(recipe: str = Form(...), auto: bool = Form(False), videos: list[UploadFile] = File(...),
               script: UploadFile | None = File(None), assets: list[UploadFile] = File([])):
        if recipe not in list_recipes():  # o id vira caminho em disco: só aceita o que existe
            raise HTTPException(400, f"receita desconhecida: {recipe!r}. Disponíveis: {', '.join(list_recipes())}")
        with tempfile.TemporaryDirectory() as td:
            n = 0

            def save(u: UploadFile) -> Path:
                nonlocal n
                n += 1  # uma pasta por upload: nomes repetidos chegam ao pipeline, que os rejeita
                p = Path(td) / str(n) / _clean_name(u.filename)
                p.parent.mkdir()
                with p.open("wb") as f:
                    shutil.copyfileobj(u.file, f)
                return p
            try:
                jid = pipeline.new_job(store, home, [save(v) for v in videos], save(script) if script else None,
                                       recipe, auto, [save(a) for a in assets])
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
        return {"id": jid}

    @app.post("/api/jobs/{jid}/approve")
    def do_approve(jid: int):
        return _gate(approve, store, jid, pipeline.STAGES)

    @app.post("/api/jobs/{jid}/reject")
    def do_reject(jid: int, fb: Feedback):
        return _gate(pipeline.reject_job, store, jid, fb.feedback)

    @app.post("/api/jobs/{jid}/resume")
    def do_resume(jid: int):
        def go():
            if not store.resume(jid):
                raise GateError(f"job {jid} não está failed (só jobs com falha podem ser retomados)")
        return _gate(go)

    app.mount("/projects", StaticFiles(directory=home), name="projects")
    if DIST.exists():
        app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
    return app
