import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="autovideo")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sv = sub.add_parser("serve")
    sv.add_argument("--port", type=int, default=8765)
    a = p.parse_args(argv)
    if a.cmd == "doctor":
        from autovideo.doctor import run_checks
        results = run_checks()
        for name, ok, info in results:
            print(f"{'OK ' if ok else 'ERR'} {name}: {info}")
        return 0 if all(ok for _, ok, _ in results) else 1
    import uvicorn
    from autovideo.server import create_app
    uvicorn.run(create_app(), host="127.0.0.1", port=a.port)  # local-only: nunca 0.0.0.0
    return 0


if __name__ == "__main__":
    sys.exit(main())
