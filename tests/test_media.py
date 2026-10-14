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
