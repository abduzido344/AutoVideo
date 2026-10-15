# autovideo/compose.py
import html
import json
from pathlib import Path
from urllib.parse import quote
from autovideo.timeline import Timeline, Word

GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"
MARK = "/*AV_WORDS*/[]"


class ComposeError(RuntimeError):
    pass


def _n(x: float) -> str:
    return format(round(x, 3), "f").rstrip("0").rstrip(".") or "0"


def _attr(v) -> str:
    return html.escape(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False), quote=True)


def _js(v) -> str:
    # valor dentro de <script>: escapa '<' (fecha </script>) e os separadores de linha que JS antigo não aceita
    return (json.dumps(v, ensure_ascii=False).replace("<", "\\u003c")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


def _asset(src: str) -> str:
    return _attr(f"assets/{quote(Path(src).name)}")


def build_html(t: Timeline, words: list[Word], silent: frozenset[str] = frozenset()) -> str:
    # silent: basenames de segmentos sem faixa de áudio (data-has-audio="true" num vídeo mudo derruba o render)
    w, h, d = t.width, t.height, t.duration
    segs, off = [], 0.0
    for i, s in enumerate(t.segments):
        segs.append(f'<video id="seg-{i}" class="clip fill" src="{_asset(s.src)}" playsinline '
                    f'data-start="{_n(off)}" data-duration="{_n(s.dur)}" data-media-start="{_n(s.in_)}" '
                    f'data-has-audio="{"false" if Path(s.src).name in silent else "true"}" data-fade-in="0.03" data-fade-out="0.03" data-track-index="{i % 2}"></video>')
        off += s.dur
    broll = [f'<video id="broll-{i}" class="clip {b.mode}" src="{_asset(b.src)}" muted playsinline data-start="{_n(b.start)}" '
             f'data-duration="{_n(b.dur)}" data-media-start="0" style="z-index:10"></video>' for i, b in enumerate(t.broll)]
    layers = [f'<div id="ov-{i}" class="layer clip" data-composition-id="{_attr(Path(o.src).stem)}" data-composition-src="{_attr(o.src)}" '
              f'data-start="{_n(o.start)}" data-duration="{_n(o.dur)}" '
              f'data-variable-values="{_attr(o.vars)}" style="z-index:20"></div>' for i, o in enumerate(t.overlays)]
    if t.captions:
        layers.append(f'<div id="captions-layer" class="layer clip" data-composition-id="captions" data-track-kind="captions" '
                      f'data-composition-src="compositions/captions.html" data-start="0" data-duration="{_n(d)}" '
                      f'style="z-index:30"></div>')
    audio = []
    if t.music:
        audio.append(f'<audio id="music" class="clip" src="{_asset(t.music.src)}" data-start="0" data-duration="{_n(d)}" '
                     f'data-volume="{t.music.volume}" data-fade-out="1.5"></audio>')
    audio += [f'<audio id="sfx-{i}" class="clip" src="{_asset(s.src)}" data-start="{_n(s.at)}" data-duration="{_n(s.dur)}" '
              f'data-volume="{s.volume}"></audio>' for i, s in enumerate(t.sfx)]
    tweens = []
    for z in t.zooms:
        o = _js(z.origin)
        if z.kind == "punch":
            tweens.append(f'tl.set("#cam", {{ scale: {z.scale}, transformOrigin: {o} }}, {_n(z.at)});')
        else:
            tweens.append(f'tl.fromTo("#cam", {{ scale: 1, transformOrigin: {o} }}, '
                          f'{{ scale: {z.scale}, duration: {_n(z.dur)}, ease: "power1.inOut" }}, {_n(z.at)});')
        tweens.append(f'tl.set("#cam", {{ scale: 1 }}, {_n(z.at + z.dur)});')
    nl = "\n"
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={w}, height={h}" />
<script src="{GSAP}"></script>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {w}px; height: {h}px; overflow: hidden; background: #000; }}
#root {{ position: relative; width: 100%; height: 100%; overflow: hidden; }}
#cam {{ position: absolute; inset: 0; transform-origin: 50% 35%; }}
.fill, .full {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
.pip {{ position: absolute; right: 6%; top: 8%; width: 42%; border-radius: 24px; }}
.layer {{ position: absolute; inset: 0; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{_n(d)}" data-width="{w}" data-height="{h}">
<div id="cam">
{nl.join(segs)}
</div>
{nl.join(broll)}
{nl.join(layers)}
{nl.join(audio)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{nl.join(tweens)}
window.__timelines = window.__timelines || {{}};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
"""


def write_composition(comp_dir: Path, t: Timeline, words: list[Word], silent: frozenset[str] = frozenset()) -> Path:
    if t.captions:
        tpl = comp_dir / "compositions" / "captions.template.html"
        if not tpl.exists():
            raise ComposeError("captions.template.html ausente (designer não entregou)")
        src = tpl.read_text(encoding="utf-8")
        if MARK not in src:
            raise ComposeError(f"captions.template.html sem o marcador {MARK} (AV_WORDS)")
        data = _js([{"text": x.text, "start": x.start, "end": x.end} for x in words])
        (comp_dir / "compositions" / "captions.html").write_text(src.replace(MARK, data), encoding="utf-8")
    out = comp_dir / "index.html"
    out.write_text(build_html(t, words, silent), encoding="utf-8")
    return out
