import json
import math
import re
from pathlib import Path
from autovideo.hf import run, ToolError

LN = "loudnorm=I={lufs}:TP=-1.5:LRA=20"


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)]).stdout
    data = json.loads(out)
    v = next(s for s in data["streams"] if s["codec_type"] == "video")
    rot = int(v.get("tags", {}).get("rotate", 0))
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, den = v.get("avg_frame_rate", "0/1").split("/")
    return {"duration": float(data["format"]["duration"]), "width": w, "height": h,
            "fps": float(num) / float(den or 1) if float(den or 1) else 0.0,
            "has_audio": any(s["codec_type"] == "audio" for s in data["streams"]), "rotation": rot}


def _loudnorm(src: Path, lufs: float, prefilter: str = "") -> str:
    """Two-pass loudnorm: measure (after prefilter), return the pass-2 filter string."""
    base = LN.format(lufs=lufs)
    pre = prefilter + "," if prefilter else ""
    err = run(["ffmpeg", "-hide_banner", "-i", str(src), "-vn", "-af", f"{pre}{base}:print_format=json",
               "-f", "null", "-"]).stderr
    m = json.loads(re.findall(r"\{[^{}]*\}", err)[-1])
    if not math.isfinite(float(m["input_i"])):  # faixa muda: loudnorm não tem o que normalizar
        return prefilter or "anull"
    return (f"{pre}{base}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


def extract_frames(src: Path, out_dir: Path, every_s: float = 2.0) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("f_*.jpg"):
        old.unlink()
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", f"fps=1/{every_s},scale=480:-2",
         "-q:v", "4", str(out_dir / "f_%04d.jpg")])
    return sorted(out_dir.glob("f_*.jpg"))


def parse_lufs(stderr: str) -> float:
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", stderr)
    if not m:
        raise ToolError("ebur128 sem medição de loudness")
    return float(m[-1])


def integrated_lufs(path: Path) -> float:
    return parse_lufs(run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"]).stderr)


def normalize_final(path: Path, lufs: float = -14) -> None:
    tmp = path.with_suffix(".norm.mp4")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-c:v", "copy",
         "-af", _loudnorm(path, lufs), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(tmp)])
    tmp.replace(path)
