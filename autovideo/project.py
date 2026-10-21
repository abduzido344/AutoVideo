import json
import os
import sys
import time
from pathlib import Path


def home() -> Path:
    """Onde ficam projetos e jobs.db. Fora do repo (o CLAUDE.md de dev não pode carregar nos agentes) e fora do
    OneDrive (não sincroniza gravações). AUTOVIDEO_HOME tem precedência."""
    if os.environ.get("AUTOVIDEO_HOME"):
        return Path(os.environ["AUTOVIDEO_HOME"])
    if sys.platform == "win32":
        return Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "AutoVideo" / "projects"
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share") / "autovideo" / "projects"


class Project:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    comp = property(lambda s: s.root / "composition")

    def log(self, entry: dict) -> None:
        with (self.root / "decisions.log").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.time(), **entry}, ensure_ascii=False) + "\n")
