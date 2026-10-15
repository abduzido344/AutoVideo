import json
import os
import re
import shutil
import time
from pathlib import Path
from autovideo import agents, media, render
from autovideo.agents import EditDecisions, Style, validate_model
from autovideo.compose import write_composition
from autovideo.jobs import Ctx, JobStore, reject
from autovideo.project import Project
from autovideo.recipes import load_recipe
from autovideo.timeline import FORMATS, Timeline, Word, plan_segments, remap_words
from autovideo.transcribe import filler_candidates, numbered_text, require_speech, transcribe

# gate rejeitado -> primeira etapa a refazer (o resto do que veio antes do gate continua válido)
REDO = {"gate1": "director", "gate2": "copywriter"}
REVIEW_ROUNDS = 2


def home() -> Path:
    return Path(os.environ.get("AUTOVIDEO_HOME", Path.cwd() / "projects"))


def _check_inputs(videos: list[Path], script: Path | None, assets: list[Path]) -> None:
    if not videos:
        raise ValueError("nenhum vídeo informado")
    for f in [*videos, *([script] if script else []), *assets]:
        if not Path(f).is_file():
            raise ValueError(f"arquivo não encontrado: {f}")
    # casefold: no NTFS A.mp4 e a.mp4 são o mesmo arquivo; a.mp4 e a.mov viram o mesmo a.clean.mp4
    raws = [v.name.casefold() for v in videos]
    cleans = [f"{v.stem}.clean.mp4".casefold() for v in videos]
    anames = [a.name.casefold() for a in assets]  # tudo vai flat para composition/assets/<basename>
    for label, xs in (("vídeos", raws), ("vídeos (mesmo nome após a limpeza)", cleans), ("assets", anames)):
        if len(set(xs)) != len(xs):
            raise ValueError(f"nomes repetidos entre {label} (sem diferenciar maiúsculas): {sorted(xs)}")
    if set(cleans) & set(anames):
        raise ValueError(f"asset com o mesmo nome de um vídeo limpo: {sorted(set(cleans) & set(anames))}")


def new_job(store: JobStore, home_dir: Path, videos: list[Path], script: Path | None, recipe: str,
            auto: bool, assets: list[Path] | None = None) -> int:
    load_recipe(recipe)  # falha cedo com a lista de receitas
    assets = assets or []
    _check_inputs(videos, script, assets)
    slug = re.sub(r"[^a-z0-9]+", "-", videos[0].stem.lower()).strip("-")[:30] or "video"
    base = f"{time.strftime('%Y%m%d-%H%M%S')}-{slug}"
    home_dir.mkdir(parents=True, exist_ok=True)
    for n in range(1, 10_000):  # mkdir é o árbitro: dois jobs no mesmo segundo ganham -2, -3...
        root = home_dir / (base if n == 1 else f"{base}-{n}")
        try:
            root.mkdir()
            break
        except FileExistsError:
            continue
    (root / "input/raw").mkdir(parents=True)
    for v in videos:
        shutil.copy2(v, root / "input/raw" / v.name)
    if script:
        shutil.copy2(script, root / "script.md")
    if assets:
        (root / "user-assets").mkdir()
        for a in assets:
            shutil.copy2(a, root / "user-assets" / a.name)
    return store.create(str(root), recipe, auto)


def reject_job(store: JobStore, jid: int, feedback: str) -> None:
    """Rejeita o gate em que o job está parado, refazendo a partir da etapa certa (REDO)."""
    reject(store, jid, STAGES, feedback, redo_from=REDO.get(store.get(jid)["stage"]))


def make_ctx(job: dict) -> Ctx:
    return Ctx(project=Project(Path(job["project_dir"])), recipe=load_recipe(job["recipe"]), job=job,
               agent=agents.run_role)


def _rel(p: Project, path: Path) -> str:
    return path.relative_to(p.root).as_posix()


def _fb(p: Project) -> str:
    fb = p.feedback()
    return f"\n\nFeedback humano a respeitar (feedback.md):\n{fb}" if fb else ""


