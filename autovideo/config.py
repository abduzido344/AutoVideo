import json
import os
from autovideo.project import home

DEFAULTS = {"image_provider": "openrouter", "image_model": "google/gemini-2.5-flash-image", "max_imagens": 40}


def load() -> dict:
    p = home() / "config.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def save(patch: dict) -> None:
    p = home() / "config.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps({**load(), **patch}, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(p)


def get_key(name: str) -> str | None:
    return os.environ.get(name) or load().get(name.lower()) or None


def setting(name: str, default=None):
    return load().get(name, DEFAULTS.get(name, default))
