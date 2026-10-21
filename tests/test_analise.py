import ipaddress
import json
import httpx
import pytest
from autovideo import agents, analise, config, data, transcribe
from autovideo.jobs import JobStore
from conftest import needs_ffmpeg

ESTILO = {"titulo": "Analisado", "paleta": ["#001122"], "imagem_prefixo": "flat cartoon"}


@pytest.fixture(autouse=True)
def dns(monkeypatch):
    def ips(host):
        try:
            return [str(ipaddress.ip_address(host))]
        except ValueError:
            return ["127.0.0.1"] if host == "localhost" else ["93.184.216.34"]
    monkeypatch.setattr(analise, "_ips", ips)


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
        (output.parent / "estilo.md").write_text("estilo", encoding="utf-8")
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


def _fake_apify(urls, body=b"x" * 10):
    def h(req):
        if req.url.host == "api.apify.com":
            return httpx.Response(200, json=[{"videoUrl": u} for u in urls])
        return httpx.Response(200, content=body)
    return httpx.Client(transport=httpx.MockTransport(h))


def test_download_caps_count_and_scheme(env, tmp_path):
    urls = ["file:///etc/passwd", "ftp://x/v.mp4", *[f"https://cdn.example/{i}.mp4" for i in range(5)]]
    out = analise._baixar("abc", tmp_path, _fake_apify(urls))
    assert len(out) == 3 and all(v.read_bytes() == b"x" * 10 for v in out)
    with pytest.raises(RuntimeError, match="não devolveu vídeos"):
        analise._baixar("abc", tmp_path, _fake_apify(["file:///x"]))


def test_download_size_cap(env, tmp_path, monkeypatch):
    monkeypatch.setattr(analise, "MAX_BYTES", 5)
    with pytest.raises(RuntimeError, match="maior que"):
        analise._baixar("abc", tmp_path, _fake_apify(["https://cdn.example/a.mp4"]))
    assert not list(tmp_path.rglob("video.mp4*"))


def test_failed_agent_keeps_existing_style(env, monkeypatch):
    from autovideo.project import home
    est = home() / "estilos" / "abc"
    est.mkdir(parents=True)
    (est / "estilo.json").write_text(json.dumps(ESTILO), encoding="utf-8")
    (est / "estilo.md").write_text("antigo", encoding="utf-8")
    monkeypatch.setattr(analise, "_baixar", lambda *a: [])

    def ruim(role, cwd, task, output, validate=None, context=""):
        output.write_text("{lixo", encoding="utf-8")
        (output.parent / "estilo.md").write_text("novo", encoding="utf-8")
        raise agents.AgentOutputError("inválido")

    monkeypatch.setattr(agents, "run_role", ruim)
    jid = analise.criar_job(env, "abc")
    assert analise.run_job(env, jid) == "failed"
    assert (est / "estilo.md").read_text(encoding="utf-8") == "antigo"
    assert json.loads((est / "estilo.json").read_text(encoding="utf-8"))["titulo"] == "Analisado"


def test_invalid_estilo_json_skipped_by_list(env):
    from autovideo.project import home
    bad = home() / "estilos" / "ruim"
    bad.mkdir(parents=True)
    (bad / "estilo.json").write_text("{lixo", encoding="utf-8")
    assert "ruim" not in {e["slug"] for e in data.list_estilos()}


def test_slug_collision_gets_suffix(env):
    a, b = analise.criar_job(env, "a_b"), analise.criar_job(env, "a.b")
    assert analise.criar_job(env, "a_b") != a
    dirs = {env.get(j)["project_dir"].split("estilos")[-1] for j in (a, b)}
    assert len(dirs) == 2
    assert env.get(analise.criar_job(env, "a_b"))["project_dir"] == env.get(a)["project_dir"]


def test_download_rejects_local_hosts_and_redirects(env, tmp_path):
    for u in ("http://localhost/v.mp4", "http://127.0.0.1/v.mp4", "http://10.0.0.5/v.mp4", "http://169.254.169.254/x"):
        with pytest.raises(RuntimeError, match="recusada"):
            analise._baixar("abc", tmp_path, _fake_apify([u]))

    def h(req):
        if req.url.host == "api.apify.com":
            return httpx.Response(200, json=[{"videoUrl": "https://cdn.example/v.mp4"}])
        if req.url.host == "cdn.example":
            return httpx.Response(302, headers={"location": "http://127.0.0.1/x"})
        pytest.fail("seguiu o redirect para host local")

    with pytest.raises(RuntimeError, match="recusada"):
        analise._baixar("abc", tmp_path, httpx.Client(transport=httpx.MockTransport(h)))


def test_download_follows_safe_redirect_with_hop_limit(env, tmp_path):
    def h(req):
        if req.url.host == "api.apify.com":
            return httpx.Response(200, json=[{"videoUrl": "https://cdn.example/a"}])
        if req.url.path == "/a":
            return httpx.Response(302, headers={"location": "/b"})
        return httpx.Response(200, content=b"ok")

    assert analise._baixar("abc", tmp_path, httpx.Client(transport=httpx.MockTransport(h)))[0].read_bytes() == b"ok"

    def loop(req):
        if req.url.host == "api.apify.com":
            return httpx.Response(200, json=[{"videoUrl": "https://cdn.example/a"}])
        return httpx.Response(302, headers={"location": "/a"})

    with pytest.raises(RuntimeError, match="redirecionamentos"):
        analise._baixar("abc", tmp_path / "2", httpx.Client(transport=httpx.MockTransport(loop)))
