import csv
import hashlib
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

EP = Path(__file__).resolve().parent.parent
PIPELINE = EP.parents[2] / "pipeline"
sys.path.insert(0, str(PIPELINE))
PARTS = EP / "audio/partes"
PARTS.mkdir(parents=True, exist_ok=True)
TAGS = r"\[[^\]]*\]\s*|</?\w+>"


def clean(text):
    return re.sub(TAGS, "", text).strip()


def main():
    paragraphs = [p.strip() for p in (EP / "narracao.txt").read_text(encoding="utf-8").split("\n\n") if p.strip()]
    assert len(paragraphs) == 6
    hashes_file = PARTS / "hashes.json"
    hashes = json.loads(hashes_file.read_text()) if hashes_file.exists() else {}
    keys = {str(i): hashlib.sha256((paragraphs[0] + "\n" + p).encode()).hexdigest() for i, p in enumerate(paragraphs, 1)}
    forced = {int(a.split("=", 1)[1]) for a in sys.argv if a.startswith("--refazer=")}
    missing = [i for i in range(1, 7) if i in forced or not (PARTS / f"p{i:03d}.wav").exists() or hashes.get(str(i)) != keys[str(i)]]
    count = sum(len(clean(p).split()) for p in paragraphs)
    print(f"Voz sintética feminina pt-BR, {count} palavras, faltantes={missing}, estimativa anterior ao uso ~US${0.15+count/133/10:.2f}", flush=True)
    if missing:
        if "--ok" not in sys.argv:
            return
        import modal
        from modal_tts import app, Narrador

        started = time.perf_counter()
        calls = []
        try:
            with modal.enable_output(), app.run():
                narrator = Narrador()
                for i in missing:
                    before = time.perf_counter()
                    text = paragraphs[i - 1]
                    if i == 1:
                        text = "[young adult female Brazilian Portuguese narrator, natural warm clear voice] " + text
                        ref, transcript = b"", ""
                    else:
                        ref = (PARTS / "p001.wav").read_bytes()
                        transcript = clean(paragraphs[0])
                    call = narrator.gerar.spawn(text, ref, transcript)
                    try:
                        audio = call.get(timeout=720 if i == missing[0] else 300)
                    except (TimeoutError, modal.exception.TimeoutError):
                        call.cancel()
                        raise RuntimeError(f"Timeout no parágrafo {i}; nenhuma tentativa adicional")
                    destination = PARTS / f"p{i:03d}.wav"
                    destination.write_bytes(audio)
                    hashes[str(i)] = keys[str(i)]
                    hashes_file.write_text(json.dumps(hashes, indent=2))
                    elapsed = time.perf_counter() - before
                    calls.append(dict(paragraph=i, client_seconds=elapsed, bytes=len(audio)))
                    print(f"Parágrafo {i} salvo em {elapsed:.2f}s", flush=True)
        finally:
            metrics = dict(client_seconds_including_app=time.perf_counter()-started, calls=calls,
                           words=count, estimate_before_run_usd=0.15+count/133/10,
                           voice="synthetic female Brazilian Portuguese; p001 unconditioned, subsequent p001 reference",
                           billing="Total faturado não consultado; estimativa anterior não é medição de cobrança")
            (EP / "audio/metricas.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    lines, total = [], 0.0
    with wave.open(str(PARTS / "p001.wav")) as handle:
        rate = handle.getframerate()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r={rate}:cl=mono", "-t", "0.18", "-c:a", "pcm_s16le", str(PARTS / "silencio.wav")], check=True)
    concat = []
    for i, text in enumerate(paragraphs, 1):
        source, dest = PARTS / f"p{i:03d}.wav", PARTS / f"e{i:03d}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(source), "-af", "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.18:stop_threshold=-45dB:stop_silence=0.15", "-ac", "1", "-ar", str(rate), "-c:a", "pcm_s16le", str(dest)], check=True)
        with wave.open(str(dest)) as handle:
            duration = handle.getnframes() / handle.getframerate()
        lines.append([i, f"{total:.3f}", f"{total+duration:.3f}", clean(text)])
        total += duration
        concat.append(f"file '{dest.name}'")
        if i != len(paragraphs):
            concat.append("file 'silencio.wav'")
            total += 0.18
    (PARTS / "lista.txt").write_text("\n".join(concat), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(PARTS / "lista.txt"), "-c:a", "pcm_s16le", str(EP / "audio/narracao.wav")], check=True)
    with (EP / "audio/tempos.csv").open("w", newline="", encoding="utf-8") as handle:
        csv.writer(handle).writerows([["paragrafo", "inicio", "fim", "texto"], *lines])
    print(f"Narração montada: {total:.3f}s, {count/total*60:.1f}ppm", flush=True)
    import palavras
    palavras.main(EP)


if __name__ == "__main__":
    main()
