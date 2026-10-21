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
    """approve fora de um gate pendente."""


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
        # `lock` é público: approve/adjust/discard o seguram durante a troca de arquivos para o worker não ver "queued" cedo
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

    def claim(self, jid: int, from_status: tuple[str, ...] = ("queued",)) -> bool:
        """Reivindica atomicamente um job (-> in_progress). False se outro executor já o pegou."""
        marks = ",".join("?" * len(from_status))
        with self.lock:
            cur = self.con.execute(f"update jobs set status='in_progress', error='', updated=? where id=? and status in ({marks})",
                                   (time.time(), jid, *from_status))
            self.con.commit()
            return cur.rowcount == 1

    def queued(self) -> "list[dict]":  # string: `list` aqui já é o método acima
        with self.lock:
            return [dict(r) for r in self.con.execute("select * from jobs where status='queued' order by id")]

    def requeue_stale(self) -> int:
        """Jobs in_progress de um processo que morreu voltam para a fila na mesma etapa (a fila retoma sozinha)."""
        with self.lock:
            cur = self.con.execute("update jobs set status='queued', updated=? where status='in_progress'", (time.time(),))
            self.con.commit()
            return cur.rowcount

    def resume(self, jid: int) -> bool:
        """failed -> queued (o worker retoma da etapa que falhou). False se o job não está failed."""
        with self.lock:
            self.get(jid)  # KeyError se não existe
            cur = self.con.execute("update jobs set status='queued', error='', updated=? where id=? and status='failed'",
                                   (time.time(), jid))
            self.con.commit()
            return cur.rowcount == 1


def _art(job: dict, rel: str) -> Path:
    return Path(job["project_dir"]) / rel


def _remove(p: Path) -> None:
    if p.is_dir():
        shutil.rmtree(p)
    elif p.exists():
        p.unlink()


def _marker(root: Path, name: str) -> Path:
    return root / ".stages" / f"{name}.ok"


def _commit(root: Path, name: str) -> None:
    """Marcador de etapa concluída: gravado só depois que a etapa terminou (artefato sem marcador = parcial)."""
    m = _marker(root, name)
    m.parent.mkdir(parents=True, exist_ok=True)
    m.write_text("ok")


def stage_done(root: Path, name: str, rel: str, legacy: bool | None = None) -> bool:
    # projeto sem .stages/ = anterior aos marcadores (legado): artefato existente conta como concluído
    legacy = not (root / ".stages").exists() if legacy is None else legacy
    return (root / rel).exists() and (legacy or _marker(root, name).exists())


def _gate_index(jid: int, job: dict, stages: list[Stage]) -> int:
    for i, (n, _, f) in enumerate(stages):
        if n == job["stage"] and f is None:
            return i
    raise GateError(f"job {jid} não está em um gate (stage={job['stage']!r})")


def invalidate_from(root: Path, stages: list[Stage], start: str) -> None:
    """Apaga marcador e artefato de `start` até o fim (o próximo run_job refaz dali em diante)."""
    names = [n for n, _, _ in stages]
    for name, rel, _ in stages[names.index(start):]:
        _remove(_marker(root, name))  # marcador primeiro: kill no meio deixa "artefato sem marcador" = refaz
        _remove(root / rel)


def run_job(store: JobStore, jid: int, stages: list[Stage], make_ctx: Callable[[dict], Ctx]) -> str:
    job = store.get(jid)
    store.set(jid, status="in_progress", error="")
    ctx = make_ctx(job)
    root = Path(job["project_dir"])
    legacy = not (root / ".stages").exists()  # decidido uma vez: a migração abaixo cria .stages/ no meio do loop
    for name, rel, fn in stages:
        p = _art(job, rel)
        if stage_done(root, name, rel, legacy):
            _commit(root, name)  # no legado, migra: o próximo run já enxerga o marcador
            continue
        _remove(p)  # artefato sem marcador = etapa morta no meio (hard kill): refaz do zero
        if fn is None and not job["auto"]:
            store.set(jid, stage=name, status="awaiting_approval")
            return "awaiting_approval"
        store.set(jid, stage=name)
        if fn is None:
            p.parent.mkdir(parents=True, exist_ok=True); p.write_text("auto")
            _commit(root, name)
            continue
        try:
            fn(ctx)
        except BaseException as e:  # noqa: BLE001 — erro ou interrupção: nunca deixa artefato parcial
            _remove(p)
            store.set(jid, status="failed", error=f"{type(e).__name__}: {e}")
            if isinstance(e, Exception):
                return "failed"
            raise
        _commit(root, name)
    store.set(jid, status="completed")
    return "completed"


def approve(store: JobStore, jid: int, stages: list[Stage]) -> None:
    with store.lock:  # o worker só pode ver "queued" depois do arquivo do gate existir
        job = store.get(jid)
        name, rel, _ = stages[_gate_index(jid, job, stages)]
        if job["status"] != "awaiting_approval":
            raise GateError(f"job {jid} não está aguardando aprovação")
        p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("ok")
        if (Path(job["project_dir"]) / ".stages").exists():  # projeto legado: a regra legado aceita o gate.ok
            _commit(Path(job["project_dir"]), name)
        store.set(jid, status="queued")

