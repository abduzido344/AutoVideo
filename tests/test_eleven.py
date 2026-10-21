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
        eleven._post("/x", {}, tmp_path / "s.mp3", client(lambda r: httpx.Response(200)))


def test_http_error_no_partial(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    out = tmp_path / "s.mp3"
    with pytest.raises(RuntimeError, match="500"):
        eleven._post("/x", {}, out, client(lambda r: httpx.Response(500, text="falhou")))
    assert not out.exists() and not out.with_name("s.mp3.part").exists()


@needs_ffmpeg
def test_tts_bad_audio_no_leftover(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    out = tmp_path / "v.mp3"
    with pytest.raises(RuntimeError, match="inválido"):
        eleven.tts("oi", "V", out, client=client(lambda r: httpx.Response(200, content=b"nao e audio")))
    assert not out.exists()


def test_vozes_lists_with_labels(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    seen = {}

    def h(req):
        seen["key"] = req.headers["xi-api-key"]
        return httpx.Response(200, json={"voices": [
            {"voice_id": "a", "name": "Ana", "preview_url": "http://p/a.mp3", "labels": {"accent": "paulista", "gender": "female"}},
            {"voice_id": "b", "name": "Beto"}]})

    out = eleven.vozes(client=client(h))
    assert seen["key"] == "k"
    assert out[0] == {"voice_id": "a", "nome": "Ana", "preview_url": "http://p/a.mp3", "descricao": "paulista, female"}
    assert out[1]["descricao"] == "" and out[1]["preview_url"] is None


def test_vozes_errors(monkeypatch):
    with pytest.raises(eleven.MissingKey):
        eleven.vozes(client=client(lambda r: httpx.Response(200)))
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    with pytest.raises(RuntimeError, match="inválida"):
        eleven.vozes(client=client(lambda r: httpx.Response(401, text="no")))


def test_key_id_instead_of_key_has_clear_message(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "abc123")
    body = {"detail": {"type": "authentication_error", "status": "api_key_id_used_as_api_key"}}
    c = httpx.Client(transport=httpx.MockTransport(lambda q: httpx.Response(400, json=body)))
    with pytest.raises(RuntimeError, match="começa com sk_"):
        eleven.vozes(client=c)
