import json
import httpx
import pytest
from autovideo import eleven
from tests.conftest import ff, needs_ffmpeg


@pytest.fixture(autouse=True)
def env(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)


def client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


@needs_ffmpeg
def test_tts_sends_context_and_key(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    mp3 = tmp_path / "s.mp3"
    ff("-f", "lavfi", "-i", "sine=frequency=440:duration=1", str(mp3))
    seen = {}

    def h(req):
        seen["key"], seen["body"], seen["url"] = req.headers["xi-api-key"], json.loads(req.content), str(req.url)
        return httpx.Response(200, content=mp3.read_bytes())

    out = tmp_path / "o" / "v.mp3"
    dur = eleven.tts("oi", "VID", out, previous_text="antes", next_text="depois", client=client(h))
    assert seen["key"] == "k" and seen["body"]["previous_text"] == "antes" and seen["body"]["next_text"] == "depois"
    assert "/text-to-speech/VID" in seen["url"] and "mp3_44100_128" in seen["url"]
    assert out.exists() and abs(dur - 1.0) < 0.2


def test_missing_key_message(tmp_path):
    with pytest.raises(eleven.MissingKey, match="ELEVENLABS_API_KEY"):
        eleven.sfx("boom", 1, tmp_path / "s.mp3", client=client(lambda r: httpx.Response(200)))


def test_sfx_clamps_duration(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    seen = {}

    def h(req):
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, content=b"x")

    out = tmp_path / "s.mp3"
    eleven.sfx("boom", 40, out, client=client(h))
    assert seen["body"]["duration_seconds"] == 22 and out.read_bytes() == b"x"


def test_http_error_no_partial(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    out = tmp_path / "s.mp3"
    with pytest.raises(RuntimeError, match="500"):
        eleven.sfx("boom", 1, out, client=client(lambda r: httpx.Response(500, text="falhou")))
    assert not out.exists() and not out.with_name("s.mp3.part").exists()
