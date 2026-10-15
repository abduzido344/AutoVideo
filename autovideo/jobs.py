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


class GateError(ValueError):
    """approve/reject fora de um gate pendente."""


@dataclass
class Ctx:
    project: Project
    recipe: object
    job: dict
    agent: Callable | None


class JobStore:
    def __init__(self, db: Path):
        db.parent.mkdir(parents=True, exist_ok=True)
        # ponytail: one shared connection behind one RLock, per-thread connections if throughput matters
        # `lock` é público: approve/reject o seguram durante a troca de arquivos para o worker não ver "queued" cedo
        self.lock = threading.RLock()
        self.con = sqlite3.connect(db, check_same_thread=False)
        self.con.row_factory = sqlite3.Row
        self.con.execute("""create table if not exists jobs(id integer primary key, project_dir text, recipe text,
            auto integer, status text, stage text, error text, created real, updated real)""")
        self.con.commit()

    def create(self, project_dir: str, recipe: str, auto: bool) -> int:
        with self.lock:
            cur = self.con.execute("insert into jobs(project_dir,recipe,auto,status,stage,error,created,updated)"
                                   " values(?,?,?,'queued','','',?,?)",
                                   (project_dir, recipe, int(auto), time.time(), time.time()))
            self.con.commit()
            return cur.lastrowid

    def get(self, jid: int) -> dict:
        with self.lock:
            r = self.con.execute("select * from jobs where id=?", (jid,)).fetchone()
        if r is None:
            raise KeyError(f"job {jid} não existe")
        return dict(r)

    def list(self) -> list[dict]:
        with self.lock:
            return [dict(r) for r in self.con.execute("select * from jobs order by id desc")]

    def set(self, jid: int, **f) -> None:
        with self.lock:
            cols = ",".join(f"{k}=?" for k in f)
            self.con.execute(f"update jobs set {cols}, updated=? where id=?", (*f.values(), time.time(), jid))
            self.con.commit()

    def cas(self, jid: int, expect_status: str, expect_stage: str, **f) -> bool:
        """Atualiza só se o job ainda estiver em (expect_status, expect_stage). Devolve True se atualizou."""
        with self.lock:
            cols = ",".join(f"{k}=?" for k in f)
            cur = self.con.execute(f"update jobs set {cols}, updated=? where id=? and status=? and stage=?",
                                   (*f.values(), time.time(), jid, expect_status, expect_stage))
            self.con.commit()
            return cur.rowcount == 1

    def next_queued(self) -> dict | None:
        with self.lock:
            r = self.con.execute("select * from jobs where status='queued' order by id limit 1").fetchone()
        return dict(r) if r else None

    def claim(self, jid: int, from_status: tuple[str, ...] = ("queued",)) -> bool:
        """Reivindica atomicamente um job (-> in_progress). False se outro executor já o pegou."""
        marks = ",".join("?" * len(from_status))
        with self.lock:
            cur = self.con.execute(f"update jobs set status='in_progress', error='', updated=? where id=? and status in ({marks})",
                                   (time.time(), jid, *from_status))
            self.con.commit()
            return cur.rowcount == 1

    def claim_next(self) -> dict | None:
        with self.lock:
            job = self.next_queued()
            return self.get(job["id"]) if job and self.claim(job["id"]) else None

    def requeue_stale(self) -> int:
        """Jobs que estavam in_progress (processo morreu no meio) voltam para queued."""
        with self.lock:
            cur = self.con.execute("update jobs set status='queued', updated=? where status='in_progress'",
                                   (time.time(),))
            self.con.commit()
            return cur.rowcount


def _art(job: dict, rel: str) -> Path:
    return Path(job["project_dir"]) / rel


def _remove(p: Path) -> None:
    if p.is_dir():
        shutil.rmtree(p)
    elif p.exists():
        p.unlink()


def _gate_index(jid: int, job: dict, stages: list[Stage]) -> int:
    for i, (n, _, f) in enumerate(stages):
        if n == job["stage"] and f is None:
            return i
    raise GateError(f"job {jid} não está em um gate (stage={job['stage']!r})")


def run_job(store: JobStore, jid: int, stages: list[Stage], make_ctx: Callable[[dict], Ctx]) -> str:
    job = store.get(jid)
    store.set(jid, status="in_progress", error="")
    ctx = make_ctx(job)
    for name, rel, fn in stages:
        p = _art(job, rel)
        if p.exists():
            continue
        if fn is None and not job["auto"]:
            store.set(jid, stage=name, status="awaiting_approval")
            return "awaiting_approval"
        store.set(jid, stage=name)
        if fn is None:
            p.parent.mkdir(parents=True, exist_ok=True); p.write_text("auto")
            continue
        try:
            fn(ctx)
        except BaseException as e:  # noqa: BLE001 — erro ou interrupção: nunca deixa artefato parcial
            _remove(p)
            store.set(jid, status="failed", error=f"{type(e).__name__}: {e}")
            if isinstance(e, Exception):
                return "failed"
            raise
    store.set(jid, status="completed")
    return "completed"


def approve(store: JobStore, jid: int, stages: list[Stage]) -> None:
    with store.lock:  # o worker só pode ver "queued" depois do arquivo do gate existir
        job = store.get(jid)
        rel = stages[_gate_index(jid, job, stages)][1]
        if job["status"] != "awaiting_approval":
            raise GateError(f"job {jid} não está aguardando aprovação")
        p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("ok")
        store.set(jid, status="queued")


def reject(store: JobStore, jid: int, stages: list[Stage], feedback: str, redo_from: str | None = None) -> None:
    with store.lock:  # idem: artefatos apagados e feedback gravado antes de o job voltar para a fila
        job = store.get(jid)
        idx = _gate_index(jid, job, stages)
        if redo_from is None:
            start = max([i for i, (_, _, f) in enumerate(stages[:idx]) if f is None], default=-1) + 1
        else:
            names = [n for n, _, _ in stages[:idx]]
            if redo_from not in names:
                raise GateError(f"redo_from {redo_from!r} não é uma etapa antes do gate atual")
            start = names.index(redo_from)
        if job["status"] != "awaiting_approval":
            raise GateError(f"job {jid} não está aguardando aprovação")
        root = Path(job["project_dir"])
        for _, rel, _ in stages[start: idx + 1]:
            _remove(root / rel)
        with (root / "feedback.md").open("a", encoding="utf-8") as fh:
            fh.write(f"\n## Feedback ({job['stage']})\n{feedback}\n")
        store.set(jid, status="queued", stage="")
