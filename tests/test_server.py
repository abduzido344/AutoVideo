from fastapi.testclient import TestClient
from autovideo import server
from autovideo.server import create_app


def _client():
    return TestClient(create_app(), base_url="http://127.0.0.1")


def test_blocks_foreign_origin_and_host(monkeypatch):
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: None)
    c = _client()
    assert c.post("/api/auth/login", headers={"Origin": "http://evil.example"}).status_code == 403
    assert c.post("/api/auth/login", headers={"Origin": "http://127.0.0.1"}).status_code == 200
    assert c.get("/api/auth", headers={"Host": "evil.example"}).status_code == 400


def test_vite_dev_proxy_origin_allowed(monkeypatch):
    # proxy com changeOrigin:false mantém Host=localhost:5173 e Origin=http://localhost:5173
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: None)
    h = {"Host": "localhost:5173", "Origin": "http://localhost:5173"}
    assert _client().post("/api/auth/login", headers=h).status_code == 200


def test_old_job_endpoints_are_gone():
    c = _client()
    assert c.get("/api/jobs").status_code == 404 and c.get("/api/recipes").status_code == 404


def test_doctor_caches_success_but_rechecks_failure(monkeypatch):
    calls, logged = [], [False]
    monkeypatch.setattr(server.doctor, "run_checks", lambda: calls.append(1) or [
        ("ffmpeg", True, "7.1"), ("claude auth", logged[0], "ok" if logged[0] else "rode claude login")])
    monkeypatch.setattr(server, "_doctor_ok", None)
    c = _client()
    a, b = c.get("/api/doctor").json(), c.get("/api/doctor").json()
    assert a == b == {"ok": False, "checks": [{"name": "ffmpeg", "ok": True, "detail": "7.1"},
                                             {"name": "claude auth", "ok": False, "detail": "rode claude login"}]}
    assert len(calls) == 2  # falha não fica em cache
    logged[0] = True  # usuário rodou claude login
    assert c.get("/api/doctor").json()["ok"] is True
    assert c.get("/api/doctor").json()["ok"] is True
    assert len(calls) == 3  # sucesso fica em cache


def test_auth_status_and_login_terminal(monkeypatch):
    c = _client()
    monkeypatch.setattr(server.doctor, "claude_auth", lambda: "logado (claude.ai)")
    assert c.get("/api/auth").json() == {"ok": True, "detail": "logado (claude.ai)"}

    def fail():
        raise server.doctor.hf.ToolError("sem autenticação do Claude" + chr(10) + "mais")
    monkeypatch.setattr(server.doctor, "claude_auth", fail)
    assert c.get("/api/auth").json() == {"ok": False, "detail": "sem autenticação do Claude"}

    opened = []
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: opened.append(1))
    assert c.post("/api/auth/login").json() == {"ok": True} and opened == [1]
    # POST vindo de outra página é barrado pelo Origin
    assert c.post("/api/auth/login", headers={"origin": "http://evil.example"}).status_code == 403 and opened == [1]


def test_open_login_terminal_runs_claude_auth_login(monkeypatch):
    from autovideo import doctor
    calls = []
    monkeypatch.setattr(doctor.subprocess, "Popen", lambda args, **kw: calls.append(args))
    doctor.open_login_terminal()
    assert len(calls) == 1 and "claude auth login" in " ".join(calls[0])
