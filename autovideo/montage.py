"""Monta a composição HyperFrames de um episódio: cenas (imagem com câmera ou tela de celular) + voz + sons."""
import html
import shutil
from pathlib import Path
from urllib.parse import quote
from autovideo.artefatos import Cenas, Voz
from autovideo.blocks import GSAP_URL, render_block
from autovideo.hf import run

RESPIRO = 0.25
W, H = 1080, 1920
# câmera -> (escala inicial, escala final, xPercent inicial, xPercent final); pan: 6% de deslocamento total
CAMERA = {"zoom-in": (1, 1.12, 0, 0), "zoom-out": (1.12, 1, 0, 0),
          "pan-left": (1.12, 1.12, 3, -3), "pan-right": (1.12, 1.12, -3, 3)}


def _n(x: float) -> str:
    return format(round(x, 3), "f").rstrip("0").rstrip(".") or "0"


def _asset(ep: Path, comp: Path, rel: str, dest: str | None = None) -> tuple[Path, str]:
    """Copia ep/rel para comp/assets/<rel> (ou <dest>); devolve (destino, URL relativa escapada)."""
    src = (ep / rel).resolve()
    if not src.is_relative_to(ep.resolve()) or not src.is_file():
        raise ValueError(f"mídia fora do episódio ou ausente: {rel}")
    rel_out = dest or src.relative_to(ep.resolve()).as_posix()
    out = comp / "assets" / rel_out
    out.parent.mkdir(parents=True, exist_ok=True)
    if not dest:
        shutil.copyfile(src, out)
    return out, html.escape(f"assets/{quote(rel_out)}", quote=True)


def build(ep: Path, cenas: Cenas, voz: Voz, imgs: dict[str, str], sfx: dict[str, str], ambiente: str | None,
          legenda: bool = False) -> None:
    if [c.id for c in cenas.cenas] != [v.id for v in voz.cenas]:
        raise ValueError("voz.json não corresponde às cenas (ids/ordem diferentes)")
    comp = ep / "composition"
    for d in ("assets", "compositions"):  # re-execução não deixa telas/mídia velhas; o resto do scaffold fica
        shutil.rmtree(comp / d, ignore_errors=True)
        (comp / d).mkdir(parents=True)
    clips, audio, tweens, t = [], [], [], 0.0
    for c, v in zip(cenas.cenas, voz.cenas):
        dur = round(v.dur + RESPIRO, 3)
        at = f'data-start="{_n(t)}" data-duration="{_n(dur)}"'
        if c.kind == "image":
            if c.id not in imgs:
                raise ValueError(f"cena {c.id} sem imagem no manifesto")
            clips.append(f'<img id="img-{c.id}" class="clip cena" src="{_asset(ep, comp, imgs[c.id])[1]}" alt="" '
                         f'{at} data-track-index="0" />')
            if c.camera != "static":
                s0, s1, x0, x1 = CAMERA[c.camera]
                tweens.append(f'tl.fromTo("#img-{c.id}", {{ scale: {s0}, xPercent: {x0} }}, {{ scale: {s1}, '
                              f'xPercent: {x1}, duration: {_n(dur)}, ease: "none" }}, {_n(t)});')
        else:
            sid = f"screen-{c.id}"
            (comp / "compositions" / f"{sid}.html").write_text(
                render_block(c.screen.type, c.screen.data, dur, sid), encoding="utf-8")
            clips.append(f'<div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
                         f'{at} data-track-index="0" data-width="{W}" data-height="{H}"></div>')
        if legenda:
            clips.append(f'<div id="legenda-{c.id}" class="clip legenda" {at} data-track-index="1">'
                         f'<p data-layout-allow-caption-zone>{html.escape(c.narration)}</p></div>')
        audio.append(f'<audio id="voz-{c.id}" src="{_asset(ep, comp, v.file)[1]}" data-start="{_n(t)}" '
                     f'data-duration="{_n(v.dur)}" data-volume="1" data-track-index="2"></audio>')
        if c.id in sfx:
            audio.append(f'<audio id="sfx-{c.id}" src="{_asset(ep, comp, sfx[c.id])[1]}" {at} '
                         f'data-volume="0.6" data-track-index="3"></audio>')
        t = round(t + dur, 3)
    if ambiente:
        # o mixer não repete áudio: o ffmpeg emenda o ambiente em loop até a duração total
        out, url = _asset(ep, comp, ambiente, "ambiente.mp3")
        run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "-1", "-i", str((ep / ambiente).resolve()),
             "-t", _n(t), "-c:a", "libmp3lame", "-q:a", "4", str(out)])
        audio.append(f'<audio id="ambiente" src="{url}" data-start="0" data-duration="{_n(t)}" '
                     f'data-volume="0.15" data-track-index="4"></audio>')
    nl = "\n"
    (comp / "index.html").write_text(f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<script src="{GSAP_URL}"></script>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; }}
#root {{ position: relative; width: 100%; height: 100%; overflow: hidden; }}
.cena {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
.legenda {{ position: absolute; inset: 0; }}
.legenda p {{ position: absolute; left: 6%; right: 6%; top: 58%; text-align: center; color: #fff;
  font: 700 64px/1.2 sans-serif; text-shadow: 0 4px 16px rgba(0, 0, 0, .9); }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{_n(t)}" data-width="{W}" data-height="{H}">
{nl.join(clips)}
{nl.join(audio)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{nl.join(tweens)}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
""", encoding="utf-8")
