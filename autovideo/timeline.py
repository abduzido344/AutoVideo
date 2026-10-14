# autovideo/timeline.py
from __future__ import annotations
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

FORMATS = {"9:16": (1080, 1920, "portrait"), "16:9": (1920, 1080, "landscape"), "1:1": (1080, 1080, "square")}
EPS = 0.01
STRICT = ConfigDict(extra="forbid")  # timeline.json é escrito por LLM: chave desconhecida é erro


class Word(BaseModel):
    model_config = STRICT
    text: str
    start: float
    end: float
    src: str


class Segment(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    src: str
    in_: float = Field(alias="in", ge=0)
    out: float

    @model_validator(mode="after")
    def _order(self):
        if self.out <= self.in_:
            raise ValueError(f"segmento {self.src}: out ({self.out}) <= in ({self.in_})")
        return self

    @property
    def dur(self) -> float:
        return self.out - self.in_


class Zoom(BaseModel):
    model_config = STRICT
    at: float = Field(ge=0)
    dur: float = Field(gt=0)
    scale: float = Field(1.12, ge=1, le=2)
    kind: Literal["punch", "push"] = "punch"
    origin: str = "50% 35%"


class Overlay(BaseModel):
    model_config = STRICT
    start: float = Field(ge=0)
    dur: float = Field(gt=0)
    src: str
    vars: dict = {}


class BRoll(BaseModel):
    model_config = STRICT
    start: float = Field(ge=0)
    dur: float = Field(gt=0)
    src: str
    mode: Literal["full", "pip"] = "full"


class Sfx(BaseModel):
    model_config = STRICT
    at: float = Field(ge=0)
    src: str
    dur: float = 1.0
    volume: float = 0.6


class Music(BaseModel):
    model_config = STRICT
    src: str
    volume: float = 0.12


class Timeline(BaseModel):
    model_config = STRICT
    width: int
    height: int
    fps: int = 30
    segments: list[Segment] = Field(min_length=1)
    zooms: list[Zoom] = []
    overlays: list[Overlay] = []
    broll: list[BRoll] = []
    sfx: list[Sfx] = []
    music: Music | None = None
    captions: bool = True
    grading: dict | None = None

    @property
    def duration(self) -> float:
        return sum(s.dur for s in self.segments)

    @model_validator(mode="after")
    def _within(self):
        d = self.duration
        for kind, items in (("overlay", [(o.start, o.dur) for o in self.overlays]),
                            ("zoom", [(z.at, z.dur) for z in self.zooms]),
                            ("broll", [(b.start, b.dur) for b in self.broll])):
            for start, dur in items:
                if start + dur > d + EPS:
                    raise ValueError(f"{kind} em {start}s+{dur}s ultrapassa a duração {d:.2f}s")
        for s in self.sfx:
            if s.at > d + EPS:
                raise ValueError(f"sfx em {s.at}s ultrapassa a duração {d:.2f}s")
        return self

    def dump(self, path: Path) -> None:
        Path(path).write_text(self.model_dump_json(by_alias=True, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Timeline":
        return cls.model_validate_json(Path(path).read_text(encoding="utf-8"))


def _merge(segs: list[Segment]) -> list[Segment]:
    merged: list[Segment] = []
    for s in segs:
        if merged and merged[-1].src == s.src and s.in_ <= merged[-1].out + EPS:
            p = merged[-1]
            merged[-1] = Segment(src=p.src, **{"in": p.in_}, out=max(p.out, s.out))
        else:
            merged.append(s)
    return merged


def plan_segments(words: list[Word], drop: set[int], durations: dict[str, float],
                  max_gap: float = 0.35, pad: float = 0.08) -> list[Segment]:
    groups: list[list[int]] = []
    prev: int | None = None
    for i, wd in enumerate(words):
        if i in drop:
            continue
        p = words[prev] if prev is not None else None
        contiguous = (p is not None and p.src == wd.src and prev == i - 1
                      and wd.start - p.end <= max_gap)
        if contiguous:
            groups[-1].append(i)
        else:
            groups.append([i])
        prev = i
    segs: list[Segment] = []
    for g in groups:
        first, last = words[g[0]], words[g[-1]]
        dur = durations[first.src]
        # vizinhos na lista original (inclusive descartados) limitam o padding, sem invadir palavras vizinhas
        before = words[g[0] - 1] if g[0] > 0 and words[g[0] - 1].src == first.src else None
        after = words[g[-1] + 1] if g[-1] + 1 < len(words) and words[g[-1] + 1].src == first.src else None
        start = max(0.0, first.start - pad)
        if before is not None:
            start = max(start, before.end)
        start = min(start, first.start)
        if segs and segs[-1].src == first.src:
            start = max(start, segs[-1].out)
        end = min(last.end + pad, dur)
        if after is not None:
            end = min(end, after.start)
        end = max(end, min(last.end, dur))
        segs.append(Segment(src=first.src, **{"in": round(start, 3)}, out=round(end, 3)))
    return _merge(segs)


def remap_words(words: list[Word], drop: set[int], segments: list[Segment]) -> list[Word]:
    out, offset, spans = [], 0.0, []
    for s in segments:
        spans.append((s, offset))
        offset += s.dur
    for i, wd in enumerate(words):
        if i in drop:
            continue
        for s, off in spans:
            if s.src == wd.src and s.in_ - EPS <= wd.start < s.out + EPS:
                a = max(wd.start, s.in_)
                b = max(min(wd.end, s.out), a)
                out.append(Word(text=wd.text, start=round(off + a - s.in_, 3),
                                end=round(off + b - s.in_, 3), src="out"))
                break
        else:
            raise ValueError(f"palavra {i} '{wd.text}' fora de qualquer segmento")
    return out
