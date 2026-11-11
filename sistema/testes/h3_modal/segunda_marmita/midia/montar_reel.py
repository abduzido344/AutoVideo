import csv
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

EP = Path(__file__).resolve().parents[1]
ROOT = EP.parents[3]
MIDIA = EP / "midia"
RESULTADO = EP.parent / "resultado"
PIPELINE = ROOT / "sistema/pipeline"


def run(args, **kwargs):
    return subprocess.run([str(x) for x in args], check=True, **kwargs)


def duracao(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", str(path)], text=True).strip())


def trilha_original(seconds):
    sr = 48000
    n = math.ceil(seconds * sr)
    y = np.zeros((n, 2), np.float64)
    chords = [(50, 57, 62, 66), (55, 59, 62, 67), (57, 61, 64, 69), (47, 54, 59, 62)]
    for bar in range(math.ceil(seconds / 6)):
        notes = chords[bar % len(chords)]
        for k, note in enumerate(notes):
            start = bar * 6 + k * .12
            i = round(start * sr)
            length = min(round(8.2 * sr), n - i)
            if length <= 0:
                continue
            t = np.arange(length) / sr
            freq = 440 * 2 ** ((note - 69) / 12)
            tone = (.5 * np.sin(2 * np.pi * (freq - .16) * t)
                    + .5 * np.sin(2 * np.pi * (freq + .16) * t)
                    + .10 * np.sin(4 * np.pi * freq * t)
                    + .025 * np.sin(6 * np.pi * freq * t))
            env = np.sin(np.minimum(t / 1.8, 1) * np.pi / 2) ** 2
            env *= np.sin(np.clip((8.2 - t) / 3.0, 0, 1) * np.pi / 2) ** 2
            env *= .8 + .2 * np.cos(2 * np.pi * .11 * t)
            pan = .2 if k % 2 else -.2
            y[i:i + length, 0] += tone * env * (1 - pan)
            y[i:i + length, 1] += tone * env * (1 + pan)
    fade = min(sr, n // 2)
    y[:fade] *= np.linspace(0, 1, fade)[:, None]
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y *= .72 / max(float(np.abs(y).max()), 1e-6)
    with wave.open(str(MIDIA / "trilha.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())
    (MIDIA / "trilha_origem.txt").write_text(
        "Trilha instrumental original sintetizada localmente por montar_reel.py. "
        "Osciladores senoidais, sequência harmônica simples, sem gravações ou samples de terceiros. "
        "Mix abaixo da voz com ducking.\n", encoding="utf-8")


def preparar_fontes():
    fontes = MIDIA / "cenas"
    fontes.mkdir(parents=True, exist_ok=True)
    destinations = []
    for idx in range(1, 7):
        source = RESULTADO / f"cena_{idx:02d}_clipproj4b_turbo6/h3.mp4"
        assert source.is_file(), source
        dest = fontes / ("cena_03_valida_lenta.mp4" if idx == 3 else f"cena_{idx:02d}_lenta.mp4")
        if not dest.exists() or dest.stat().st_mtime < source.stat().st_mtime:
            limits = ["-t", "2.0"] if idx == 3 else []
            run(["ffmpeg", "-y", "-v", "error", *limits, "-i", source, "-vf", "setpts=1.2*(PTS-STARTPTS),fps=24",
                 "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", dest])
        destinations.append(dest)
    return destinations


def preparar():
    audio = EP / "audio/narracao.wav"
    tempos = list(csv.DictReader((EP / "audio/tempos.csv").open(encoding="utf-8-sig")))
    assert len(tempos) == 6, "A narração deve ter seis parágrafos"
    total = duracao(audio)
    destinations = preparar_fontes()
    edl = []
    for idx, row in enumerate(tempos, 1):
        dest = destinations[idx - 1]
        start = 0 if idx == 1 else float(row["inicio"])
        end = float(tempos[idx]["inicio"]) if idx < 6 else total
        edl.append(dict(inicio=f"{start:.6f}", fim=f"{end:.6f}", fonte=f"cenas/{dest.name}",
                        de="0", ate="", zoom="1>1.025@0.5;0.5", trans="corte" if idx < 6 else "fim"))
    with (MIDIA / "edl.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["inicio", "fim", "fonte", "de", "ate", "zoom", "trans"])
        writer.writeheader()
        writer.writerows(edl)
    trilha_original(total)
    run([sys.executable, PIPELINE / "montar.py", EP, "--vertical", "--checar"])
    run([sys.executable, PIPELINE / "legendar.py", EP, "0", "--vertical"])
    ass = MIDIA / "legendas.ass"
    text = ass.read_text(encoding="utf-8")
    text = text.replace("Style: Normal,Segoe UI,72,", "Style: Normal,Segoe UI,60,")
    text = text.replace(",1,5,2,2,80,80,430,1", ",1,4,1,2,110,160,430,1")
    text = text.replace("&H005AD1F2", "&H00C8E4F2")
    ass.write_text(text, encoding="utf-8")
    return total


def validar(total):
    final = MIDIA / "final.mp4"
    probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-show_streams",
                                               "-show_format", "-of", "json", str(final)], text=True))
    (MIDIA / "ffprobe_final.json").write_text(json.dumps(probe, indent=2), encoding="utf-8")
    video = next(s for s in probe["streams"] if s["codec_type"] == "video")
    assert (video["width"], video["height"], video["avg_frame_rate"]) == (1080, 1920, "24/1")
    assert abs(float(video["duration"]) - total) < .05
    with (MIDIA / "ffmpeg_validacao.log").open("w", encoding="utf-8") as log:
        run(["ffmpeg", "-hide_banner", "-v", "error", "-i", final, "-f", "null", "-"], stderr=log)
    with (MIDIA / "blackdetect_loudness.log").open("w", encoding="utf-8") as log:
        run(["ffmpeg", "-hide_banner", "-i", final, "-vf", "blackdetect=d=0.1:pix_th=0.10",
             "-af", "ebur128=peak=true", "-f", "null", "-"], stderr=log)
    run(["ffmpeg", "-y", "-v", "error", "-i", final, "-vf",
         f"fps=12/{total},scale=180:-1,tile=4x3", "-frames:v", "1", MIDIA / "contato_final.jpg"])
    print(json.dumps({"seconds": float(video["duration"]), "frames": video["nb_read_frames"], "final": str(final)}))


def creditar():
    final = MIDIA / "final.mp4"
    temp = MIDIA / "final_creditos.tmp.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", final, "-map", "0", "-c", "copy",
         "-metadata", "title=A segunda marmita", "-metadata", "comment=Built with Fish Audio",
         "-movflags", "+faststart", temp])
    temp.replace(final)


if __name__ == "__main__":
    if "--fontes" in sys.argv:
        preparar_fontes()
        raise SystemExit(0)
    total = preparar()
    if "--render" in sys.argv:
        run([sys.executable, PIPELINE / "montar.py", EP, "--vertical"])
        creditar()
        validar(total)
