import re
from pathlib import Path
from autovideo import hf


def parse_node_major(version: str) -> int:
    return int(re.match(r"v?(\d+)", version.strip()).group(1))


def run_checks() -> list[tuple[str, bool, str]]:
    out = []

    def check(name, fn):
        try:
            out.append((name, True, fn()))
        except Exception as e:  # noqa: BLE001 — doctor reporta qualquer falha
            out.append((name, False, str(e).splitlines()[0]))

    check("ffmpeg", lambda: hf.run(["ffmpeg", "-version"]).stdout.split("\n")[0])
    check("ffprobe", lambda: hf.run(["ffprobe", "-version"]).stdout.split("\n")[0])

    def node():
        v = hf.run(["node", "--version"]).stdout
        if parse_node_major(v) < 22:
            raise hf.ToolError(f"Node {v.strip()} < 22")
        return v.strip()

    check("node>=22", node)
    check("hyperframes", lambda: hf.run([*hf.HF, "--version"], timeout=600).stdout.strip())
    check("claude CLI", lambda: hf.run(["claude", "--version"]).stdout.strip())

    def skills():
        p = Path.home() / ".claude" / "skills" / "hyperframes"
        if not p.exists():
            raise hf.ToolError("skills ausentes — rode: npx hyperframes skills update talking-head-recut embedded-captions music-to-video")
        return str(p)

    check("hyperframes skills", skills)
    return out
