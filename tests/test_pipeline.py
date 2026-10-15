import json
from pathlib import Path
import pytest
from conftest import needs_ffmpeg
from autovideo import cli, doctor, hf, pipeline
from autovideo.hf import ToolError
from autovideo.jobs import Ctx, JobStore, run_job
from autovideo.project import Project
from autovideo.recipes import load_recipe
from autovideo.timeline import Timeline


# ---------- helpers ----------
def fake_run_role(role, project, recipe, task, output, validate=None, bash=False):
    r = project.root
    if role == "director":
        output.write_text("# Intenção\nteste", encoding="utf-8")
    elif role == "copywriter":
        output.write_text(json.dumps({"drop": [], "hook_text": "teste", "post":
                          {"title": "t", "caption": "c", "hashtags": ["#t"]}}), encoding="utf-8")
    elif role == "designer":
        (r / "composition/compositions/captions.template.html").write_text(
            '<!doctype html><html><body><div data-composition-id="cap" data-width="1080" data-height="1920">'
            '</div><script>const WORDS = /*AV_WORDS*/[];window.__timelines=window.__timelines||{};'
            'window.__timelines["cap"]=gsap.timeline({paused:true});</script></body></html>', encoding="utf-8")
        output.write_text(json.dumps({"palette": ["#fff"], "fonts": ["Inter"], "caption_component": "x"}), encoding="utf-8")
    elif role == "editor":
        base = json.loads((r / "timeline.base.json").read_text(encoding="utf-8"))
        output.write_text(json.dumps(base), encoding="utf-8")
    if validate:
        validate(output)


def seg(src, a, b):
    return {"src": src, "in": a, "out": b}


def mk_project(tmp_path, recipe="talking-head-punchy", agent=None):
    """Projeto com ingest/transcribe prontos: 1 vídeo clean de 10 s, 6 palavras (índice 2 é o filler 'ahn')."""
    root = tmp_path / "proj ç"
    p = Project(root)
    vids = [{"raw": "input/raw/a.mp4", "clean": "input/a.clean.mp4", "duration": 10.0, "has_audio": True}]
    p.save_manifest({"videos": vids, "aspect": "9:16"})
    words = [{"text": t, "start": s, "end": s + 0.4, "src": "input/a.clean.mp4"}
             for t, s in [("oi", 1.0), ("pessoal", 1.5), ("ahn", 2.0), ("hoje", 5.0), ("vamos", 5.5), ("lá", 6.0)]]
    (p.analysis).mkdir()
    (p.analysis / "words.json").write_text(json.dumps(words), encoding="utf-8")
    return Ctx(project=p, recipe=load_recipe(recipe), job={}, agent=agent)


# ---------- estrutura ----------
def test_stage_order_and_artifacts():
    assert [(n, a) for n, a, _ in pipeline.STAGES] == [
        ("ingest", "input/manifest.json"), ("clean", "input/clean.ok"), ("transcribe", "analysis/words.json"),
        ("analyze", "analysis/summary.json"), ("director", "brief.md"), ("gate1", "approvals/gate1.ok"),
        ("copywriter", "edit.json"), ("plan", "timeline.base.json"), ("designer", "style.json"),
        ("editor", "timeline.json"), ("render", "out/review.json"), ("gate2", "approvals/gate2.ok"),
        ("post", "out/post.json")]
    assert [n for n, _, f in pipeline.STAGES if f is None] == ["gate1", "gate2"]


def test_redo_map_targets_existing_stages_before_their_gate():
    names = [n for n, _, _ in pipeline.STAGES]
    for gate, start in pipeline.REDO.items():
        assert names.index(start) < names.index(gate)
    assert pipeline.REDO == {"gate1": "director", "gate2": "copywriter"}


def test_home_from_env(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "h"))
    assert pipeline.home() == tmp_path / "h"


def test_home_default_is_outside_repo_and_onedrive(monkeypatch, tmp_path):
    import sys
    monkeypatch.delenv("AUTOVIDEO_HOME", raising=False)
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "lad"))
    monkeypatch.setattr(sys, "platform", "win32")
    assert pipeline.home() == tmp_path / "lad" / "AutoVideo" / "projects"
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    monkeypatch.setattr(Path, "home", lambda: tmp_path / "u")
    assert pipeline.home() == tmp_path / "u" / ".local" / "share" / "autovideo" / "projects"


def test_doctor_prints_home(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "h"))
    monkeypatch.setattr(hf, "run", lambda *a, **k: (_ for _ in ()).throw(ToolError("x")))
    res = {n: (ok, info) for n, ok, info in doctor.run_checks()}
    assert res["AUTOVIDEO_HOME"] == (True, str(tmp_path / "h"))


# ---------- new_job ----------
def test_new_job_unique_dir_same_second(tmp_path, monkeypatch):
    monkeypatch.setattr(pipeline.time, "strftime", lambda fmt: "20261014-101010")
    store = JobStore(tmp_path / "jobs.db")
    v = tmp_path / "Meu Vídeo.mp4"
    v.write_bytes(b"x")
    j1 = pipeline.new_job(store, tmp_path / "projects", [v], None, "montage-beat", auto=True)
    j2 = pipeline.new_job(store, tmp_path / "projects", [v], None, "montage-beat", auto=True)
    j3 = pipeline.new_job(store, tmp_path / "projects", [v], None, "montage-beat", auto=True)
    dirs = [Path(store.get(j)["project_dir"]).name for j in (j1, j2, j3)]
    assert dirs == ["20261014-101010-meu-v-deo", "20261014-101010-meu-v-deo-2", "20261014-101010-meu-v-deo-3"]
    for j in (j1, j2, j3):
        assert (Path(store.get(j)["project_dir"]) / "input/raw/Meu Vídeo.mp4").read_bytes() == b"x"


