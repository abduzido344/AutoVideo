import json
import httpx
import pytest
from autovideo import agents, analise, config, data, transcribe
from autovideo.jobs import JobStore
from conftest import needs_ffmpeg

ESTILO = {"titulo": "Analisado", "paleta": ["#001122"], "imagem_prefixo": "flat cartoon"}


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.setenv("APIFY_TOKEN", "tok")
    return JobStore(tmp_path / "jobs.db")


def test_handle_normalization():
    for raw in ("@manualdobenji", "https://www.instagram.com/manualdobenji/", "instagram.com/manualdobenji/reels/", " manualdobenji "):
        assert analise.normalizar_handle(raw) == "manualdobenji"
    with pytest.raises(ValueError):
        analise.normalizar_handle("../../x")


@needs_ffmpeg
def test_analise_pipeline_with_fakes(env, media_dir, monkeypatch):
    seen = {}

    def handler(req):
        if req.url.host == "api.apify.com":
            seen["auth"], seen["body"] = req.headers["authorization"], json.loads(req.content)
            return httpx.Response(200, json=[{"videoUrl": "https://cdn.example/v.mp4"}])
        return httpx.Response(200, content=(media_dir / "talk.mp4").read_bytes())

    monkeypatch.setattr(transcribe, "transcribe", lambda media, src, workdir, **k: [
        transcribe.Word(text="olá", start=0, end=1, src=src), transcribe.Word(text="mundo", start=1, end=2, src=src)])

    def analista(role, cwd, task, output, validate=None, context=""):
        assert role.name == "analista"
        v1 = cwd / ".analise" / "v1"
        assert (v1 / "folha.jpg").stat().st_size > 0 and (v1 / "transcricao.txt").read_text(encoding="utf-8") == "olá mundo"
        (cwd / "estilo.md").write_text("estilo", encoding="utf-8")
        output.write_text(json.dumps(ESTILO), encoding="utf-8")
        validate(output)

    monkeypatch.setattr(agents, "run_role", analista)
    jid = analise.criar_job(env, "@manualdobenji")
    assert analise.run_job(env, jid, client=httpx.Client(transport=httpx.MockTransport(handler))) == "completed"
    assert seen == {"auth": "Bearer tok", "body": {"username": ["manualdobenji"], "resultsLimit": 3}}
    assert {"slug": "manualdobenji", "origem": "usuario", "titulo": "Analisado"} in data.list_estilos()
    assert env.get(jid)["status"] == "completed"


def test_missing_token_fails_readably(env, monkeypatch):
    monkeypatch.delenv("APIFY_TOKEN")
    monkeypatch.setattr(config, "load", lambda: {})
    jid = analise.criar_job(env, "abc")
    assert analise.run_job(env, jid) == "failed"
    assert "APIFY_TOKEN" in env.get(jid)["error"]


def test_usage_limit_requeues(env, monkeypatch):
    monkeypatch.setattr(analise, "_baixar", lambda *a: [])
    monkeypatch.setattr(agents, "run_role", lambda *a, **k: (_ for _ in ()).throw(agents.UsageLimit("usage limit")))
    jid = analise.criar_job(env, "abc")
    env.claim(jid)
    with pytest.raises(agents.UsageLimit):
        analise.run_job(env, jid)
    assert env.get(jid)["status"] == "queued"
