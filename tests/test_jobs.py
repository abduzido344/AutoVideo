from pathlib import Path
from autovideo.jobs import JobStore, run_job, approve, reject, Ctx
from autovideo.project import Project

def mk_stages(calls, boom=None):
    def make(name, art):
        def fn(ctx):
            calls.append(name)
            if name == boom:
                raise RuntimeError("explodiu")
            p = ctx.project.root / art
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(name)
        return (name, art, fn)
    return [make("a", "a.txt"), ("gate1", "approvals/gate1.ok", None),
            make("b", "b.txt"), make("c", "out/c.txt"), ("gate2", "approvals/gate2.ok", None)]

def setup(tmp_path, auto=False):
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create(str(tmp_path / "p 1"), "talking-head-punchy", auto)
    make_ctx = lambda job: Ctx(project=Project(Path(job["project_dir"])), recipe=None, job=job, agent=None)
    return store, jid, make_ctx

def test_stops_at_gate_and_resumes_after_approve(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert store.get(jid)["stage"] == "gate1"
    approve(store, jid, st)
    assert store.get(jid)["status"] == "queued"
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert calls == ["a", "b", "c"]          # "a" não reexecuta

def test_auto_skips_gates(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    assert run_job(store, jid, mk_stages(calls), mk) == "completed"

def test_failure_marks_failed_and_resume_continues(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    assert run_job(store, jid, mk_stages(calls, boom="b"), mk) == "failed"
    job = store.get(jid)
    assert job["stage"] == "b" and "explodiu" in job["error"]
    assert run_job(store, jid, mk_stages(calls), mk) == "completed"   # Review Focus 5
    assert calls == ["a", "b", "b", "c"]

def test_reject_clears_only_downstream_and_saves_feedback(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk); approve(store, jid, st); run_job(store, jid, st, mk)
    root = Path(store.get(jid)["project_dir"])
    reject(store, jid, st, "zoom demais")
    assert (root / "a.txt").exists() and (root / "approvals/gate1.ok").exists()
    assert not (root / "b.txt").exists() and not (root / "out/c.txt").exists()
    assert "zoom demais" in (root / "feedback.md").read_text(encoding="utf-8")
    assert store.get(jid)["status"] == "queued"
