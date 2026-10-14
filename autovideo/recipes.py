from pathlib import Path
from typing import Literal
import yaml
from pydantic import BaseModel

RECIPES_DIR = Path(__file__).resolve().parent.parent / "recipes"


class Pacing(BaseModel):
    max_gap: float = 0.35
    pad: float = 0.08
    fillers: list[str] = []


class Captions(BaseModel):
    enabled: bool = True
    component: str = "caption-pill-karaoke"


class Motion(BaseModel):
    zoom_every_s: float = 4
    zoom_scale: float = 1.12
    components: list[str] = []


class AudioCfg(BaseModel):
    clean: bool = True
    lufs: float = -14


class Budget(BaseModel):
    max_turns: int = 40
    max_usd: float = 3.0


class Recipe(BaseModel):
    id: str
    title: str
    mode: Literal["speech", "montage"]
    aspect: str = "9:16"
    pacing: Pacing = Pacing()
    captions: Captions = Captions()
    motion: Motion = Motion()
    audio: AudioCfg = AudioCfg()
    budget: Budget = Budget()
    skills: list[str] = []
    prompts: dict[str, str]


def list_recipes() -> list[str]:
    return sorted(p.stem for p in RECIPES_DIR.glob("*.yaml"))


def load_recipe(rid: str) -> Recipe:
    path = RECIPES_DIR / f"{rid}.yaml"
    if not path.exists():
        raise KeyError(f"receita '{rid}' não existe. Disponíveis: {', '.join(list_recipes())}")
    return Recipe.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))