def test_new_job_copies_script_and_assets_and_rejects_clashes(tmp_path):
    store = JobStore(tmp_path / "jobs.db")
    v, s, a = tmp_path / "a.mp4", tmp_path / "s.md", tmp_path / "logo.png"
    for f in (v, s, a):
        f.write_bytes(b"x")
    root = Path(store.get(pipeline.new_job(store, tmp_path, [v], s, "montage-beat", False, [a]))["project_dir"])
    assert (root / "script.md").exists() and (root / "user-assets/logo.png").exists()
    clash = tmp_path / "x" / "a.clean.mp4"
    clash.parent.mkdir()
    clash.write_bytes(b"x")
    with pytest.raises(ValueError, match="mesmo nome"):
        pipeline.new_job(store, tmp_path, [v], None, "montage-beat", False, [clash])
    with pytest.raises(KeyError, match="não existe"):
        pipeline.new_job(store, tmp_path, [v], None, "nao-existe", False)


def test_new_job_rejects_case_and_extension_clashes(tmp_path):
    store = JobStore(tmp_path / "jobs.db")

    def mk(d, n):
        (tmp_path / d).mkdir(exist_ok=True)
        (tmp_path / d / n).write_bytes(b"x")
        return tmp_path / d / n
    with pytest.raises(ValueError, match="após a limpeza"):  # a.mp4 + a.mov -> a.clean.mp4
        pipeline.new_job(store, tmp_path, [mk("1", "a.mp4"), mk("2", "a.mov")], None, "montage-beat", False)
    with pytest.raises(ValueError, match="repetidos"):  # NTFS: A.mp4 == a.mp4
        pipeline.new_job(store, tmp_path, [mk("3", "A.mp4"), mk("4", "a.mp4")], None, "montage-beat", False)
    with pytest.raises(ValueError, match="assets"):
        pipeline.new_job(store, tmp_path, [mk("5", "v.mp4")], None, "montage-beat", False,
                         [mk("6", "Logo.png"), mk("7", "logo.PNG")])
    with pytest.raises(ValueError, match="asset com o mesmo nome"):
        pipeline.new_job(store, tmp_path, [mk("8", "v.mp4")], None, "montage-beat", False, [mk("9", "V.CLEAN.mp4")])
    assert store.list() == [] and not list(tmp_path.glob("20*"))  # nada criado


def test_new_job_requires_existing_inputs_before_creating_anything(tmp_path):
    store = JobStore(tmp_path / "jobs.db")
    v = tmp_path / "v.mp4"
    v.write_bytes(b"x")
    for kw in ({"videos": [tmp_path / "falta.mp4"]}, {"script": tmp_path / "falta.md"},
               {"assets": [tmp_path / "falta.png"]}, {"videos": []}):
        args = {"videos": [v], "script": None, "assets": None, **kw}
        with pytest.raises(ValueError, match="não encontrado|nenhum vídeo"):
            pipeline.new_job(store, tmp_path / "h", args["videos"], args["script"], "montage-beat", False, args["assets"])
    assert not (tmp_path / "h").exists() and store.list() == []


def test_cli_edit_missing_file_is_clean_error(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "h"))
    assert cli.main(["edit", str(tmp_path / "falta.mp4"), "--recipe", "montage-beat"]) == 1
    err = capsys.readouterr().err
    assert err.startswith("erro:") and "falta.mp4" in err and "Traceback" not in err


# ---------- plan ----------
def test_plan_speech_drops_edit_ranges_and_fillers(tmp_path):
    ctx = mk_project(tmp_path)
    p = ctx.project
    (p.root / "edit.json").write_text(json.dumps({"drop": [[4, 4]], "hook_text": "h", "post":
                                      {"title": "t", "caption": "c", "hashtags": []}}), encoding="utf-8")
    pipeline.plan(ctx)
    t = Timeline.load(p.root / "timeline.base.json")
    assert (t.width, t.height, t.captions) == (1080, 1920, True)
    assert {s.src for s in t.segments} == {"input/a.clean.mp4"} and len(t.segments) == 3
    words_out = json.loads((p.analysis / "words.out.json").read_text(encoding="utf-8"))
    # só o drop do copywriter cai: "ahn" (filler_candidate) fica, quem decide é o copywriter
    assert [w["text"] for w in words_out] == ["oi", "pessoal", "ahn", "hoje", "lá"]
    assert all(w["src"] == "out" for w in words_out) and words_out[-1]["end"] <= t.duration + 0.01


def test_plan_keeps_verb_e_not_in_drop(tmp_path):
    ctx = mk_project(tmp_path)
    p = ctx.project
    words = json.loads((p.analysis / "words.json").read_text(encoding="utf-8"))
    words[2]["text"] = "é"  # "oi pessoal é hoje": verbo, não hesitação
    (p.analysis / "words.json").write_text(json.dumps(words), encoding="utf-8")
    (p.root / "edit.json").write_text(json.dumps({"drop": [], "hook_text": "h", "post":
                                      {"title": "t", "caption": "c", "hashtags": []}}), encoding="utf-8")
    pipeline.plan(ctx)
    words_out = json.loads((p.analysis / "words.out.json").read_text(encoding="utf-8"))
    assert "é" in [w["text"] for w in words_out]


