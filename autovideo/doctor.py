import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from autovideo import hf
from autovideo import config
from autovideo.agents import missing_skills
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


SKILLS = ("hyperframes", "hyperframes-core", "hyperframes-animation")
AUTH_HINT = "rode `claude auth login` (uso pessoal) ou defina ANTHROPIC_API_KEY"
LOGIN = ["claude", "auth", "login"]


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


def claude_auth() -> str:
    # sai com 1 quando não está logado, ainda com o JSON no stdout
    return parse_claude_auth(hf.run(["claude", "auth", "status", "--json"], ok_codes=(0, 1)).stdout)


def open_login_terminal() -> None:
    """Abre uma janela de terminal com o login do próprio Claude Code. O AutoVideo não vê nem guarda credenciais."""
    if sys.platform == "win32":
        subprocess.Popen(["cmd", "/k", *LOGIN], creationflags=subprocess.CREATE_NEW_CONSOLE)
    elif sys.platform == "darwin":
        subprocess.Popen(["osascript", "-e", f'tell application "Terminal" to do script "{" ".join(LOGIN)}"',
                          "-e", 'tell application "Terminal" to activate'])
    elif term := shutil.which("x-terminal-emulator"):
        subprocess.Popen([term, "-e", *LOGIN])
    else:
        raise hf.ToolError(f"não achei um terminal para abrir — rode `{' '.join(LOGIN)}` num terminal")


def skills() -> str:
    if err := missing_skills(SKILLS):
        raise hf.ToolError(err)
    return f"{len(SKILLS)} skills em {Path.home() / '.claude' / 'skills'}"


def key(name: str) -> str:
    if not config.get_key(name):
        raise hf.ToolError(f"{name} ausente — defina a variável de ambiente ou salve nas configurações")
    return "definida"


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
    check("claude auth", claude_auth)

    check("hyperframes skills", skills)
    imagem = "HIGGSFIELD_API_KEY" if config.setting("image_provider") == "higgsfield" else "OPENROUTER_API_KEY"
    for k in ("ELEVENLABS_API_KEY", imagem):
        check(k, lambda k=k: key(k))
    return out
