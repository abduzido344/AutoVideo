import json
import os
import re
from pathlib import Path
from autovideo import hf
from autovideo.project import home


def parse_node_major(version: str) -> int:
    return int(re.match(r"v?(\d+)", version.strip()).group(1))


def parakeet() -> str:
    # Windows não tem whisper-cpp: sem o modelo Parakeet o `hyperframes transcribe` não funciona
    lines = hf.run([*hf.HF, "models", "list", "--json"], timeout=600).stdout.strip().splitlines()
    models = json.loads(lines[-1]).get("models", [])
    found = next((m for m in models if m.get("engine") == "parakeet" and m.get("installed")), None)
    if not found:
        raise hf.ToolError(f"modelo Parakeet ausente — rode: {' '.join(hf.HF)} models install parakeet")
    return found["model"]


AUTH_HINT = "rode `claude login` (uso pessoal) ou defina ANTHROPIC_API_KEY"


def parse_claude_auth(stdout: str) -> str:
    """`claude auth status` (JSON). Passa com login local ou ANTHROPIC_API_KEY (o AutoVideo não faz login)."""
    try:
        data = json.loads(stdout)
    except ValueError:
        data = {}
    if isinstance(data, dict) and data.get("loggedIn") is True:
        return f"logado ({data.get('authMethod', '?')})"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "ANTHROPIC_API_KEY definida"
    raise hf.ToolError(f"sem autenticação do Claude — {AUTH_HINT}")


def run_checks() -> list[tuple[str, bool, str]]:
    out = []

    def check(name, fn):
        try:
            out.append((name, True, fn()))
        except Exception as e:  # noqa: BLE001 — doctor reporta qualquer falha
            out.append((name, False, str(e).splitlines()[0]))

    check("AUTOVIDEO_HOME", lambda: str(home()))
    check("ffmpeg", lambda: hf.run(["ffmpeg", "-version"]).stdout.split("\n")[0])
    check("ffprobe", lambda: hf.run(["ffprobe", "-version"]).stdout.split("\n")[0])

    def node():
        v = hf.run(["node", "--version"]).stdout
        if parse_node_major(v) < 22:
            raise hf.ToolError(f"Node {v.strip()} < 22")
        return v.strip()

    check("node>=22", node)
    check("hyperframes", lambda: hf.run([*hf.HF, "--version"], timeout=600).stdout.strip())
    check("parakeet model", parakeet)
    check("claude CLI", lambda: hf.run(["claude", "--version"]).stdout.strip())
    # sai com 1 quando não está logado, ainda com o JSON no stdout
    check("claude auth", lambda: parse_claude_auth(hf.run(["claude", "auth", "status", "--json"], ok_codes=(0, 1)).stdout))

    def skills():
        p = Path.home() / ".claude" / "skills" / "hyperframes"
        if not p.exists():
            raise hf.ToolError("skills ausentes — rode: npx hyperframes skills update talking-head-recut embedded-captions music-to-video")
        return str(p)

    check("hyperframes skills", skills)
    return out
