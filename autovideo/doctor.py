import json
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

    def skills():
        p = Path.home() / ".claude" / "skills" / "hyperframes"
        if not p.exists():
            raise hf.ToolError("skills ausentes — rode: npx hyperframes skills update talking-head-recut embedded-captions music-to-video")
        return str(p)

    check("hyperframes skills", skills)
    return out
