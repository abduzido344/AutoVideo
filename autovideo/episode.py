"""Diretor de um episódio: etapas determinísticas, bastão por arquivo para os subagentes, laço de revisão.
O Diretor só lê recibos e JSONs pequenos; roteiro, imagens e áudio ficam com os subagentes e as APIs."""
import hashlib
import json
import os
import re
import shutil
import time
from contextlib import contextmanager
from pathlib import Path
from autovideo import agents, config, data, eleven, hf, images, jobs, montage, render, transcribe, voz_check
from autovideo.artefatos import Cenas, Edicao, EpisodioOut, Fix, Revisao, Voz
from autovideo.edicao import conferir_escopo, foto_arvore, invariantes, restaurar_base
from autovideo.jobs import Ctx, GateError, JobStore, Stage
from autovideo.project import Project

REDO = {"roteirista": "roteiro", "diretor_arte": "cenas", "editor": "edicao"}
REVIEW_ROUNDS = 2
AMBIENTE_S = 22  # o ElevenLabs gera no máximo 22 s; a montagem emenda em loop
_ROUND = re.compile(r"^## Ajuste \(revisor", re.M)


def make_ctx(job: dict) -> Ctx:
    # perfis/<perfil>/series/<NN>-<serie>/ep<NN>
    ep = Path(job["project_dir"])
    return Ctx(project=Project(ep), recipe={"perfil": ep.parents[2].name, "serie": ep.parent, "n": int(ep.name[2:])},
               job=job, agent=None)


def _estilo(perfil: str) -> data.Estilo:
    return data.load_estilo(data.load_perfil(perfil).estilo)[1]


def _serie(path: Path) -> data.Serie:
    return data.Serie.model_validate_json((path / "serie.json").read_text(encoding="utf-8"))


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def _sha(*parts: str | bytes) -> str:
    # separador \0: ("ab", "c") e ("a", "bc") não colidem
    return hashlib.sha256(b"\0".join(x.encode() if isinstance(x, str) else x for x in parts)).hexdigest()


def _cache(p: Path) -> dict:
    try:
        c = json.loads(_read(p))
    except (OSError, ValueError):  # ausente ou truncado (kill no meio da gravação): cache vazio, regera
        return {}
    return c if isinstance(c, dict) else {}


def _save(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, p)


def _ajustes(ep: Path) -> str:
    return "\nSe ajustes.md existir, leia e aplique as correções endereçadas a você." if (ep / "ajustes.md").exists() else ""


def _norm(text: str) -> str:
    return " ".join(text.split())


def roteiro(ctx: Ctx) -> None:
    ep, r = ctx.project.root, ctx.recipe
    total = len(_serie(r["serie"]).episodios)
    if r["n"] >= total:
        fim = "Este é o último episódio da série: feche o arco, sem gancho."
    else:
        fim = f'Termine com o gancho do estilo: "{_estilo(r["perfil"]).gancho.replace("{n}", voz_check.extenso(r["n"] + 1))}".'  # por extenso: o roteiro não aceita dígitos
    task = (f"Escreva o roteiro da Parte {r['n']} de {total}. A sinopse está em sinopse.md. {fim}\n"
            "Confira no histórico a estratégia de gancho do episódio anterior e use outra, salvo se o estilo fixar a abertura.\n"
            "Grave roteiro.md e episodio.json." + _ajustes(ep))
    ok_json = agents.validate_model(EpisodioOut)

    def valida(p: Path) -> None:
        ok_json(p)
        if not (ep / "roteiro.md").is_file() or not _read(ep / "roteiro.md").strip():
            raise ValueError("roteiro.md não foi gravado ou está vazio")
        if any(re.search(r"\d", l) for l in _read(ep / "roteiro.md").splitlines() if not l.lstrip().startswith("#")):
            raise ValueError("o roteiro tem dígitos: escreva todos os números, horas e siglas por extenso, como se leem")

    agents.run_role(agents.ROLES["roteirista"], ep, task, ep / "episodio.json", valida,
                    context=data.context_for(r["perfil"]))


