import json
from pathlib import Path
from types import SimpleNamespace
import pytest
from conftest import needs_ffmpeg, ff
from autovideo import render
from autovideo.hf import ToolError
from autovideo.media import integrated_lufs
from autovideo.project import Project

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


def _fake_check_run(stdout, rc, stderr=""):
    def fake(*a, **k):
        assert k.get("ok_codes") == (0, 1)
        return SimpleNamespace(stdout=stdout, stderr=stderr, returncode=rc)
    return fake


def test_check_parses_json_with_noise_and_exit_1(monkeypatch):
    out = "[hyperframes] probe\n" + json.dumps(REAL, indent=2) + "\n[hyperframes] trailing log\n"
    monkeypatch.setattr(render, "run", _fake_check_run(out, 1))
    assert [i["code"] for i in render.check(None, "9:16")] == ["content_overlap", "caption_zone_collision"]


def test_check_exit_1_without_error_findings_is_check_failed(monkeypatch):
    out = json.dumps({"lint": {"findings": []}}, indent=2)  # sem "ok" e sem erros, mas exit 1
    monkeypatch.setattr(render, "run", _fake_check_run(out, 1))
    assert [i["code"] for i in render.check(None, "9:16")] == ["check_failed"]
    out = json.dumps({"ok": True, "lint": {"findings": []}}, indent=2)  # ok=true mas exit 1
    monkeypatch.setattr(render, "run", _fake_check_run(out, 1))
    assert [i["code"] for i in render.check(None, "9:16")] == ["check_failed"]


def test_check_clean_run_returns_empty(monkeypatch):
    monkeypatch.setattr(render, "run", _fake_check_run(json.dumps({"ok": True}, indent=2), 0))
    assert render.check(None, "9:16") == []


def test_check_without_json_raises(monkeypatch):
    monkeypatch.setattr(render, "run", _fake_check_run("", 1, "boom"))
    with pytest.raises(ToolError, match="boom"):
        render.check(None, "9:16")


def test_check_garbled_json_raises(monkeypatch):
    monkeypatch.setattr(render, "run", _fake_check_run('{\n  "ok": tru\n}\n', 1, "stderr-aqui"))
    with pytest.raises(ToolError, match="stderr-aqui"):
        render.check(None, "9:16")


def test_caption_zone_by_aspect():
    assert "y0=0.55" in render.caption_zone("9:16") and "severity=error" in render.caption_zone("16:9")
    assert render.caption_zone("1:1") == render.caption_zone("16:9")


def _render_final(monkeypatch, tmp_path, measures, write=True, fail=False, normalize_fail=False):
    """run falso escreve o arquivo do -o (a .part); integrated_lufs/normalize_final são falsos."""
    calls, it, out = [], iter(measures), tmp_path / "o" / "f.mp4"

    def fake_run(args, **k):
        part = args[args.index("-o") + 1]
        assert part.endswith("f.part.mp4")
        if write:
            Path(part).write_bytes(b"x")
        if fail:
            raise ToolError("render falhou")

    monkeypatch.setattr(render, "run", fake_run)
    monkeypatch.setattr(render, "integrated_lufs", lambda p: next(it))
    monkeypatch.setattr(render, "normalize_final", lambda p, l: calls.append((p, l)))
    return out, calls


def _parts(out):
    return list(out.parent.glob("*"))


def test_render_final_within_tolerance_skips_normalize(monkeypatch, tmp_path):
    out, calls = _render_final(monkeypatch, tmp_path, [-15.4])
    assert render.render_final(tmp_path, out, -14) == -15.4 and calls == []
    assert _parts(out) == [out]  # a .part virou o arquivo final


def test_render_final_lufs_none_skips_measurement(monkeypatch, tmp_path):
    out, calls = _render_final(monkeypatch, tmp_path, [])  # integrated_lufs falso levantaria StopIteration
    assert render.render_final(tmp_path, out, None) is None and calls == [] and _parts(out) == [out]


def test_render_final_exact_boundary_does_not_normalize(monkeypatch, tmp_path):
    out, calls = _render_final(monkeypatch, tmp_path, [-15.5])
    assert render.render_final(tmp_path, out, -14) == -15.5 and calls == []


def test_render_final_out_of_tolerance_normalizes_and_remeasures(monkeypatch, tmp_path):
    out, calls = _render_final(monkeypatch, tmp_path, [-20.0, -14.1])
    assert render.render_final(tmp_path, out, -14) == -14.1
    assert calls == [(tmp_path / "o" / "f.part.mp4", -14)] and _parts(out) == [out]


def test_render_final_still_out_of_range_after_normalize_raises(monkeypatch, tmp_path):
    out, _ = _render_final(monkeypatch, tmp_path, [-20.0, -18.0])
    with pytest.raises(ToolError, match="mesmo após normalizar"):
        render.render_final(tmp_path, out, -14)
    assert _parts(out) == []


def test_render_final_failure_leaves_no_out_nor_part(monkeypatch, tmp_path):
    out, _ = _render_final(monkeypatch, tmp_path, [], fail=True)
    out.parent.mkdir()
    out.write_bytes(b"velho")  # final antigo não pode sobreviver como se fosse novo
    (out.parent / "f.part.mp4").write_bytes(b"parcial")
    with pytest.raises(ToolError, match="render falhou"):
        render.render_final(tmp_path, out, -14)
    assert _parts(out) == []


def test_render_final_exit_0_without_file_raises(monkeypatch, tmp_path):
    out, _ = _render_final(monkeypatch, tmp_path, [], write=False)
    with pytest.raises(ToolError, match="não gerou"):
        render.render_final(tmp_path, out, -14)
    assert _parts(out) == []


def test_snapshots_ignores_stale_pngs(monkeypatch, tmp_path):
    (tmp_path / "velho.png").write_bytes(b"x")

    def fake_run(args, **k):
        (tmp_path / "frame-0.50.png").write_bytes(b"x")

    monkeypatch.setattr(render, "run", fake_run)
    assert [p.name for p in render.snapshots(tmp_path, [0.5], tmp_path)] == ["frame-0.50.png"]


@needs_ffmpeg
def test_make_cover(media_dir, tmp_path):
    render.make_cover(media_dir / "talk.mp4", 1.0, tmp_path / "cover.jpg")
    assert (tmp_path / "cover.jpg").stat().st_size > 1000


@needs_ffmpeg
def test_make_cover_past_end_raises(media_dir, tmp_path):
    with pytest.raises(ToolError):  # o ffmpeg falha sozinho além do fim
        render.make_cover(media_dir / "talk.mp4", 600.0, tmp_path / "late.jpg")
    assert not (tmp_path / "late.jpg").exists()


def test_make_cover_exit_0_without_file_raises(monkeypatch, tmp_path):
    monkeypatch.setattr(render, "run", lambda *a, **k: None)
    with pytest.raises(ToolError, match="capa"):
        render.make_cover(tmp_path / "v.mp4", 1.0, tmp_path / "c.jpg")


def test_formats_only_vertical():
    assert render.FORMATS == {"9:16": (1080, 1920, "portrait")}


def test_init_composition_runs_init_once(monkeypatch, tmp_path):
    seen = []
    p = Project(tmp_path / "p")
    monkeypatch.setattr(render, "run", lambda args, **k: (seen.append(args), p.comp.mkdir(exist_ok=True)))
    render.init_composition(p, "9:16")
    assert "portrait" in seen[0] and (p.comp / "assets").is_dir()
    (p.comp / "hyperframes.json").write_text("{}")
    render.init_composition(p, "9:16")
    assert len(seen) == 1