def _write_json(path: Path, data, **kw) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, **kw), encoding="utf-8")


def _words(p: Project, name: str = "words.json") -> list[Word]:
    return [Word(**w) for w in json.loads((p.analysis / name).read_text(encoding="utf-8"))]


def ingest(ctx):
    p, vids = ctx.project, []
    for raw in sorted((p.input / "raw").iterdir()):
        clean = p.input / f"{raw.stem}.clean.mp4"
        vids.append({"raw": _rel(p, raw), "clean": _rel(p, clean), **media.probe(raw)})
    p.save_manifest({"videos": vids, "aspect": ctx.recipe.aspect})


def clean(ctx):
    p = ctx.project
    for v in p.manifest()["videos"]:
        media.clean(p.root / v["raw"], p.root / v["clean"], ctx.recipe.audio.clean, ctx.recipe.audio.lufs)
    (p.input / "clean.ok").write_text("ok")


def do_transcribe(ctx):
    p, words = ctx.project, []
    if ctx.recipe.mode == "speech":
        for v in p.manifest()["videos"]:
            words += transcribe(p.root / v["clean"], v["clean"], p.analysis / "asr")
        require_speech(words)
    _write_json(p.analysis / "words.json", [w.model_dump() for w in words])


def analyze(ctx):
    p, r = ctx.project, ctx.recipe
    vids, words = p.manifest()["videos"], _words(p)
    scenes = {}
    for n, v in enumerate(vids):
        src = p.root / v["clean"]
        media.extract_frames(src, p.analysis / "frames" / str(n), every_s=2 if r.mode == "speech" else 1)
        scenes[v["clean"]] = media.detect_scenes(src)
    _write_json(p.analysis / "scenes.json", scenes)
    (p.analysis / "transcript.txt").write_text(numbered_text(words), encoding="utf-8")
    w, h, _ = FORMATS[r.aspect]
    _write_json(p.analysis / "summary.json", {
        "duration_total": sum(v["duration"] for v in vids), "width": w, "height": h, "aspect": r.aspect,
        "word_count": len(words), "filler_candidates": sorted(filler_candidates(words, r.pacing.fillers)),
        "sources": [v["clean"] for v in vids]}, indent=2)


def director(ctx):
    ctx.agent("director", ctx.project, ctx.recipe, "Escreva brief.md." + _fb(ctx.project),
              ctx.project.root / "brief.md")


def copywriter(ctx):
    ctx.agent("copywriter", ctx.project, ctx.recipe,
              "Escreva edit.json. Os filler_candidates de analysis/summary.json são só sugestões: só sai do vídeo "
              "o que você puser em drop. Ponha lá as hesitações reais e nunca remova o verbo \"é\"." + _fb(ctx.project),
              ctx.project.root / "edit.json", validate_model(EditDecisions))


def plan(ctx):
    p, r = ctx.project, ctx.recipe
    w, h, _ = FORMATS[r.aspect]
    vids = p.manifest()["videos"]
    if r.mode == "speech":
        words = _words(p)
        ed = EditDecisions.model_validate_json((p.root / "edit.json").read_text(encoding="utf-8"))
        # só o drop do copywriter: filler_candidates são sugestões ("é" também é o verbo "ser")
        drop = {i for a, b in ed.drop for i in range(a, b + 1)}
        segs = plan_segments(words, drop, {v["clean"]: v["duration"] for v in vids}, r.pacing.max_gap, r.pacing.pad)
        out_words = remap_words(words, drop, segs)
    else:
        segs = [{"src": v["clean"], "in": 0, "out": v["duration"]} for v in vids]
        out_words = []
    _write_json(p.analysis / "words.out.json", [x.model_dump() for x in out_words])
    Timeline(width=w, height=h, segments=segs,
             captions=r.captions.enabled and r.mode == "speech").dump(p.root / "timeline.base.json")


