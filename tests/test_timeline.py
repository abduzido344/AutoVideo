import pytest
from pydantic import ValidationError
from autovideo.timeline import Word, Segment, Timeline, Overlay, Zoom, Sfx, plan_segments, remap_words

def w(text, s, e, src="a.mp4"):
    return Word(text=text, start=s, end=e, src=src)

WORDS = [w("Olá", 0.5, 0.8), w("pessoal", 0.85, 1.3),            # bloco 1
         w("é", 2.5, 2.6),                                       # filler isolado
         w("hoje", 2.7, 3.0), w("vamos", 3.05, 3.4)]             # bloco 2

def test_gap_creates_new_segment_with_padding():
    segs = plan_segments(WORDS, drop={2}, durations={"a.mp4": 10})
    assert [(s.in_, s.out) for s in segs] == [(0.42, 1.38), (2.62, 3.48)]

def test_padding_never_overlaps_previous_segment():
    words = [w("a", 1.0, 1.2), w("b", 1.25, 1.3), w("c", 1.32, 1.5)]
    segs = plan_segments(words, drop={1}, durations={"a.mp4": 10})
    assert segs[1].in_ >= segs[0].out

def test_padding_clamped_to_media_bounds():
    segs = plan_segments([w("x", 0.02, 0.5), w("y", 0.6, 9.98)], drop=set(), durations={"a.mp4": 10})
    assert segs[0].in_ == 0 and segs[-1].out == 10

def test_source_change_starts_new_segment():
    words = [w("a", 0, 1, "a.mp4"), w("b", 0, 1, "b.mp4")]
    segs = plan_segments(words, drop=set(), durations={"a.mp4": 5, "b.mp4": 5})
    assert [s.src for s in segs] == ["a.mp4", "b.mp4"]

def test_remap_words_to_output_axis():
    segs = plan_segments(WORDS, drop={2}, durations={"a.mp4": 10})
    out = remap_words(WORDS, {2}, segs)
    assert [x.text for x in out] == ["Olá", "pessoal", "hoje", "vamos"]
    assert out[0].start == pytest.approx(0.08)
    # segundo bloco começa após 0.96 s do primeiro segmento
    assert out[2].start == pytest.approx(0.96 + 0.08)
    assert all(x.src == "out" for x in out)

def test_timeline_duration_and_alias_roundtrip(tmp_path):
    t = Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 1.0}, out=3.5)])
    assert t.duration == pytest.approx(2.5)
    t.dump(tmp_path / "t.json")
    assert '"in": 1.0' in (tmp_path / "t.json").read_text()
    assert Timeline.load(tmp_path / "t.json").segments[0].in_ == 1.0

def test_overlay_past_end_is_rejected():
    with pytest.raises(ValidationError, match="ultrapassa"):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 overlays=[Overlay(start=1.5, dur=1.0, src="compositions/hook.html")])

def test_segment_out_before_in_rejected():
    with pytest.raises(ValidationError):
        Segment(src="a.mp4", **{"in": 3}, out=2)

def test_zoom_outside_duration_rejected():
    with pytest.raises(ValidationError, match="ultrapassa"):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 zooms=[Zoom(at=1.9, dur=0.5)])

def test_dropped_short_filler_is_excluded_from_segments():
    words = [w("a", 1.0, 1.2), w("b", 1.25, 1.3), w("c", 1.32, 1.5)]
    segs = plan_segments(words, drop={1}, durations={"a.mp4": 10})
    for s in segs:
        assert not (s.in_ < 1.3 and s.out > 1.25)  # b não pode ficar audível
    assert [x.text for x in remap_words(words, {1}, segs)] == ["a", "c"]

def test_remap_keeps_word_starting_after_segment_start():
    words = [w("a", 1.0, 1.2), w("b", 1.21, 1.25), w("c", 1.26, 1.5)]
    segs = plan_segments(words, drop={1}, durations={"a.mp4": 10})
    out = remap_words(words, {1}, segs)
    assert [x.text for x in out] == ["a", "c"]

def test_touching_segments_merge():
    words = [w("x", 0, 0.5), w("d", 0.5, 0.5), w("y", 0.5, 0.9)]
    segs = plan_segments(words, drop={1}, durations={"a.mp4": 10})
    assert [(s.in_, s.out) for s in segs] == [(0, 0.98)]

def test_remap_raises_when_kept_word_outside_segments():
    segs = [Segment(src="a.mp4", **{"in": 0}, out=1)]
    with pytest.raises(ValueError, match="fora de qualquer segmento"):
        remap_words(WORDS, {2}, segs)

def test_unknown_key_in_timeline_rejected():
    with pytest.raises(ValidationError):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 zooms=[{"at": 0, "dur": 1, "zoom": 1.3}])

def test_unknown_key_in_segment_rejected():
    with pytest.raises(ValidationError):
        Segment(**{"in": 0, "out": 1, "src": "a", "foo": 1})

def test_sfx_past_end_rejected():
    with pytest.raises(ValidationError, match="ultrapassa"):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 sfx=[Sfx(at=2.5, src="whoosh.wav")])