def test_plan_montage_one_full_segment_per_clean(tmp_path):
    ctx = mk_project(tmp_path, "montage-beat")
    pipeline.plan(ctx)
    t = Timeline.load(ctx.project.root / "timeline.base.json")
    assert [(s.src, s.in_, s.out) for s in t.segments] == [("input/a.clean.mp4", 0, 10.0)] and t.captions is False
    assert json.loads((ctx.project.analysis / "words.out.json").read_text(encoding="utf-8")) == []


# ---------- validação do timeline.json ----------
def _timeline(ctx, **extra):
    base = json.loads((ctx.project.root / "timeline.base.json").read_text(encoding="utf-8"))
    path = ctx.project.root / "timeline.json"
    path.write_text(json.dumps({**base, **extra}), encoding="utf-8")
    return path


def test_validate_timeline_rules(tmp_path):
    ctx = mk_project(tmp_path)
    p = ctx.project
    (p.root / "edit.json").write_text(json.dumps({"drop": [], "hook_text": "h", "post":
                                      {"title": "t", "caption": "c", "hashtags": []}}), encoding="utf-8")
    pipeline.plan(ctx)
    (p.comp / "assets").mkdir(parents=True)
    (p.comp / "compositions").mkdir()
    for f in ("assets/a.clean.mp4", "assets/boom.wav", "assets/b.mp4", "assets/m.mp3", "compositions/hook.html"):
        (p.comp / f).write_bytes(b"x")
    validate = pipeline._validate_timeline(ctx)
    validate(_timeline(ctx))
    validate(_timeline(ctx, overlays=[{"start": 0, "dur": 1, "src": "compositions/hook.html"}],
                       sfx=[{"at": 0.5, "src": "assets/boom.wav"}], broll=[{"start": 0, "dur": 1, "src": "assets/b.mp4"}],
                       music={"src": "assets/m.mp3"}))
    # sfx/music/broll são resolvidos como compose.py os emite: assets/<basename>
    validate(_timeline(ctx, sfx=[{"at": 0.5, "src": "boom.wav"}]))
    with pytest.raises(ValueError, match="não altere segments"):
        validate(_timeline(ctx, segments=[seg("input/a.clean.mp4", 0, 1)]))
    for bad in ({"sfx": [{"at": 0.5, "src": "assets/sfx/nope.wav"}]},
                {"music": {"src": "assets/nope.mp3"}},
                {"broll": [{"start": 0, "dur": 1, "src": "assets/nope.mp4"}]},
                {"overlays": [{"start": 0, "dur": 1, "src": "compositions/nope.html"}]},
                {"overlays": [{"start": 0, "dur": 1, "src": "../input/manifest.json"}]}):
        with pytest.raises(ValueError, match="inexistentes"):
            validate(_timeline(ctx, **bad))


def test_validate_timeline_montage_may_define_segments_but_needs_asset(tmp_path):
    ctx = mk_project(tmp_path, "montage-beat")
    pipeline.plan(ctx)
    (ctx.project.comp / "assets").mkdir(parents=True)
    validate = pipeline._validate_timeline(ctx)
    with pytest.raises(ValueError, match="inexistentes"):  # clean ainda não copiado pelo designer
        validate(_timeline(ctx, segments=[seg("input/a.clean.mp4", 1, 3)]))
    (ctx.project.comp / "assets/a.clean.mp4").write_bytes(b"x")
    validate(_timeline(ctx, segments=[seg("input/a.clean.mp4", 1, 3)]))


# ---------- render: loop de revisão ----------
def render_ready(ctx, timeline):
    """timeline.json + o que o _validate_timeline do início do render exige (assets/overlay) + words.out.json."""
    p = ctx.project
    (p.comp / "assets").mkdir(parents=True, exist_ok=True)
    (p.comp / "compositions").mkdir(exist_ok=True)
    (p.comp / "assets/a.clean.mp4").write_bytes(b"x")
    (p.comp / "compositions/h.html").write_text("ok", encoding="utf-8")
    (p.root / "timeline.json").write_text(json.dumps(timeline), encoding="utf-8")
    (p.analysis / "words.out.json").write_text("[]", encoding="utf-8")