def _check_cenas(ep: Path, perfil: str):
    est = _estilo(perfil)
    chars = {c["slug"] for c in data.personagens(perfil)}

    def v(path: Path) -> None:
        cs = Cenas.model_validate_json(_read(path))
        ids = [c.id for c in cs.cenas]
        if ids != [f"s{i:02d}" for i in range(1, len(ids) + 1)]:
            raise ValueError(f"ids das cenas fora de sequência (s01, s02...): {ids}")
        roteiro_ = "\n".join(l for l in _read(ep / "roteiro.md").splitlines() if not l.lstrip().startswith("#"))
        if _norm(" ".join(c.narration for c in cs.cenas)) != _norm(roteiro_):
            raise ValueError("a narração das cenas, concatenada, precisa ser exatamente o roteiro.md (sem títulos)")
        for c in cs.cenas:
            if c.screen and c.screen.type not in est.telas:
                raise ValueError(f"cena {c.id}: tela {c.screen.type} fora do estilo ({est.telas})")
            if bad := set(c.characters) - chars:
                raise ValueError(f"cena {c.id}: personagens inexistentes no perfil: {sorted(bad)}")
        n, mx = sum(c.kind == "image" for c in cs.cenas), config.setting("max_imagens")
        if n > mx:
            raise ValueError(f"{n} cenas de imagem passam do limite max_imagens={mx}; junte cenas ou use telas")
    return v


def cenas(ctx: Ctx) -> None:
    ep = ctx.project.root
    task = "Leia roteiro.md e divida em cenas. Grave cenas.json." + _ajustes(ep)
    agents.run_role(agents.ROLES["diretor_arte"], ep, task, ep / "cenas.json", _check_cenas(ep, ctx.recipe["perfil"]),
                    context=data.context_for(ctx.recipe["perfil"]))


def _cenas(ep: Path) -> Cenas:
    return Cenas.model_validate_json(_read(ep / "cenas.json"))


def _voz(ep: Path) -> Voz:
    return Voz.model_validate_json(_read(ep / "voz.json"))


def voz(ctx: Ctx) -> None:
    ep, perfil = ctx.project.root, ctx.recipe["perfil"]
    voz_id = data.load_perfil(perfil).voz_id or _estilo(perfil).voz_padrao
    if not voz_id:
        raise RuntimeError("defina a voz do perfil (nem o perfil nem o estilo têm voz)")
    cs, cp = _cenas(ep).cenas, ep / "voz" / "cache.json"
    cache, out = _cache(cp), []
    asr = ep / "voz" / ".asr"

    def ouvir(f: str, c) -> tuple[float, str] | None:
        """Transcreve o áudio e devolve (semelhança, texto ouvido); None se a transcrição falhar (não trava o episódio)."""
        try:
            asr.mkdir(parents=True, exist_ok=True)
            ws = transcribe.transcribe(ep / f, f, asr)
        except Exception as e:  # noqa: BLE001 — ToolError, JSON ruim, disco: qualquer falha da checagem é "não checado"
            ctx.project.log({"stage": "voz", "scene": c.id, "asr": "não checado", "erro": str(e)[:200]})
            return None
        _save(ep / f.replace(".mp3", ".words.json"), [w.model_dump() for w in ws])
        ouvido = " ".join(w.text for w in ws)
        return voz_check.semelhanca(c.narration, ouvido), ouvido

    for i, c in enumerate(cs):
        sha = _sha(c.narration, voz_id)
        vizinhos = dict(previous_text=cs[i - 1].narration if i else "",
                        next_text=cs[i + 1].narration if i + 1 < len(cs) else "")
        if sha not in cache or not (ep / cache[sha]["file"]).exists():
            f = f"voz/{sha[:16]}.mp3"
            cache[sha] = {"file": f, "dur": eleven.tts(c.narration, voz_id, ep / f, **vizinhos)}
            _save(cp, cache)  # logo após o TTS pago: um limite ou kill no meio não paga de novo
        e = cache[sha]
        if "asr" not in e:  # sem checagem gravada (morreu entre o TTS e a checagem): checa agora
            res = ouvir(e["file"], c)
            ok = True  # não checada (curta ou transcrição falhou) conta como ok
            if voz_check.precisa_checar(c.narration) and res and res[0] < voz_check.LIMITE:  # uma regeração só
                e["dur"] = eleven.tts(c.narration, voz_id, ep / e["file"], **vizinhos)
                res = ouvir(e["file"], c) or res  # se a nova checagem falhar, vale o primeiro resultado (ruim)
                ok = res[0] >= voz_check.LIMITE
            r, ouvido = res or (1.0, c.narration)
            e["asr"] = {"ratio": r, "ouvido": ouvido, "ok": ok}
            _save(cp, cache)
        out.append({"id": c.id, "file": e["file"], "dur": e["dur"], "sha": sha,
                    "asr_ok": e["asr"]["ok"], "ouvido": e["asr"]["ouvido"]})
    _save(ep / "voz.json", {"cenas": out})


