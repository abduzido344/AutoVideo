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
