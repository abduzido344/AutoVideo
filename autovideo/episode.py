"""Diretor de um episódio: etapas determinísticas, bastão por arquivo para os subagentes, laço de revisão.
O Diretor só lê recibos e JSONs pequenos; roteiro, imagens e áudio ficam com os subagentes e as APIs."""
import hashlib
import json
import re
import shutil
from pathlib import Path
from autovideo import agents, config, data, eleven, images, jobs, montage, render
from autovideo.artefatos import Cenas, EpisodioOut, Fix, Revisao, Voz
from autovideo.jobs import Ctx, GateError, JobStore, Stage
from autovideo.project import Project

REDO = {"roteirista": "roteiro", "diretor_arte": "cenas"}
REVIEW_ROUNDS = 2
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
    return json.loads(_read(p)) if p.exists() else {}


def _save(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


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
        fim = f'Termine com o gancho do estilo: "{_estilo(r["perfil"]).gancho.replace("{n}", str(r["n"] + 1))}".'
    task = (f"Escreva o roteiro da Parte {r['n']} de {total}. A sinopse está em sinopse.md. {fim}\n"
            "Grave roteiro.md e episodio.json." + _ajustes(ep))
    agents.run_role(agents.ROLES["roteirista"], ep, task, ep / "episodio.json", agents.validate_model(EpisodioOut),
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
    for i, c in enumerate(cs):
        sha = _sha(c.narration, voz_id)
        if sha not in cache or not (ep / cache[sha]["file"]).exists():
            f = f"voz/{sha[:16]}.mp3"
            dur = eleven.tts(c.narration, voz_id, ep / f, previous_text=cs[i - 1].narration if i else "",
                             next_text=cs[i + 1].narration if i + 1 < len(cs) else "")
            cache[sha] = {"file": f, "dur": dur}
            _save(cp, cache)  # a cada cena: um limite no meio não perde o que já foi pago
        out.append({"id": c.id, "file": cache[sha]["file"], "dur": cache[sha]["dur"], "sha": sha})
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


def montagem(ctx: Ctx) -> None:
    ep = ctx.project.root
    render.init_composition(ctx.project, "9:16")
    montage.build(ep, _cenas(ep), _voz(ep), json.loads(_read(ep / "img" / "manifest.json")),
                  legenda=_estilo(ctx.recipe["perfil"]).legenda)


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
    agents.run_role(agents.ROLES["revisor"], ep, task, ep / "revisao.json", agents.validate_model(Revisao),
                    context=data.context_for(ctx.recipe["perfil"]))


STAGES: list[Stage] = [
    ("roteiro", "episodio.json", roteiro), ("cenas", "cenas.json", cenas), ("voz", "voz.json", voz),
    ("imagens", "img/manifest.json", imagens),
    ("montagem", "composition/index.html", montagem), ("render", "out/final.mp4", render_ep),
    ("revisao", "revisao.json", revisar), ("aprovacao", "approvals/aprovado.ok", None)]


def _write_ajuste(ep: Path, origem: str, body: str) -> None:
    with (ep / "ajustes.md").open("a", encoding="utf-8") as f:
        f.write(f"\n## Ajuste ({origem})\n{body}\n")


def _earliest(roles) -> str:
    names = [n for n, _, _ in STAGES]
    return min((REDO[r] for r in roles), key=names.index)


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
        status = jobs.run_job(store, jid, stages, make_ctx)
        if hit:  # limite de uso não é falha: volta para a fila na mesma etapa e a fila pausa
            store.set(jid, status="queued", error="")
            raise hit[0]
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
            _write_ajuste(ep, f"revisor, rodada {k + 1}",
                          "\n".join(f"- [{f.role}{' ' + f.scene if f.scene else ''}] {f.note}" for f in rev.fixes))
            jobs.invalidate_from(ep, STAGES, _earliest(f.role for f in rev.fixes))
            store.set(jid, status="queued", stage="")
        Project(ep).log({"review_round": k + 1})


def _awaiting(store: JobStore, jid: int, ok=("awaiting_approval",)) -> dict:
    job = store.get(jid)
    if job["status"] not in ok:
        raise GateError(f"job {jid} não está aguardando revisão (status={job['status']})")
    return job


def approve(store: JobStore, jid: int) -> None:
    jobs.approve(store, jid, STAGES)
    ctx = make_ctx(store.get(jid))
    out = EpisodioOut.model_validate_json(_read(ctx.project.root / "episodio.json"))
    with (data.perfis_dir() / ctx.recipe["perfil"] / "universo" / "historico.md").open("a", encoding="utf-8") as f:
        f.write(f"\n## Parte {ctx.recipe['n']} — {out.titulo}\n{out.resumo}\n")


def adjust(store: JobStore, jid: int, texto: str) -> None:
    ep = Path(_awaiting(store, jid)["project_dir"])
    task = f"Pedido de ajuste do usuário:\n\"\"\"\n{texto}\n\"\"\"\nDecida o responsável e grave triagem.json."
    agents.run_role(agents.ROLES["triagem"], ep, task, ep / "triagem.json", agents.validate_model(Fix))
    fix = Fix.model_validate_json(_read(ep / "triagem.json"))
    with store.lock:  # a triagem roda fora do lock; a troca de arquivos e o queued, dentro
        _awaiting(store, jid)
        _write_ajuste(ep, f"usuário → {fix.role}", f"{texto}\n\nResumo da triagem: {fix.note}")
        jobs.invalidate_from(ep, STAGES, REDO[fix.role])
        store.set(jid, status="queued", stage="")


def discard(store: JobStore, jid: int) -> None:
    from autovideo import showrunner  # import tardio evita ciclo
    ctx = make_ctx(_awaiting(store, jid, ("awaiting_approval", "failed")))
    showrunner.rewrite_synopsis(ctx.recipe["serie"], ctx.recipe["n"])
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
    with data.SERIE_LOCK:
        s = _serie(serie_path)
        next(e for e in s.episodios if e.n == n).job = jid
        data.save_serie(serie_path, s)
    return jid
