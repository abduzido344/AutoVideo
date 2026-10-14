import pytest
from conftest import needs_ffmpeg
from autovideo import media

def test_parse_scene_times():
    err = "[Parsed_showinfo_1 @ 0x1] n:   0 pts:  60 pts_time:2.002 duration:1\n" \
          "[Parsed_showinfo_1 @ 0x1] n:   1 pts: 120 pts_time:4.5 duration:1\n"
    assert media.parse_scene_times(err) == [2.002, 4.5]

def test_parse_lufs():
    err = "Summary:\n\n  Integrated loudness:\n    I:         -14.3 LUFS\n    Threshold: -24.5 LUFS\n"
    assert media.parse_lufs(err) == -14.3

@needs_ffmpeg
def test_probe(media_dir):
    p = media.probe(media_dir / "talk.mp4")
    assert p["width"] == 1920 and p["height"] == 1080 and p["has_audio"]
    assert p["duration"] == pytest.approx(6, abs=0.1)

@needs_ffmpeg
def test_clean_applies_rotation_and_cfr(media_dir, tmp_path):
    # a fixture precisa carregar rotação de verdade
    assert media.probe(media_dir / "rotated.mp4")["rotation"] in (90, -90, 270)
    dst = tmp_path / "out dir ã" / "rot.clean.mp4"
    media.clean(media_dir / "rotated.mp4", dst, clean_audio=True)
    p = media.probe(dst)
    assert (p["width"], p["height"]) == (1080, 1920)   # rotação aplicada
    assert p["rotation"] == 0
    assert p["fps"] == pytest.approx(30)

@needs_ffmpeg
def test_detect_scenes(media_dir):
    times = media.detect_scenes(media_dir / "scenes.mp4")
    assert any(abs(t - 2.0) < 0.1 for t in times)

@needs_ffmpeg
def test_extract_frames(media_dir, tmp_path):
    frames = media.extract_frames(media_dir / "talk.mp4", tmp_path / "f", every_s=2)
    assert len(frames) == 3 and frames[0].suffix == ".jpg"


def _sample_rate(path):
    import json, subprocess
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    return int(json.loads(out)["streams"][0]["sample_rate"])


@needs_ffmpeg
def test_normalize_final_hits_target_on_dynamic_audio(dynamic_dir, tmp_path):
    import shutil
    dst = shutil.copy(dynamic_dir / "dyn.mp4", tmp_path / "final.mp4")
    assert abs(media.integrated_lufs(dynamic_dir / "dyn.mp4") + 14) > 1.5  # entrada realmente fora do alvo
    media.normalize_final(tmp_path / "final.mp4")
    assert media.integrated_lufs(tmp_path / "final.mp4") == pytest.approx(-14, abs=1.5)
    assert _sample_rate(tmp_path / "final.mp4") == 48000

@needs_ffmpeg
@pytest.mark.parametrize("clean_audio", [False, True])
def test_clean_hits_target_on_dynamic_audio(dynamic_dir, tmp_path, clean_audio, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    dst = tmp_path / "c.mp4"
    media.clean(dynamic_dir / "dyn.mp4", dst, clean_audio=clean_audio)
    assert media.integrated_lufs(dst) == pytest.approx(-14, abs=1.5)
    assert _sample_rate(dst) == 48000

@needs_ffmpeg
def test_clean_vfr_without_audio(dynamic_dir, tmp_path):
    src = media.probe(dynamic_dir / "vfr.mp4")
    assert not src["has_audio"]
    dst = tmp_path / "v.mp4"
    media.clean(dynamic_dir / "vfr.mp4", dst, clean_audio=True)
    p = media.probe(dst)
    assert p["fps"] == pytest.approx(30) and not p["has_audio"]

@needs_ffmpeg
def test_extract_frames_drops_stale(media_dir, tmp_path):
    out = tmp_path / "f"
    out.mkdir()
    (out / "f_0099.jpg").write_bytes(b"x")
    assert len(media.extract_frames(media_dir / "talk.mp4", out, every_s=2)) == 3
