import os
import re
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


def argv_for(exe: str, rest: list[str]) -> list[str]:
    """Windows: um shim .cmd/.bat só roda via cmd.exe, que reinterpreta & | % " nos argumentos (injeção, e
    `Q&A.mp4` quebra). Então roda o alvo do shim direto: npx/npm -> node <npm>/bin/<nome>-cli.js; shims de um
    alvo só (ex.: claude.CMD -> claude.exe, cmd-shim do npm -> script .js) -> esse alvo."""
    p = Path(exe)
    if p.suffix.lower() not in (".cmd", ".bat"):
        return [exe, *rest]
    node = str(p.parent / "node.exe") if (p.parent / "node.exe").is_file() else None
    cli = p.parent / "node_modules" / "npm" / "bin" / f"{p.stem.lower()}-cli.js"
    if p.stem.lower() in ("npx", "npm") and cli.is_file():
        # ponytail: ignora o npm do `npm prefix` global que o npx.cmd prefere; igual quando o prefixo é o do node
        return [node or which("node"), str(cli), *rest]
    text = p.read_text(encoding="utf-8", errors="replace")
    targets = [p.parent / t for t in re.findall(r'%~?dp0%?\\([^"%\r\n]+\.(?:exe|js|cjs|mjs))', text, re.I)]
    targets = [t for t in targets if t.is_file()]
    if targets:
        t = targets[-1]
        return [str(t), *rest] if t.suffix.lower() == ".exe" else [node or which("node"), str(t), *rest]
    raise ToolError(f"{exe}: shim .cmd/.bat sem alvo node/exe conhecido; não rodo via cmd.exe "
                    "(reinterpretaria os argumentos)")


def run(args: list[str], cwd: Path | None = None, timeout: int = 1800,
        env: dict | None = None, ok_codes: tuple[int, ...] = (0,)) -> subprocess.CompletedProcess[str]:
    argv = argv_for(which(args[0]), args[1:])
    try:
        proc = subprocess.run(argv, cwd=cwd, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=timeout, env={**os.environ, **(env or {})})
    except subprocess.TimeoutExpired as e:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... excedeu {timeout}s") from e
    if proc.returncode not in ok_codes:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... falhou ({proc.returncode}):\n{(proc.stderr or proc.stdout)[-2000:]}")
    return proc


HF = ["npx", "--yes", f"hyperframes@{HF_VERSION}"]
