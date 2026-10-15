from fastapi.testclient import TestClient
from autovideo.jobs import JobStore
from autovideo.server import create_app


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    return store, TestClient(create_app(store, start_worker=False))


def _mk(c, name="a b.mp4", recipe="talking-head-punchy"):
    return c.post("/api/jobs", data={"recipe": recipe, "auto": "false"},
                  files=[("videos", (name, b"fake", "video/mp4")), ("script", ("r.md", "Olá".encode(), "text/markdown"))])


def test_create_list_and_reject(tmp_path, monkeypatch):
    store, c = _client(tmp_path, monkeypatch)
    assert "talking-head-punchy" in c.get("/api/recipes").json()
    assert c.get("/api/stages").json()[0] == "ingest"
    jid = _mk(c).json()["id"]
    assert c.get("/api/jobs").json()[0]["id"] == jid
    store.set(jid, status="awaiting_approval", stage="gate1")
    assert c.post(f"/api/jobs/{jid}/reject", json={"feedback": "mais curto"}).status_code == 200
    assert store.get(jid)["status"] == "queued"
    files = c.get(f"/api/jobs/{jid}").json()["files"]
    assert files["has_final"] is False and files["decisions"] == []


def test_reject_gate2_redoes_from_copywriter(tmp_path, monkeypatch):
    from pathlib import Path
    store, c = _client(tmp_path, monkeypatch)
    jid = _mk(c).json()["id"]
    root = Path(store.get(jid)["project_dir"])
    for rel in ("brief.md", "approvals/gate1.ok", "edit.json"):
        (root / rel).parent.mkdir(parents=True, exist_ok=True); (root / rel).write_text("x")
    store.set(jid, status="awaiting_approval", stage="gate2")
    assert c.post(f"/api/jobs/{jid}/reject", json={"feedback": "x"}).status_code == 200
    assert (root / "brief.md").exists() and not (root / "edit.json").exists()


def test_gate_errors_409_and_unknown_404(tmp_path, monkeypatch):
    store, c = _client(tmp_path, monkeypatch)
    jid = _mk(c).json()["id"]  # queued, não em gate
    assert c.post(f"/api/jobs/{jid}/approve").status_code == 409
    assert c.post(f"/api/jobs/{jid}/reject", json={"feedback": "x"}).status_code == 409
    assert c.get("/api/jobs/999").status_code == 404
    assert c.post("/api/jobs/999/approve").status_code == 404
    assert c.post("/api/jobs/999/reject", json={"feedback": "x"}).status_code == 404


def test_create_validation(tmp_path, monkeypatch):
    store, c = _client(tmp_path, monkeypatch)
    assert _mk(c, recipe="../x").status_code == 400
    assert _mk(c, recipe="nope").status_code == 400
    assert _mk(c, name="").status_code in (400, 422)
    two = c.post("/api/jobs", data={"recipe": "talking-head-punchy"},
                 files=[("videos", ("a.mp4", b"1", "video/mp4")), ("videos", ("A.mp4", b"2", "video/mp4"))])
    assert two.status_code == 400  # nomes repetidos (ValueError do pipeline)
    assert store.list() == []


def test_upload_name_sanitized_keeps_accents(tmp_path, monkeypatch):
    from pathlib import Path
    store, c = _client(tmp_path, monkeypatch)
    r = _mk(c, name="../../evil é.mp4")
    assert r.status_code == 200
    root = Path(store.get(r.json()["id"])["project_dir"])
    assert [p.name for p in (root / "input/raw").iterdir()] == ["evil é.mp4"]
    assert not (tmp_path.parent / "evil é.mp4").exists()


def test_has_final_only_with_review_marker(tmp_path, monkeypatch):
    from pathlib import Path
    store, c = _client(tmp_path, monkeypatch)
    jid = _mk(c).json()["id"]
    out = Path(store.get(jid)["project_dir"]) / "out"
    out.mkdir(); (out / "final.mp4").write_bytes(b"old")
    assert c.get(f"/api/jobs/{jid}").json()["files"]["has_final"] is False
    (out / "review.json").write_text("{}")
    assert c.get(f"/api/jobs/{jid}").json()["files"]["has_final"] is True


def test_projects_static_serves_and_does_not_escape(tmp_path, monkeypatch):
    store, c = _client(tmp_path, monkeypatch)
    (tmp_path / "ok.txt").write_text("hi")
    (tmp_path.parent / "secret.txt").write_text("nope")
    assert c.get("/projects/ok.txt").text == "hi"
    assert c.get("/projects/../secret.txt").status_code == 404
    assert c.get("/projects/%2e%2e/secret.txt").status_code == 404


def test_blocks_foreign_origin_and_host(tmp_path, monkeypatch):
    store, c = _client(tmp_path, monkeypatch)
    jid = _mk(c).json()["id"]
    store.set(jid, status="awaiting_approval", stage="gate1")
    assert c.post(f"/api/jobs/{jid}/approve", headers={"Origin": "http://evil.example"}).status_code == 403
    assert c.post(f"/api/jobs/{jid}/approve", headers={"Origin": "http://testserver"}).status_code == 200
    assert c.get("/api/recipes", headers={"Host": "evil.example"}).status_code == 400


def test_serve_requeues_stale_before_worker(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create(str(tmp_path / "p"), "talking-head-punchy", False)
    store.set(jid, status="in_progress")
    monkeypatch.setattr("autovideo.server.threading.Thread", lambda **kw: type("T", (), {"start": lambda s: None})())
    create_app(store)
    assert store.get(jid)["status"] == "queued"