def test_render_review_loop_orders_grading_and_snapshots(tmp_path, monkeypatch):
    calls = []
    agent_calls = []
    ctx = mk_project(tmp_path, "montage-beat", agent=lambda *a, **k: agent_calls.append((a, k)) or calls.append("agent"))
    p = ctx.project
    base = {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 10.0)],
            "grading": {"adjust": {"exposure": 0.1}}, "overlays": [{"start": 2, "dur": 1, "src": "compositions/h.html"}]}
    render_ready(ctx, base)
    issues = iter([[{"code": "x"}], [{"code": "y"}], [{"code": "z"}]])  # nunca limpa: para depois de 2 rodadas
    r = pipeline.render
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: calls.append("write"))
    monkeypatch.setattr(r, "apply_grading", lambda comp, g: calls.append(("grade", g)))
    monkeypatch.setattr(r, "check", lambda comp, aspect: calls.append("check") or next(issues))
    snaps = []

    def snapshots(comp, times, out_dir):
        snaps.append((times, out_dir))
        out_dir.mkdir(parents=True, exist_ok=True)
        return [out_dir / "f.png"]
    monkeypatch.setattr(r, "snapshots", snapshots)
    monkeypatch.setattr(r, "render_final", lambda comp, out, lufs: calls.append("final") or -14.2)
    covers = []
    monkeypatch.setattr(r, "make_cover", lambda video, at, out: covers.append(at))
    pipeline.do_render(ctx)
    g = ("grade", {"adjust": {"exposure": 0.1}})
    assert calls == ["write", g, "check", "agent", "write", g, "check", "agent", "write", g, "check", "final"]
    assert [d for _, d in snaps] == [p.analysis / "review" / "0", p.analysis / "review" / "1"]
    assert snaps[0][0] == [2.3, 9.5, 9.8]  # overlay+0.3, duração-0.5, fim do 1º corte (-0.2)
    assert covers == [1.0]
    review = json.loads((p.out / "review.json").read_text(encoding="utf-8"))
    assert review == {"issues_restantes": [{"code": "z"}], "lufs": -14.2}
    task = agent_calls[0][0][3]
    assert "Problemas" in task and "analysis/review/0/f.png" in task
    assert "Sempre reescreva timeline.json" in task and "captions.template.html" in task


def _failing_review_setup(tmp_path, monkeypatch, agent):
    ctx = mk_project(tmp_path, "montage-beat", agent=agent)
    good = {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 10.0)]}
    render_ready(ctx, good)
    (ctx.project.comp / "compositions/captions.template.html").write_text("bom", encoding="utf-8")
    r = pipeline.render
    composed = []
    monkeypatch.setattr(pipeline, "write_composition", lambda comp, t, *a: composed.append(t.duration))
    monkeypatch.setattr(r, "apply_grading", lambda *a: None)
    monkeypatch.setattr(r, "check", lambda *a: [{"code": "x"}])
    monkeypatch.setattr(r, "snapshots", lambda comp, times, d: d.mkdir(parents=True, exist_ok=True) or [])
    monkeypatch.setattr(r, "render_final", lambda *a: -14.0)
    monkeypatch.setattr(r, "make_cover", lambda *a: None)
    return ctx, good, composed


def test_failed_review_restores_timeline_and_compositions_and_still_renders(tmp_path, monkeypatch):
    def breaking_agent(role, project, recipe, task, output, validate=None, bash=False):
        output.write_text("{lixo", encoding="utf-8")  # timeline inválido
        (project.comp / "compositions/captions.template.html").write_text("quebrado", encoding="utf-8")
        raise RuntimeError("agente falhou")
    ctx, good, composed = _failing_review_setup(tmp_path, monkeypatch, breaking_agent)
    p = ctx.project
    pipeline.do_render(ctx)
    assert json.loads((p.root / "timeline.json").read_text(encoding="utf-8")) == good
    assert (p.comp / "compositions/captions.template.html").read_text(encoding="utf-8") == "bom"
    assert json.loads((p.out / "review.json").read_text(encoding="utf-8")) == {
        "issues_restantes": [{"code": "x"}], "lufs": -14.0}
    assert composed == [10.0, 10.0]  # recomposto a partir do timeline restaurado; sem 2ª rodada
    assert "revisão revertida" in (p.root / "decisions.log").read_text(encoding="utf-8")


def test_render_refuses_invalid_timeline_at_start(tmp_path, monkeypatch):
    ctx, _, composed = _failing_review_setup(tmp_path, monkeypatch, lambda *a, **k: pytest.fail("não chega ao agente"))
    (ctx.project.root / "timeline.json").write_text(json.dumps(
        {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 1)],
         "sfx": [{"at": 0, "src": "assets/nao-existe.wav"}]}), encoding="utf-8")
    with pytest.raises(ValueError, match="inexistentes"):
        pipeline.do_render(ctx)
    assert composed == [] and not (ctx.project.out / "review.json").exists()


def test_render_clean_check_skips_agent_and_clamps_cover(tmp_path, monkeypatch):
    ctx = mk_project(tmp_path, "montage-beat", agent=lambda *a, **k: pytest.fail("sem issues, sem agente"))
    p = ctx.project
    render_ready(ctx, {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 0.6)]})
    r = pipeline.render
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: None)
    monkeypatch.setattr(r, "check", lambda *a: [])
    monkeypatch.setattr(r, "render_final", lambda *a: -14.0)
    covers = []
    monkeypatch.setattr(r, "make_cover", lambda video, at, out: covers.append(at))
    pipeline.do_render(ctx)
    assert covers == [pytest.approx(0.3)]


def test_render_without_any_audio_skips_loudness(tmp_path, monkeypatch):
    ctx = mk_project(tmp_path, "montage-beat")
    p = ctx.project
    m = p.manifest()
    m["videos"][0]["has_audio"] = False
    p.save_manifest(m)
    render_ready(ctx, {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 2)]})
    r, seen, html = pipeline.render, [], {}
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: html.update(silent=a[3]))
    monkeypatch.setattr(r, "check", lambda *a: [])
    monkeypatch.setattr(r, "render_final", lambda comp, out, lufs: seen.append(lufs))
    monkeypatch.setattr(r, "make_cover", lambda *a: None)
    pipeline.do_render(ctx)
    assert seen == [None] and html["silent"] == {"a.clean.mp4"}
    assert json.loads((p.out / "review.json").read_text(encoding="utf-8"))["lufs"] is None