def designer(ctx):
    p = ctx.project
    render.init_composition(p, ctx.recipe.aspect)
    assets = p.comp / "assets"  # flat: compose.py emite todo src de mídia como assets/<basename>
    assets.mkdir(exist_ok=True)
    for v in p.manifest()["videos"]:
        shutil.copy2(p.root / v["clean"], assets / Path(v["clean"]).name)
    ua = p.root / "user-assets"
    if ua.exists():
        for a in ua.iterdir():
            shutil.copy2(a, assets / a.name)
    ctx.agent("designer", p, ctx.recipe, "Entregue style.json e as composições." + _fb(p),
              p.root / "style.json", validate_model(Style), bash=True)


def _validate_timeline(ctx):
    p, r = ctx.project, ctx.recipe

    def v(path: Path) -> None:
        t = Timeline.load(path)
        if r.mode == "speech" and t.segments != Timeline.load(p.root / "timeline.base.json").segments:
            raise ValueError("não altere segments (copie de timeline.base.json)")
        comp = p.comp.resolve()
        media_srcs = [s.src for s in t.segments] + [b.src for b in t.broll] + [s.src for s in t.sfx] + \
                     ([t.music.src] if t.music else [])
        missing = [x for x in media_srcs if not (comp / "assets" / Path(x).name).is_file()]
        missing += [o.src for o in t.overlays
                    if not (comp / o.src).resolve().is_relative_to(comp) or not (comp / o.src).is_file()]
        if missing:
            raise ValueError(f"arquivos inexistentes em composition/ (mídia vai em composition/assets/, "
                             f"overlays em composition/compositions/): {missing}")
    return v


def editor(ctx):
    ctx.agent("editor", ctx.project, ctx.recipe, "Escreva timeline.json." + _fb(ctx.project),
              ctx.project.root / "timeline.json", _validate_timeline(ctx), bash=True)


def _silent(p: Project) -> frozenset[str]:
    return frozenset(Path(v["clean"]).name for v in p.manifest()["videos"] if not v["has_audio"])


def _has_audio(p: Project, t: Timeline) -> bool:
    silent = _silent(p)
    return bool(t.music or t.sfx or any(Path(s.src).name not in silent for s in t.segments))


def _compose(p: Project, t: Timeline) -> None:
    write_composition(p.comp, t, _words(p, "words.out.json"), _silent(p))
    render.apply_grading(p.comp, t.grading)  # write_composition regenera o index.html: sempre depois dele


def _review_times(t: Timeline) -> list[float]:
    cuts, off = [], 0.0
    for s in t.segments[:3]:
        off += s.dur
        cuts.append(off - 0.2)
    raw = [*(o.start + 0.3 for o in t.overlays), *cuts, t.duration - 0.5]
    return sorted({round(min(max(x, 0.0), max(t.duration - 0.05, 0.0)), 2) for x in raw})


def _backups(p: Project) -> list[Path]:
    return sorted((d for d in (p.analysis / "review").glob("*/") if (d / "timeline.bak.json").exists()),
                  key=lambda d: int(d.name) if d.name.isdigit() else -1)


def _restore(p: Project, rdir: Path) -> None:
    shutil.copy2(rdir / "timeline.bak.json", p.root / "timeline.json")
    shutil.rmtree(p.comp / "compositions", ignore_errors=True)
    shutil.copytree(rdir / "compositions.bak", p.comp / "compositions", dirs_exist_ok=True)


def _drop_backup(rdir: Path) -> None:
    (rdir / "timeline.bak.json").unlink(missing_ok=True)
    shutil.rmtree(rdir / "compositions.bak", ignore_errors=True)