def _cached(ep: Path, cp: Path, cache: dict, sha: str, ext: str, gen) -> str:
    """Arquivo do cache por hash; gera (gen(destino)) só se faltar. O cache vive fora do artefato da etapa."""
    if sha not in cache or not (ep / cache[sha]).exists():
        f = f"{cp.parent.name}/{sha[:16]}.{ext}"
        gen(ep / f)
        cache[sha] = f
        _save(cp, cache)
    return cache[sha]


def imagens(ctx: Ctx) -> None:
    ep, perfil = ctx.project.root, ctx.recipe["perfil"]
    est, cs = _estilo(perfil), [c for c in _cenas(ep).cenas if c.kind == "image"]
    pers = data.personagens(perfil)
    ok = {c["slug"] for c in pers if c["folha"] and c["aprovada"]}
    if bad := {p for c in cs for p in c.characters} - ok:  # checa tudo antes de gastar a primeira imagem
        raise RuntimeError(f"folha de {', '.join(sorted(bad))} não aprovada")
    aparencia = {c["slug"]: data.aparencia(c["ficha"]) for c in pers}
    base, cp = data.perfis_dir() / perfil / "personagens", ep / "img" / "cache.json"
    cache, manifest = _cache(cp), {}
    for c in cs:
        refs = [base / p / "folha.png" for p in c.characters]
        # a aparência fixa vai em todo prompt, além da folha: só a referência deixa o personagem mudar de cara
        quem = " ".join(f"Character from reference image {i}: {aparencia[p]}." for i, p in enumerate(c.characters, 1))
        prompt = " ".join(x for x in (f"{est.imagem_prefixo}. {c.prompt.rstrip('. ')}.", quem) if x)

        def gen(out, c=c, prompt=prompt, refs=refs):
            info = images.generate(prompt, refs, out)
            ctx.project.log({"stage": "imagens", "scene": c.id, "cost_usd": info.get("cost_usd")})

        manifest[c.id] = _cached(ep, cp, cache, _sha(prompt, *(r.read_bytes() for r in refs)), "png", gen)
    _save(ep / "img" / "manifest.json", manifest)


def sons(ctx: Ctx) -> None:
    ep = ctx.project.root
    cs, durs = _cenas(ep), {v.id: v.dur for v in _voz(ep).cenas}
    cp = ep / "sfx" / "cache.json"
    cache, manifest = _cache(cp), {"cenas": {}, "ambiente": None}
    for c in cs.cenas:
        if c.sfx:
            s = min(durs[c.id], AMBIENTE_S)
            manifest["cenas"][c.id] = _cached(ep, cp, cache, _sha(c.sfx, f"{s:.2f}"), "mp3",
                                              lambda out, c=c, s=s: eleven.sfx(c.sfx, s, out))
    if cs.ambiente:
        manifest["ambiente"] = _cached(ep, cp, cache, _sha(cs.ambiente, str(AMBIENTE_S)), "mp3",
                                       lambda out: eleven.sfx(cs.ambiente, AMBIENTE_S, out))
    _save(ep / "sfx" / "manifest.json", manifest)


def montagem(ctx: Ctx) -> None:
    ep = ctx.project.root
    sfx = json.loads(_read(ep / "sfx" / "manifest.json"))
    if (ep / "composition.base").is_dir():  # refeita: parte da base, senão arquivos do editor vazam para a base nova
        restaurar_base(ep)
    render.init_composition(ctx.project, "9:16")
    montage.build(ep, _cenas(ep), _voz(ep), json.loads(_read(ep / "img" / "manifest.json")), sfx["cenas"],
                  sfx["ambiente"], legenda=_estilo(ctx.recipe["perfil"]).legenda)
    base = ep / "composition.base"  # cópia da montagem determinística, para a edição restaurar/comparar
    shutil.rmtree(base, ignore_errors=True)
    shutil.copytree(ep / "composition", base)


