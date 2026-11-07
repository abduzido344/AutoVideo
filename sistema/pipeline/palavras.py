"""Tempo de cada palavra da narração (Whisper local, CPU, sem custo).

Uso: python sistema/pipeline/palavras.py <pasta do vídeo> [--modelo=small]
Lê audio/narracao.wav e narracao.txt (por parágrafo, se houver audio/tempos.csv); grava audio/palavras.json = [[palavra, início], ...].
"""
import csv, json, re, sys
from pathlib import Path
from comum import h


def main(v, modelo="small"):
    v = Path(v)
    wav, saida = v / "audio/narracao.wav", v / "audio/palavras.json"
    texto = re.sub(r"\[[^\]]*\]\s*|</?\w+>", "", (v / "narracao.txt").read_text(encoding="utf8"))
    chave = h(wav.read_bytes(), modelo)
    marca = v / "audio/.palavras"
    if saida.exists() and (marca.read_text() == chave if marca.exists() else saida.stat().st_mtime >= wav.stat().st_mtime):
        print("palavras.json em dia"); return
    import whisper
    m, audio = whisper.load_model(modelo), whisper.load_audio(str(wav))
    tempos = v / "audio/tempos.csv"
    trechos = [(float(k["inicio"]), float(k["fim"]), k["texto"]) for k in csv.DictReader(open(tempos, encoding="utf8"))] if tempos.exists() else [(0, len(audio) / 16000, texto)]
    ws = []
    for a, b, t in trechos:
        r = m.transcribe(audio[int(a * 16000):int((b + .1) * 16000)], language="pt", word_timestamps=True,
                         initial_prompt=" ".join(t.split())[:800], fp16=False, condition_on_previous_text=False)
        ws += [[w["word"].strip(), round(a + w["start"], 2)] for s in r["segments"] for w in s.get("words", []) if w["word"].strip()]
    saida.write_text(json.dumps(ws, ensure_ascii=False), encoding="utf8")
    marca.write_text(chave)
    print(len(ws), "palavras")


if __name__ == "__main__":
    m = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--modelo=")), "small")
    main(sys.argv[1], m)