def do_render(ctx):
    p, r = ctx.project, ctx.recipe
    timeline = p.root / "timeline.json"
    # Consumidores devem tratar out/review.json como o marcador de "render pronto": final.mp4/cover.jpg velhos
    # (render anterior, antes de um reject) somem aqui para nunca serem confundidos com a saída desta rodada.
    (p.out / "final.mp4").unlink(missing_ok=True)
    (p.out / "cover.jpg").unlink(missing_ok=True)
    # backup restante = rodada de revisão interrompida (kill): volta ao estado anterior a ela, que era válido
    leftover = _backups(p)
    if leftover:
        _restore(p, leftover[-1])
        _drop_backup(leftover[-1])
    _validate_timeline(ctx)(timeline)  # job retomado nunca renderiza um timeline inválido
    t = Timeline.load(timeline)
    _compose(p, t)
    issues = render.check(p.comp, r.aspect)
    for n in range(REVIEW_ROUNDS):
        if not issues:
            break
        rdir = p.analysis / "review" / str(n)
        pngs = render.snapshots(p.comp, _review_times(t), rdir)
        # backup: um review que falha não pode deixar timeline.json/composições inválidos para o render
        # timeline.bak.json é o marcador de backup completo: grava por último (kill no meio = sem backup)
        shutil.rmtree(rdir / "compositions.bak", ignore_errors=True)
        shutil.copytree(p.comp / "compositions", rdir / "compositions.bak")
        shutil.copy2(timeline, rdir / "timeline.bak.part")
        (rdir / "timeline.bak.part").replace(rdir / "timeline.bak.json")
        try:
            ctx.agent("editor", p, r,
                      "REVIEW: corrija os problemas abaixo editando timeline.json e/ou composition/compositions/*.html.\n"
                      "Correções de legenda vão em composition/compositions/captions.template.html "
                      "(captions.html é gerado a partir dele a cada recomposição); mantenha o marcador "
                      "/*AV_WORDS*/[] nesse arquivo.\n"
                      "Sempre reescreva timeline.json ao final, mesmo que sem mudanças.\n"
                      f"Problemas: {json.dumps(issues, ensure_ascii=False)}\n"
                      f"Frames para inspecionar: {[_rel(p, x) for x in pngs]}",
                      timeline, _validate_timeline(ctx), bash=True)
            new_t = Timeline.load(timeline)
            _compose(p, new_t)
            new_issues = render.check(p.comp, r.aspect)
        except BaseException as e:  # noqa: BLE001 — revisão é best-effort: restaura e renderiza o que já era válido
            _restore(p, rdir)
            _drop_backup(rdir)
            p.log({"role": "editor", "review_round": n, "is_error": True,
                   "result": f"revisão revertida: {type(e).__name__}: {e}"[:500]})
            if not isinstance(e, Exception):
                raise  # interrupção: o próximo start recompõe a partir do estado restaurado
            _compose(p, t)  # index.html/captions.html de volta ao estado do timeline restaurado
            break
        _drop_backup(rdir)
        t, issues = new_t, new_issues
    final = p.out / "final.mp4"
    lufs = render.render_final(p.comp, final, r.audio.lufs if _has_audio(p, t) else None)
    render.make_cover(final, min(1.0, t.duration / 2), p.out / "cover.jpg")
    # por último: é o artefato da etapa, então uma morte antes dele refaz o render no resume
    _write_json(p.out / "review.json", {"issues_restantes": issues, "lufs": lufs}, indent=2)


def post(ctx):
    ed = json.loads((ctx.project.root / "edit.json").read_text(encoding="utf-8"))
    _write_json(ctx.project.out / "post.json", ed["post"], indent=2)


STAGES = [
    ("ingest", "input/manifest.json", ingest),
    ("clean", "input/clean.ok", clean),
    ("transcribe", "analysis/words.json", do_transcribe),
    ("analyze", "analysis/summary.json", analyze),
    ("director", "brief.md", director),
    ("gate1", "approvals/gate1.ok", None),
    ("copywriter", "edit.json", copywriter),
    ("plan", "timeline.base.json", plan),
    ("designer", "style.json", designer),
    ("editor", "timeline.json", editor),
    ("render", "out/review.json", do_render),
    ("gate2", "approvals/gate2.ok", None),
    ("post", "out/post.json", post),
]
