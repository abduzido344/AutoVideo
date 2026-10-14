import json
import time
from pathlib import Path


class Project:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    input = property(lambda s: s.root / "input")
    analysis = property(lambda s: s.root / "analysis")
    comp = property(lambda s: s.root / "composition")
    out = property(lambda s: s.root / "out")
    approvals = property(lambda s: s.root / "approvals")

    def manifest(self) -> dict:
        p = self.input / "manifest.json"
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}

    def save_manifest(self, d: dict) -> None:
        self.input.mkdir(parents=True, exist_ok=True)
        (self.input / "manifest.json").write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")

    def log(self, entry: dict) -> None:
        with (self.root / "decisions.log").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.time(), **entry}, ensure_ascii=False) + "\n")

    def feedback(self) -> str:
        p = self.root / "feedback.md"
        return p.read_text(encoding="utf-8") if p.exists() else ""
