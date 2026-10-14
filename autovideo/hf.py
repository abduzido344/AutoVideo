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


def run(args: list[str], cwd: Path | None = None, timeout: int = 1800) -> subprocess.CompletedProcess[str]:
    exe = which(args[0])
    proc = subprocess.run([exe, *args[1:]], cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)
    if proc.returncode != 0:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... falhou ({proc.returncode}):\n{proc.stderr[-2000:]}")
    return proc


HF = ["npx", "--yes", f"hyperframes@{HF_VERSION}"]
