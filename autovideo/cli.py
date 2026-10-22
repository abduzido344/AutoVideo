import argparse
import sys
import time
from datetime import datetime


def _store():
    from autovideo.jobs import JobStore
    from autovideo.project import home
    return JobStore(home() / "jobs.db")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="autovideo")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("skills")
    sv = sub.add_parser("serve")
    sv.add_argument("--port", type=int, default=8765)
    sub.add_parser("fila")
    sub.add_parser("gerar").add_argument("perfil")
    sub.add_parser("aprovar").add_argument("jid", type=int)
    aj = sub.add_parser("ajustar")
    aj.add_argument("jid", type=int)
    aj.add_argument("texto")
    sub.add_parser("retomar").add_argument("jid", type=int)
    a = p.parse_args(argv)
    if a.cmd == "doctor":
        from autovideo.doctor import run_checks
        results = run_checks()
        for name, ok, info in results:
            print(f"{'OK ' if ok else 'ERR'} {name}: {info}")
        return 0 if all(ok for _, ok, _ in results) else 1
    if a.cmd == "skills":
        from autovideo.skills_sync import sync
        print(sync())
        return 0
    if a.cmd == "serve":
        import uvicorn
        from autovideo.server import create_app
        uvicorn.run(create_app(_store()), host="127.0.0.1", port=a.port)  # local-only: nunca 0.0.0.0
        return 0
    from autovideo import episode, fila
    from autovideo.jobs import GateError
    store = _store()
    if a.cmd == "fila":
        st = fila.state()
        print(f"fila: {'PAUSADA (' + st['reason'] + ')' if st['paused'] else 'ativa'}")
        for j in reversed(store.list()):
            print(f"{j['id']:>4}  {j['status']:<18} {j['stage']:<10} {j['project_dir']}")
        return 0
    if a.cmd == "gerar":
        if not fila.acquire_producer():
            print("o autovideo serve está produzindo — use o painel", file=sys.stderr)
            return 1
        fila.tick(store, datetime.now(), force=a.perfil)
        fila.run_next(store, time.time())
        return 0
    try:
        if a.cmd == "aprovar":
            episode.approve(store, a.jid)
        elif a.cmd == "ajustar":
            episode.adjust(store, a.jid, a.texto)
        elif not store.resume(a.jid):
            raise GateError(f"episódio {a.jid} não está com falha")
    except (GateError, KeyError) as e:
        print(str(e).strip("'\""), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