def _real_compose_setup(tmp_path, monkeypatch, agent):
    """Como _failing_review_setup, mas com o write_composition real (captions=True exige o marcador AV_WORDS)."""
    ctx, good, _ = _failing_review_setup(tmp_path, monkeypatch, agent)
    monkeypatch.undo()  # volta o write_composition real; refaz só o resto
    good = {**good, "captions": True}
    render_ready(ctx, good)
    tpl = ctx.project.comp / "compositions/captions.template.html"
    tpl.write_text("<script>const WORDS = /*AV_WORDS*/[];</script>", encoding="utf-8")
    r = pipeline.render
    monkeypatch.setattr(r, "apply_grading", lambda *a: None)
    monkeypatch.setattr(r, "check", lambda *a: [{"code": "x"}])
    monkeypatch.setattr(r, "snapshots", lambda comp, times, d: d.mkdir(parents=True, exist_ok=True) or [])
    monkeypatch.setattr(r, "render_final", lambda *a: -14.0)
    monkeypatch.setattr(r, "make_cover", lambda *a: None)
    return ctx, good, tpl


def test_review_that_breaks_compose_is_restored(tmp_path, monkeypatch):
    def agent(role, project, recipe, task, output, validate=None, bash=False):
        assert "/*AV_WORDS*/[]" in task
        output.write_text((project.root / "timeline.json").read_text(encoding="utf-8"), encoding="utf-8")  # válido
        (project.comp / "compositions/captions.template.html").write_text("sem marcador", encoding="utf-8")
    ctx, good, tpl = _real_compose_setup(tmp_path, monkeypatch, agent)
    pipeline.do_render(ctx)
    p = ctx.project
    assert "/*AV_WORDS*/" in tpl.read_text(encoding="utf-8")
    assert "const WORDS = [];" in (p.comp / "compositions/captions.html").read_text(encoding="utf-8")  # recomposto
    assert json.loads((p.root / "timeline.json").read_text(encoding="utf-8")) == good
    assert (p.out / "review.json").exists()
    assert "ComposeError" in (p.root / "decisions.log").read_text(encoding="utf-8")
    assert not list((p.analysis / "review").glob("*/timeline.bak.json"))  # backup consumido


def test_interrupted_review_restores_then_reraises(tmp_path, monkeypatch):
    def agent(role, project, recipe, task, output, validate=None, bash=False):
        output.write_text("{lixo", encoding="utf-8")
        raise KeyboardInterrupt
    ctx, good, composed = _failing_review_setup(tmp_path, monkeypatch, agent)
    p = ctx.project
    with pytest.raises(KeyboardInterrupt):
        pipeline.do_render(ctx)
    assert json.loads((p.root / "timeline.json").read_text(encoding="utf-8")) == good
    assert composed == [10.0] and not (p.out / "review.json").exists()  # não recompôs na interrupção


def test_resume_restores_leftover_review_backup(tmp_path, monkeypatch):
    ctx, good, composed = _failing_review_setup(tmp_path, monkeypatch, lambda *a, **k: pytest.fail("sem issues"))
    monkeypatch.setattr(pipeline.render, "check", lambda *a: [])
    p = ctx.project
    rdir = p.analysis / "review" / "0"  # rodada morta no meio: backup bom + timeline/HTML quebrados
    (rdir / "compositions.bak").mkdir(parents=True)
    (rdir / "compositions.bak/captions.template.html").write_text("bom", encoding="utf-8")
    (rdir / "timeline.bak.json").write_text(json.dumps(good), encoding="utf-8")
    (p.root / "timeline.json").write_text("{lixo", encoding="utf-8")
    (p.comp / "compositions/captions.template.html").write_text("meio editado", encoding="utf-8")
    pipeline.do_render(ctx)
    assert json.loads((p.root / "timeline.json").read_text(encoding="utf-8")) == good
    assert (p.comp / "compositions/captions.template.html").read_text(encoding="utf-8") == "bom"
    assert (p.out / "review.json").exists() and not (rdir / "timeline.bak.json").exists()


def test_rerender_starts_without_stale_final_and_cover(tmp_path, monkeypatch):
    ctx, _, _ = _failing_review_setup(tmp_path, monkeypatch, lambda *a, **k: None)
    p = ctx.project
    monkeypatch.setattr(pipeline.render, "check", lambda *a: [])
    p.out.mkdir()
    (p.out / "final.mp4").write_bytes(b"velho")
    (p.out / "cover.jpg").write_bytes(b"velho")
    seen = []
    monkeypatch.setattr(pipeline.render, "render_final", lambda comp, out, lufs: seen.append(out.exists()) or -14.0)
    pipeline.do_render(ctx)
    assert seen == [False] and not (p.out / "cover.jpg").exists()  # make_cover é falso: nada novo, nada velho


