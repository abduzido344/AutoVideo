# autovideo/jobs.py
import shutil
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from autovideo.project import Project

Stage = tuple[str, str, Callable | None]


@dataclass
class Ctx:
    project: Project
    recipe: object
    job: dict
    agent: Callable | None


class JobStore:
    def __init__(self, db: Path):
        db.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.con = sqlite3.connect(db, check_same_thread=False)
        self.con.row_factory = sqlite3.Row
        self.con.execute("""create table if not exists jobs(id integer primary key, project_dir text, recipe text,
            auto integer, status text, stage text, error text, created real, updated real)""")
        self.con.commit()

    def create(self, project_dir: str, recipe: str, auto: bool) -> int:
        with self._lock:
            cur = self.con.execute("insert into jobs(project_dir,recipe,auto,status,stage,error,created,updated)"
                                   " values(?,?,?,'queued','','',?,?)",
                                   (project_dir, recipe, int(auto), time.time(), time.time()))
            self.con.commit()
            return cur.lastrowid

    def get(self, jid: int) -> dict:
        return dict(self.con.execute("select * from jobs where id=?", (jid,)).fetchone())

    def list(self) -> list[dict]:
        return [dict(r) for r in self.con.execute("select * from jobs order by id desc")]

    def set(self, jid: int, **f) -> None:
        with self._lock:
            cols = ",".join(f"{k}=?" for k in f)
            self.con.execute(f"update jobs set {cols}, updated=? where id=?", (*f.values(), time.time(), jid))
            self.con.commit()

    def next_queued(self) -> dict | None:
        r = self.con.execute("select * from jobs where status='queued' order by id limit 1").fetchone()
        return dict(r) if r else None


def _art(job: dict, rel: str) -> Path:
    return Path(job["project_dir"]) / rel


def run_job(store: JobStore, jid: int, stages: list[Stage], make_ctx: Callable[[dict], Ctx]) -> str:
    job = store.get(jid)
    store.set(jid, status="in_progress", error="")
    ctx = make_ctx(job)
    for name, rel, fn in stages:
        if _art(job, rel).exists():
            continue
        store.set(jid, stage=name)
        if fn is None:
            if job["auto"]:
                p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("auto")
                continue
            store.set(jid, status="awaiting_approval")
            return "awaiting_approval"
        try:
            fn(ctx)
        except Exception as e:  # noqa: BLE001 — qualquer erro de etapa vira status failed
            store.set(jid, status="failed", error=f"{type(e).__name__}: {e}")
            return "failed"
    store.set(jid, status="completed")
    return "completed"


def approve(store: JobStore, jid: int, stages: list[Stage]) -> None:
    job = store.get(jid)
    rel = next(r for n, r, f in stages if n == job["stage"] and f is None)
    p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("ok")
    store.set(jid, status="queued")


def reject(store: JobStore, jid: int, stages: list[Stage], feedback: str) -> None:
    job = store.get(jid)
    idx = next(i for i, (n, _, f) in enumerate(stages) if n == job["stage"] and f is None)
    prev_gate = max([i for i, (_, _, f) in enumerate(stages[:idx]) if f is None], default=-1)
    root = Path(job["project_dir"])
    with (root / "feedback.md").open("a", encoding="utf-8") as fh:
        fh.write(f"\n## Feedback ({job['stage']})\n{feedback}\n")
    for _, rel, _ in stages[prev_gate + 1: idx + 1]:
        p = root / rel
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists():
            p.unlink()
    store.set(jid, status="queued")
