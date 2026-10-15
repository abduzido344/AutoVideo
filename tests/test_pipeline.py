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
        ("editor", "timeline.json"), ("render", "out/final.mp4"), ("gate2", "approvals/gate2.ok"),
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
    with pytest.raises(ValueError, match="repetidos"):
        pipeline.new_job(store, tmp_path, [v], None, "montage-beat", False, [clash])
    with pytest.raises(KeyError, match="não existe"):
        pipeline.new_job(store, tmp_path, [v], None, "nao-existe", False)


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
    assert [w["text"] for w in words_out] == ["oi", "pessoal", "hoje", "lá"]  # "ahn" (filler) e "vamos" (edit) caíram
    assert all(w["src"] == "out" for w in words_out) and words_out[-1]["end"] <= t.duration + 0.01


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
def test_render_review_loop_orders_grading_and_snapshots(tmp_path, monkeypatch):
    calls = []
    agent_calls = []
    ctx = mk_project(tmp_path, "montage-beat", agent=lambda *a, **k: agent_calls.append((a, k)) or calls.append("agent"))
    p = ctx.project
    base = {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 10.0)],
            "grading": {"adjust": {"exposure": 0.1}}, "overlays": [{"start": 2, "dur": 1, "src": "compositions/h.html"}]}
    (p.root / "timeline.json").write_text(json.dumps(base), encoding="utf-8")
    (p.analysis / "words.out.json").write_text("[]", encoding="utf-8")
    issues = iter([[{"code": "x"}], [{"code": "y"}], [{"code": "z"}]])  # nunca limpa: para depois de 2 rodadas
    r = pipeline.render
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: calls.append("write"))
    monkeypatch.setattr(r, "apply_grading", lambda comp, g: calls.append(("grade", g)))
    monkeypatch.setattr(r, "check", lambda comp, aspect: calls.append("check") or next(issues))
    snaps = []

    def snapshots(comp, times, out_dir):
        snaps.append((times, out_dir))
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
    assert "Problemas" in agent_calls[0][0][3] and "analysis/review/0/f.png" in agent_calls[0][0][3]


def test_render_clean_check_skips_agent_and_clamps_cover(tmp_path, monkeypatch):
    ctx = mk_project(tmp_path, "montage-beat", agent=lambda *a, **k: pytest.fail("sem issues, sem agente"))
    p = ctx.project
    (p.root / "timeline.json").write_text(json.dumps(
        {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 0.6)]}), encoding="utf-8")
    (p.analysis / "words.out.json").write_text("[]", encoding="utf-8")
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
    (p.root / "timeline.json").write_text(json.dumps(
        {"width": 1080, "height": 1920, "segments": [seg("input/a.clean.mp4", 0, 2)]}), encoding="utf-8")
    (p.analysis / "words.out.json").write_text("[]", encoding="utf-8")
    r, seen, html = pipeline.render, [], {}
    monkeypatch.setattr(pipeline, "write_composition", lambda *a: html.update(silent=a[3]))
    monkeypatch.setattr(r, "check", lambda *a: [])
    monkeypatch.setattr(r, "render_final", lambda comp, out, lufs: seen.append(lufs))
    monkeypatch.setattr(r, "make_cover", lambda *a: None)
    pipeline.do_render(ctx)
    assert seen == [None] and html["silent"] == {"a.clean.mp4"}
    assert json.loads((p.out / "review.json").read_text(encoding="utf-8"))["lufs"] is None


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
    assert not (root / "brief.md").exists() and store.get(jid)["status"] == "queued"


def test_cli_reject_gate2_redoes_copywriter_onwards(tmp_path, monkeypatch):
    _, _, root = _reject(tmp_path, monkeypatch, "gate2")
    for gone in ("edit.json", "timeline.base.json", "style.json", "timeline.json", "out/final.mp4"):
        assert not (root / gone).exists(), gone
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


def test_cli_resume_requeues_stale_but_approve_does_not(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    mk = lambda: store.create(str(tmp_path / "p"), "talking-head-punchy", True)
    live, gate, dead = mk(), mk(), mk()
    store.set(live, status="in_progress", stage="clean")
    store.set(dead, status="in_progress", stage="clean")
    store.set(gate, status="awaiting_approval", stage="gate1")
    monkeypatch.setattr(pipeline, "STAGES", [("gate1", "approvals/gate1.ok", None)])
    monkeypatch.setattr(pipeline, "make_ctx", lambda job: Ctx(Project(Path(job["project_dir"])), None, job, None))
    assert cli.main(["approve", str(gate)]) == 0
    assert store.get(live)["status"] == "in_progress"  # approve não mexe em jobs de outro processo
    assert cli.main(["resume", str(dead)]) == 0
    assert store.get(dead)["status"] == "completed" and store.get(live)["status"] == "queued"


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