def test_render_refuses_speech_timeline_with_changed_segments(tmp_path, monkeypatch):
    ctx = mk_project(tmp_path)
    p = ctx.project
    (p.root / "edit.json").write_text(json.dumps({"drop": [], "hook_text": "h", "post":
                                      {"title": "t", "caption": "c", "hashtags": []}}), encoding="utf-8")
    pipeline.plan(ctx)
    (p.comp / "assets").mkdir(parents=True)
    (p.comp / "assets/a.clean.mp4").write_bytes(b"x")
    _timeline(ctx, segments=[seg("input/a.clean.mp4", 0, 1)])
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: pytest.fail("não deve compor"))
    with pytest.raises(ValueError, match="não altere segments"):
        pipeline.do_render(ctx)


def test_review_times_clamped_and_sorted(tmp_path):
    t = Timeline(width=1, height=1, segments=[seg("a", 0, 0.3)], overlays=[{"start": 0.2, "dur": 0.1, "src": "c/h.html"}])
    assert pipeline._review_times(t) == [0.0, 0.1, 0.25]  # tudo dentro de [0, duração]


# ---------- CLI ----------
def _gate_job(tmp_path, monkeypatch, stage="gate1"):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    v = tmp_path / "a.mp4"
    v.write_bytes(b"x")
    jid = pipeline.new_job(store, tmp_path, [v], None, "talking-head-punchy", auto=False)
    root = Path(store.get(jid)["project_dir"])
    names = [n for n, _, _ in pipeline.STAGES]
    for n, rel, f in pipeline.STAGES[: names.index(stage) + 1]:
        if f is not None or n != stage:
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(n)
            (root / ".stages" / f"{n}.ok").write_text("ok")
    store.set(jid, status="awaiting_approval", stage=stage)
    return store, jid, root


def _reject(tmp_path, monkeypatch, stage):
    store, jid, root = _gate_job(tmp_path, monkeypatch, stage)
    import autovideo.jobs as jobs
    monkeypatch.setattr(jobs, "run_job", lambda *a, **k: "awaiting_approval")  # só o reject é o alvo
    assert cli.main(["reject", str(jid), "mais ritmo"]) == 0
    assert "mais ritmo" in (root / "feedback.md").read_text(encoding="utf-8")
    return store, jid, root


def test_cli_reject_gate1_redoes_only_director(tmp_path, monkeypatch):
    store, jid, root = _reject(tmp_path, monkeypatch, "gate1")
    for kept in ("input/manifest.json", "input/clean.ok", "analysis/words.json", "analysis/summary.json"):
        assert (root / kept).exists(), kept
    # a CLI reivindica o job antes de rodar (run_job está stubado, então fica in_progress)
    assert not (root / "brief.md").exists() and store.get(jid)["status"] == "in_progress"


def test_cli_reject_gate2_redoes_copywriter_onwards(tmp_path, monkeypatch):
    _, _, root = _reject(tmp_path, monkeypatch, "gate2")
    for gone in ("edit.json", "timeline.base.json", "style.json", "timeline.json", "out/review.json"):
        assert not (root / gone).exists(), gone
    assert sorted(m.stem for m in (root / ".stages").iterdir()) == sorted(
        ["ingest", "clean", "transcribe", "analyze", "director", "gate1"])
    for kept in ("brief.md", "approvals/gate1.ok", "analysis/summary.json", "input/clean.ok"):
        assert (root / kept).exists(), kept


