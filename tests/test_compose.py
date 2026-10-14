import json
from html.parser import HTMLParser
import pytest
from autovideo.compose import build_html, write_composition, ComposeError
from autovideo.timeline import Timeline, Segment, Zoom, Overlay, Word, Music, BRoll, Sfx


class Grab(HTMLParser):
    def __init__(self): super().__init__(); self.tags = []
    def handle_starttag(self, tag, attrs): self.tags.append((tag, dict(attrs)))

T = Timeline(width=1080, height=1920,
             segments=[Segment(src="input/a.clean.mp4", **{"in": 1.0}, out=3.0),
                       Segment(src="input/a.clean.mp4", **{"in": 5.0}, out=6.5)],
             zooms=[Zoom(at=0.5, dur=1.0, scale=1.2, kind="push", origin="50% 30%")],
             overlays=[Overlay(start=0, dur=2, src="compositions/hook.html", vars={"title": "Olá 'x'"})],
             music=Music(src="assets/m.mp3"), captions=False)

def tags(html):
    g = Grab(); g.feed(html); return g.tags

def test_segments_become_trimmed_video_clips():
    vids = [a for t, a in tags(build_html(T, [])) if t == "video"]
    assert [(v["data-start"], v["data-duration"], v["data-media-start"]) for v in vids] == \
           [("0", "2", "1"), ("2", "1.5", "5")]
    assert all(v["src"] == "assets/a.clean.mp4" and v["data-fade-in"] == "0.03" for v in vids)

def test_root_duration_and_size():
    root = next(a for t, a in tags(build_html(T, [])) if a.get("data-composition-id") == "main")
    assert root["data-duration"] == "3.5" and root["data-width"] == "1080"

def test_overlay_vars_are_escaped_json():
    ov = next(a for t, a in tags(build_html(T, [])) if a.get("data-composition-src") == "compositions/hook.html")
    assert json.loads(ov["data-variable-values"]) == {"title": "Olá 'x'"}

    # HyperFrames liga a timeline da sub-composição pelo data-composition-id do host == id do arquivo
    assert ov["data-composition-id"] == "hook" and ov["id"] == "ov-0"
def test_timed_media_have_ids():
    # HyperFrames só descobre mídia com id; sem ele o áudio sai mudo no render
    t = T.model_copy(update={"broll": [BRoll(start=0, dur=1, src="assets/b.mp4")],
                             "sfx": [Sfx(at=0.5, src="assets/s.mp3")]})
    timed = [a for name, a in tags(build_html(t, [])) if name in ("video", "audio") and "data-start" in a]
    assert timed and all(a.get("id") for a in timed)

def test_zoom_tween_emitted():
    h = build_html(T, [])
    assert 'tl.fromTo("#cam"' in h and "scale: 1.2" in h and '"50% 30%"' in h

def test_captions_injects_words(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    (comp / "compositions/captions.template.html").write_text("<script>const WORDS = /*AV_WORDS*/[];</script>", encoding="utf-8")
    t = T.model_copy(update={"captions": True})
    write_composition(comp, t, [Word(text="oi", start=0.1, end=0.3, src="out")])
    cap = (comp / "compositions/captions.html").read_text(encoding="utf-8")
    assert '"text": "oi"' in cap and "/*AV_WORDS*/" not in cap
    assert 'data-composition-src="compositions/captions.html"' in (comp / "index.html").read_text(encoding="utf-8")

def test_captions_missing_marker_raises(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    (comp / "compositions/captions.template.html").write_text("<div></div>", encoding="utf-8")
    with pytest.raises(ComposeError, match="AV_WORDS"):
        write_composition(comp, T.model_copy(update={"captions": True}), [])

def test_missing_template_raises(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    with pytest.raises(ComposeError, match="ausente"):
        write_composition(comp, T.model_copy(update={"captions": True}), [])

def test_caption_words_are_script_safe(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    (comp / "compositions/captions.template.html").write_text("<script>const WORDS = /*AV_WORDS*/[];</script>", encoding="utf-8")
    words = [Word(text="</script><b>", start=0, end=0.2, src="out"), Word(text="ação\u2028", start=0.2, end=0.4, src="out")]
    write_composition(comp, T.model_copy(update={"captions": True}), words)
    cap = (comp / "compositions/captions.html").read_text(encoding="utf-8")
    section = cap.split("const WORDS = ", 1)[1].split(";</script>", 1)[0]
    assert "</script><b>" not in section and "\u2028" not in section
    assert "ação" in section
    assert [x["text"] for x in json.loads(section)] == ["</script><b>", "ação\u2028"]

def test_zoom_origin_is_script_safe():
    z = Zoom(at=0.5, dur=1.0, scale=1.2, kind="push", origin="</script>")
    h = build_html(T.model_copy(update={"zooms": [z]}), [])
    assert '"</script>"' not in h and '"\\u003c/script>"' in h

def test_media_srcs_are_quoted_basenames():
    t = T.model_copy(update={"segments": [Segment(src="input/meu vídeo #1.mp4", **{"in": 0}, out=1)],
                             "music": Music(src="input/faixa ç?.mp3")})
    h = build_html(t, [])
    seg = next(a for tg, a in tags(h) if tg == "video")
    music = next(a for tg, a in tags(h) if tg == "audio" and a.get("id") == "music")
    assert seg["src"] == "assets/meu%20v%C3%ADdeo%20%231.mp4"
    assert music["src"] == "assets/faixa%20%C3%A7%3F.mp3"

def test_times_are_fixed_point():
    t = T.model_copy(update={"overlays": [Overlay(start=1234.567, dur=1.0, src="compositions/x.html"),
                                         Overlay(start=100.0, dur=1.0, src="compositions/y.html")]})
    h = build_html(t, [])
    assert 'data-start="1234.567"' in h and 'data-start="100"' in h

def test_punch_zoom_sets_scale_at_time():
    z = Zoom(at=2.0, dur=0.5, scale=1.1, kind="punch", origin="50% 30%")
    h = build_html(T.model_copy(update={"zooms": [z]}), [])
    assert 'tl.set("#cam", { scale: 1.1, transformOrigin: "50% 30%" }, 2);' in h
    assert 'tl.set("#cam", { scale: 1 }, 2.5);' in h
    assert "fromTo" not in h

def test_segments_fade_out():
    vids = [a for tg, a in tags(build_html(T, [])) if tg == "video"]
    assert all(v["data-fade-out"] == "0.03" for v in vids)

def test_broll_music_sfx_attributes():
    t = T.model_copy(update={"broll": [BRoll(start=1, dur=2, src="input/b.mp4", mode="pip")],
                             "sfx": [Sfx(at=0.5, src="input/s.wav", dur=0.8, volume=0.4)]})
    by_id = {a["id"]: a for _, a in tags(build_html(t, [])) if "id" in a}
    b = by_id["broll-0"]
    assert b["src"] == "assets/b.mp4" and b["class"] == "clip pip" and "muted" in b
    assert (b["data-start"], b["data-duration"], b["data-media-start"]) == ("1", "2", "0")
    s = by_id["sfx-0"]
    assert s["src"] == "assets/s.wav" and (s["data-start"], s["data-duration"], s["data-volume"]) == ("0.5", "0.8", "0.4")
    m = by_id["music"]
    assert m["src"] == "assets/m.mp3" and (m["data-start"], m["data-duration"], m["data-volume"], m["data-fade-out"]) == ("0", "3.5", "0.12", "1.5")
