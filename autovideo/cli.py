import argparse
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="autovideo")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    e = sub.add_parser("edit")
    e.add_argument("videos", nargs="+", type=Path)
    e.add_argument("--script", type=Path)
    e.add_argument("--recipe", default="talking-head-punchy")
    e.add_argument("--assets", nargs="*", type=Path, default=[])
    e.add_argument("--auto", action="store_true")
    for name in ("approve", "reject", "resume"):
        s = sub.add_parser(name)
        s.add_argument("job", type=int)
        if name == "reject":
            s.add_argument("feedback")
    a = p.parse_args(argv)
    if a.cmd == "doctor":
        from autovideo.doctor import run_checks
        results = run_checks()
        for name, ok, info in results:
            print(f"{'OK ' if ok else 'ERR'} {name}: {info}")
        return 0 if all(ok for _, ok, _ in results) else 1
    from autovideo import pipeline
    from autovideo.jobs import GateError, JobStore, approve, reject, run_job
    store = JobStore(pipeline.home() / "jobs.db")
    try:
        if a.cmd == "edit":
            jid = pipeline.new_job(store, pipeline.home(), a.videos, a.script, a.recipe, a.auto, a.assets)
        else:
            jid = a.job
            if a.cmd == "resume":
                store.requeue_stale()  # só aqui: num edit/approve/reject um servidor vivo pode ser dono de jobs em andamento
            elif a.cmd == "approve":
                approve(store, jid, pipeline.STAGES)
            elif a.cmd == "reject":
                reject(store, jid, pipeline.STAGES, a.feedback, redo_from=pipeline.REDO.get(store.get(jid)["stage"]))
        status = run_job(store, jid, pipeline.STAGES, pipeline.make_ctx)
    except (GateError, KeyError, ValueError) as err:
        print(f"erro: {err.args[0] if isinstance(err, KeyError) else err}", file=sys.stderr)
        return 1
    job = store.get(jid)
    print(f"job {jid}: {status} (etapa {job['stage']}) {job['error']}\n{job['project_dir']}")
    return 0 if status in ("completed", "awaiting_approval") else 1


if __name__ == "__main__":
    sys.exit(main())
