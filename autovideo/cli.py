import argparse
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="autovideo")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("jobs")
    e = sub.add_parser("edit")
    e.add_argument("videos", nargs="+", type=Path)
    e.add_argument("--script", type=Path)
    e.add_argument("--recipe", default="talking-head-punchy")
    e.add_argument("--assets", nargs="*", type=Path, default=[])
    e.add_argument("--auto", action="store_true")
    sv = sub.add_parser("serve")
    sv.add_argument("--port", type=int, default=8765)
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
    if a.cmd == "jobs":
        from autovideo.jobs import JobStore
        from autovideo.project import home
        print("id\tstatus\tetapa\tprojeto")
        for j in JobStore(home() / "jobs.db").list():
            root = Path(j["project_dir"])
            rel = root.relative_to(home()).as_posix() if root.is_relative_to(home()) else str(root)
            print(f"{j['id']}\t{j['status']}\t{j['stage'] or '-'}\t{rel}")
        return 0
    from autovideo import pipeline
    if a.cmd == "serve":
        import uvicorn
        from autovideo.jobs import JobStore
        from autovideo.server import create_app
        app = create_app(JobStore(pipeline.home() / "jobs.db"))
        uvicorn.run(app, host="127.0.0.1", port=a.port)  # local-only: nunca 0.0.0.0
        return 0
    from autovideo.jobs import GateError, JobStore, approve, run_job
    store = JobStore(pipeline.home() / "jobs.db")
    try:
        if a.cmd == "edit":
            jid = pipeline.new_job(store, pipeline.home(), a.videos, a.script, a.recipe, a.auto, a.assets)
        else:
            jid = a.job
            if a.cmd == "resume":
                store.fail_stale()  # só aqui: num edit/approve/reject um servidor vivo pode ser dono de jobs em andamento
            elif a.cmd == "approve":
                approve(store, jid, pipeline.STAGES)
            elif a.cmd == "reject":
                pipeline.reject_job(store, jid, a.feedback)
        # só o resume reivindica um job failed; um servidor vivo pode já ter pego o job
        if not store.claim(jid, ("queued", "failed") if a.cmd == "resume" else ("queued",)):
            raise GateError(f"job {jid} não está executável (já em execução, aguardando aprovação ou concluído)")
        status = run_job(store, jid, pipeline.STAGES, pipeline.make_ctx)
    except (GateError, KeyError, ValueError, FileNotFoundError) as err:
        print(f"erro: {err.args[0] if isinstance(err, KeyError) else err}", file=sys.stderr)
        return 1
    job = store.get(jid)
    print(f"job {jid}: {status} (etapa {job['stage']}) {job['error']}\n{job['project_dir']}")
    return 0 if status in ("completed", "awaiting_approval") else 1


if __name__ == "__main__":
    sys.exit(main())