def edicao(ctx: Ctx) -> None:
    ep, perfil = ctx.project.root, ctx.recipe["perfil"]
    base, comp, out = ep / "composition.base", ep / "composition", ep / "edicao.json"
    if not base.is_dir() and comp.is_dir():  # montado antes do editor existir: a montagem vira a base
        shutil.copytree(comp, base)
    ajustes = _read(ep / "ajustes.md") if (ep / "ajustes.md").exists() else ""
    sha = _sha((base / "index.html").read_bytes(), json.dumps([c.edicao for c in _cenas(ep).cenas]),
               data.load_estilo(data.load_perfil(perfil).estilo)[0], ajustes, hf.HF_VERSION,
               _read(agents.PROMPTS / "editor.md"), _read(agents.PROMPTS / "_direcao.md"))
    cp = ep / "edicao" / "cache.json"
    cache = _cache(cp)
    if sha in cache and (ep / cache[sha]["dir"]).is_dir():
        shutil.rmtree(comp, ignore_errors=True)
        shutil.copytree(ep / cache[sha]["dir"], comp)
        _save(out, {**cache[sha]["recibo"], "cache": True})
        return

    def valida(p: Path) -> None:
        Edicao.model_validate_json(_read(p))
        erros = [f"{i['category']}: {i['message']}" for i in render.check(comp, "9:16")] + invariantes(base, comp)
        if erros:
            raise ValueError("\n".join(erros))

    task = ("Melhore a edição da composição montada em composition/. As cenas, com a intenção de edição de cada uma, "
            "estão em cenas.json; o estilo está no contexto. Grave edicao.json." + _ajustes(ep))
    restaurar_base(ep)  # sempre parte da base: retentativa ou retomada não acumula edição velha
    antes, erro = foto_arvore(ep), None
    try:
        agents.run_role(agents.ROLES["editor"], ep, task, out, valida, context=data.context_for(perfil))
    except agents.UsageLimit:  # subclasse de AgentOutputError: não é fallback, a fila pausa e retoma aqui
        conferir_escopo(ep, antes, ctx.project.log)
        raise
    except (agents.AgentOutputError, hf.ToolError) as e:
        erro = e
    # em todo caminho: as flags do Bash escapam do escopo do Edit
    if (fora := conferir_escopo(ep, antes, ctx.project.log)) and erro is None:
        erro = agents.AgentOutputError("o editor alterou arquivos fora do escopo: " + ", ".join(fora[:5]))
    if erro is not None:
        restaurar_base(ep)
        _save(out, Edicao(fallback=True, motivo=str(erro)[:300], sha=sha).model_dump())
        ctx.project.log({"stage": "edicao", "fallback": True, "motivo": str(erro)[:300]})
        return
    recibo = Edicao.model_validate_json(_read(out)).model_copy(
        update={"sha": sha, "fallback": False, "motivo": "", "cache": False}).model_dump()
    d = f"edicao/{sha[:16]}"
    shutil.rmtree(ep / d, ignore_errors=True)
    # os snapshots do editor não entram no cache
    shutil.copytree(comp, ep / d, ignore=lambda p, names: ["artifacts"] if Path(p).name == ".hyperframes" else [])
    cache[sha] = {"dir": d, "recibo": recibo}
    _save(cp, cache)
    _save(out, recibo)


def _tempos(ep: Path) -> list[tuple[str, float, float]]:
    """(kind, início, duração) de cada cena, pelo mesmo cálculo da montagem."""
    ts = [(c.kind, t, d) for c, (t, d) in zip(_cenas(ep).cenas, montage.timeline(_voz(ep)))]
    if not ts:
        raise ValueError("cenas.json sem cenas")
    return ts


def render_ep(ctx: Ctx) -> None:
    ep = ctx.project.root
    final = ep / "out" / "final.mp4"
    if issues := render.check(ep / "composition", "9:16"):  # falha a etapa (retomável) antes do render caro
        raise RuntimeError("a composição tem erros: " + "; ".join(f"{i['category']}: {i['message']}" for i in issues[:5]))
    render.render_final(ep / "composition", final, -14)
    ts = _tempos(ep)
    _, t, d = next((x for x in ts if x[0] == "image"), ts[0])
    render.make_cover(final, t + d / 3, ep / "out" / "capa.jpg")


