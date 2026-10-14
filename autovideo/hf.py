import os
import shutil
import subprocess
from pathlib import Path

HF_VERSION = "0.8.158"


class ToolError(RuntimeError):
    pass


def which(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise ToolError(f"'{name}' não encontrado no PATH")
    return path


def run(args: list[str], cwd: Path | None = None, timeout: int = 1800,
        env: dict | None = None, ok_codes: tuple[int, ...] = (0,)) -> subprocess.CompletedProcess[str]:
    exe = which(args[0])
    try:
        proc = subprocess.run([exe, *args[1:]], cwd=cwd, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=timeout, env={**os.environ, **(env or {})})
    except subprocess.TimeoutExpired as e:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... excedeu {timeout}s") from e
    if proc.returncode not in ok_codes:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... falhou ({proc.returncode}):\n{(proc.stderr or proc.stdout)[-2000:]}")
    return proc


HF = ["npx", "--yes", f"hyperframes@{HF_VERSION}"]
