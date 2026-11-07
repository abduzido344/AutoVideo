import csv, difflib, json, os, re, sys, unicodedata
from comum import ass_cor, tema, vertical as eh_vertical

FRACAS = set("a o as os um uma de do da dos das e que no na nos nas em para por com se eu o seu sua mais".split())


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def palavras(v):
    texto = open(os.path.join(v, "narracao.txt"), encoding="utf8").read()
    texto = re.sub(r"\[[^\]]*\]\s*|</?\w+>", "", texto)
    num = os.path.join(v, "midia", "numeros.txt")
    for linha in open(num, encoding="utf8").read().splitlines() if os.path.exists(num) else []:
        if ">" in linha:
            a, b = linha.split(">", 1)
            texto = texto.replace(a.strip(), b.strip())
    paras = [p.split() for p in texto.split("\n\n") if p.strip()]
    ws = [(w, i) for i, p in enumerate(paras) for w in p]
    ouvido = json.load(open(os.path.join(v, "audio", "palavras.json"), encoding="utf8"))
    A, B = [norm(w) for w, _ in ws], [norm(w) for w, _ in ouvido]
    t = [None] * len(ws)
    for m in difflib.SequenceMatcher(None, A, B, autojunk=False).get_matching_blocks():
        for k in range(m.size):
            t[m.a + k] = ouvido[m.b + k][1]
    conhecidos = [i for i, x in enumerate(t) if x is not None]
    for i in range(len(t)):
        if t[i] is None:
            a = max([j for j in conhecidos if j < i], default=None)
            b = min([j for j in conhecidos if j > i], default=None)
            t[i] = t[a] + (t[b] - t[a]) * (i - a) / (b - a) if a is not None and b is not None else (t[a] + .3 if a is not None else 0)
    return [(w, ti, p) for (w, p), ti in zip(ws, t)]


def blocos(ws, maximo=5, chars=30):
    out, cur = [], []
    for k, (w, t, p) in enumerate(ws):
        if cur and (cur[-1][2] != p or len(cur) >= maximo or len(" ".join(x[0] for x in cur + [(w,)])) > chars):
            leva = [cur.pop()] if len(cur) > 2 and cur[-1][2] == p and norm(cur[-1][0]) in FRACAS else []
            out.append(cur); cur = leva
        cur.append((w, t, p))
        if re.search(r"[.?!:]$", w) or (re.search(r",$", w) and len(cur) >= 3):
            out.append(cur); cur = []
    return out + ([cur] if cur else [])


def ts(x, srt=False):
    h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",") if srt else f"{h}:{m:02d}:{s:05.2f}"


def main(v, gancho_ate, vertical=False):
    t = tema(v)
    COR, DESTAQUE, BORDA, FONTE = ass_cor(t["cor"]), ass_cor(t["destaque"]), ass_cor(t["borda"]), t["fonte"]
    bs = blocos(palavras(v), *((4, 20) if vertical else ()))
    w, h, tam, mv = (1080, 1920, (72, 100), (430, 470)) if vertical else (1920, 1080, (62, 96), (60, 150))
    ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {w}", f"PlayResY: {h}", "", "[V4+ Styles]",
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
           f"Style: Normal,{FONTE},{tam[0]},{COR},{COR},{BORDA},&H80000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,80,{mv[0]},1",
           f"Style: Gancho,{FONTE},{tam[1]},{COR},{COR},{BORDA},&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,80,80,{mv[1]},1",
           "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    srt = []
    for n, b in enumerate(bs):
        prox = bs[n + 1][0][1] if n + 1 < len(bs) else b[-1][1] + 1.5
        fim = min(prox, b[-1][1] + 1.2)
        estilo = "Gancho" if b[0][1] < gancho_ate else "Normal"
        pop = r"{\fscx85\fscy85\t(0,140,\fscx100\fscy100)}" if estilo == "Gancho" else ""
        for i, (w, t, _) in enumerate(b):
            a = b[0][1] if i == 0 else t
            z = b[i + 1][1] if i + 1 < len(b) else fim
            txt = " ".join((f"{{\\c{DESTAQUE}}}{x}{{\\c{COR}}}" if j == i else x) for j, (x, _, _) in enumerate(b))
            ass.append(f"Dialogue: 0,{ts(a)},{ts(z)},{estilo},,0,0,0,,{pop if i == 0 else ''}{txt}")
        srt.append(f"{n + 1}\n{ts(b[0][1], 1)} --> {ts(fim, 1)}\n{' '.join(x for x, _, _ in b)}\n")
    open(os.path.join(v, "midia", "legendas.ass"), "w", encoding="utf8").write("\n".join(ass) + "\n")
    open(os.path.join(v, "midia", "legendas.srt"), "w", encoding="utf8").write("\n".join(srt))
    print(len(bs), "blocos")


if __name__ == "__main__":
    v = sys.argv[1]
    vertical = eh_vertical(v, sys.argv)
    sys.argv = [a for a in sys.argv if a != "--vertical"]
    fim2 = float(list(csv.DictReader(open(os.path.join(v, "audio", "tempos.csv"), encoding="utf8")))[1]["fim"])
    main(v, float(sys.argv[2]) if len(sys.argv) > 2 else fim2, vertical)
