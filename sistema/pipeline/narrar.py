"""Narração com Fish Audio Drama 3 na Modal (H100), um parágrafo por vez.

Uso: python sistema/pipeline/narrar.py <pasta do vídeo> [voz.wav] [--ok] [--refazer=3,5] [--com-pausas] [--ritmo=1.2] [--enxuto]
Sem --ok só mostra o que vai gerar, a densidade de pontuação e o custo. Refaz só parágrafos novos ou com texto mudado.
Shorts: pausas dentro do parágrafo limitadas a ~0,2 s; --enxuto limita a ~0,3 s nos longos (a voz crua deixa até 0,6 s). --ritmo acelera a narração inteira sem mudar o tom. No fim gera audio/palavras.json (Whisper local).
Texto enviado à voz: : ; — … e parênteses viram vírgula. [direção] no começo do parágrafo vale para o parágrafo todo (voz.md em video-longo).
Saída: audio/partes/pNNN.wav, audio/narracao.wav, audio/tempos.csv.
"""
import csv, re, subprocess, sys, wave
from pathlib import Path
from comum import Cache, h, vertical

LIMITE_PRIMEIRO, LIMITE = 12 * 60, 5 * 60
TAGS = r"\[[^\]]*\]\s*|</?\w+>"


def aparar(parado, fica):
    return f"silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration={parado}:stop_threshold=-45dB:stop_silence={fica}"


def limpo(t):
    return re.sub(TAGS, "", t)


def fala(t):
    def solta(s):
        s = re.sub(r"\s*(?:\.{3}|…|[—–;:])\s*", ", ", s)
        s = re.sub(r"[()]", "", s)
        s = re.sub(r"(?:\s*,){2,}", ",", s)
        s = re.sub(r"^\s*,\s*", " ", s)
        s = re.sub(r",\s*([.!?])", r"\1", s)
        return re.sub(r"([.!?])(?:\s*\1)+", r"\1", s)
    return "".join(x if x.startswith("[") else solta(x) for x in re.split(r"(\[[^\]]*\])", t))


def densidade(ps):
    t = " ".join(limpo(fala(p)) for p in ps)
    frases = [f for f in re.split(r"(?<=[.!?])\s+", t) if f.strip()]
    return len(t.split()), len(re.findall(r"[.,!?]", t)), len(frases), sum(len(f.split()) <= 4 for f in frases)


args = [a for a in sys.argv[1:] if not a.startswith("--")]
ep = Path(args[0])
ref = Path(args[1]) if len(args) > 1 else ep.resolve().parents[1] / "voz/voz.wav"
if not ref.exists() or not ref.with_suffix(".txt").exists():
    sys.exit(f"falta {ref} ou {ref.with_suffix('.txt')}")
curto = vertical(ep) and "--com-pausas" not in sys.argv
enxuto = curto or "--enxuto" in sys.argv
FILTRO = aparar(0.1, 0.1) if curto else aparar(0.15, 0.15)
PAUSA = 0.15 if curto else 0.35
ritmo = next((float(a[8:]) for a in sys.argv if a.startswith("--ritmo=")), 1.0)
refazer = {int(x) for a in sys.argv if a.startswith("--refazer=") for x in a[10:].split(",")}
ref_texto = ref.with_suffix(".txt").read_text(encoding="utf8").strip()
partes = ep / "audio/partes"
partes.mkdir(parents=True, exist_ok=True)
paragrafos = [p.strip() for p in (ep / "narracao.txt").read_text(encoding="utf8").split("\n\n") if p.strip()]
cache, hr = Cache(partes), h(ref.read_bytes(), ref_texto)
chave = {i: h(p, hr) for i, p in enumerate(paragrafos, 1)}
faltam = [i for i in chave if i in refazer or cache.novo(f"p{i:03d}", chave[i], (partes / f"p{i:03d}.wav").exists())]

if faltam:
    palavras = sum(len(paragrafos[i - 1].split()) for i in faltam)
    custo = 0.15 + palavras / 133 / 10
    n, marcas, frases, curtas = densidade([paragrafos[i - 1] for i in faltam])
    com_tag = sum("[" in paragrafos[i - 1] for i in faltam)
    print(f"pontuação: 1 sinal a cada {n / max(marcas, 1):.1f} palavras (meta ≥ 8) · {curtas} de {frases} frases com até 4 palavras · direção de voz em {com_tag} de {len(faltam)} parágrafos")
    print(f"gerar {len(faltam)} parágrafos ({palavras} palavras) na H100 · ≈ US$ {custo:.2f}")
    if "--ok" not in sys.argv:
        sys.exit("rode de novo com --ok para gerar")
    import modal
    from modal_tts import app, Narrador
    with modal.enable_output(), app.run():
        narrador, ref_bytes, primeiro = Narrador(), ref.read_bytes(), True
        for i in faltam:
            chamada = narrador.gerar.spawn(fala(paragrafos[i - 1]), ref_bytes, ref_texto)
            try:
                dados = chamada.get(timeout=LIMITE_PRIMEIRO if primeiro else LIMITE)
            except (TimeoutError, modal.exception.TimeoutError):
                chamada.cancel()
                sys.exit(f"parágrafo {i}: sem resposta a tempo, cancelado (os prontos ficam salvos)")
            primeiro = False
            destino = partes / f"p{i:03d}.wav"
            tmp = destino.with_suffix(".tmp")
            tmp.write_bytes(dados)
            tmp.replace(destino)
            cache.marca(f"p{i:03d}", chave[i])
            print(f"{i}/{len(paragrafos)} ok", flush=True)

final = ep / "audio/narracao.wav"
if not faltam and final.exists() and final.stat().st_mtime >= max(p.stat().st_mtime for p in partes.glob("p*.wav")):
    sys.exit("narração em dia, nada a gerar")
linhas, t, lista = [], 0.0, partes / "lista.txt"
silencio = partes / "silencio.wav"
with wave.open(str(partes / "p001.wav")) as w:
    taxa = w.getframerate()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r={taxa}:cl=mono", "-t", str(PAUSA),
                "-c:a", "pcm_s16le", str(silencio)], check=True)
with lista.open("w", encoding="utf8") as f:
    for i, texto in enumerate(paragrafos, 1):
        arq = partes / f"p{i:03d}.wav"
        if enxuto:
            e = partes / f"e{i:03d}.wav"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(arq), "-af", FILTRO, "-c:a", "pcm_s16le", str(e)], check=True)
            arq = e
        with wave.open(str(arq)) as w:
            dur = w.getnframes() / w.getframerate()
        linhas.append([i, f"{t:.2f}", f"{t + dur:.2f}", limpo(texto)])
        t += dur + PAUSA
        f.write(f"file '{arq.name}'\nfile '{silencio.name}'\n")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lista), "-af", f"atempo={ritmo}", str(final)], check=True)
linhas = [[i, f"{float(a) / ritmo:.2f}", f"{float(b) / ritmo:.2f}", x] for i, a, b, x in linhas]
t /= ritmo
with (ep / "audio/tempos.csv").open("w", newline="", encoding="utf8") as f:
    csv.writer(f).writerows([["paragrafo", "inicio", "fim", "texto"], *linhas])
print(f"narração: {t:.1f}s")
import palavras
palavras.main(ep)