def revisar(ctx: Ctx) -> None:
    ep = ctx.project.root
    ts = _tempos(ep)
    frames = render.snapshots(ep / "composition", [round(t + d / 2, 3) for _, t, d in ts], ep / "review")
    # o agente só lê dentro do episódio: as folhas aprovadas dos personagens em cena vêm copiadas para review/refs
    refs, base = ep / "review" / "refs", data.perfis_dir() / ctx.recipe["perfil"] / "personagens"
    shutil.rmtree(refs, ignore_errors=True)
    refs.mkdir(parents=True)
    for p in sorted({p for c in _cenas(ep).cenas for p in c.characters}):
        shutil.copyfile(base / p / "folha.png", refs / f"{p}.png")
    total = ts[-1][1] + ts[-1][2]
    lista = ", ".join(f.relative_to(ep).as_posix() for f in frames) or "nenhum"
    folhas = ", ".join(f.relative_to(ep).as_posix() for f in sorted(refs.glob("*.png"))) or "nenhuma"
    lo, hi = _estilo(ctx.recipe["perfil"]).duracao_alvo_s
    task = (f"Revise o episódio. Duração total: {total:.1f} s; o alvo do estilo é entre {lo} e {hi} s. Leia roteiro.md, episodio.json e cenas.json; "
            f"frames do meio de cada cena, na ordem: {lista}. Folhas aprovadas dos personagens em cena: {folhas}. "
            "Grave revisao.json.")
    if ruins := [v for v in _voz(ep).cenas if not v.asr_ok]:
        task += " A voz não bateu com a narração na transcrição de volta (confira se a fala está correta): " +                 "; ".join(f"{v.id} ouvido: \"{v.ouvido}\"" for v in ruins) + "."
    agents.run_role(agents.ROLES["revisor"], ep, task, ep / "revisao.json", agents.validate_model(Revisao),
                    context=data.context_for(ctx.recipe["perfil"]))


STAGES: list[Stage] = [
    ("roteiro", "episodio.json", roteiro), ("cenas", "cenas.json", cenas), ("voz", "voz.json", voz),
    ("imagens", "img/manifest.json", imagens), ("sfx", "sfx/manifest.json", sons),
    ("montagem", "composition/index.html", montagem), ("edicao", "edicao.json", edicao),
    ("render", "out/final.mp4", render_ep),
    ("revisao", "revisao.json", revisar), ("aprovacao", "approvals/aprovado.ok", None)]


def _write_ajuste(ep: Path, origem: str, body: str, start: str = "cenas") -> None:
    # o invalidate_from apaga cenas.json: sem a cópia o diretor_arte refaz tudo do zero, muda todo prompt e perde o cache de imagens
    # roteiro novo: as cenas antigas não casam mais com o texto, então a cópia é descartada
    if start == "roteiro":
        (ep / "cenas.anterior.json").unlink(missing_ok=True)
    elif (ep / "cenas.json").exists():
        shutil.copy2(ep / "cenas.json", ep / "cenas.anterior.json")
    with (ep / "ajustes.md").open("a", encoding="utf-8") as f:
        f.write(f"\n## Ajuste ({origem})\n{body}\n")


def _earliest(roles) -> str:
    names = [n for n, _, _ in STAGES]
    return min((REDO[r] for r in roles), key=names.index)


def _pausado(job: dict) -> bool:
    """Fila ou série pausada: o episódio em andamento para na próxima fronteira de etapa."""
    from autovideo import fila  # import tardio evita ciclo (fila importa episode)
    try:
        return fila.is_paused(time.time()) or fila._serie(Path(job["project_dir"]).parent).paused
    except (OSError, ValueError):  # série sumiu: o run_next já trata, aqui não para o episódio
        return False


def produce(store: JobStore, jid: int) -> str:
    hit: list[agents.UsageLimit] = []

    def guard(fn):
        def g(ctx):
            try:
                fn(ctx)
            except agents.UsageLimit as e:
                hit.append(e)
                raise
        return g

    stages = [(n, r, fn and guard(fn)) for n, r, fn in STAGES]
    while True:
        status = jobs.run_job(store, jid, stages, make_ctx, lambda: _pausado(store.get(jid)))
        if hit:  # limite de uso não é falha: volta para a fila na mesma etapa e a fila pausa
            store.set(jid, status="queued", error="")
            raise hit[0]
        if status == "paused":
            return status
        ep = Path(store.get(jid)["project_dir"])
        if status != "awaiting_approval":
            return status
        rev = Revisao.model_validate_json(_read(ep / "revisao.json"))
        k = len(_ROUND.findall(_read(ep / "ajustes.md"))) if (ep / "ajustes.md").exists() else 0
        if rev.ok or not rev.fixes or k >= REVIEW_ROUNDS:
            return status  # rodadas esgotadas: vai para a revisão humana com os fixes visíveis em revisao.json
        with store.lock:  # como no adjust: só mexe nos arquivos se o job ainda está parado no gate
            job = store.get(jid)
            if (job["status"], job["stage"]) != ("awaiting_approval", "aprovacao"):
                return job["status"]
            start = _earliest(f.role for f in rev.fixes)
            _write_ajuste(ep, f"revisor, rodada {k + 1}",
                          "\n".join(f"- [{f.role}{' ' + f.scene if f.scene else ''}] {f.note}" for f in rev.fixes), start)
            store.set(jid, status="queued", stage="")  # queued antes de invalidar: falha no meio refaz o que falta, nunca fica no gate incompleto
            jobs.invalidate_from(ep, STAGES, start)
        Project(ep).log({"review_round": k + 1})


