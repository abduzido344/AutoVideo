from pathlib import Path
import pytest
from autovideo.jobs import JobStore, run_job, approve, reject, Ctx, GateError
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

def simple(calls, name, art):
    def fn(ctx):
        calls.append(name)
        p = ctx.project.root / art
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(name)
    return (name, art, fn)

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

def test_approve_requires_gate_awaiting_approval(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    root = Path(store.get(jid)["project_dir"])
    with pytest.raises(GateError):           # queued, stage ""
        approve(store, jid, st)
    assert store.get(jid)["status"] == "queued" and not (root / "approvals/gate1.ok").exists()
    store.set(jid, status="in_progress", stage="gate1")
    with pytest.raises(GateError):           # in_progress at a gate
        approve(store, jid, st)
    assert store.get(jid)["status"] == "in_progress" and not (root / "approvals/gate1.ok").exists()
    assert calls == []

def test_stale_approve_after_reject_raises(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk); approve(store, jid, st); run_job(store, jid, st, mk)
    root = Path(store.get(jid)["project_dir"])
    reject(store, jid, st, "refazer")
    with pytest.raises(GateError):
        approve(store, jid, st)
    assert not (root / "approvals/gate2.ok").exists()
    assert store.get(jid)["stage"] == ""

def test_fail_stale_marks_in_progress_failed_interrompido(tmp_path):
    store, jid, _ = setup(tmp_path)
    jid2 = store.create(str(tmp_path / "p 2"), "talking-head-punchy", False)
    store.set(jid, status="in_progress")
    store.set(jid2, status="awaiting_approval")
    assert store.fail_stale() == 1
    assert store.get(jid)["status"] == "failed" and store.get(jid)["error"] == "interrompido"
    assert store.get(jid2)["status"] == "awaiting_approval"


def test_resume_only_requeues_failed(tmp_path):
    store, jid, _ = setup(tmp_path)
    assert store.resume(jid) is False  # queued
    store.set(jid, status="failed", error="interrompido")
    assert store.resume(jid) is True
    assert store.get(jid)["status"] == "queued" and store.get(jid)["error"] == ""
    with pytest.raises(KeyError):
        store.resume(999)

def test_failed_stage_leaves_no_partial_artifact(tmp_path):
    store, jid, mk = setup(tmp_path, auto=True)
    def half(ctx):
        (ctx.project.root / "b.txt").write_text("meio")
        raise RuntimeError("meio")
    stages = [("a", "a.txt", lambda ctx: (ctx.project.root / "a.txt").write_text("a")), ("b", "b.txt", half)]
    assert run_job(store, jid, stages, mk) == "failed"
    job = store.get(jid)
    assert job["status"] == "failed" and job["stage"] == "b" and "meio" in job["error"]
    assert not (Path(job["project_dir"]) / "b.txt").exists()

def test_base_exception_removes_artifact_marks_failed_and_reraises(tmp_path):
    store, jid, mk = setup(tmp_path, auto=True)
    def interrupted(ctx):
        (ctx.project.root / "b.txt").write_text("x")
        raise KeyboardInterrupt
    with pytest.raises(KeyboardInterrupt):
        run_job(store, jid, [("b", "b.txt", interrupted)], mk)
    job = store.get(jid)
    assert job["status"] == "failed" and not (Path(job["project_dir"]) / "b.txt").exists()

def test_get_unknown_job_raises_keyerror(tmp_path):
    store = JobStore(tmp_path / "jobs.db")
    with pytest.raises(KeyError):
        store.get(999)

def test_reject_redo_from_keeps_earlier_stages(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = [simple(calls, "a", "a.txt"), simple(calls, "x", "x.txt"),
          ("gate1", "approvals/gate1.ok", None), simple(calls, "b", "b.txt")]
    run_job(store, jid, st, mk)              # a, x -> gate1
    root = Path(store.get(jid)["project_dir"])
    (root / "approvals").mkdir(parents=True, exist_ok=True)
    (root / "approvals/gate1.ok").write_text("stale")   # checks the current gate file is removed too
    with pytest.raises(GateError):           # "b" is after gate1, not before it
        reject(store, jid, st, "x", redo_from="b")
    assert store.get(jid)["status"] == "awaiting_approval" and (root / "x.txt").exists()
    reject(store, jid, st, "refazer x", redo_from="x")
    assert (root / "a.txt").exists()         # earlier stage survives
    assert not (root / "x.txt").exists() and not (root / "approvals/gate1.ok").exists()
    assert store.get(jid)["status"] == "queued" and store.get(jid)["stage"] == ""
    assert "refazer x" in (root / "feedback.md").read_text(encoding="utf-8")
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert calls == ["a", "x", "x"]          # a not redone

def test_reject_without_redo_from_at_first_gate_clears_from_start(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = [simple(calls, "a", "a.txt"), simple(calls, "x", "x.txt"),
          ("gate1", "approvals/gate1.ok", None), simple(calls, "b", "b.txt")]
    run_job(store, jid, st, mk)              # a, x -> gate1
    root = Path(store.get(jid)["project_dir"])
    reject(store, jid, st, "do de novo")     # redo_from=None
    assert not (root / "a.txt").exists() and not (root / "x.txt").exists()
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert calls == ["a", "x", "a", "x"]


def test_worker_cannot_see_queued_before_reject_file_work(tmp_path, monkeypatch):
    from autovideo import jobs
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk); approve(store, jid, st); run_job(store, jid, st, mk)  # -> gate2
    seen = []
    real = jobs._remove
    def spy(p):
        # chamado no meio do reject, com o lock seguro: outra thread não pode reivindicar o job
        import threading
        t = threading.Thread(target=lambda: seen.append(store.next_queued()))
        t.start(); t.join(timeout=0.3)
        assert t.is_alive() or seen == [None]  # bloqueada pelo lock (ou viu nenhum queued)
        real(p)
    monkeypatch.setattr(jobs, "_remove", spy)
    reject(store, jid, st, "x")
    monkeypatch.undo()
    assert store.get(jid)["status"] == "queued"
    assert store.next_queued()["id"] == jid
    assert all(s is None or s["id"] == jid for s in seen)


def test_gate_status_checked_before_file_work(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk)  # gate1
    root = Path(store.get(jid)["project_dir"])
    store.set(jid, status="in_progress")  # worker/CLI já pegou: gate não pode mexer em arquivos
    for fn in (lambda: approve(store, jid, st), lambda: reject(store, jid, st, "x")):
        with pytest.raises(GateError):
            fn()
    assert not (root / "approvals/gate1.ok").exists() and (root / "a.txt").exists()


def test_claim_is_atomic_and_run_job_runs_from_in_progress(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    c = store.claim_next()
    assert c["id"] == jid and store.get(jid)["status"] == "in_progress"
    assert store.claim(jid) is False and store.claim_next() is None
    assert run_job(store, jid, mk_stages(calls), mk) == "awaiting_approval"


def test_partial_artifact_without_marker_is_rerun(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    a, b = simple(calls, "a", "a.txt"), simple(calls, "b", "b.txt")
    assert run_job(store, jid, [a], mk) == "completed"
    root = Path(store.get(jid)["project_dir"])
    assert (root / ".stages/a.ok").exists()
    (root / "b.txt").write_text("meio")  # hard kill no meio de b: artefato sem marcador
    assert run_job(store, jid, [a, b], mk) == "completed"
    assert calls == ["a", "b"] and (root / "b.txt").read_text() == "b" and (root / ".stages/b.ok").exists()


def test_marker_without_artifact_reruns(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    a = simple(calls, "a", "a.txt")
    run_job(store, jid, [a], mk)
    (Path(store.get(jid)["project_dir"]) / "a.txt").unlink()
    run_job(store, jid, [a], mk)
    assert calls == ["a", "a"]


def test_legacy_project_without_stages_dir_is_skipped_and_migrated(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    root = Path(store.get(jid)["project_dir"])
    root.mkdir(parents=True)
    (root / "a.txt").write_text("velho")
    (root / "x.txt").write_text("velho")
    st = [simple(calls, "a", "a.txt"), simple(calls, "x", "x.txt"), simple(calls, "b", "b.txt")]
    assert run_job(store, jid, st, mk) == "completed"
    assert calls == ["b"] and (root / ".stages/a.ok").exists()  # migrado: o próximo run não refaz "a" nem "x"
    assert (root / "x.txt").read_text() == "velho"
    run_job(store, jid, st, mk)
    assert calls == ["b"]


def test_gates_and_reject_keep_markers_consistent(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk); approve(store, jid, st)
    root = Path(store.get(jid)["project_dir"])
    assert (root / ".stages/gate1.ok").exists()
    run_job(store, jid, st, mk)  # -> gate2
    assert {m.name for m in (root / ".stages").iterdir()} == {"a.ok", "gate1.ok", "b.ok", "c.ok"}
    reject(store, jid, st, "refazer")  # sem redo_from: refaz b, c (depois do gate1)
    assert {m.name for m in (root / ".stages").iterdir()} == {"a.ok", "gate1.ok"}


def test_auto_gate_writes_marker(tmp_path):
    store, jid, mk = setup(tmp_path, auto=True)
    run_job(store, jid, [("g", "approvals/g.ok", None)], mk)
    assert (Path(store.get(jid)["project_dir"]) / ".stages/g.ok").exists()


def test_approve_legacy_project_parked_at_gate_does_not_rerun(tmp_path):
    # projeto de antes dos marcadores, parado no gate1: aprovar não pode apagar/refazer "a"
    calls = []
    store, jid, mk = setup(tmp_path)
    root = Path(store.get(jid)["project_dir"]); root.mkdir(parents=True)
    (root / "a.txt").write_text("a")
    store.set(jid, status="awaiting_approval", stage="gate1")
    st = mk_stages(calls)
    approve(store, jid, st)
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert calls == ["b", "c"] and (root / "a.txt").read_text() == "a"
