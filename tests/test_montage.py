import re
import subprocess
import pytest
from pydantic import ValidationError
from conftest import ff, needs_ffmpeg
from autovideo import montage, render
from autovideo.artefatos import Cena, Cenas, Voz
from autovideo.project import Project

ALERTA = {"titulo": "Tempestade", "orgao": "Defesa Civil", "texto": "Procure abrigo.", "hora": "14:02"}


def _ep(tmp_path, durs, kinds=None, img_name="s{n}.png"):
    """Episódio fake: arquivos de mídia com bytes quaisquer (o build só copia)."""
    ep = tmp_path / "ep 1"
    kinds = kinds or ["image"] * len(durs)
    cenas, voz, imgs = [], [], {}
    for i, (d, k) in enumerate(zip(durs, kinds), 1):
        sid = f"s{i:02d}"
        c = {"id": sid, "kind": k, "narration": f"fala {i}"}
        if k == "image":
            rel = "img/" + img_name.format(n=f"{i:02d}")
            (ep / rel).parent.mkdir(parents=True, exist_ok=True)
            (ep / rel).write_bytes(b"png")
            imgs[sid] = rel
            c["prompt"] = "a cat"
        else:
            c["screen"] = {"type": "alerta", "data": ALERTA}
        cenas.append(c)
        (ep / "voz").mkdir(parents=True, exist_ok=True)
        (ep / f"voz/{sid}.mp3").write_bytes(b"mp3")
        voz.append({"id": sid, "file": f"voz/{sid}.mp3", "dur": d, "sha": "x"})
    return ep, Cenas(cenas=cenas), Voz(cenas=voz), imgs


def _index(ep):
    return (ep / "composition" / "index.html").read_text(encoding="utf-8")


def test_scene_starts_are_cumulative(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0, 3.0])
    montage.build(ep, cenas, voz, imgs, {}, None)
    s = _index(ep)
    assert re.findall(r'<img id="img-s\d+"[^>]*data-start="([\d.]+)"', s) == ["0", "2.25"]
    assert re.search(r'data-composition-id="main"[^>]*data-duration="5.5"', s)
    assert s.count("gsap.min.js") == 1


def test_screen_scene_uses_subcomposition(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0, 3.0], ["image", "screen"])
    montage.build(ep, cenas, voz, imgs, {}, None)
    sub = (ep / "composition/compositions/screen-s02.html").read_text(encoding="utf-8")
    assert 'data-composition-id="screen-s02"' in sub
    assert re.search(r'data-composition-id="screen-s02" data-composition-src="compositions/screen-s02.html" '
                     r'data-start="2.25" data-duration="3.25"', _index(ep))


def test_no_captions_when_style_says_no(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0])
    montage.build(ep, cenas, voz, imgs, {}, None)
    assert 'id="legenda-' not in _index(ep) and "fala 1" not in _index(ep)
    montage.build(ep, cenas, voz, imgs, {}, None, legenda=True)
    assert 'id="legenda-s01"' in _index(ep) and "fala 1" in _index(ep)


def test_assets_copied_with_safe_names(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0], img_name="foto {n} & cia.png")
    sfx = {"s01": "sfx/s01.mp3"}
    (ep / "sfx").mkdir()
    (ep / "sfx/s01.mp3").write_bytes(b"sfx")
    montage.build(ep, cenas, voz, imgs, sfx, None)
    assets = ep / "composition/assets"
    assert (assets / "img/foto 01 & cia.png").read_bytes() == b"png"
    # voz/s01.mp3 e sfx/s01.mp3 não colidem
    assert (assets / "voz/s01.mp3").read_bytes() == b"mp3" and (assets / "sfx/s01.mp3").read_bytes() == b"sfx"
    s = _index(ep)
    assert 'src="assets/img/foto%2001%20%26%20cia.png"' in s
    assert re.search(r'<audio id="sfx-s01" src="assets/sfx/s01.mp3" data-start="0" [^>]*data-volume="0.6"', s)
    assert re.search(r'<audio id="voz-s01" src="assets/voz/s01.mp3" data-start="0" data-duration="2" '
                     r'data-volume="1"', s)