def _awaiting(store: JobStore, jid: int, ok=("awaiting_approval",)) -> dict:
    job = store.get(jid)
    if job["status"] not in ok:
        raise GateError(f"job {jid} não está aguardando revisão (status={job['status']})")
    return job


def approve(store: JobStore, jid: int) -> None:
    ctx = make_ctx(_awaiting(store, jid))
    ep = ctx.project.root
    out = EpisodioOut.model_validate_json(_read(ep / "episodio.json"))  # lê/valida antes de mudar o estado
    if jobs.stage_done(ep, "render", "out/final.mp4") and not jobs.stage_done(ep, "edicao", "edicao.json"):
        # renderizado antes da etapa edicao existir: conta como pulada, senão o approve trava e o worker rodaria o editor depois do render
        _save(ep / "edicao.json", Edicao(fallback=True, motivo="episódio renderizado antes do editor").model_dump())
        if (ep / ".stages").exists():  # no legado o artefato basta; criar .stages/ tiraria o projeto do legado
            jobs._commit(ep, "edicao")
    jobs.approve(store, jid, STAGES)
    with (data.perfis_dir() / ctx.recipe["perfil"] / "universo" / "historico.md").open("a", encoding="utf-8") as f:
        f.write(f"\n## Parte {ctx.recipe['n']} — {out.titulo}\n{out.resumo}\n")
        if out.gancho:
            f.write(f"Gancho: {out.gancho}\n")


def adjust(store: JobStore, jid: int, texto: str) -> None:
    ep = Path(_awaiting(store, jid)["project_dir"])
    task = f"Pedido de ajuste do usuário:\n\"\"\"\n{texto}\n\"\"\"\nDecida o responsável e grave triagem.json."
    agents.run_role(agents.ROLES["triagem"], ep, task, ep / "triagem.json", agents.validate_model(Fix))
    fix = Fix.model_validate_json(_read(ep / "triagem.json"))
    with store.lock:  # a triagem roda fora do lock; a troca de arquivos e o queued, dentro
        _awaiting(store, jid)
        _write_ajuste(ep, f"usuário → {fix.role}", f"{texto}\n\nResumo da triagem: {fix.note}", REDO[fix.role])
        store.set(jid, status="queued", stage="")  # queued antes de invalidar (ver produce)
        jobs.invalidate_from(ep, STAGES, REDO[fix.role])


def discard(store: JobStore, jid: int) -> None:
    from autovideo import showrunner  # import tardio evita ciclo
    ctx = make_ctx(_awaiting(store, jid, ("awaiting_approval", "failed")))

    @contextmanager
    def guard():  # a sinopse só é gravada se o job ainda está parado no gate
        with store.lock:
            _awaiting(store, jid, ("awaiting_approval", "failed"))
            yield

    showrunner.rewrite_synopsis(ctx.recipe["serie"], ctx.recipe["n"], guard)
    with store.lock:
        _awaiting(store, jid, ("awaiting_approval", "failed"))
        for p in ctx.project.root.iterdir():
            if p.name != "sinopse.md":
                shutil.rmtree(p) if p.is_dir() else p.unlink()
        (ctx.project.root / ".stages").mkdir()  # nunca "legado": artefato só conta com marcador
        store.set(jid, status="queued", stage="", error="")


def new_episode_job(store: JobStore, serie_path: Path, n: int) -> int:
    ep = data.ep_dir(serie_path, n)
    s = _serie(serie_path)
    ref = next((e for e in s.episodios if e.n == n), None)
    if ref is None:
        raise ValueError(f"a série {s.slug} não tem o episódio {n}")
    (ep / ".stages").mkdir(parents=True, exist_ok=True)  # idem
    jid = store.create(str(ep), "episodio", False)
    try:
        with data.SERIE_LOCK:
            s = _serie(serie_path)
            next(e for e in s.episodios if e.n == n).job = jid
            data.save_serie(serie_path, s)
    except BaseException:
        store.delete(jid)  # sem e.job apontando para ele, o job viraria órfão e a fila o rodaria
        raise
    return jid
