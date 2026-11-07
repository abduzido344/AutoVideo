"""Thumbnail em grade com painéis gerados (modal_edit.py --tam=1024x768).

Uso: python sistema/pipeline/thumb_grade.py pasta_paineis saida.png "7 TIPOS DE *DESCANSO*" "QUAL TE *FALTA*?" "Físico,Mental,..."
Painéis em ordem alfabética (1_*.png, 2_*.png...); primeira linha com 4, o resto centrado embaixo.
*palavra* = cor de destaque (título turquesa, pergunta vermelha).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from comum import tema

pasta, saida, titulo, pergunta, rotulos = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5].split(",")
_t = tema(saida.parent.parent if saida.parent.name == "thumbs" else saida.parent)
TINTA, TURQ, VERM, BRANCO, CREME, FUNDO = (_t["thumb_cores"][k] for k in ("tinta", "turq", "verm", "branco", "creme", "fundo"))
PRETA, SEMI = _t["thumb_fonte"], _t["thumb_fonte2"]
W, H, GAP = 440, 330, 30


def texto(d, s, cx, y, tam, destaque, contorno):
    f = ImageFont.truetype(PRETA, tam)
    partes = [(p, destaque if i % 2 else CREME) for i, p in enumerate(s.split("*")) if p]
    total = sum(d.textlength(p, font=f) for p, _ in partes)
    x = cx - total / 2
    for p, cor in partes:
        d.text((x, y), p, font=f, fill=cor, stroke_width=contorno, stroke_fill=TINTA, anchor="ls")
        x += d.textlength(p, font=f)


def tracos(d, cx, cy, dist):
    for s in (-1, 1):
        x = cx + s * dist
        for dy, dx, ey in ((-30, 40, -14), (0, 50, 0), (30, 40, 14)):
            d.line([(x, cy + dy), (x + s * dx, cy + dy + ey)], fill=TINTA, width=10)


def painel(base, im, rotulo, x, y):
    im = ImageOps.fit(im.convert("RGB"), (W, H), centering=(0.5, 0.35))
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, W - 1, H - 1], 22, fill=255)
    base.paste(im, (x, y), m)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([x, y, x + W, y + H], 22, outline=TINTA, width=8)
    f = ImageFont.truetype(SEMI, 36)
    lw = d.textlength(rotulo, font=f) + 50
    cx, cy = x + W / 2, y + H - 34
    d.rounded_rectangle([cx - lw / 2, cy - 30, cx + lw / 2, cy + 24], 14, fill=BRANCO, outline=TINTA, width=6)
    d.text((cx, cy - 3), rotulo, font=f, fill=TINTA, anchor="mm")


imgs = sorted(pasta.glob("*.png"))
if len(imgs) != len(rotulos):
    sys.exit(f"{len(imgs)} painéis e {len(rotulos)} rótulos: precisam bater")
base = Image.new("RGB", (1920, 1080), FUNDO)
d = ImageDraw.Draw(base)
tracos(d, 960, 92, 820)
texto(d, titulo, 960, 134, 118, TURQ, 11)
cima, baixo = list(zip(imgs, rotulos))[:4], list(zip(imgs, rotulos))[4:]
for i, (im, r) in enumerate(cima):
    painel(base, Image.open(im), r, 28 + i * (W + GAP), 186)
x0 = (1920 - len(baixo) * W - (len(baixo) - 1) * GAP) // 2
for i, (im, r) in enumerate(baixo):
    painel(base, Image.open(im), r, x0 + i * (W + GAP), 700)
tracos(d, 960, 588, 560)
texto(d, pergunta, 960, 626, 104, VERM, 10)
saida.parent.mkdir(parents=True, exist_ok=True)
base.save(saida)
print(saida)
