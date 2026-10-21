import pytest
from conftest import needs_ffmpeg
from autovideo import media

def test_parse_lufs():
    err = "Summary:\n\n  Integrated loudness:\n    I:         -14.3 LUFS\n    Threshold: -24.5 LUFS\n"
    assert media.parse_lufs(err) == -14.3

@needs_ffmpeg
def test_probe(media_dir):
    p = media.probe(media_dir / "talk.mp4")
    assert p["width"] == 1920 and p["height"] == 1080 and p["has_audio"]
    assert p["duration"] == pytest.approx(6, abs=0.1)
    r = media.probe(media_dir / "rotated.mp4")
    assert (r["width"], r["height"]) == (1080, 1920) and abs(r["rotation"]) == 90

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
    shutil.copy(dynamic_dir / "dyn.mp4", tmp_path / "final.mp4")
    assert abs(media.integrated_lufs(dynamic_dir / "dyn.mp4") + 14) > 1.5  # entrada realmente fora do alvo
    media.normalize_final(tmp_path / "final.mp4")
    assert media.integrated_lufs(tmp_path / "final.mp4") == pytest.approx(-14, abs=1.5)
    assert _sample_rate(tmp_path / "final.mp4") == 48000

@needs_ffmpeg
def test_extract_frames_drops_stale(media_dir, tmp_path):
    out = tmp_path / "f"
    out.mkdir()
    (out / "f_0099.jpg").write_bytes(b"x")
    assert len(media.extract_frames(media_dir / "talk.mp4", out, every_s=2)) == 3


@needs_ffmpeg
def test_normalize_final_passes_silent_audio_through(tmp_path):
    import subprocess
    src = tmp_path / "silent.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=320x240:r=30:d=2",
                    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "2", "-c:v", "libx264", "-c:a", "aac",
                    str(src)], check=True)
    media.normalize_final(src)  # faixa muda: loudnorm não tem o que medir, o áudio passa
    assert media.probe(src)["has_audio"]