def test_rejects_paths_outside_episode(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0])
    (tmp_path / "fora.png").write_bytes(b"x")
    with pytest.raises(ValueError, match="fora"):
        montage.build(ep, cenas, voz, {"s01": "../fora.png"}, {}, None)


def test_voice_must_match_scenes(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0, 3.0])
    voz.cenas.reverse()
    with pytest.raises(ValueError, match="voz"):
        montage.build(ep, cenas, voz, imgs, {}, None)


def test_camera_tweens(tmp_path):
    ep, cenas, voz, imgs = _ep(tmp_path, [2.0, 3.0, 1.0])
    cenas.cenas[1].camera = "pan-left"
    cenas.cenas[2].camera = "static"
    montage.build(ep, cenas, voz, imgs, {}, None)
    s = _index(ep)
    assert 'tl.fromTo("#img-s01", { scale: 1, xPercent: 0 }, { scale: 1.12, xPercent: 0, duration: 2.25, ease: "none" }, 0);' in s
    assert 'tl.fromTo("#img-s02", { scale: 1.12, xPercent: 3 }, { scale: 1.12, xPercent: -3, duration: 3.25, ease: "none" }, 2.25);' in s
    assert "#img-s03" not in s.split("<script>")[-1]


def test_cena_schema():
    with pytest.raises(ValidationError, match="prompt"):
        Cena(id="s01", kind="image", narration="x")
    with pytest.raises(ValidationError, match="screen"):
        Cena(id="s01", kind="screen", narration="x")
    with pytest.raises(ValidationError):
        Cena(id="s01", kind="screen", narration="x", screen={"type": "bateria", "data": {"nivel": 500}})


@needs_ffmpeg
def test_montage_renders(slow, tmp_path):
    ep = tmp_path / "ep ç"
    for d in ("img", "voz", "sfx"):
        (ep / d).mkdir(parents=True)
    ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920", "-frames:v", "1", str(ep / "img/s01.png"))
    ff("-f", "lavfi", "-i", "color=c=navy:size=1080x1920", "-frames:v", "1", str(ep / "img/s 02.png"))
    for i in (1, 2, 3):
        ff("-f", "lavfi", "-i", f"sine=frequency={300 + 100 * i}:duration=1", "-c:a", "libmp3lame",
           str(ep / f"voz/s0{i}.mp3"))
    ff("-f", "lavfi", "-i", "sine=frequency=900:duration=0.3", "-c:a", "libmp3lame", str(ep / "sfx/s02.mp3"))
    ff("-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.1:duration=1.5", "-c:a", "libmp3lame",
       str(ep / "sfx/amb.mp3"))
    cenas = Cenas(cenas=[
        Cena(id="s01", kind="image", narration="Era uma noite comum.", prompt="x", camera="zoom-in"),
        Cena(id="s02", kind="image", narration="Até que o céu ficou vermelho.", prompt="y", camera="pan-right",
             sfx="boom"),
        Cena(id="s03", kind="screen", narration="Chegou o alerta.", screen={"type": "alerta", "data": ALERTA})])
    voz = Voz(cenas=[{"id": f"s0{i}", "file": f"voz/s0{i}.mp3", "dur": 1.0, "sha": "x"} for i in (1, 2, 3)])
    p = Project(ep)
    render.init_composition(p, "9:16")
    montage.build(ep, cenas, voz, {"s01": "img/s01.png", "s02": "img/s 02.png"}, {"s02": "sfx/s02.mp3"},
                  "sfx/amb.mp3", legenda=True)
    assert render.check(p.comp, "9:16") == []
    out = ep / "out/final.mp4"
    render.render_final(p.comp, out, -14)
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                           "stream=width,height:format=duration", "-of", "default=nw=1", str(out)],
                          capture_output=True, text=True, check=True).stdout
    assert "width=1080" in info and "height=1920" in info
    assert abs(float(re.search(r"duration=([\d.]+)", info).group(1)) - 3.75) <= 0.2
