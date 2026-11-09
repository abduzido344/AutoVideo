"""Mede ritmo e marcos da narração de um vídeo, sem gravar nada.

Uso: python sistema/pipeline/medir.py <pasta do vídeo> [--marcos=promessa:7,revelacao:26] [--ppm=155]
Lê narracao.txt, marcos.txt (linhas "nome N", N = nº do parágrafo, como em audio/tempos.csv) e, se existirem, audio/tempos.csv e audio/palavras.json.
Sem áudio estima o tempo por palavras acumuladas ÷ ppm (marca ~). Sai com código 1 se houver FORA.
"""
import csv, json, re, sys
from pathlib import Path
from comum import vertical

TAGS = r"\[[^\]]*\]\s*|</?\w+>"
LIMITES = {"promessa": 30, "gancho": 60, "revelacao": 150, "acao": 30, "escada": 30}


def limpo(t):
    return re.sub(TAGS, "", t)


def fala(t):
    def solta(s):
        s = re.sub(r"\s*(?:\.{3}|…|[—–;:])\s*", ", ", s)
        s = re.sub(r"[()]", "", s)
        s = re.sub(r"(?:\s*,){2,}", ",", s)
        s = re.sub(r"^\s*,\s*", " ", s)
        return re.sub(r",\s*([.!?])", r"\1", s)
    return "".join(x if x.startswith("[") else solta(x) for x in re.split(r"(\[[^\]]*\])", t))


def mmss(s):
    return f"{int(s) // 60}:{int(s) % 60:02d}"


sys.stdout.reconfigure(encoding="utf8")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if not args:
    sys.exit(__doc__)
ep = Path(args[0])
opc = {a.split("=")[0]: a.split("=", 1)[1] for a in sys.argv[1:] if "=" in a}
cm = ep.resolve().parents[1] / "canal.md"
mc = re.search(r"Medido: (\d+) ppm", cm.read_text(encoding="utf8")) if cm.exists() else None
alvo = float(opc.get("--ppm", mc[1] if mc else 155))
paragrafos = [p.strip() for p in (ep / "narracao.txt").read_text(encoding="utf8").split("\n\n") if p.strip()]
pausa = {i: float(m[1]) for i, p in enumerate(paragrafos, 1) if (m := re.fullmatch(r"\[pausa ([\d.]+)\]", p))}
falados = [i for i in range(1, len(paragrafos) + 1) if i not in pausa]
palavras = {i: len(limpo(fala(paragrafos[i - 1])).split()) for i in falados}
total = sum(palavras.values())

marcos = {}
mf = ep / "marcos.txt"
if mf.exists():
    marcos = {n: int(v) for n, v in (l.split()[:2] for l in mf.read_text(encoding="utf8").splitlines() if len(l.split()) >= 2 and not l.startswith("#"))}
if "--marcos" in opc:
    marcos.update({n: int(v) for n, v in (x.split(":") for x in opc["--marcos"].split(",") if ":" in x)})

tf, pj = ep / "audio/tempos.csv", ep / "audio/palavras.json"
inicio = {}
if tf.exists():
    with tf.open(encoding="utf8") as f:
        linhas = list(csv.DictReader(f))
    inicio = {int(r["paragrafo"]): float(r["inicio"]) for r in linhas}
    dur, til = float(linhas[-1]["fim"]), ""
    n_pal = len(json.loads(pj.read_text(encoding="utf8"))) if pj.exists() else total
    ppm = n_pal / dur * 60
else:
    til, ppm, acc = "~", alvo, 0.0
    for i in range(1, len(paragrafos) + 1):
        inicio[i] = acc
        acc += pausa.get(i, palavras.get(i, 0) / alvo * 60)
    dur = acc

res = []


def linha(nome, valor, ok, regra):
    res.append(ok)
    print(f"{'ok  ' if ok else 'FORA'} {nome}: {valor} ({regra})")


curto = vertical(ep)
if til:
    print(f"info palavras: {total} · duração estimada {til}{mmss(dur)} a {alvo:.0f} ppm")
else:
    linha("palavras/ppm", f"{total} palavras · {ppm:.0f} ppm · {mmss(dur)}", abs(ppm - alvo) <= alvo * 0.1, f"alvo {alvo:.0f} ±10%")
texto = " ".join(limpo(fala(paragrafos[i - 1])) for i in falados)
sinais = len(re.findall(r"[.,!?]", texto))
linha("palavras por sinal", f"{total / max(sinais, 1):.1f}", total / max(sinais, 1) >= 8, "≥8")
print(f"info parágrafos [pausa N]: {len(pausa)}")
for nome, lim in LIMITES.items():
    if nome in marcos:
        t = inicio.get(marcos[nome])
        linha(nome, f"parágrafo {marcos[nome]} " + ("inexistente" if t is None else f"em {til}{mmss(t)}"), t is not None and t <= lim, f"≤{mmss(lim)}")
cta = next((i for i in falados if "inscrev" in paragrafos[i - 1].lower()), None)
if curto:
    linha("inscrev", "presente" if cta else "ausente", cta is None, "ausente")
    linha("duração", f"{til}{mmss(dur)}", 30 <= dur <= 90, "30–90 s")
elif cta:
    t, num = inicio.get(cta, 0), int((re.search(r"\d+", ep.resolve().name) or [0])[0])
    if "promessa" in marcos:
        linha("CTA depois da promessa", f"parágrafo {cta} em {til}{mmss(t)}", cta > marcos["promessa"], f"> parágrafo {marcos['promessa']}")
    if "acao" in marcos and num % 2:
        linha("CTA depois da 1ª ação", f"parágrafo {cta} em {til}{mmss(t)}", cta > marcos["acao"], f"> parágrafo {marcos['acao']}")
    elif num % 2:
        linha("CTA ímpar", f"parágrafo {cta} em {til}{mmss(t)}", 120 <= t <= 180, "2:00–3:00")
    else:
        linha("CTA par", f"parágrafo {cta} em {til}{mmss(t)}", cta == falados[-1], f"último falado ({falados[-1]})")
sys.exit(0 if all(res) else 1)