def test_cli_gate_error_is_clean_message(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create(str(tmp_path / "p"), "talking-head-punchy", False)
    store.set(jid, status="in_progress", stage="clean")
    for argv in (["approve", str(jid)], ["reject", str(jid), "fb"], ["approve", "99"]):
        assert cli.main(argv) == 1
        err = capsys.readouterr().err
        assert err.startswith("erro:") and "Traceback" not in err
    assert store.get(jid)["status"] == "in_progress"  # nada foi mexido


def test_cli_resume_fails_stale_and_claims_failed_but_approve_does_not(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    mk = lambda n: store.create(str(tmp_path / f"p{n}"), "talking-head-punchy", False)  # um diretório por job
    live, gate, dead = mk(1), mk(2), mk(3)
    store.set(live, status="in_progress", stage="clean")
    store.set(dead, status="in_progress", stage="clean")
    store.set(gate, status="awaiting_approval", stage="gate1")
    monkeypatch.setattr(pipeline, "STAGES", [("gate1", "approvals/gate1.ok", None)])
    monkeypatch.setattr(pipeline, "make_ctx", lambda job: Ctx(Project(Path(job["project_dir"])), None, job, None))
    assert cli.main(["approve", str(gate)]) == 0
    assert store.get(live)["status"] == "in_progress"  # approve não mexe em jobs de outro processo
    assert cli.main(["resume", str(dead)]) == 0
    assert store.get(dead)["status"] == "awaiting_approval"
    assert store.get(live)["status"] == "failed" and store.get(live)["error"] == "interrompido"  # não volta à fila
    assert (tmp_path / "p2/approvals/gate1.ok").exists() and not (tmp_path / "p1/approvals/gate1.ok").exists()


# ---------- doctor ----------
def test_doctor_parakeet(monkeypatch):
    from types import SimpleNamespace
    out = lambda models: SimpleNamespace(stdout=json.dumps({"ok": True, "models": models}) + "\n")
    monkeypatch.setattr(hf, "run", lambda *a, **k: out([{"engine": "parakeet", "model": "m", "installed": True}]))
    assert doctor.parakeet() == "m"
    monkeypatch.setattr(hf, "run", lambda *a, **k: out([{"engine": "parakeet", "model": "m", "installed": False}]))
    with pytest.raises(ToolError, match="models install parakeet"):
        doctor.parakeet()


# ---------- ponta a ponta ----------
@needs_ffmpeg
def test_speech_recipe_without_speech_fails_clearly(media_dir, tmp_path, monkeypatch):   # Review Focus 1
    monkeypatch.setattr("autovideo.pipeline.transcribe", lambda *a, **k: [])
    store = JobStore(tmp_path / "jobs.db")
    jid = pipeline.new_job(store, tmp_path, [media_dir / "talk.mp4"], None, "talking-head-punchy", auto=True)
    assert run_job(store, jid, pipeline.STAGES, pipeline.make_ctx) == "failed"
    assert "montage-beat" in store.get(jid)["error"]


@needs_ffmpeg
@pytest.mark.usefixtures("slow")
def test_montage_end_to_end_with_fake_agents(media_dir, tmp_path, monkeypatch):
    monkeypatch.setattr(pipeline.agents, "run_role", fake_run_role)
    store = JobStore(tmp_path / "jobs.db")
    jid = pipeline.new_job(store, tmp_path, [media_dir / "scenes.mp4"], None, "montage-beat", auto=True)
    assert run_job(store, jid, pipeline.STAGES, pipeline.make_ctx) == "completed", store.get(jid)["error"]
    root = Path(store.get(jid)["project_dir"])
    assert (root / "out/final.mp4").exists() and (root / "out/cover.jpg").exists()
    assert json.loads((root / "out/post.json").read_text(encoding="utf-8"))["title"] == "t"



def test_kill_while_backing_up_leaves_no_marker_and_resume_keeps_good_state(tmp_path, monkeypatch):
    ctx, good, composed = _failing_review_setup(tmp_path, monkeypatch, lambda *a, **k: pytest.fail("não chega"))
    p = ctx.project
    real = pipeline.shutil.copytree
    def dies(src, dst, **k):
        if Path(dst).name == "compositions.bak":
            raise KeyboardInterrupt  # kill no meio da cópia do backup
        return real(src, dst, **k)
    monkeypatch.setattr(pipeline.shutil, "copytree", dies)
    with pytest.raises(KeyboardInterrupt):
        pipeline.do_render(ctx)
    assert not (p.analysis / "review/0/timeline.bak.json").exists()
    monkeypatch.setattr(pipeline.shutil, "copytree", real)
    monkeypatch.setattr(pipeline.render, "check", lambda *a: [])
    pipeline.do_render(ctx)  # resume: nada a restaurar, composições boas intactas
    assert (p.comp / "compositions/captions.template.html").read_text(encoding="utf-8") == "bom"
    assert json.loads((p.root / "timeline.json").read_text(encoding="utf-8")) == good


def test_copywriter_task_says_fillers_are_suggestions(tmp_path):
    seen = []
    ctx = mk_project(tmp_path, agent=lambda role, p, r, task, *a, **k: seen.append(task))
    pipeline.copywriter(ctx)
    assert "só sugestões" in seen[0] and 'nunca remova o verbo "é"' in seen[0]
    assert 'Nunca remova o verbo "é"' in (pipeline.agents.PROMPTS / "copywriter.md").read_text(encoding="utf-8")


def test_cli_only_resume_claims_failed_jobs(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create(str(tmp_path / "p"), "talking-head-punchy", False)
    store.set(jid, status="failed", stage="gate1", error="x")
    monkeypatch.setattr(pipeline, "STAGES", [("gate1", "approvals/gate1.ok", None)])
    monkeypatch.setattr(pipeline, "make_ctx", lambda job: Ctx(Project(Path(job["project_dir"])), None, job, None))
    assert cli.main(["approve", str(jid)]) == 1  # approve num job failed: erro limpo, nada roda
    assert store.get(jid)["status"] == "failed"
    assert cli.main(["resume", str(jid)]) == 0 and store.get(jid)["status"] == "awaiting_approval"


# ---------- designer: prévia da composição ----------
def _designer_setup(tmp_path, monkeypatch, recipe, music=True):
    seen = {}

    def agent(role, project, r, task, output, validate=None, bash=False):
        seen["index"] = (project.comp / "index.html").read_text(encoding="utf-8")
        seen["beats_at_call"] = (project.analysis / "beats.json").exists()
        output.write_text(json.dumps({"palette": ["#fff"], "fonts": ["Inter"], "caption_component": "x"}), encoding="utf-8")
    ctx = mk_project(tmp_path, recipe, agent=agent)
    p = ctx.project
    (p.root / "edit.json").write_text(json.dumps({"drop": [], "hook_text": "h", "post":
                                      {"title": "t", "caption": "c", "hashtags": []}}), encoding="utf-8")
    pipeline.plan(ctx)
    (p.input / "a.clean.mp4").write_bytes(b"v")
    (p.root / "user-assets").mkdir()
    (p.root / "user-assets/logo.png").write_bytes(b"i")
    if music:
        (p.root / "user-assets/my song.mp3").write_bytes(b"a")
    r = pipeline.render

    def init(project, aspect):
        (project.comp / "compositions").mkdir(parents=True)
        (project.comp / "assets").mkdir()
        (project.comp / "index.html").write_text("<blank/>", encoding="utf-8")
    monkeypatch.setattr(r, "init_composition", init)
    calls = []

    def fake_run(args, **k):
        import subprocess
        calls.append(args)
        comp = Path(args[args.index("beats") + 1])
        (comp / "beats/assets").mkdir(parents=True)
        (comp / "beats/assets/my song.mp3.json").write_text(json.dumps(
            {"version": 1, "audio": "assets/my song.mp3", "beats": [{"time": 0.5, "strength": 1}]}), encoding="utf-8")
        return subprocess.CompletedProcess(args, 0, stdout='log\n{"ok": true, "file": "beats/assets/my song.mp3.json", '
                                                         '"count": 1, "bpm": 120}\n', stderr="")
    monkeypatch.setattr(r, "run", fake_run)
    return ctx, seen, calls


def test_designer_composes_preview_with_music_and_beats_for_montage(tmp_path, monkeypatch):
    ctx, seen, calls = _designer_setup(tmp_path, monkeypatch, "montage-beat")
    pipeline.designer(ctx)
    idx = seen["index"]
    assert '<div id="cam">\n<video id="seg-0"' in idx and 'src="assets/a.clean.mp4"' in idx  # "#cam video" casa
    assert '<audio id="music"' in idx and 'src="assets/my%20song.mp3"' in idx
    assert seen["beats_at_call"] and calls[0][-3:] == ["beats", str(ctx.project.comp), "--json"]
    beats = json.loads((ctx.project.analysis / "beats.json").read_text(encoding="utf-8"))
    assert beats["bpm"] == 120 and beats["beats"] == [{"time": 0.5, "strength": 1}]


def test_designer_preview_for_speech_has_no_captions_and_no_beats(tmp_path, monkeypatch):
    ctx, seen, calls = _designer_setup(tmp_path, monkeypatch, "talking-head-punchy", music=False)
    pipeline.designer(ctx)  # sem captions.template.html ainda: a prévia não pode exigir legendas
    assert '<video id="seg-0"' in seen["index"] and "captions-layer" not in seen["index"]
    assert '<audio id="music"' not in seen["index"] and calls == []
    assert not (ctx.project.analysis / "beats.json").exists()


# ---------- contratos de artefatos ----------
def test_analyze_writes_frames_index_and_summary_contract(tmp_path, monkeypatch):
    ctx = mk_project(tmp_path)
    p = ctx.project

    def frames(src, out_dir, every_s):
        out_dir.mkdir(parents=True, exist_ok=True)
        fs = [out_dir / f"f_{k:04d}.jpg" for k in (1, 2, 3)]
        for f in fs:
            f.write_bytes(b"j")
        return fs
    monkeypatch.setattr(pipeline.media, "extract_frames", frames)
    monkeypatch.setattr(pipeline.media, "detect_scenes", lambda src: [])
    pipeline.analyze(ctx)
    idx = json.loads((p.analysis / "frames/index.json").read_text(encoding="utf-8"))
    assert idx == [{"file": f"analysis/frames/0/f_000{k}.jpg", "src": "input/a.clean.mp4", "t_src": t}
                   for k, t in ((1, 0.0), (2, 2.0), (3, 4.0))]  # speech: 1 frame a cada 2 s
    assert all((p.root / f["file"]).is_file() for f in idx)
    s = json.loads((p.analysis / "summary.json").read_text(encoding="utf-8"))
    assert s["durations"] == {"input/a.clean.mp4": 10.0} and s["fps"] == 30


def test_plan_writes_onscreen_out_in_output_time(tmp_path):
    ctx = mk_project(tmp_path)
    p = ctx.project
    (p.root / "edit.json").write_text(json.dumps({"drop": [[2, 2]], "hook_text": "3 erros", "post":
                                      {"title": "t", "caption": "c", "hashtags": []},
                                      "onscreen": [{"word_idx": 3, "text": "HOJE"}, {"word_idx": 2, "text": "X"},
                                                   {"word_idx": 99, "text": "Y"}]}), encoding="utf-8")
    pipeline.plan(ctx)
    words_out = json.loads((p.analysis / "words.out.json").read_text(encoding="utf-8"))
    o = json.loads((p.analysis / "onscreen.out.json").read_text(encoding="utf-8"))
    assert o["hook"] == {"text": "3 erros", "start": 0.0}
    hoje = next(w for w in words_out if w["text"] == "hoje")
    assert o["onscreen"] == [{"word_idx": 3, "text": "HOJE", "start": hoje["start"], "end": hoje["end"]}]
    assert [(s["word_idx"], s["text"]) for s in o["skipped"]] == [(2, "X"), (99, "Y")]
    assert all(s["note"] for s in o["skipped"])


def test_plan_montage_writes_no_onscreen_out(tmp_path):
    ctx = mk_project(tmp_path, "montage-beat")
    pipeline.plan(ctx)
    assert not (ctx.project.analysis / "onscreen.out.json").exists()


def test_prompts_reference_real_artifacts():
    pr = pipeline.agents.PROMPTS
    text = {r: (pr / f"{r}.md").read_text(encoding="utf-8") for r in ("director", "copywriter", "designer", "editor")}
    assert "analysis/frames/*.jpg" not in "".join(text.values())
    assert "analysis/frames/index.json" in text["director"] and "analysis/frames/index.json" in text["editor"]
    assert "analysis/onscreen.out.json" in text["editor"]
