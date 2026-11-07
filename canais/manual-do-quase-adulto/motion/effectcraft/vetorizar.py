import os, re, sys, tempfile, threading
import vtracer
from PIL import Image, ImageFilter

K = int(os.environ.get("K", 2))


def vetorizar(src, dst, cores=16):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    im = im.filter(ImageFilter.MedianFilter(3)).resize((w * K, h * K), Image.LANCZOS)
    if isinstance(cores, str):
        pal = [int(h[i:i + 2], 16) for h in cores.replace("#", "").split(",") for i in (0, 2, 4)]
    else:
        px = [c for c in im.getdata() if min(c) < 235]
        amostra = Image.new("RGB", (len(px), 1)); amostra.putdata(px)
        pal = amostra.quantize(cores, method=Image.Quantize.MEDIANCUT).getpalette()[:cores * 3] + [255, 255, 255]
    ref = Image.new("P", (1, 1)); ref.putpalette(pal + [0] * (768 - len(pal)))
    im = im.quantize(palette=ref, dither=Image.Dither.NONE).convert("RGB")
    d = tempfile.mkdtemp()
    png, svg = os.path.join(d, "q.png"), os.path.join(d, "q.svg")
    im.save(png)
    vtracer.convert_image_to_svg_py(png, svg, colormode="color", hierarchical=os.environ.get("MODO", "stacked"), mode="spline", filter_speckle=10,
                                    color_precision=8, layer_difference=10, corner_threshold=60, length_threshold=4.0, splice_threshold=45, path_precision=2)
    out = []
    for m in re.finditer(r'<path d="([^"]*)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"/>', open(svg).read()):
        a, b = float(m[3]), float(m[4])
        dd = re.sub(r"(-?[\d.]+)[ ,](-?[\d.]+)", lambda p: f"{(float(p[1]) + a) / K:.1f} {(float(p[2]) + b) / K:.1f}", m[1])
        cor = m[2].upper()
        if isinstance(cores, str):
            c = [int(cor[i:i + 2], 16) for i in (1, 3, 5)]
            cor = "#%02X%02X%02X" % min(zip(*[iter(pal)] * 3), key=lambda p: sum((a - b) ** 2 for a, b in zip(p, c)))
        out.append(f'<path fill="{cor}" d="{dd}"/>')
    open(dst, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{"".join(out)}</svg>')
    print(dst, len(out), "paths")


if __name__ == "__main__":
    threading.stack_size(64 * 1024 * 1024 - 4096)
    t = threading.Thread(target=vetorizar, args=(*sys.argv[1:3], *[a if '#' in a else int(a) for a in sys.argv[3:]]))
    t.start(); t.join()
