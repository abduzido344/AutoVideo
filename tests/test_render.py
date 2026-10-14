import json
import subprocess
from types import SimpleNamespace
import pytest
from conftest import needs_ffmpeg, ff
from autovideo import render
from autovideo.compose import write_composition
from autovideo.hf import ToolError
from autovideo.media import integrated_lufs
from autovideo.project import Project
from autovideo.timeline import Timeline, Segment, Word

# shape REAL do `hyperframes check --json` (0.8.158): findings por categoria; só os campos relevantes
REAL = {
    "ok": False, "strict": False,
    "lint": {"ok": True, "errorCount": 0, "warningCount": 1, "findings": [
        {"code": "caption_track_kind_missing", "severity": "warning", "message": "w", "selector": "#captions-layer"}]},
    "runtime": {"ok": True, "errorCount": 0, "warningCount": 0, "findings": []},
    "layout": {"ok": False, "errorCount": 2, "warningCount": 0, "findings": [
        {"code": "content_overlap", "severity": "error", "time": 0.111, "selector": "#ttl", "message": "overlap",
         "fixHint": "separe", "firstSeen": 0.111, "lastSeen": 2},
        {"code": "caption_zone_collision", "severity": "error", "time": 2, "selector": "#ttl",
         "message": "overlaps the reserved caption band", "firstSeen": 2, "lastSeen": 2}]},
    "motion": {"ok": True, "errorCount": 0, "warningCount": 0, "findings": [], "enabled": False},
    "contrast": {"ok": True, "errorCount": 0, "warningCount": 0, "findings": []},
}


def test_summarize_check_keeps_errors_only():
    assert render.summarize_check(REAL) == [
        {"category": "layout", "code": "content_overlap", "message": "overlap", "selector": "#ttl", "at": 0.111, "hint": "separe"},
        {"category": "layout", "code": "caption_zone_collision", "message": "overlaps the reserved caption band",
         "selector": "#ttl", "at": 2, "hint": None}]


def test_summarize_check_clean_and_silent_failure():
    clean = {"ok": True, "lint": {"findings": [{"severity": "warning"}]}, "layout": {"findings": []}}
    assert render.summarize_check(clean) == []
    assert [i["code"] for i in render.summarize_check({"ok": False, "lint": {"findings": []}})] == ["check_failed"]


def test_check_parses_json_with_noise_and_exit_1(monkeypatch):
    out = "[hyperframes] probe\n" + json.dumps(REAL, indent=2) + "\n[hyperframes] trailing log\n"
    monkeypatch.setattr(render, "run", lambda *a, **k: SimpleNamespace(stdout=out, stderr="", returncode=1))
    assert [i["code"] for i in render.check(None, "9:16")] == ["content_overlap", "caption_zone_collision"]


def test_check_without_json_raises(monkeypatch):
    monkeypatch.setattr(render, "run", lambda *a, **k: SimpleNamespace(stdout="", stderr="boom", returncode=1))
    with pytest.raises(ToolError, match="boom"):
        render.check(None, "9:16")


def test_caption_zone_by_aspect():
    assert "y0=0.55" in render.caption_zone("9:16") and "severity=error" in render.caption_zone("16:9")
    assert render.caption_zone("1:1") == render.caption_zone("16:9")


def test_apply_grading_skips_none(monkeypatch):
    monkeypatch.setattr(render, "run", lambda *a, **k: pytest.fail("não deve rodar"))
    render.apply_grading(None, None)


def _render_final(monkeypatch, tmp_path, measures):
    calls = []
    it = iter(measures)
    monkeypatch.setattr(render, "run", lambda *a, **k: None)
    monkeypatch.setattr(render, "integrated_lufs", lambda p: next(it))
    monkeypatch.setattr(render, "normalize_final", lambda p, l: calls.append((p, l)))
    return render.render_final(tmp_path, tmp_path / "o" / "f.mp4", -14), calls


def test_render_final_within_tolerance_skips_normalize(monkeypatch, tmp_path):
    got, calls = _render_final(monkeypatch, tmp_path, [-15.4])
    assert got == -15.4 and calls == []


def test_render_final_out_of_tolerance_normalizes_and_remeasures(monkeypatch, tmp_path):
    got, calls = _render_final(monkeypatch, tmp_path, [-20.0, -14.1])
    assert got == -14.1 and calls == [(tmp_path / "o" / "f.mp4", -14)]


@needs_ffmpeg
def test_make_cover(media_dir, tmp_path):
    render.make_cover(media_dir / "talk.mp4", 1.0, tmp_path / "cover.jpg")
    assert (tmp_path / "cover.jpg").stat().st_size > 1000


CAPTIONS_TPL = """<template id="captions-template">
<div data-composition-id="captions" data-track-kind="captions" data-start="0" data-duration="2" data-width="1080" data-height="1920">
<style>#cap{position:absolute;left:5%;right:5%;top:62%;text-align:center;font:700 72px sans-serif;color:#fff;background:#000a;padding:8px}</style>
<div id="cap" class="clip" data-start="0" data-duration="2">oi mundo</div>
<script>
const WORDS = /*AV_WORDS*/[];
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
tl.from("#cap", { opacity: 0, duration: 0.3 }, 0);
window.__timelines["captions"] = tl;
</script>
</div></template>"""


@needs_ffmpeg
def test_real_pipeline_smoke(slow, tmp_path):
    """init → compose → grading → check → snapshot → render → LUFS, com espaço e acento no caminho."""
    project = Project(tmp_path / "Projeto Açaí")
    render.init_composition(project, "9:16")
    assert (project.comp / "hyperframes.json").exists()
    render.init_composition(project, "9:16")  # idempotente
    ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
       "-af", "volume=0.3", "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
       str(project.comp / "assets" / "clip.mp4"))
    (project.comp / "compositions" / "captions.template.html").write_text(CAPTIONS_TPL, encoding="utf-8")
    t = Timeline(width=1080, height=1920, segments=[Segment(src="input/clip.mp4", **{"in": 0.0}, out=2.0)], captions=True)
    write_composition(project.comp, t, [Word(text="oi", start=0.1, end=0.5, src="out")])
    render.apply_grading(project.comp, {"adjust": {"exposure": 0.1, "contrast": 0.1}})
    assert "data-color-grading" in (project.comp / "index.html").read_text(encoding="utf-8")
    assert render.check(project.comp, "9:16") == []
    snaps = render.snapshots(project.comp, [0.5, 1.5], project.root / "review")
    assert len(snaps) == 2
    final = project.out / "final.mp4"
    measured = render.render_final(project.comp, final, -14)
    assert abs(measured - (-14)) <= 1.5 and abs(integrated_lufs(final) - measured) < 0.01
    print(f"LUFS medido: {measured}")
