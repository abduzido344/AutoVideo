"""Vozes candidatas sem referência (Fish Drama 3, H100): cada semente sai uma voz diferente lendo voz/voz.txt.

Uso: python sistema/pipeline/voz_nova.py <canal> [n=4] [--ok]  (continua depois das candidatas que já existem)
Saída: canais/<canal>/voz/candidatas/vNN.wav. A escolhida vira voz/voz.wav.
"""
import sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--")]
canal = Path("canais") / args[0]
n = int(args[1]) if len(args) > 1 else 4
texto = (canal / "voz/voz.txt").read_text(encoding="utf8").strip()
saida = canal / "voz/candidatas"
ini = len(list(saida.glob("v*.wav"))) + 1
print(f"gerar {n} vozes ({len(texto.split())} palavras cada) na H100 · ≈ US$ {0.25 + n * 0.08:.2f}")
if "--ok" not in sys.argv:
    sys.exit("rode de novo com --ok para gerar")
import comum  # carrega o .env
import modal
from modal_tts import app, Narrador
saida.mkdir(parents=True, exist_ok=True)
with modal.enable_output(), app.run():
    narrador = Narrador()
    for s in range(ini, ini + n):
        chamada = narrador.gerar.spawn(texto, b"", "", s * 101)
        try:
            dados = chamada.get(timeout=12 * 60 if s == ini else 5 * 60)
        except (TimeoutError, modal.exception.TimeoutError):
            chamada.cancel()
            sys.exit(f"voz {s}: sem resposta a tempo, cancelado")
        (saida / f"v{s:02d}.wav").write_bytes(dados)
        print(f"v{s:02d} ok", flush=True)
