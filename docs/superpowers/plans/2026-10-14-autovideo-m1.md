# AutoVideo M1 — Roteiro + Gravação → Vídeo Editado: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comando `autovideo edit grav.mp4 --script roteiro.md --recipe talking-head-punchy` (e o painel web local) entrega `out/final.mp4` editado: cortes de silêncio, fillers e retakes; voz tratada; legenda animada; zooms; overlays de motion; e também `cover.jpg` e `post.json`, tudo planejado por 4 agentes Claude.

**Architecture:** Pipeline Python de etapas retomáveis, onde cada etapa grava um artefato em `projects/<id>/`. As etapas determinísticas (ffmpeg, `hyperframes transcribe`) analisam a mídia. Quatro papéis do Claude Agent SDK, chamados em sequência, escrevem arquivos validados por pydantic: diretor `brief.md`, copywriter `edit.json`, designer `style.json` + composições HTML, editor `timeline.json`. `compose.py` converte o timeline em `index.html` do HyperFrames, que renderiza o MP4. Os gates de aprovação são arquivos em `approvals/`.

**Tech Stack:** Python ≥3.11 (o sistema tem 3.14), uv, claude-agent-sdk, FastAPI, pydantic v2, PyYAML, httpx, pytest. Node 22 + `hyperframes@0.8.158` (via npx). FFmpeg 7. Painel: React + Vite + Tailwind v4 + shadcn/ui + registry Kobra (`@kobra`).

**Spec:** `docs/superpowers/specs/2026-10-14-autovideo-design.md`

**Atualização do spec (descoberta durante o planejamento):** o CLI do HyperFrames 0.8.158 já faz várias coisas que o spec atribuía a bibliotecas Python. O M1 usa o CLI no lugar delas:

| Capacidade | Antes, no spec | Agora, via HyperFrames |
|---|---|---|
| Transcrição por palavra | faster-whisper | `transcribe` (whisper.cpp) |
| Beats | librosa | `beats` |
| Checagem de safe zone | — | `check --caption-zone` |
| Self-review | — | `snapshot --at` |
| Correção de cor | — | `media-treatment --analyze/--grading` |
| Blocos prontos (legendas, lower-thirds, transições, `cursor-zoom-follow`, `push-in`) | — | catálogo de 447 itens via `add` |
| Conhecimento de motion para os agentes | — | skills Claude (`hyperframes-*`, `media-use`, workflows `talking-head-recut`, `embedded-captions`, `music-to-video`) |

O que ficou de fora do M1:
- **MediaPipe:** sem reframe automático 16:9→9:16 (ponytail). Os zooms usam `origin` escolhido pelo editor a partir dos frames.
- **PySceneDetect:** substituído por `ffmpeg select=gt(scene,…)`.

## Global Constraints
- Todos os comandos externos usam lista de argumentos (sem `shell=True`) e o executável resolvido por `shutil.which` (no Windows, `npx` é `npx.cmd`).
- HyperFrames é sempre chamado como `npx --yes hyperframes@0.8.158 ...` (constante `HF` em `autovideo/hf.py`).
- O AutoVideo **não implementa login**. O Agent SDK herda o `claude login` local ou `ANTHROPIC_API_KEY`. O README declara a policy da Anthropic: produto de terceiros não pode oferecer login claude.ai sem aprovação.
- Formatos: `9:16` → 1080×1920 (`portrait`), `16:9` → 1920×1080 (`landscape`), `1:1` → 1080×1080 (`square`). FPS 30.
- Loudness final: −14 LUFS integrado, com tolerância de ±1.5.
- Cortes: padding de 0.08 s e fade de áudio de 0.03 s em cada segmento.
- Agentes rodam com `permission_mode="dontAsk"` e só podem:
  - usar Edit/Read dentro do projeto;
  - ler skills em `~/.claude/skills`;
  - rodar Bash apenas em `npx --yes hyperframes@0.8.158 *` e `ffprobe *`.
- Cada chamada de agente tem `max_turns` e `max_budget_usd` vindos da receita, e é registrada em `projects/<id>/decisions.log` (JSONL).
- `ELEVENLABS_API_KEY` é opcional. Se presente, a limpeza de voz usa o Voice Isolator do ElevenLabs; se não, usa a cadeia ffmpeg.
- Os caminhos de projeto podem conter espaços e acentos (OneDrive "Documentos").
- UI: antes de escrever qualquer componente, procure um pronto em Kobra → shadcn base → outros registries (`docs/ui-components.md`), com design minimalista. Kobra Pro exige `KOBRA_TOKEN`; sem ele, use o fallback shadcn base.

## Review Focus
1. **Gravação sem fala (ou transcrição vazia) numa receita `speech`:** o job falha com a mensagem "Nenhuma fala detectada — use a receita montage-beat", e não segue com um vídeo vazio. *(Teste: Task 5.)*
2. **Vídeo de celular VFR e/ou com metadado de rotação:** a etapa `clean` reencoda para CFR 30 com a rotação aplicada, para que os `data-media-start` caiam no frame certo. *(Teste: Task 4.)*
3. **Caminho de projeto com espaço e acento:** todas as chamadas a ffmpeg e hyperframes funcionam. *(Teste: Task 4, fixture `tmp_path / "Meus Vídeos ç"`.)*
4. **Agente escreve JSON inválido ou overlay fora da duração:** há uma retentativa com o erro de validação e, se falhar de novo, o job vai para `failed` com a mensagem do pydantic. *(Teste: Task 7.)*
5. **Processo morre no meio do job:** ao rodar de novo, ele retoma da primeira etapa sem artefato. Um reject com feedback apaga só os artefatos a jusante. *(Teste: Task 6.)*

---

## File Structure
```
AutoVideo/
  pyproject.toml                 # deps + entrypoint autovideo
  .gitignore                     # projects/ .venv/ __pycache__/ node_modules/
  README.md                      # setup, auth policy, uso
  autovideo/
    __init__.py
    hf.py                        # run(), HF const, which() — wrapper de subprocess
    cli.py                       # argparse: doctor | edit | serve | approve | reject
    doctor.py                    # checagens de ambiente
    timeline.py                  # modelos pydantic + plan_segments + remap_words
    recipes.py                   # Recipe model + load_recipe/list_recipes
    media.py                     # probe, clean_audio, extract_frames, detect_scenes, loudness
    transcribe.py                # transcribe() + parse_transcript + filler_candidates
    project.py                   # Project (paths, manifest, decisions log)
    jobs.py                      # JobStore (SQLite) + run_job (motor de etapas + gates)
    agents.py                    # run_role (Agent SDK) + validação/retentativa
    prompts/director.md copywriter.md designer.md editor.md
    pipeline.py                  # STAGES: lista (nome, artefato, função)
    compose.py                   # Timeline → composition/index.html
    render.py                    # init composition, check, snapshot, render, review loop
    server.py                    # FastAPI (API + serve web/dist)
  recipes/talking-head-punchy.yaml screen-tutorial.yaml montage-beat.yaml
  web/                           # Vite react-ts + shadcn + Kobra (components.json com registry @kobra)
  docs/ui-components.md          # regra 'procure componente pronto' + mapa necessidade→componente
  tests/conftest.py test_timeline.py test_recipes.py test_media.py test_transcribe.py
        test_jobs.py test_agents.py test_compose.py test_render.py test_pipeline.py test_server.py
```

---

### Task 1: Scaffold + `hf.py` + `autovideo doctor`

**Files:**
- Create: `pyproject.toml`, `.gitignore`, `autovideo/__init__.py`, `autovideo/hf.py`, `autovideo/doctor.py`, `autovideo/cli.py`
- Test: `tests/test_doctor.py`

**Interfaces:**
- Produces:
  - `hf.HF: list[str]`
  - `hf.run(args: list[str], cwd: Path | None = None, timeout: int = 1800) -> subprocess.CompletedProcess[str]`, que levanta `ToolError(msg)` se o código de retorno for diferente de zero.
  - `hf.which(name: str) -> str`, que levanta `ToolError` se a ferramenta não for encontrada.
  - `doctor.parse_node_major(version: str) -> int`
  - `doctor.run_checks() -> list[tuple[str, bool, str]]`

- [ ] **Step 1: Criar `pyproject.toml` e `.gitignore`**

```toml
[project]
name = "autovideo"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "claude-agent-sdk>=0.2.129",
  "fastapi>=0.115",
  "uvicorn>=0.30",
  "python-multipart>=0.0.9",
  "pydantic>=2.12",
  "pyyaml>=6",
  "httpx>=0.27",
]
[project.optional-dependencies]
dev = ["pytest>=8"]
[project.scripts]
autovideo = "autovideo.cli:main"
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
[tool.pytest.ini_options]
markers = ["slow: needs network/models (run with AV_SLOW=1)"]
```

```
projects/
.venv/
__pycache__/
node_modules/
*.egg-info/
```

Run: `uv venv && uv pip install -e ".[dev]"`
Expected: instala sem erro. Se `claude-agent-sdk` não tiver wheel para 3.14, use `uv venv --python 3.12` e repita.

- [ ] **Step 2: Escrever o teste que falha**

```python
# tests/test_doctor.py
from autovideo.doctor import parse_node_major

def test_parse_node_major():
    assert parse_node_major("v22.22.2\n") == 22
    assert parse_node_major("v18.0.0") == 18
```

Run: `uv run pytest tests/test_doctor.py -v`. Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implementar `hf.py`, `doctor.py` e `cli.py` (subcomando doctor)**

```python
# autovideo/__init__.py
```

```python
# autovideo/hf.py
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


def run(args: list[str], cwd: Path | None = None, timeout: int = 1800) -> subprocess.CompletedProcess[str]:
    exe = which(args[0])
    proc = subprocess.run([exe, *args[1:]], cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)
    if proc.returncode != 0:
        raise ToolError(f"{args[0]} {' '.join(args[1:4])}... falhou ({proc.returncode}):\n{proc.stderr[-2000:]}")
    return proc


HF = ["npx", "--yes", f"hyperframes@{HF_VERSION}"]
```

```python
# autovideo/doctor.py
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
```

```python
# autovideo/cli.py
import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="autovideo")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    a = p.parse_args(argv)
    if a.cmd == "doctor":
        from autovideo.doctor import run_checks
        results = run_checks()
        for name, ok, info in results:
            print(f"{'OK ' if ok else 'ERR'} {name}: {info}")
        return 0 if all(ok for _, ok, _ in results) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Rodar teste e doctor**

Run: `uv run pytest tests/test_doctor.py -v`. Expected: PASS.

Run: `uv run autovideo doctor`. Expected: todas as linhas OK. Se "hyperframes skills" der ERR, rode o comando sugerido e repita.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scaffold autovideo package and doctor command"
```

---

### Task 2: `timeline.py` — contrato central, planejamento de cortes e remap de palavras

**Files:**
- Create: `autovideo/timeline.py`
- Test: `tests/test_timeline.py`

**Interfaces:**
- Produces:
  - Modelos:
    - `Word(text: str, start: float, end: float, src: str)`
    - `Segment(src: str, in_: float [alias "in"], out: float)`
    - `Zoom(at, dur, scale=1.12, kind: "punch"|"push"="punch", origin="50% 35%")`
    - `Overlay(start, dur, src: str, vars: dict = {})`
    - `BRoll(start, dur, src, mode: "full"|"pip"="full")`
    - `Sfx(at, src, dur=1.0, volume=0.6)`
    - `Music(src, volume=0.12)`
    - `Timeline(width, height, fps=30, segments, zooms=[], overlays=[], broll=[], sfx=[], music=None, captions=True, grading: dict | None = None)`, com a property `duration`
  - `plan_segments(words: list[Word], drop: set[int], durations: dict[str, float], max_gap: float = 0.35, pad: float = 0.08) -> list[Segment]`
  - `remap_words(words: list[Word], drop: set[int], segments: list[Segment]) -> list[Word]`. As palavras saem no eixo de saída, com `src="out"`.
  - `FORMATS: dict[str, tuple[int, int, str]]`, por exemplo `{"9:16": (1080, 1920, "portrait"), ...}`
  - `Timeline.dump(path)` e `Timeline.load(path)`

- [ ] **Step 1: Escrever os testes que falham**

```python
# tests/test_timeline.py
import pytest
from pydantic import ValidationError
from autovideo.timeline import Word, Segment, Timeline, Overlay, Zoom, plan_segments, remap_words

def w(text, s, e, src="a.mp4"):
    return Word(text=text, start=s, end=e, src=src)

WORDS = [w("Olá", 0.5, 0.8), w("pessoal", 0.85, 1.3),            # bloco 1
         w("é", 2.5, 2.6),                                       # filler isolado
         w("hoje", 2.7, 3.0), w("vamos", 3.05, 3.4)]             # bloco 2

def test_gap_creates_new_segment_with_padding():
    segs = plan_segments(WORDS, drop={2}, durations={"a.mp4": 10})
    assert [(s.in_, s.out) for s in segs] == [(0.42, 1.38), (2.62, 3.48)]

def test_padding_never_overlaps_previous_segment():
    words = [w("a", 1.0, 1.2), w("b", 1.25, 1.3), w("c", 1.32, 1.5)]
    segs = plan_segments(words, drop={1}, durations={"a.mp4": 10})
    assert segs[1].in_ >= segs[0].out

def test_padding_clamped_to_media_bounds():
    segs = plan_segments([w("x", 0.02, 0.5), w("y", 0.6, 9.98)], drop=set(), durations={"a.mp4": 10})
    assert segs[0].in_ == 0 and segs[-1].out == 10

def test_source_change_starts_new_segment():
    words = [w("a", 0, 1, "a.mp4"), w("b", 0, 1, "b.mp4")]
    segs = plan_segments(words, drop=set(), durations={"a.mp4": 5, "b.mp4": 5})
    assert [s.src for s in segs] == ["a.mp4", "b.mp4"]

def test_remap_words_to_output_axis():
    segs = plan_segments(WORDS, drop={2}, durations={"a.mp4": 10})
    out = remap_words(WORDS, {2}, segs)
    assert [x.text for x in out] == ["Olá", "pessoal", "hoje", "vamos"]
    assert out[0].start == pytest.approx(0.08)
    # segundo bloco começa após 0.96 s do primeiro segmento
    assert out[2].start == pytest.approx(0.96 + 0.08)
    assert all(x.src == "out" for x in out)

def test_timeline_duration_and_alias_roundtrip(tmp_path):
    t = Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 1.0}, out=3.5)])
    assert t.duration == pytest.approx(2.5)
    t.dump(tmp_path / "t.json")
    assert '"in": 1.0' in (tmp_path / "t.json").read_text()
    assert Timeline.load(tmp_path / "t.json").segments[0].in_ == 1.0

def test_overlay_past_end_is_rejected():
    with pytest.raises(ValidationError, match="ultrapassa"):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 overlays=[Overlay(start=1.5, dur=1.0, src="compositions/hook.html")])

def test_segment_out_before_in_rejected():
    with pytest.raises(ValidationError):
        Segment(src="a.mp4", **{"in": 3}, out=2)

def test_zoom_outside_duration_rejected():
    with pytest.raises(ValidationError, match="ultrapassa"):
        Timeline(width=1080, height=1920, segments=[Segment(src="a.mp4", **{"in": 0}, out=2)],
                 zooms=[Zoom(at=1.9, dur=0.5)])
```

Run: `uv run pytest tests/test_timeline.py -v`. Expected: FAIL (`ImportError`).

- [ ] **Step 2: Implementar `timeline.py`**

```python
# autovideo/timeline.py
from __future__ import annotations
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

FORMATS = {"9:16": (1080, 1920, "portrait"), "16:9": (1920, 1080, "landscape"), "1:1": (1080, 1080, "square")}
EPS = 0.01


class Word(BaseModel):
    text: str
    start: float
    end: float
    src: str


class Segment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
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
    at: float = Field(ge=0)
    dur: float = Field(gt=0)
    scale: float = Field(1.12, ge=1, le=2)
    kind: Literal["punch", "push"] = "punch"
    origin: str = "50% 35%"


class Overlay(BaseModel):
    start: float = Field(ge=0)
    dur: float = Field(gt=0)
    src: str
    vars: dict = {}


class BRoll(BaseModel):
    start: float = Field(ge=0)
    dur: float = Field(gt=0)
    src: str
    mode: Literal["full", "pip"] = "full"


class Sfx(BaseModel):
    at: float = Field(ge=0)
    src: str
    dur: float = 1.0
    volume: float = 0.6


class Music(BaseModel):
    src: str
    volume: float = 0.12


class Timeline(BaseModel):
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
        return self

    def dump(self, path: Path) -> None:
        Path(path).write_text(self.model_dump_json(by_alias=True, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Timeline":
        return cls.model_validate_json(Path(path).read_text(encoding="utf-8"))


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
        start = max(0.0, first.start - pad)
        if segs and segs[-1].src == first.src:
            start = max(start, segs[-1].out)
        end = min(durations[first.src], last.end + pad)
        segs.append(Segment(src=first.src, **{"in": round(start, 3)}, out=round(end, 3)))
    return segs


def remap_words(words: list[Word], drop: set[int], segments: list[Segment]) -> list[Word]:
    out, offset, spans = [], 0.0, []
    for s in segments:
        spans.append((s, offset))
        offset += s.dur
    for i, wd in enumerate(words):
        if i in drop:
            continue
        for s, off in spans:
            if s.src == wd.src and wd.start >= s.in_ - EPS and wd.end <= s.out + EPS:
                out.append(Word(text=wd.text, start=round(off + wd.start - s.in_, 3),
                                end=round(off + wd.end - s.in_, 3), src="out"))
                break
    return out
```


- [ ] **Step 3: Rodar os testes**

Run: `uv run pytest tests/test_timeline.py -v`. Expected: 9 PASS.

- [ ] **Step 4: Commit**

```bash
git add autovideo/timeline.py tests/test_timeline.py && git commit -m "feat: timeline contract, segment planning and word remap"
```

---

### Task 3: Receitas (YAML) + `recipes.py`

**Files:**
- Create: `autovideo/recipes.py`, `recipes/talking-head-punchy.yaml`, `recipes/screen-tutorial.yaml`, `recipes/montage-beat.yaml`
- Test: `tests/test_recipes.py`

**Interfaces:**
- Produces:
  - `Recipe` com os campos `id`, `title`, `mode: "speech"|"montage"`, `aspect: str`, `pacing: Pacing(max_gap, pad, fillers: list[str])`, `captions: Captions(enabled: bool, component: str)`, `motion: Motion(zoom_every_s: float, zoom_scale: float, components: list[str])`, `audio: AudioCfg(clean: bool, lufs: float)`, `budget: Budget(max_turns: int, max_usd: float)`, `prompts: dict[str, str]` (chaves: director, copywriter, designer, editor) e `skills: list[str]`
  - `RECIPES_DIR: Path`
  - `load_recipe(id: str) -> Recipe`, que levanta `KeyError` com a lista das disponíveis
  - `list_recipes() -> list[str]`

- [ ] **Step 1: Teste que falha**

```python
# tests/test_recipes.py
import pytest
from autovideo.recipes import load_recipe, list_recipes
from autovideo.timeline import FORMATS

def test_all_shipped_recipes_load():
    ids = list_recipes()
    assert {"talking-head-punchy", "screen-tutorial", "montage-beat"} <= set(ids)
    for i in ids:
        r = load_recipe(i)
        assert r.aspect in FORMATS
        assert set(r.prompts) == {"director", "copywriter", "designer", "editor"}

def test_unknown_recipe_lists_available():
    with pytest.raises(KeyError, match="talking-head-punchy"):
        load_recipe("nope")
```

Run: `uv run pytest tests/test_recipes.py -v`. Expected: FAIL.

- [ ] **Step 2: Implementar `recipes.py`**

```python
# autovideo/recipes.py
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
```

- [ ] **Step 3: Escrever as 3 receitas**

```yaml
# recipes/talking-head-punchy.yaml
id: talking-head-punchy
title: Talking head — ritmo de Reels
mode: speech
aspect: "9:16"
pacing: {max_gap: 0.3, pad: 0.08, fillers: ["é", "eh", "ãh", "ahn", "hum", "hmm", "uh", "éé"]}
captions: {enabled: true, component: caption-pill-karaoke}
motion:
  zoom_every_s: 3.5
  zoom_scale: 1.14
  components: [headline-slam, lt-bold-block, count-up, marker-highlight, push-in, camera-shake, whip-pan-cut, caption-emoji-pop]
audio: {clean: true, lufs: -14}
budget: {max_turns: 40, max_usd: 3.0}
skills: [hyperframes, hyperframes-core, hyperframes-animation, hyperframes-creative, hyperframes-registry, hyperframes-cli, media-use, talking-head-recut, embedded-captions]
prompts:
  director: |
    Formato Reels/TikTok/Shorts. Os 3 primeiros segundos precisam de um hook visual + textual que prometa o payoff.
    Ritmo alto: nenhum trecho parado > 3.5 s sem mudança visual (zoom, overlay, b-roll ou corte).
  copywriter: |
    Corte retakes (frase repetida: mantenha a ÚLTIMA versão completa), gaguejos e frases que fogem do roteiro.
    Ênfase: 1 palavra-chave a cada ~2 frases (números, verbos fortes, promessas).
  designer: |
    Visual disruptivo e legível no celular: contraste alto, fontes condensadas pesadas, 1 cor de acento.
    Legendas em 2–3 palavras por vez, palavra ativa destacada, dentro da faixa segura (entre 55% e 78% da altura).
  editor: |
    Zoom punch-in de 1.10–1.18 nas frases de ênfase; alterne punch e push. Overlay de hook em 0–2.5 s.
    SFX curtos (whoosh/pop) só em transições e overlays, se houver arquivos em assets/sfx/.
```

```yaml
# recipes/screen-tutorial.yaml
id: screen-tutorial
title: Gravação de tela — tutorial com zoom no que importa
mode: speech
aspect: "16:9"
pacing: {max_gap: 0.45, pad: 0.1, fillers: ["é", "eh", "ãh", "ahn", "hum", "hmm"]}
captions: {enabled: true, component: caption-highlight}
motion:
  zoom_every_s: 6
  zoom_scale: 1.6
  components: [cursor-zoom-follow, ui-focus-zoom, mk-callout-highlight, hw-callout-circle, lt-clean-bar, typed-prompt]
audio: {clean: true, lufs: -14}
budget: {max_turns: 40, max_usd: 3.0}
skills: [hyperframes, hyperframes-core, hyperframes-animation, hyperframes-registry, hyperframes-cli, media-use, embedded-captions]
prompts:
  director: |
    Tutorial: o espectador precisa SEMPRE ver onde está a ação. Estruture em passos numerados.
  copywriter: |
    Corte hesitações e esperas de carregamento de tela (trechos sem fala longos). Gere títulos curtos por passo.
  designer: |
    Estilo limpo de produto: fundo escuro, 1 cor de acento, callouts com seta/círculo desenhado.
  editor: |
    Use os frames em analysis/frames/ para localizar onde está a ação de cada trecho e faça zooms push
    (scale 1.4–1.8) com origin apontando para essa região. Volte ao quadro inteiro entre passos.
```

```yaml
# recipes/montage-beat.yaml
id: montage-beat
title: Montagem de clipes no ritmo da música
mode: montage
aspect: "9:16"
pacing: {max_gap: 0, pad: 0, fillers: []}
captions: {enabled: false, component: caption-kinetic-slam}
motion:
  zoom_every_s: 2
  zoom_scale: 1.08
  components: [beat-freeze-cut, beat-accent, flash-through-white, whip-pan, headline-slam, light-leak]
audio: {clean: false, lufs: -14}
budget: {max_turns: 50, max_usd: 4.0}
skills: [hyperframes, hyperframes-core, hyperframes-animation, hyperframes-audio, hyperframes-cli, media-use, music-to-video]
prompts:
  director: |
    Montagem: escolha os melhores momentos (movimento, rostos, ação) e uma narrativa em 3 atos curtos.
  copywriter: |
    Sem fala: produza 3–6 textos curtos na tela que contem a história e o post.json.
  designer: |
    Tipografia cinética grande, transições no beat.
  editor: |
    Você define os segments (cortes) diretamente a partir de analysis/scenes.json e dos frames.
    Se houver música em assets/music.*, rode `npx --yes hyperframes@0.8.158 beats composition --json` depois de
    incluí-la e alinhe os cortes aos beats. Duração alvo: 15–30 s.
```

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_recipes.py -v`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: recipe schema and three shipped recipes"
```

---

### Task 4: `media.py` — probe, limpeza de áudio/CFR, frames, cenas e loudness

**Files:**
- Create: `autovideo/media.py`, `tests/conftest.py`
- Test: `tests/test_media.py`

**Interfaces:**
- Consumes: `hf.run`, `hf.which`
- Produces:
  - `probe(path: Path) -> dict`, com as chaves `duration`, `width`, `height`, `fps`, `has_audio` e `rotation`. `width`/`height` já vêm com a rotação aplicada.
  - `clean(src: Path, dst: Path, clean_audio: bool, lufs: float = -14) -> None`: reencoda para H.264 CFR 30 com yuv420p e aplica a rotação; se `clean_audio`, aplica a cadeia de áudio ou o ElevenLabs.
  - `extract_frames(src: Path, out_dir: Path, every_s: float = 2.0) -> list[Path]`
  - `detect_scenes(src: Path, threshold: float = 0.3) -> list[float]`
  - `parse_scene_times(stderr: str) -> list[float]`
  - `integrated_lufs(path: Path) -> float` e `parse_lufs(stderr: str) -> float`
  - `normalize_final(path: Path, lufs: float = -14) -> None`, que reescreve só o áudio, copiando o vídeo

- [ ] **Step 1: Fixtures de mídia sintética**

```python
# tests/conftest.py
import os
import shutil
import subprocess
import pytest

needs_ffmpeg = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg ausente")


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


@pytest.fixture(scope="session")
def media_dir(tmp_path_factory):
    d = tmp_path_factory.mktemp("Meus Vídeos ç")  # Review Focus 3: espaço + acento
    # 6 s: tom 0–2 s, silêncio 2–4 s, tom 4–6 s; VFR simulado com -vsync vfr; rotação 90°
    ff("-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24",
       "-f", "lavfi", "-i", "aevalsrc='if(lt(mod(t,4),2),0.3*sin(440*2*PI*t),0)':s=48000",
       "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(d / "talk.mp4"))
    ff("-i", str(d / "talk.mp4"), "-c", "copy", "-metadata:s:v:0", "rotate=90", str(d / "rotated.mp4"))
    ff("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30", "-f", "lavfi", "-i", "color=c=red:size=640x360:rate=30",
       "-filter_complex", "[0:v]trim=0:2[a];[1:v]trim=0:2,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]",
       "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(d / "scenes.mp4"))
    return d


@pytest.fixture
def slow():
    if not os.environ.get("AV_SLOW"):
        pytest.skip("defina AV_SLOW=1 para testes com rede/modelos")
```

- [ ] **Step 2: Testes que falham**

```python
# tests/test_media.py
import pytest
from conftest import needs_ffmpeg
from autovideo import media

def test_parse_scene_times():
    err = "[Parsed_showinfo_1 @ 0x1] n:   0 pts:  60 pts_time:2.002 duration:1\n" \
          "[Parsed_showinfo_1 @ 0x1] n:   1 pts: 120 pts_time:4.5 duration:1\n"
    assert media.parse_scene_times(err) == [2.002, 4.5]

def test_parse_lufs():
    err = "Summary:\n\n  Integrated loudness:\n    I:         -14.3 LUFS\n    Threshold: -24.5 LUFS\n"
    assert media.parse_lufs(err) == -14.3

@needs_ffmpeg
def test_probe(media_dir):
    p = media.probe(media_dir / "talk.mp4")
    assert p["width"] == 1920 and p["height"] == 1080 and p["has_audio"]
    assert p["duration"] == pytest.approx(6, abs=0.1)

@needs_ffmpeg
def test_clean_applies_rotation_and_cfr(media_dir, tmp_path):
    dst = tmp_path / "out dir ã" / "rot.clean.mp4"
    media.clean(media_dir / "rotated.mp4", dst, clean_audio=True)
    p = media.probe(dst)
    assert (p["width"], p["height"]) == (1080, 1920)   # rotação aplicada
    assert p["rotation"] == 0
    assert p["fps"] == pytest.approx(30)

@needs_ffmpeg
def test_detect_scenes(media_dir):
    times = media.detect_scenes(media_dir / "scenes.mp4")
    assert any(abs(t - 2.0) < 0.1 for t in times)

@needs_ffmpeg
def test_extract_frames(media_dir, tmp_path):
    frames = media.extract_frames(media_dir / "talk.mp4", tmp_path / "f", every_s=2)
    assert len(frames) == 3 and frames[0].suffix == ".jpg"
```

Run: `uv run pytest tests/test_media.py -v`. Expected: FAIL.

- [ ] **Step 3: Implementar `media.py`**

```python
# autovideo/media.py
import json
import os
import re
import tempfile
from pathlib import Path
import httpx
from autovideo.hf import run, ToolError

AUDIO_CHAIN = "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-18dB:ratio=3:attack=5:release=60,loudnorm=I={lufs}:TP=-1.5:LRA=11"


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)]).stdout
    data = json.loads(out)
    v = next(s for s in data["streams"] if s["codec_type"] == "video")
    rot = int(v.get("tags", {}).get("rotate", 0))
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, den = v.get("avg_frame_rate", "0/1").split("/")
    return {"duration": float(data["format"]["duration"]), "width": w, "height": h,
            "fps": float(num) / float(den or 1) if float(den or 1) else 0.0,
            "has_audio": any(s["codec_type"] == "audio" for s in data["streams"]), "rotation": rot}


def _elevenlabs_isolate(src: Path, wav_out: Path) -> None:
    key = os.environ["ELEVENLABS_API_KEY"]
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "a.mp3"
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vn", "-ac", "1", "-b:a", "192k", str(raw)])
        r = httpx.post("https://api.elevenlabs.io/v1/audio-isolation", headers={"xi-api-key": key},
                       files={"audio": ("a.mp3", raw.read_bytes(), "audio/mpeg")}, timeout=600)
        r.raise_for_status()
        wav_out.write_bytes(r.content)


def clean(src: Path, dst: Path, clean_audio: bool, lufs: float = -14) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    vargs = ["-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast"]
    if not probe(src)["has_audio"]:
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), *vargs, "-an", str(dst)])
        return
    if clean_audio and os.environ.get("ELEVENLABS_API_KEY"):
        iso = dst.with_suffix(".iso.mp3")
        _elevenlabs_isolate(src, iso)
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(iso), "-map", "0:v:0", "-map", "1:a:0",
             *vargs, "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k",
             "-ar", "48000", str(dst)])
        iso.unlink()
        return
    af = AUDIO_CHAIN.format(lufs=lufs) if clean_audio else f"loudnorm=I={lufs}:TP=-1.5:LRA=11"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), *vargs, "-af", af,
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(dst)])


def extract_frames(src: Path, out_dir: Path, every_s: float = 2.0) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", f"fps=1/{every_s},scale=480:-2",
         "-q:v", "4", str(out_dir / "f_%04d.jpg")])
    return sorted(out_dir.glob("f_*.jpg"))


def parse_scene_times(stderr: str) -> list[float]:
    return [float(m) for m in re.findall(r"pts_time:([\d.]+)", stderr)]


def detect_scenes(src: Path, threshold: float = 0.3) -> list[float]:
    p = run(["ffmpeg", "-hide_banner", "-i", str(src), "-vf", f"select='gt(scene,{threshold})',showinfo",
             "-an", "-f", "null", "-"])
    return parse_scene_times(p.stderr)


def parse_lufs(stderr: str) -> float:
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", stderr)
    if not m:
        raise ToolError("ebur128 sem medição de loudness")
    return float(m[-1])


def integrated_lufs(path: Path) -> float:
    return parse_lufs(run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"]).stderr)


def normalize_final(path: Path, lufs: float = -14) -> None:
    tmp = path.with_suffix(".norm.mp4")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-c:v", "copy",
         "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", str(tmp)])
    tmp.replace(path)
```

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_media.py -v`. Expected: 6 PASS.

Se `test_clean_applies_rotation_and_cfr` falhar em `rotation`: o ffmpeg 7 aplica a rotação automaticamente ao reencodar e grava rotation 0. Confira com `ffprobe` o valor que sai e ajuste a leitura de `side_data_list` no `probe`. Não mexa no teste.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: media utilities (probe, clean/CFR, frames, scenes, loudness)"
```

---

### Task 5: `transcribe.py` — transcrição pt-BR e candidatos de corte

**Files:**
- Create: `autovideo/transcribe.py`
- Test: `tests/test_transcribe.py`

**Interfaces:**
- Consumes: `hf.HF`, `hf.run`, `timeline.Word`
- Produces:
  - `parse_transcript(data: object, src: str) -> list[Word]`. Aceita uma lista `[{text,start,end}]`, `{"words": [...]}` ou `{"segments": [{"words": [...]}]}`; o campo de texto pode se chamar `text` ou `word`.
  - `transcribe(media: Path, src: str, workdir: Path, language: str = "pt", model: str = "small") -> list[Word]`
  - `filler_candidates(words: list[Word], fillers: list[str]) -> set[int]`
  - `require_speech(words: list[Word]) -> None`, que levanta `NoSpeechError("Nenhuma fala detectada — use a receita montage-beat")` quando há menos de 3 palavras
  - `numbered_text(words: list[Word]) -> str`, uma linha por frase no formato `[i] palavra palavra…`, quebrada em pausas de mais de 0.6 s, para os prompts

- [ ] **Step 1: Descobrir o formato real do `hyperframes transcribe`**

Run (em qualquer pasta temporária com um arquivo de fala real, por exemplo um áudio de celular seu):
`npx --yes hyperframes@0.8.158 transcribe fala.m4a --language pt --model small --json > t.json`
Inspecione `t.json` e confirme que o formato bate com um dos três aceitos por `parse_transcript`. Se não bater, inclua o formato real no teste abaixo como um 4º caso.

Se `--model small` for recusado (as opções listadas são `tiny.en … large-v3`), use `large-v3`. Nesse caso, mude o default de `model` para `"large-v3"` e anote no README que ele é mais lento em CPU.

- [ ] **Step 2: Testes que falham**

```python
# tests/test_transcribe.py
import pytest
from autovideo.transcribe import parse_transcript, filler_candidates, require_speech, numbered_text, NoSpeechError
from autovideo.timeline import Word

RAW = [{"text": "Olá", "start": 0.1, "end": 0.4}, {"text": "é", "start": 0.5, "end": 0.6},
       {"text": "pessoal,", "start": 0.7, "end": 1.0}, {"text": "Hoje", "start": 2.0, "end": 2.3}]

@pytest.mark.parametrize("data", [RAW, {"words": RAW},
                                  {"segments": [{"words": RAW[:2]}, {"words": RAW[2:]}]},
                                  [{"word": r["text"], "start": r["start"], "end": r["end"]} for r in RAW]])
def test_parse_transcript_shapes(data):
    ws = parse_transcript(data, "a.mp4")
    assert [w.text for w in ws] == ["Olá", "é", "pessoal,", "Hoje"]
    assert ws[0].src == "a.mp4"

def test_filler_candidates_ignores_case_and_punctuation():
    ws = parse_transcript(RAW + [{"text": "É,", "start": 3, "end": 3.1}], "a.mp4")
    assert filler_candidates(ws, ["é", "hum"]) == {1, 4}

def test_require_speech():
    with pytest.raises(NoSpeechError, match="montage-beat"):
        require_speech([])
    require_speech(parse_transcript(RAW, "a.mp4"))

def test_numbered_text_breaks_on_pause():
    txt = numbered_text(parse_transcript(RAW, "a.mp4"))
    assert txt.splitlines() == ["[0] Olá é pessoal,", "[3] Hoje"]
```

Run: `uv run pytest tests/test_transcribe.py -v`. Expected: FAIL.

- [ ] **Step 3: Implementar**

```python
# autovideo/transcribe.py
import json
import re
from pathlib import Path
from autovideo.hf import HF, run
from autovideo.timeline import Word


class NoSpeechError(RuntimeError):
    pass


def _iter_raw(data):
    if isinstance(data, dict) and "segments" in data:
        for seg in data["segments"]:
            yield from seg.get("words", [])
    elif isinstance(data, dict):
        yield from data.get("words", [])
    else:
        yield from data


def parse_transcript(data, src: str) -> list[Word]:
    return [Word(text=str(r.get("text", r.get("word", ""))).strip(), start=float(r["start"]),
                 end=float(r["end"]), src=src) for r in _iter_raw(data)
            if str(r.get("text", r.get("word", ""))).strip()]


def transcribe(media: Path, src: str, workdir: Path, language: str = "pt", model: str = "small") -> list[Word]:
    workdir.mkdir(parents=True, exist_ok=True)
    p = run([*HF, "transcribe", str(media), "--dir", str(workdir), "--language", language,
             "--model", model, "--json"], cwd=workdir, timeout=7200)
    return parse_transcript(json.loads(p.stdout), src)


def _norm(t: str) -> str:
    return re.sub(r"[^\wà-ú]", "", t.lower())


def filler_candidates(words: list[Word], fillers: list[str]) -> set[int]:
    f = {_norm(x) for x in fillers}
    return {i for i, w in enumerate(words) if _norm(w.text) in f}


def require_speech(words: list[Word]) -> None:
    if len(words) < 3:
        raise NoSpeechError("Nenhuma fala detectada — use a receita montage-beat")


def numbered_text(words: list[Word]) -> str:
    lines, cur, start_idx = [], [], 0
    for i, w in enumerate(words):
        if cur and (w.start - words[i - 1].end > 0.6 or w.src != words[i - 1].src):
            lines.append(f"[{start_idx}] " + " ".join(cur))
            cur, start_idx = [], i
        cur.append(w.text)
    if cur:
        lines.append(f"[{start_idx}] " + " ".join(cur))
    return "\n".join(lines)
```

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_transcribe.py -v`. Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: transcription parsing, filler candidates, speech guard"
```

---

### Task 6: `project.py` + `jobs.py` — projeto, store SQLite e motor de etapas retomáveis com gates

**Files:**
- Create: `autovideo/project.py`, `autovideo/jobs.py`
- Test: `tests/test_jobs.py`

**Interfaces:**
- Produces:
  - `Project(root: Path)` com as properties `input`, `analysis`, `comp` (= root/"composition"), `out` e `approvals`. Métodos:
    - `manifest() -> dict` e `save_manifest(d)` (arquivo `input/manifest.json`)
    - `log(entry: dict)`, que faz append em `decisions.log`
    - `feedback() -> str` (conteúdo de `feedback.md`, ou "")
  - `Stage = tuple[str, str, Callable[[Ctx], None] | None]`, com nome, artefato relativo e função. Quando a função é `None`, a etapa é um gate.
  - `Ctx(project: Project, recipe: Recipe, job: dict, agent: Callable)`
  - `JobStore(db: Path)` com os métodos `create(project_dir, recipe, auto) -> int`, `get(id) -> dict`, `list() -> list[dict]`, `set(id, **fields)` e `next_queued() -> dict | None`
  - `run_job(store: JobStore, job_id: int, stages: list[Stage], make_ctx: Callable[[dict], Ctx]) -> str`, que devolve o status final
  - `approve(store, job_id, stages)` e `reject(store, job_id, stages, feedback: str)`

Regras:
- Uma etapa é pulada se o artefato existe.
- Um gate pendente com `auto=False` deixa o job em `awaiting_approval` e para.
- Exceção numa etapa: status `failed`, com `error=str(e)` e a etapa registrada.
- `reject` está associado ao gate pendente. Ele faz append do feedback em `feedback.md` e apaga os artefatos de todas as etapas entre o gate anterior e esta (exclusive o gate anterior). Também apaga o arquivo do gate atual e põe o job em `queued`.

- [ ] **Step 1: Testes que falham**

```python
# tests/test_jobs.py
from pathlib import Path
from autovideo.jobs import JobStore, run_job, approve, reject, Ctx
from autovideo.project import Project

def mk_stages(calls, boom=None):
    def make(name, art):
        def fn(ctx):
            calls.append(name)
            if name == boom:
                raise RuntimeError("explodiu")
            p = ctx.project.root / art
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(name)
        return (name, art, fn)
    return [make("a", "a.txt"), ("gate1", "approvals/gate1.ok", None),
            make("b", "b.txt"), make("c", "out/c.txt"), ("gate2", "approvals/gate2.ok", None)]

def setup(tmp_path, auto=False):
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create(str(tmp_path / "p 1"), "talking-head-punchy", auto)
    make_ctx = lambda job: Ctx(project=Project(Path(job["project_dir"])), recipe=None, job=job, agent=None)
    return store, jid, make_ctx

def test_stops_at_gate_and_resumes_after_approve(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert store.get(jid)["stage"] == "gate1"
    approve(store, jid, st)
    assert store.get(jid)["status"] == "queued"
    assert run_job(store, jid, st, mk) == "awaiting_approval"
    assert calls == ["a", "b", "c"]          # "a" não reexecuta

def test_auto_skips_gates(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    assert run_job(store, jid, mk_stages(calls), mk) == "completed"

def test_failure_marks_failed_and_resume_continues(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path, auto=True)
    assert run_job(store, jid, mk_stages(calls, boom="b"), mk) == "failed"
    job = store.get(jid)
    assert job["stage"] == "b" and "explodiu" in job["error"]
    assert run_job(store, jid, mk_stages(calls), mk) == "completed"   # Review Focus 5
    assert calls == ["a", "b", "b", "c"]

def test_reject_clears_only_downstream_and_saves_feedback(tmp_path):
    calls = []
    store, jid, mk = setup(tmp_path)
    st = mk_stages(calls)
    run_job(store, jid, st, mk); approve(store, jid, st); run_job(store, jid, st, mk)
    root = Path(store.get(jid)["project_dir"])
    reject(store, jid, st, "zoom demais")
    assert (root / "a.txt").exists() and (root / "approvals/gate1.ok").exists()
    assert not (root / "b.txt").exists() and not (root / "out/c.txt").exists()
    assert "zoom demais" in (root / "feedback.md").read_text(encoding="utf-8")
    assert store.get(jid)["status"] == "queued"
```

Run: `uv run pytest tests/test_jobs.py -v`. Expected: FAIL.

- [ ] **Step 2: Implementar `project.py`**

```python
# autovideo/project.py
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
```

- [ ] **Step 3: Implementar `jobs.py`**

```python
# autovideo/jobs.py
import shutil
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from autovideo.project import Project

Stage = tuple[str, str, Callable | None]


@dataclass
class Ctx:
    project: Project
    recipe: object
    job: dict
    agent: Callable | None


class JobStore:
    def __init__(self, db: Path):
        db.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.con = sqlite3.connect(db, check_same_thread=False)
        self.con.row_factory = sqlite3.Row
        self.con.execute("""create table if not exists jobs(id integer primary key, project_dir text, recipe text,
            auto integer, status text, stage text, error text, created real, updated real)""")
        self.con.commit()

    def create(self, project_dir: str, recipe: str, auto: bool) -> int:
        with self._lock:
            cur = self.con.execute("insert into jobs(project_dir,recipe,auto,status,stage,error,created,updated)"
                                   " values(?,?,?,'queued','','',?,?)",
                                   (project_dir, recipe, int(auto), time.time(), time.time()))
            self.con.commit()
            return cur.lastrowid

    def get(self, jid: int) -> dict:
        return dict(self.con.execute("select * from jobs where id=?", (jid,)).fetchone())

    def list(self) -> list[dict]:
        return [dict(r) for r in self.con.execute("select * from jobs order by id desc")]

    def set(self, jid: int, **f) -> None:
        with self._lock:
            cols = ",".join(f"{k}=?" for k in f)
            self.con.execute(f"update jobs set {cols}, updated=? where id=?", (*f.values(), time.time(), jid))
            self.con.commit()

    def next_queued(self) -> dict | None:
        r = self.con.execute("select * from jobs where status='queued' order by id limit 1").fetchone()
        return dict(r) if r else None


def _art(job: dict, rel: str) -> Path:
    return Path(job["project_dir"]) / rel


def run_job(store: JobStore, jid: int, stages: list[Stage], make_ctx: Callable[[dict], Ctx]) -> str:
    job = store.get(jid)
    store.set(jid, status="in_progress", error="")
    ctx = make_ctx(job)
    for name, rel, fn in stages:
        if _art(job, rel).exists():
            continue
        store.set(jid, stage=name)
        if fn is None:
            if job["auto"]:
                p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("auto")
                continue
            store.set(jid, status="awaiting_approval")
            return "awaiting_approval"
        try:
            fn(ctx)
        except Exception as e:  # noqa: BLE001 — qualquer erro de etapa vira status failed
            store.set(jid, status="failed", error=f"{type(e).__name__}: {e}")
            return "failed"
    store.set(jid, status="completed")
    return "completed"


def approve(store: JobStore, jid: int, stages: list[Stage]) -> None:
    job = store.get(jid)
    rel = next(r for n, r, f in stages if n == job["stage"] and f is None)
    p = _art(job, rel); p.parent.mkdir(parents=True, exist_ok=True); p.write_text("ok")
    store.set(jid, status="queued")


def reject(store: JobStore, jid: int, stages: list[Stage], feedback: str) -> None:
    job = store.get(jid)
    idx = next(i for i, (n, _, f) in enumerate(stages) if n == job["stage"] and f is None)
    prev_gate = max([i for i, (_, _, f) in enumerate(stages[:idx]) if f is None], default=-1)
    root = Path(job["project_dir"])
    with (root / "feedback.md").open("a", encoding="utf-8") as fh:
        fh.write(f"\n## Feedback ({job['stage']})\n{feedback}\n")
    for _, rel, _ in stages[prev_gate + 1: idx + 1]:
        p = root / rel
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists():
            p.unlink()
    store.set(jid, status="queued")
```

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_jobs.py -v`. Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: project layout, sqlite job store, resumable stage runner with gates"
```

---

### Task 7: `agents.py` + prompts — papéis Claude com validação e retentativa

**Files:**
- Create: `autovideo/agents.py`, `autovideo/prompts/director.md`, `copywriter.md`, `designer.md`, `editor.md`
- Test: `tests/test_agents.py`

**Interfaces:**
- Consumes: `Project.log`, `Recipe`
- Produces:
  - `EditDecisions(drop: list[tuple[int, int]], emphasis: list[str] = [], hook_text: str, onscreen: list[OnScreen] = [], post: Post)`
    - `OnScreen(word_idx: int, text: str)`
    - `Post(title: str, caption: str, hashtags: list[str])`
  - `Style(palette: list[str], fonts: list[str], caption_component: str, notes: str = "")`
  - `run_role(role: str, project: Project, recipe: Recipe, task: str, output: Path, validate: Callable[[Path], None] | None = None, bash: bool = False) -> None`
    - Roda o agente, valida a saída e, se falhar, faz 1 retentativa com `resume=session_id` e a mensagem de erro.
    - Se falhar de novo, levanta `AgentOutputError`.
    - Também levanta `AgentOutputError` se `ResultMessage.is_error` vier verdadeiro.
  - `_query`: alias de módulo para `claude_agent_sdk.query` (os testes fazem monkeypatch)
  - `options_for(role, project, recipe, bash) -> ClaudeAgentOptions`

- [ ] **Step 1: Testes que falham (SDK falso)**

```python
# tests/test_agents.py
import json
import pytest
from types import SimpleNamespace
from autovideo import agents
from autovideo.agents import run_role, AgentOutputError, EditDecisions
from autovideo.project import Project
from autovideo.recipes import load_recipe

class FakeResult:  # imita ResultMessage
    def __init__(self, sid): self.session_id, self.is_error, self.total_cost_usd, self.num_turns, self.result = sid, False, 0.01, 2, "ok"

def fake_query_factory(writes, prompts_seen):
    def fake_query(*, prompt, options):
        prompts_seen.append((prompt, options))
        async def gen():
            writes.pop(0)()
            yield FakeResult("s1")
        return gen()
    return fake_query

def valid_edit(p):
    return lambda: p.write_text(json.dumps({"drop": [[1, 1]], "hook_text": "3 erros", "post":
                                            {"title": "t", "caption": "c", "hashtags": ["#a"]}}), encoding="utf-8")

def test_validates_and_logs(tmp_path, monkeypatch):
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([valid_edit(out)], seen))
    run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))
    log = (tmp_path / "decisions.log").read_text(encoding="utf-8")
    assert '"role": "copywriter"' in log and '"cost_usd": 0.01' in log

def test_retries_once_with_error_then_succeeds(tmp_path, monkeypatch):
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    bad = lambda: out.write_text("{nope", encoding="utf-8")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, valid_edit(out)], seen))
    run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))
    assert len(seen) == 2 and "falhou na validação" in seen[1][0] and seen[1][1].resume == "s1"

def test_fails_after_second_invalid_output(tmp_path, monkeypatch):   # Review Focus 4
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    bad = lambda: out.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, bad], seen))
    with pytest.raises(AgentOutputError, match="hook_text"):
        run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))

def test_options_restrict_bash_and_paths(tmp_path):
    o = agents.options_for("editor", Project(tmp_path), load_recipe("talking-head-punchy"), bash=True)
    assert o.permission_mode == "dontAsk"
    assert "Bash(npx --yes hyperframes@0.8.158 *)" in o.allowed_tools
    assert not any(t == "Bash" for t in o.allowed_tools)
    assert "talking-head-recut" in o.skills
```

Run: `uv run pytest tests/test_agents.py -v`. Expected: FAIL.

- [ ] **Step 2: Implementar `agents.py`**

```python
# autovideo/agents.py
import asyncio
from pathlib import Path
from typing import Callable
from pydantic import BaseModel, ValidationError
from claude_agent_sdk import ClaudeAgentOptions, query
from autovideo.hf import HF
from autovideo.project import Project

_query = query
PROMPTS = Path(__file__).parent / "prompts"


class AgentOutputError(RuntimeError):
    pass


class OnScreen(BaseModel):
    word_idx: int
    text: str


class Post(BaseModel):
    title: str
    caption: str
    hashtags: list[str]


class EditDecisions(BaseModel):
    drop: list[tuple[int, int]]
    emphasis: list[str] = []
    hook_text: str
    onscreen: list[OnScreen] = []
    post: Post


class Style(BaseModel):
    palette: list[str]
    fonts: list[str]
    caption_component: str
    notes: str = ""


def validate_model(model: type[BaseModel]) -> Callable[[Path], None]:
    def v(path: Path) -> None:
        model.model_validate_json(path.read_text(encoding="utf-8"))
    return v


def options_for(role: str, project: Project, recipe, bash: bool) -> ClaudeAgentOptions:
    system = (PROMPTS / f"{role}.md").read_text(encoding="utf-8") + \
        f"\n\n## Receita: {recipe.title}\n{recipe.prompts[role]}"
    skills_dir = (Path.home() / ".claude" / "skills").as_posix()
    tools = ["Read(./**)", "Edit(./**)", "Write(./**)", "Glob", "Grep", f"Read({skills_dir}/**)"]
    if bash:
        tools += [f"Bash({' '.join(HF)} *)", "Bash(ffprobe *)"]
    return ClaudeAgentOptions(
        system_prompt=system, cwd=str(project.root), permission_mode="dontAsk",
        allowed_tools=tools, setting_sources=["user", "project"],
        skills=recipe.skills if role in ("designer", "editor") else None,
        max_turns=recipe.budget.max_turns, max_budget_usd=recipe.budget.max_usd)


async def _run(prompt: str, opts: ClaudeAgentOptions):
    last = None
    async for msg in _query(prompt=prompt, options=opts):
        if hasattr(msg, "total_cost_usd"):
            last = msg
    return last


def run_role(role: str, project: Project, recipe, task: str, output: Path,
             validate: Callable[[Path], None] | None = None, bash: bool = False) -> None:
    opts = options_for(role, project, recipe, bash)
    prompt = task
    for attempt in (1, 2):
        res = asyncio.run(_run(prompt, opts))
        project.log({"role": role, "attempt": attempt, "cost_usd": getattr(res, "total_cost_usd", None),
                     "turns": getattr(res, "num_turns", None), "is_error": getattr(res, "is_error", True),
                     "result": str(getattr(res, "result", ""))[:500]})
        if res is None or res.is_error:
            raise AgentOutputError(f"{role}: execução do agente falhou ({getattr(res, 'result', 'sem resultado')})")
        try:
            if not output.exists():
                raise FileNotFoundError(f"{output.name} não foi escrito")
            if validate:
                validate(output)
            return
        except (ValidationError, ValueError, FileNotFoundError) as e:
            err = str(e)
            opts.resume = res.session_id
            prompt = f"O arquivo {output.name} falhou na validação:\n{err}\nCorrija o arquivo e termine."
    raise AgentOutputError(f"{role}: saída inválida após retentativa: {err}")
```

Nota: `json.JSONDecodeError` é subclasse de `ValueError`, e `pydantic` levanta `ValidationError` para JSON malformado em `model_validate_json`. Os dois são capturados.

- [ ] **Step 3: Escrever os 4 prompts de papel**

```markdown
<!-- autovideo/prompts/director.md -->
Você é o DIRETOR de um vídeo curto para redes sociais. Trabalhe só com arquivos do projeto (diretório atual).
Leia: script.md (roteiro, pode não existir), analysis/transcript.txt (fala numerada [índice] palavras),
analysis/summary.json (duração, fps, formato, candidatos de corte), analysis/frames/*.jpg (amostras visuais) e feedback.md (se existir).
Escreva brief.md em português com estas seções exatas:
# Intenção (1 frase: o que o espectador sente/aprende)
# Hook (0–3 s): texto do hook + ideia visual
# Estrutura (blocos com faixa de índices de palavras)
# Ritmo (onde acelerar, onde respirar)
# Motion e b-roll (momentos e ideias concretas)
# Riscos (o que pode ficar ruim)
Não edite nenhum outro arquivo.
```

```markdown
<!-- autovideo/prompts/copywriter.md -->
Você é o COPYWRITER/STORYTELLER. Leia brief.md, script.md (se existir), analysis/transcript.txt e analysis/summary.json
(campo filler_candidates = índices de palavras que já são fillers prováveis) e feedback.md.
Decida o que sai do vídeo comparando fala × roteiro: retakes (mantenha a última versão completa), gaguejos,
frases fora do roteiro, fillers. Escreva edit.json exatamente neste schema:
{"drop": [[i_inicio, i_fim], ...],            // intervalos INCLUSIVOS de índices de palavras a remover
 "emphasis": ["palavra", ...],                 // palavras para destacar na legenda
 "hook_text": "texto do hook (máx. 6 palavras)",
 "onscreen": [{"word_idx": 12, "text": "3 ERROS"}],  // textos na tela ancorados em palavras mantidas
 "post": {"title": "...", "caption": "legenda do post com CTA", "hashtags": ["#..."]}}
Não remova palavras que quebrem o sentido. Não edite nenhum outro arquivo.
```

```markdown
<!-- autovideo/prompts/designer.md -->
Você é o DESIGNER DE MOTION, com estilo disruptivo e legível no celular. O projeto HyperFrames está em composition/
(use as skills hyperframes-* e media-use, e o catálogo via `npx --yes hyperframes@0.8.158 catalog --json` /
`npx --yes hyperframes@0.8.158 add <nome> --dir composition --no-clipboard`).
Leia brief.md, edit.json, analysis/summary.json (width/height) e feedback.md.
Entregue:
1. style.json: {"palette": ["#hex",...], "fonts": ["..."], "caption_component": "<nome do catálogo>", "notes": "..."}
2. composition/compositions/captions.template.html: composição de legendas no tamanho do vídeo, baseada no componente
   escolhido, que lê as palavras de `const WORDS = /*AV_WORDS*/[];` ([{text,start,end}] em segundos do vídeo final)
   e destaca as palavras de edit.json.emphasis. Mantenha o texto dentro da faixa segura descrita na receita.
3. composition/compositions/hook.html e demais overlays (lower-third, callouts, textos de edit.json.onscreen),
   cada um uma composição com data-composition-id próprio, fundo transparente, no tamanho do vídeo, aceitando
   textos via data-composition-variables.
Não crie nem edite composition/index.html (ele é gerado). Rode `npx --yes hyperframes@0.8.158 lint composition` ao final e corrija erros.
```

```markdown
<!-- autovideo/prompts/editor.md -->
Você é o EDITOR. Leia brief.md, edit.json, style.json, analysis/summary.json, analysis/words.out.json
(palavras já no tempo do vídeo final), timeline.base.json, analysis/frames/*.jpg, as composições em
composition/compositions/ e feedback.md.
Escreva timeline.json: copie timeline.base.json e acrescente
- "zooms": [{"at": s, "dur": s, "scale": 1.0–2.0, "kind": "punch"|"push", "origin": "X% Y%"}]
- "overlays": [{"start": s, "dur": s, "src": "compositions/hook.html", "vars": {...}}]
- "broll": [{"start": s, "dur": s, "src": "assets/<arquivo>", "mode": "full"|"pip"}] (só arquivos que existam em composition/assets/)
- "sfx": [{"at": s, "src": "assets/sfx/<arquivo>", "dur": s, "volume": 0–1}] (só se existirem)
- "music": {"src": "assets/<arquivo>", "volume": 0.08–0.2} ou null
- "grading": objeto de `npx --yes hyperframes@0.8.158 media-treatment --project composition --selector "#cam video" --analyze --json` (campo de correção sugerida) ou null
Todos os tempos são do vídeo FINAL e precisam caber em [0, duração]. NÃO altere "segments" (exceto na receita montage, em que você os define a partir de analysis/scenes.json).
Se receber um relatório de revisão (review), corrija timeline.json e/ou as composições apontadas.
```

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_agents.py -v`. Expected: 4 PASS.

- [ ] **Step 5: Smoke real do SDK (1 chamada)**

Run: `uv run python -c "import asyncio;from claude_agent_sdk import query,ClaudeAgentOptions;asyncio.run((lambda: [m async for m in query(prompt='Responda só OK',options=ClaudeAgentOptions(max_turns=1))])())" `

Se o one-liner for complicado no shell, crie um `scratch_smoke.py` fora do repo com o mesmo conteúdo. Expected: termina sem erro de auth, usando o `claude login` local.

Verifique também que `skills=` com `setting_sources=["user","project"]` aceita os nomes das skills da receita. Um `ValueError` de nome indica uma skill não instalada: rode `npx --yes hyperframes@0.8.158 skills update talking-head-recut embedded-captions music-to-video`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Claude role runner with validation, retry, cost log; role prompts"
```

---

### Task 8: `compose.py` — Timeline → `composition/index.html`

**Files:**
- Create: `autovideo/compose.py`
- Test: `tests/test_compose.py`

**Interfaces:**
- Consumes: `Timeline`, `Word`
- Produces:
  - `build_html(t: Timeline, words: list[Word]) -> str`
  - `write_composition(comp_dir: Path, t: Timeline, words: list[Word]) -> Path`
    - Escreve `index.html`.
    - Se `t.captions`, gera `compositions/captions.html` a partir de `captions.template.html` trocando `/*AV_WORDS*/[]` pelo JSON das palavras.
    - Levanta `ComposeError` se faltar o marcador ou o template.
  - `ComposeError`

Os segments referenciam `assets/<basename do src>`. Copiar as mídias para `composition/assets/` é feito pelo pipeline (Task 10).

- [ ] **Step 1: Testes que falham**

```python
# tests/test_compose.py
import json
from html.parser import HTMLParser
import pytest
from autovideo.compose import build_html, write_composition, ComposeError
from autovideo.timeline import Timeline, Segment, Zoom, Overlay, Word, Music

class Grab(HTMLParser):
    def __init__(self): super().__init__(); self.tags = []
    def handle_starttag(self, tag, attrs): self.tags.append((tag, dict(attrs)))

T = Timeline(width=1080, height=1920,
             segments=[Segment(src="input/a.clean.mp4", **{"in": 1.0}, out=3.0),
                       Segment(src="input/a.clean.mp4", **{"in": 5.0}, out=6.5)],
             zooms=[Zoom(at=0.5, dur=1.0, scale=1.2, kind="push", origin="50% 30%")],
             overlays=[Overlay(start=0, dur=2, src="compositions/hook.html", vars={"title": "Olá 'x'"})],
             music=Music(src="assets/m.mp3"), captions=False)

def tags(html):
    g = Grab(); g.feed(html); return g.tags

def test_segments_become_trimmed_video_clips():
    vids = [a for t, a in tags(build_html(T, [])) if t == "video"]
    assert [(v["data-start"], v["data-duration"], v["data-media-start"]) for v in vids] == \
           [("0", "2", "1"), ("2", "1.5", "5")]
    assert all(v["src"] == "assets/a.clean.mp4" and v["data-fade-in"] == "0.03" for v in vids)

def test_root_duration_and_size():
    root = next(a for t, a in tags(build_html(T, [])) if a.get("data-composition-id") == "main")
    assert root["data-duration"] == "3.5" and root["data-width"] == "1080"

def test_overlay_vars_are_escaped_json():
    ov = next(a for t, a in tags(build_html(T, [])) if a.get("data-composition-src") == "compositions/hook.html")
    assert json.loads(ov["data-variable-values"]) == {"title": "Olá 'x'"}

def test_zoom_tween_emitted():
    h = build_html(T, [])
    assert 'tl.fromTo("#cam"' in h and "scale: 1.2" in h and '"50% 30%"' in h

def test_captions_injects_words(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    (comp / "compositions/captions.template.html").write_text("<script>const WORDS = /*AV_WORDS*/[];</script>", encoding="utf-8")
    t = T.model_copy(update={"captions": True})
    write_composition(comp, t, [Word(text="oi", start=0.1, end=0.3, src="out")])
    cap = (comp / "compositions/captions.html").read_text(encoding="utf-8")
    assert '"text": "oi"' in cap and "/*AV_WORDS*/" not in cap
    assert 'data-composition-src="compositions/captions.html"' in (comp / "index.html").read_text(encoding="utf-8")

def test_captions_missing_marker_raises(tmp_path):
    comp = tmp_path / "composition"; (comp / "compositions").mkdir(parents=True)
    (comp / "compositions/captions.template.html").write_text("<div></div>", encoding="utf-8")
    with pytest.raises(ComposeError, match="AV_WORDS"):
        write_composition(comp, T.model_copy(update={"captions": True}), [])
```

Run: `uv run pytest tests/test_compose.py -v`. Expected: FAIL.

- [ ] **Step 2: Implementar**

```python
# autovideo/compose.py
import html
import json
from pathlib import Path
from autovideo.timeline import Timeline, Word

GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"
MARK = "/*AV_WORDS*/[]"


class ComposeError(RuntimeError):
    pass


def _n(x: float) -> str:
    return f"{round(x, 3):g}"


def _attr(v) -> str:
    return html.escape(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False), quote=True)


def build_html(t: Timeline, words: list[Word]) -> str:
    w, h, d = t.width, t.height, t.duration
    segs, off = [], 0.0
    for i, s in enumerate(t.segments):
        segs.append(f'<video id="seg-{i}" class="clip fill" src="assets/{Path(s.src).name}" playsinline '
                    f'data-start="{_n(off)}" data-duration="{_n(s.dur)}" data-media-start="{_n(s.in_)}" '
                    f'data-has-audio="true" data-fade-in="0.03" data-fade-out="0.03" data-track-index="{i % 2}"></video>')
        off += s.dur
    broll = [f'<video class="clip {b.mode}" src="{_attr(b.src)}" muted playsinline data-start="{_n(b.start)}" '
             f'data-duration="{_n(b.dur)}" data-media-start="0" style="z-index:10"></video>' for b in t.broll]
    layers = [f'<div class="layer clip" data-composition-id="ov-{i}" data-composition-src="{_attr(o.src)}" '
              f'data-start="{_n(o.start)}" data-duration="{_n(o.dur)}" '
              f'data-variable-values="{_attr(o.vars)}" style="z-index:20"></div>' for i, o in enumerate(t.overlays)]
    if t.captions:
        layers.append(f'<div class="layer clip" data-composition-id="captions" '
                      f'data-composition-src="compositions/captions.html" data-start="0" data-duration="{_n(d)}" '
                      f'style="z-index:30"></div>')
    audio = []
    if t.music:
        audio.append(f'<audio class="clip" src="{_attr(t.music.src)}" data-start="0" data-duration="{_n(d)}" '
                     f'data-volume="{t.music.volume}" data-fade-out="1.5"></audio>')
    audio += [f'<audio class="clip" src="{_attr(s.src)}" data-start="{_n(s.at)}" data-duration="{_n(s.dur)}" '
              f'data-volume="{s.volume}"></audio>' for s in t.sfx]
    tweens = []
    for z in t.zooms:
        o = json.dumps(z.origin)
        if z.kind == "punch":
            tweens.append(f'tl.set("#cam", {{ scale: {z.scale}, transformOrigin: {o} }}, {_n(z.at)});')
        else:
            tweens.append(f'tl.fromTo("#cam", {{ scale: 1, transformOrigin: {o} }}, '
                          f'{{ scale: {z.scale}, duration: {_n(z.dur)}, ease: "power1.inOut" }}, {_n(z.at)});')
        tweens.append(f'tl.set("#cam", {{ scale: 1 }}, {_n(z.at + z.dur)});')
    nl = "\n"
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={w}, height={h}" />
<script src="{GSAP}"></script>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {w}px; height: {h}px; overflow: hidden; background: #000; }}
#root {{ position: relative; width: 100%; height: 100%; overflow: hidden; }}
#cam {{ position: absolute; inset: 0; transform-origin: 50% 35%; }}
.fill, .full {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
.pip {{ position: absolute; right: 6%; top: 8%; width: 42%; border-radius: 24px; }}
.layer {{ position: absolute; inset: 0; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{_n(d)}" data-width="{w}" data-height="{h}">
<div id="cam">
{nl.join(segs)}
</div>
{nl.join(broll)}
{nl.join(layers)}
{nl.join(audio)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{nl.join(tweens)}
window.__timelines = window.__timelines || {{}};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
"""


def write_composition(comp_dir: Path, t: Timeline, words: list[Word]) -> Path:
    if t.captions:
        tpl = comp_dir / "compositions" / "captions.template.html"
        if not tpl.exists():
            raise ComposeError("captions.template.html ausente (designer não entregou)")
        src = tpl.read_text(encoding="utf-8")
        if MARK not in src:
            raise ComposeError(f"captions.template.html sem o marcador {MARK} (AV_WORDS)")
        data = json.dumps([{"text": x.text, "start": x.start, "end": x.end} for x in words], ensure_ascii=False)
        (comp_dir / "compositions" / "captions.html").write_text(src.replace(MARK, data), encoding="utf-8")
    out = comp_dir / "index.html"
    out.write_text(build_html(t, words), encoding="utf-8")
    return out
```

- [ ] **Step 3: Rodar os testes**

Run: `uv run pytest tests/test_compose.py -v`. Expected: 6 PASS.

- [ ] **Step 4: Lint real do HTML gerado**

Num diretório temporário:
1. `npx --yes hyperframes@0.8.158 init c --example blank --resolution portrait --non-interactive --skip-transcribe` com `HYPERFRAMES_SKIP_SKILLS=1`.
2. Copie `tests/media` → gere `assets/a.clean.mp4` com ffmpeg (testsrc 8 s).
3. Grave `build_html(T sem overlays, [])` em `c/index.html`.
4. Rode `npx --yes hyperframes@0.8.158 lint c --json`.

Expected: nenhum finding de severidade error. Se algum atributo for reclamado (por exemplo `data-fade-in` em `<video>`), ajuste o template e o teste correspondente juntos.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: compose timeline into HyperFrames index.html with captions injection"
```

---

### Task 9: `render.py` — init da composição, revisão (check + snapshot), render e loudness

**Files:**
- Create: `autovideo/render.py`
- Test: `tests/test_render.py`

**Interfaces:**
- Consumes: `HF`, `run`, `media.integrated_lufs`, `media.normalize_final`, `compose.write_composition`
- Produces:
  - `init_composition(project: Project, aspect: str) -> None`. Roda `hyperframes init composition --example blank --resolution <preset> --non-interactive --skip-transcribe` em `project.root`, com env `HYPERFRAMES_SKIP_SKILLS=1`. É idempotente: não faz nada se `composition/hyperframes.json` existe.
  - `apply_grading(comp: Path, grading: dict | None) -> None`
  - `caption_zone(aspect: str) -> str`. Para `9:16`: `"x0=0.05;y0=0.55;x1=0.95;y1=0.80;severity=error"`. Para `16:9` e `1:1`: `"x0=0.05;y0=0.72;x1=0.95;y1=0.95;severity=error"`.
  - `check(comp: Path, aspect: str) -> list[dict]`, que devolve a lista de issues com severity error
  - `summarize_check(data: dict) -> list[dict]`
  - `snapshots(comp: Path, times: list[float], out_dir: Path) -> list[Path]`
  - `render_final(comp: Path, out: Path, lufs: float) -> float`, que devolve o LUFS medido; normaliza se a diferença for maior que 1.5
  - `make_cover(video: Path, at: float, out: Path) -> None`

O `run(...)` de `hf.py` não recebe `env`. Adicione `env: dict | None = None` a `hf.run`, mesclando com `os.environ`, e mantenha os testes da Task 1 passando.

- [ ] **Step 1: Descobrir o shape do `check --json`**

No projeto do Step 4 da Task 8, rode `npx --yes hyperframes@0.8.158 check c --json > check.json` e inspecione as chaves: lista de issues, campo de severidade e mensagem. Escreva o teste abaixo com o shape REAL. O abaixo assume `{"ok": bool, "issues": [{"severity": "error"|"warning", "message": str, "at": float?}]}`; ajuste se for diferente.

- [ ] **Step 2: Testes que falham**

```python
# tests/test_render.py
from conftest import needs_ffmpeg
from autovideo import render

def test_summarize_check_keeps_errors_only():
    data = {"ok": False, "issues": [{"severity": "error", "message": "caption fora da faixa", "at": 3.2},
                                    {"severity": "warning", "message": "contraste"}]}
    assert render.summarize_check(data) == [{"severity": "error", "message": "caption fora da faixa", "at": 3.2}]

def test_caption_zone_by_aspect():
    assert "y0=0.55" in render.caption_zone("9:16") and "severity=error" in render.caption_zone("16:9")

@needs_ffmpeg
def test_make_cover(media_dir, tmp_path):
    render.make_cover(media_dir / "talk.mp4", 1.0, tmp_path / "cover.jpg")
    assert (tmp_path / "cover.jpg").stat().st_size > 1000
```

Run: `uv run pytest tests/test_render.py -v`. Expected: FAIL.

- [ ] **Step 3: Implementar**

```python
# autovideo/render.py
import json
from pathlib import Path
from autovideo.hf import HF, run
from autovideo.media import integrated_lufs, normalize_final
from autovideo.project import Project
from autovideo.timeline import FORMATS


def init_composition(project: Project, aspect: str) -> None:
    if (project.comp / "hyperframes.json").exists():
        return
    run([*HF, "init", "composition", "--example", "blank", "--resolution", FORMATS[aspect][2],
         "--non-interactive", "--skip-transcribe"], cwd=project.root, env={"HYPERFRAMES_SKIP_SKILLS": "1"})
    (project.comp / "compositions").mkdir(exist_ok=True)
    (project.comp / "assets").mkdir(exist_ok=True)


def apply_grading(comp: Path, grading: dict | None) -> None:
    if grading:
        run([*HF, "media-treatment", "--project", str(comp), "--selector", "#cam video",
             "--grading", json.dumps(grading), "--apply", "--json"])


def caption_zone(aspect: str) -> str:
    if aspect == "9:16":
        return "x0=0.05;y0=0.55;x1=0.95;y1=0.80;severity=error"
    return "x0=0.05;y0=0.72;x1=0.95;y1=0.95;severity=error"


def summarize_check(data: dict) -> list[dict]:
    return [i for i in data.get("issues", []) if i.get("severity") == "error"]


def check(comp: Path, aspect: str) -> list[dict]:
    p = run([*HF, "check", str(comp), "--json", "--caption-zone", caption_zone(aspect), "--at-transitions"],
            timeout=1800)
    return summarize_check(json.loads(p.stdout))


def snapshots(comp: Path, times: list[float], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    run([*HF, "snapshot", str(comp), "--at", ",".join(f"{t:.2f}" for t in times), "-o", str(out_dir)],
        timeout=1800)
    return sorted(out_dir.glob("*.png"))


def render_final(comp: Path, out: Path, lufs: float) -> float:
    out.parent.mkdir(parents=True, exist_ok=True)
    run([*HF, "render", str(comp), "-o", str(out), "--quality", "delivery", "--fps", "30", "--quiet"],
        timeout=7200)
    measured = integrated_lufs(out)
    if abs(measured - lufs) > 1.5:
        normalize_final(out, lufs)
        measured = integrated_lufs(out)
    return measured


def make_cover(video: Path, at: float, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", str(video), "-frames:v", "1",
         "-q:v", "2", str(out)])
```

Em `hf.py`, troque a assinatura por `run(args, cwd=None, timeout=1800, env=None)` e passe `env={**os.environ, **(env or {})}` ao `subprocess.run` (com `import os`).

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_render.py tests/test_doctor.py -v`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: composition init, check/snapshot review, render with loudness guard, cover"
```

---

### Task 10: `pipeline.py` + `autovideo edit/approve/reject` — fluxo completo

**Files:**
- Create: `autovideo/pipeline.py`
- Modify: `autovideo/cli.py` (subcomandos `edit`, `approve`, `reject`)
- Test: `tests/test_pipeline.py`

**Interfaces:**
- Consumes: tudo acima.
- Produces:
  - `STAGES: list[Stage]`, nesta ordem:
    1. `ingest` → `input/manifest.json`
    2. `clean` → `input/clean.ok`
    3. `transcribe` → `analysis/words.json`
    4. `analyze` → `analysis/summary.json`
    5. `director` → `brief.md`
    6. `gate1` → `approvals/gate1.ok`
    7. `copywriter` → `edit.json`
    8. `plan` → `timeline.base.json`
    9. `designer` → `style.json`
    10. `editor` → `timeline.json`
    11. `render` → `out/final.mp4`
    12. `gate2` → `approvals/gate2.ok`
    13. `post` → `out/post.json`
  - `new_job(store, home: Path, videos: list[Path], script: Path | None, recipe: str, auto: bool, assets: list[Path] = []) -> int`. Cria `projects/<AAAAMMDD-HHMMSS>-<slug>/`, copia vídeos para `input/raw/`, o roteiro para `script.md` e os assets para `composition-assets/`; grava a receita em `job.json`.
  - `make_ctx(job: dict) -> Ctx`, com o agente real `agents.run_role`
  - `home() -> Path`, que vem de `AUTOVIDEO_HOME` ou é `./projects`

Comportamento de cada etapa:
- **ingest:** grava `manifest = {"videos": [{"raw": "input/raw/x.mp4", "clean": "input/x.clean.mp4", **probe}], "aspect": recipe.aspect}`.
- **clean:** roda `media.clean(raw, clean, recipe.audio.clean, recipe.audio.lufs)` para cada vídeo e escreve `input/clean.ok`.
- **transcribe:**
  - Receita `speech`: transcreve cada clean com `src` = caminho relativo do clean, concatena, aplica `require_speech` e grava `analysis/words.json` (lista de Word).
  - Receita `montage`: grava `[]`.
- **analyze:**
  - Extrai frames de cada clean em `analysis/frames/<n>/` (a cada 2 s em speech, 1 s em montage).
  - Grava `analysis/scenes.json` com `{src: [tempos]}`.
  - Grava `analysis/transcript.txt` com `numbered_text`.
  - Grava `summary.json` com as chaves `duration_total`, `width`, `height` (de `FORMATS[aspect]`), `aspect`, `word_count`, `filler_candidates` (lista ordenada) e `sources`.
- **director:** `run_role("director", ..., output=brief.md)`. Antes, se existir `feedback.md`, inclui o texto no task.
- **copywriter:** `run_role(..., output=edit.json, validate=validate_model(EditDecisions))`.
- **plan:**
  - Em speech: `drop` = intervalos do `edit.json` ∪ `filler_candidates`; segs = `plan_segments(words, drop, durations, recipe.pacing.max_gap, recipe.pacing.pad)`; `words_out` = `remap_words(...)` gravado em `analysis/words.out.json`.
  - Em montage: segs = um segmento por clean, com o vídeo inteiro.
  - Grava `Timeline(width, height, segments=segs, captions=recipe.captions.enabled and mode=="speech")` em `timeline.base.json`.
- **designer:** `render.init_composition(project, aspect)`; copia os cleans e os assets do usuário para `composition/assets/` (sfx em `assets/sfx/`); depois `run_role("designer", ..., output=style.json, validate=validate_model(Style), bash=True)`.
- **editor:** `run_role("editor", ..., output=timeline.json, validate=_validate_timeline(ctx), bash=True)`.
  - `_validate_timeline` carrega o Timeline.
  - Em speech, exige `segments == base.segments`, com a mensagem "não altere segments".
  - Exige que todo `broll`/`sfx`/`music.src` e `overlay.src` exista dentro de `composition/`.
- **render:**
  1. `t = Timeline.load(timeline.json)`; `write_composition(comp, t, words_out)`; `apply_grading`.
  2. Loop de até 2 vezes: `issues = check(...)`; se houver issues, roda `snapshots` nos tempos de início de overlay, nos 3 primeiros cortes e em `duration-0.5`, e depois `run_role("editor", task=REVIEW com issues JSON + caminhos dos PNGs, output=timeline.json, validate=..., bash=True)` e recompõe.
  3. `lufs = render_final(comp, out/final.mp4, recipe.audio.lufs)`.
  4. `make_cover(final, at=1.0, out/cover.jpg)`.
  5. Grava `out/review.json` com `{"issues_restantes": issues, "lufs": lufs}`.
- **post:** copia `edit.json.post` para `out/post.json`.

- [ ] **Step 1: Teste ponta a ponta com agentes falsos (sem LLM, com ffmpeg + HyperFrames)**

```python
# tests/test_pipeline.py
import json
from pathlib import Path
import pytest
from conftest import needs_ffmpeg
from autovideo import pipeline, agents
from autovideo.jobs import JobStore, run_job

def fake_run_role(role, project, recipe, task, output, validate=None, bash=False):
    r = project.root
    if role == "director":
        output.write_text("# Intenção\nteste", encoding="utf-8")
    elif role == "copywriter":
        output.write_text(json.dumps({"drop": [], "hook_text": "teste", "post":
                          {"title": "t", "caption": "c", "hashtags": ["#t"]}}), encoding="utf-8")
    elif role == "designer":
        (r / "composition/compositions/captions.template.html").write_text(
            '<!doctype html><html><body><div data-composition-id="cap" data-width="1080" data-height="1920">'
            '</div><script>const WORDS = /*AV_WORDS*/[];window.__timelines=window.__timelines||{};'
            'window.__timelines["cap"]=gsap.timeline({paused:true});</script></body></html>', encoding="utf-8")
        output.write_text(json.dumps({"palette": ["#fff"], "fonts": ["Inter"], "caption_component": "x"}), encoding="utf-8")
    elif role == "editor":
        base = json.loads((r / "timeline.base.json").read_text(encoding="utf-8"))
        output.write_text(json.dumps(base), encoding="utf-8")
    if validate:
        validate(output)

@needs_ffmpeg
@pytest.mark.usefixtures("slow")
def test_montage_end_to_end_with_fake_agents(media_dir, tmp_path, monkeypatch):
    monkeypatch.setattr(agents, "run_role", fake_run_role)
    store = JobStore(tmp_path / "jobs.db")
    jid = pipeline.new_job(store, tmp_path, [media_dir / "scenes.mp4"], None, "montage-beat", auto=True)
    assert run_job(store, jid, pipeline.STAGES, pipeline.make_ctx) == "completed", store.get(jid)["error"]
    root = Path(store.get(jid)["project_dir"])
    assert (root / "out/final.mp4").exists() and (root / "out/cover.jpg").exists()
    assert json.loads((root / "out/post.json").read_text(encoding="utf-8"))["title"] == "t"

@needs_ffmpeg
def test_speech_recipe_without_speech_fails_clearly(media_dir, tmp_path, monkeypatch):   # Review Focus 1
    monkeypatch.setattr("autovideo.pipeline.transcribe", lambda *a, **k: [])
    store = JobStore(tmp_path / "jobs.db")
    jid = pipeline.new_job(store, tmp_path, [media_dir / "talk.mp4"], None, "talking-head-punchy", auto=True)
    assert run_job(store, jid, pipeline.STAGES, pipeline.make_ctx) == "failed"
    assert "montage-beat" in store.get(jid)["error"]
```

Run: `uv run pytest tests/test_pipeline.py -v`. Expected: FAIL (o módulo `pipeline` ainda não existe).

- [ ] **Step 2: Implementar `pipeline.py`**

```python
# autovideo/pipeline.py
import json
import os
import re
import shutil
import time
from pathlib import Path
from autovideo import agents, media, render
from autovideo.agents import EditDecisions, Style, validate_model
from autovideo.compose import write_composition
from autovideo.jobs import Ctx, JobStore
from autovideo.project import Project
from autovideo.recipes import load_recipe
from autovideo.timeline import FORMATS, Timeline, Word, plan_segments, remap_words
from autovideo.transcribe import filler_candidates, numbered_text, require_speech, transcribe


def home() -> Path:
    return Path(os.environ.get("AUTOVIDEO_HOME", Path.cwd() / "projects"))


def new_job(store: JobStore, home_dir: Path, videos: list[Path], script: Path | None, recipe: str,
            auto: bool, assets: list[Path] = []) -> int:
    load_recipe(recipe)  # falha cedo com a lista de receitas
    slug = re.sub(r"[^a-z0-9]+", "-", videos[0].stem.lower()).strip("-")[:30] or "video"
    root = home_dir / f"{time.strftime('%Y%m%d-%H%M%S')}-{slug}"
    (root / "input/raw").mkdir(parents=True)
    for v in videos:
        shutil.copy2(v, root / "input/raw" / v.name)
    if script:
        shutil.copy2(script, root / "script.md")
    if assets:
        (root / "user-assets").mkdir()
        for a in assets:
            shutil.copy2(a, root / "user-assets" / a.name)
    return store.create(str(root), recipe, auto)


def make_ctx(job: dict) -> Ctx:
    return Ctx(project=Project(Path(job["project_dir"])), recipe=load_recipe(job["recipe"]), job=job,
               agent=agents.run_role)


def _rel(p: Project, path: Path) -> str:
    return path.relative_to(p.root).as_posix()


def _fb(p: Project) -> str:
    fb = p.feedback()
    return f"\n\nFeedback humano a respeitar (feedback.md):\n{fb}" if fb else ""


def ingest(ctx):
    p, vids = ctx.project, []
    for raw in sorted((p.input / "raw").iterdir()):
        clean = p.input / f"{raw.stem}.clean.mp4"
        vids.append({"raw": _rel(p, raw), "clean": _rel(p, clean), **media.probe(raw)})
    p.save_manifest({"videos": vids, "aspect": ctx.recipe.aspect})


def clean(ctx):
    p = ctx.project
    for v in p.manifest()["videos"]:
        media.clean(p.root / v["raw"], p.root / v["clean"], ctx.recipe.audio.clean, ctx.recipe.audio.lufs)
    (p.input / "clean.ok").write_text("ok")


def do_transcribe(ctx):
    p, words = ctx.project, []
    if ctx.recipe.mode == "speech":
        for v in p.manifest()["videos"]:
            words += transcribe(p.root / v["clean"], v["clean"], p.analysis / "asr")
        require_speech(words)
    p.analysis.mkdir(parents=True, exist_ok=True)
    (p.analysis / "words.json").write_text(json.dumps([w.model_dump() for w in words], ensure_ascii=False),
                                           encoding="utf-8")


def _words(p: Project, name: str = "words.json") -> list[Word]:
    return [Word(**w) for w in json.loads((p.analysis / name).read_text(encoding="utf-8"))]


def analyze(ctx):
    p, r = ctx.project, ctx.recipe
    vids, words = p.manifest()["videos"], _words(p)
    scenes = {}
    for n, v in enumerate(vids):
        src = p.root / v["clean"]
        media.extract_frames(src, p.analysis / "frames" / str(n), every_s=2 if r.mode == "speech" else 1)
        scenes[v["clean"]] = media.detect_scenes(src)
    (p.analysis / "scenes.json").write_text(json.dumps(scenes), encoding="utf-8")
    (p.analysis / "transcript.txt").write_text(numbered_text(words), encoding="utf-8")
    w, h, _ = FORMATS[r.aspect]
    (p.analysis / "summary.json").write_text(json.dumps({
        "duration_total": sum(v["duration"] for v in vids), "width": w, "height": h, "aspect": r.aspect,
        "word_count": len(words), "filler_candidates": sorted(filler_candidates(words, r.pacing.fillers)),
        "sources": [v["clean"] for v in vids]}, ensure_ascii=False, indent=2), encoding="utf-8")


def director(ctx):
    agents.run_role("director", ctx.project, ctx.recipe, "Escreva brief.md." + _fb(ctx.project),
                    ctx.project.root / "brief.md")


def copywriter(ctx):
    agents.run_role("copywriter", ctx.project, ctx.recipe, "Escreva edit.json." + _fb(ctx.project),
                    ctx.project.root / "edit.json", validate_model(EditDecisions))


def plan(ctx):
    p, r = ctx.project, ctx.recipe
    w, h, _ = FORMATS[r.aspect]
    vids = p.manifest()["videos"]
    if r.mode == "speech":
        words = _words(p)
        ed = EditDecisions.model_validate_json((p.root / "edit.json").read_text(encoding="utf-8"))
        drop = {i for a, b in ed.drop for i in range(a, b + 1)} | filler_candidates(words, r.pacing.fillers)
        segs = plan_segments(words, drop, {v["clean"]: v["duration"] for v in vids}, r.pacing.max_gap, r.pacing.pad)
        out_words = remap_words(words, drop, segs)
    else:
        segs = [{"src": v["clean"], "in": 0, "out": v["duration"]} for v in vids]
        out_words = []
    (p.analysis / "words.out.json").write_text(json.dumps([x.model_dump() for x in out_words], ensure_ascii=False),
                                               encoding="utf-8")
    Timeline(width=w, height=h, segments=segs,
             captions=r.captions.enabled and r.mode == "speech").dump(p.root / "timeline.base.json")


def designer(ctx):
    p = ctx.project
    render.init_composition(p, ctx.recipe.aspect)
    assets = p.comp / "assets"
    for v in p.manifest()["videos"]:
        shutil.copy2(p.root / v["clean"], assets / Path(v["clean"]).name)
    ua = p.root / "user-assets"
    if ua.exists():
        for a in ua.iterdir():
            dest = assets / ("sfx" if a.suffix.lower() in (".wav",) or "sfx" in a.stem.lower() else "")
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(a, dest / a.name)
    agents.run_role("designer", p, ctx.recipe, "Entregue style.json e as composições." + _fb(p),
                    p.root / "style.json", validate_model(Style), bash=True)


def _validate_timeline(ctx):
    p, r = ctx.project, ctx.recipe

    def v(path: Path) -> None:
        t = Timeline.load(path)
        base = Timeline.load(p.root / "timeline.base.json")
        if r.mode == "speech" and t.segments != base.segments:
            raise ValueError("não altere segments (copie de timeline.base.json)")
        refs = [o.src for o in t.overlays] + [b.src for b in t.broll] + [s.src for s in t.sfx] + \
               ([t.music.src] if t.music else [])
        missing = [x for x in refs if not (p.comp / x).exists()]
        if missing:
            raise ValueError(f"arquivos inexistentes em composition/: {missing}")
    return v


def editor(ctx):
    agents.run_role("editor", ctx.project, ctx.recipe, "Escreva timeline.json." + _fb(ctx.project),
                    ctx.project.root / "timeline.json", _validate_timeline(ctx), bash=True)


def _compose(p: Project, t: Timeline) -> None:
    for s in t.segments:  # montage pode referenciar src relativos ao projeto
        dst = p.comp / "assets" / Path(s.src).name
        if not dst.exists():
            shutil.copy2(p.root / s.src, dst)
    write_composition(p.comp, t, _words(p, "words.out.json"))
    render.apply_grading(p.comp, t.grading)


def do_render(ctx):
    p, r = ctx.project, ctx.recipe
    t = Timeline.load(p.root / "timeline.json")
    _compose(p, t)
    issues = render.check(p.comp, r.aspect)
    for attempt in range(2):
        if not issues:
            break
        cuts, off = [], 0.0
        for s in t.segments[:3]:
            off += s.dur
            cuts.append(max(0.0, off - 0.2))
        times = sorted({*(o.start + 0.3 for o in t.overlays), *cuts, max(0.0, t.duration - 0.5)})
        pngs = render.snapshots(p.comp, times, p.out / f"review-{attempt}")
        agents.run_role("editor", p, r,
                        "REVIEW: corrija os problemas abaixo editando timeline.json e/ou composition/compositions/*.html.\n"
                        f"Problemas: {json.dumps(issues, ensure_ascii=False)}\n"
                        f"Frames para inspecionar: {[_rel(p, x) for x in pngs]}",
                        p.root / "timeline.json", _validate_timeline(ctx), bash=True)
        t = Timeline.load(p.root / "timeline.json")
        _compose(p, t)
        issues = render.check(p.comp, r.aspect)
    final = p.out / "final.mp4"
    lufs = render.render_final(p.comp, final, r.audio.lufs)
    render.make_cover(final, 1.0, p.out / "cover.jpg")
    (p.out / "review.json").write_text(json.dumps({"issues_restantes": issues, "lufs": lufs},
                                                  ensure_ascii=False, indent=2), encoding="utf-8")


def post(ctx):
    ed = json.loads((ctx.project.root / "edit.json").read_text(encoding="utf-8"))
    (ctx.project.out / "post.json").write_text(json.dumps(ed["post"], ensure_ascii=False, indent=2), encoding="utf-8")


STAGES = [
    ("ingest", "input/manifest.json", ingest),
    ("clean", "input/clean.ok", clean),
    ("transcribe", "analysis/words.json", do_transcribe),
    ("analyze", "analysis/summary.json", analyze),
    ("director", "brief.md", director),
    ("gate1", "approvals/gate1.ok", None),
    ("copywriter", "edit.json", copywriter),
    ("plan", "timeline.base.json", plan),
    ("designer", "style.json", designer),
    ("editor", "timeline.json", editor),
    ("render", "out/final.mp4", do_render),
    ("gate2", "approvals/gate2.ok", None),
    ("post", "out/post.json", post),
]
```

Nota: `fake_run_role` no teste faz monkeypatch de `agents.run_role`. Por isso o pipeline chama `agents.run_role(...)` (atributo do módulo), e não um `from agents import run_role`.

Nota de reject: `reject` no gate2 apaga as etapas entre gate1 e gate2, inclusive copywriter e designer. Se o feedback for só de edição, isso desperdiça trabalho. Isso é aceito no M1: um ciclo de feedback refaz copy, design e edição juntos. Se incomodar, adicione um gate extra depois do designer.

- [ ] **Step 3: Subcomandos de CLI**

Em `autovideo/cli.py`, adicione ao parser:

```python
    e = sub.add_parser("edit")
    e.add_argument("videos", nargs="+", type=Path)
    e.add_argument("--script", type=Path)
    e.add_argument("--recipe", default="talking-head-punchy")
    e.add_argument("--assets", nargs="*", type=Path, default=[])
    e.add_argument("--auto", action="store_true")
    for name in ("approve", "reject", "resume"):
        s = sub.add_parser(name)
        s.add_argument("job", type=int)
        if name == "reject":
            s.add_argument("feedback")
    srv = sub.add_parser("serve")
    srv.add_argument("--port", type=int, default=8765)
```

E o despacho (troque o bloco final):

```python
    from autovideo import pipeline
    from autovideo.jobs import JobStore, run_job, approve, reject
    store = JobStore(pipeline.home() / "jobs.db")
    if a.cmd == "edit":
        jid = pipeline.new_job(store, pipeline.home(), a.videos, a.script, a.recipe, a.auto, a.assets)
    elif a.cmd == "serve":
        import uvicorn
        from autovideo.server import create_app
        uvicorn.run(create_app(store), host="127.0.0.1", port=a.port)
        return 0
    else:
        jid = a.job
        if a.cmd == "approve":
            approve(store, jid, pipeline.STAGES)
        elif a.cmd == "reject":
            reject(store, jid, pipeline.STAGES, a.feedback)
    status = run_job(store, jid, pipeline.STAGES, pipeline.make_ctx)
    job = store.get(jid)
    print(f"job {jid}: {status} (etapa {job['stage']}) {job['error']}\n{job['project_dir']}")
    return 0 if status in ("completed", "awaiting_approval") else 1
```

Adicione `from pathlib import Path` no topo do `cli.py`.

- [ ] **Step 4: Rodar os testes**

Run: `uv run pytest tests/test_pipeline.py -v`. Expected: `test_speech_recipe_without_speech_fails_clearly` PASS; o e2e é skipped.

Run: `AV_SLOW=1 uv run pytest tests/test_pipeline.py -v` (no PowerShell: `$env:AV_SLOW=1; uv run pytest ...`). Expected: 2 PASS. O primeiro render baixa o Chrome do HyperFrames.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `uv run pytest -v`. Expected: tudo PASS (os slow ficam skipped sem `AV_SLOW`).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: end-to-end pipeline stages and edit/approve/reject/resume CLI"
```

---

### Task 11: Painel web (API FastAPI + React/Vite + shadcn + Kobra)

Regra de UI (ver `CLAUDE.md` e `docs/ui-components.md`): antes de escrever qualquer componente, procure um pronto na ordem Kobra → shadcn base → outros registries. Os componentes Kobra Pro precisam de `KOBRA_TOKEN`; sem o token, use o fallback shadcn indicado no doc. O design é minimalista: fundo neutro escuro, 1 cor de acento (`#ff5a1f`) e espaço generoso.

**Files:**
- Create: `autovideo/server.py`
- Create (frontend):
  - `web/` (Vite react-ts): `web/components.json`, `web/vite.config.ts`, `web/src/index.css`, `web/src/main.tsx`
  - `web/src/api.ts`, `web/src/App.tsx`
  - `web/src/components/NewJobForm.tsx`, `JobList.tsx`, `JobDetail.tsx`
- Test: `tests/test_server.py`

**Interfaces:**
- Consumes: `JobStore`, `pipeline.new_job/STAGES/make_ctx/home`, `jobs.run_job/approve/reject`, `recipes.list_recipes`
- Produces: `create_app(store: JobStore, start_worker: bool = True) -> FastAPI`. Rotas:
  - `GET /api/recipes` → `list[str]`
  - `GET /api/stages` → `list[str]`
  - `GET /api/jobs` → `list[job]`
  - `GET /api/jobs/{id}` → job + `rel` + `files` = `{brief: str|null, post: obj|null, has_final: bool, decisions: list[obj]}`
  - `POST /api/jobs` (multipart `videos[]`, `script?`, `assets[]?`, `recipe`, `auto`) → `{"id": int}`
  - `POST /api/jobs/{id}/approve` e `POST /api/jobs/{id}/reject` (`{"feedback": str}`)
  - `GET /projects/...` (arquivos dos projetos)
  - `GET /` → `web/dist` (SPA), se existir build

  O worker é uma thread daemon (`next_queued` → `run_job`, com sleep de 2 s quando a fila está vazia).

- [ ] **Step 1: Teste da API (falha)**

```python
# tests/test_server.py
from fastapi.testclient import TestClient
from autovideo.jobs import JobStore
from autovideo.server import create_app

def test_create_list_and_reject(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    store = JobStore(tmp_path / "jobs.db")
    c = TestClient(create_app(store, start_worker=False))
    assert "talking-head-punchy" in c.get("/api/recipes").json()
    assert c.get("/api/stages").json()[0] == "ingest"
    r = c.post("/api/jobs", data={"recipe": "talking-head-punchy", "auto": "false"},
               files=[("videos", ("a b.mp4", b"fake", "video/mp4")), ("script", ("r.md", "Olá".encode(), "text/markdown"))])
    jid = r.json()["id"]
    assert c.get("/api/jobs").json()[0]["id"] == jid
    store.set(jid, status="awaiting_approval", stage="gate1")
    assert c.post(f"/api/jobs/{jid}/reject", json={"feedback": "mais curto"}).status_code == 200
    assert store.get(jid)["status"] == "queued"
    files = c.get(f"/api/jobs/{jid}").json()["files"]
    assert files["has_final"] is False and files["decisions"] == []
```

Run: `uv run pytest tests/test_server.py -v`. Expected: FAIL.

- [ ] **Step 2: Implementar `server.py`**

```python
# autovideo/server.py
import json
import tempfile
import threading
import time
from pathlib import Path
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from autovideo import pipeline
from autovideo.jobs import JobStore, approve, reject, run_job
from autovideo.recipes import list_recipes

DIST = Path(__file__).resolve().parent.parent / "web" / "dist"


class Feedback(BaseModel):
    feedback: str


def _worker(store: JobStore) -> None:
    while True:
        job = store.next_queued()
        if job:
            run_job(store, job["id"], pipeline.STAGES, pipeline.make_ctx)
        else:
            time.sleep(2)


def create_app(store: JobStore, start_worker: bool = True) -> FastAPI:
    app = FastAPI(title="AutoVideo")
    home = pipeline.home()
    home.mkdir(parents=True, exist_ok=True)
    if start_worker:
        threading.Thread(target=_worker, args=(store,), daemon=True).start()

    @app.get("/api/recipes")
    def recipes():
        return list_recipes()

    @app.get("/api/stages")
    def stages():
        return [name for name, _, _ in pipeline.STAGES]

    @app.get("/api/jobs")
    def jobs():
        return store.list()

    @app.get("/api/jobs/{jid}")
    def job(jid: int):
        j = store.get(jid)
        root = Path(j["project_dir"])
        brief, post, log = root / "brief.md", root / "out/post.json", root / "decisions.log"
        j["rel"] = root.relative_to(home).as_posix()
        j["files"] = {
            "brief": brief.read_text(encoding="utf-8") if brief.exists() else None,
            "post": json.loads(post.read_text(encoding="utf-8")) if post.exists() else None,
            "has_final": (root / "out/final.mp4").exists(),
            "decisions": [json.loads(x) for x in log.read_text(encoding="utf-8").splitlines()] if log.exists() else [],
        }
        return j

    @app.post("/api/jobs")
    def create(recipe: str = Form(...), auto: bool = Form(False), videos: list[UploadFile] = File(...),
               script: UploadFile | None = File(None), assets: list[UploadFile] = File([])):
        with tempfile.TemporaryDirectory() as td:
            def save(u: UploadFile) -> Path:
                p = Path(td) / Path(u.filename).name
                p.write_bytes(u.file.read())
                return p
            jid = pipeline.new_job(store, home, [save(v) for v in videos], save(script) if script else None,
                                   recipe, auto, [save(a) for a in assets])
        return {"id": jid}

    @app.post("/api/jobs/{jid}/approve")
    def do_approve(jid: int):
        approve(store, jid, pipeline.STAGES)
        return {"ok": True}

    @app.post("/api/jobs/{jid}/reject")
    def do_reject(jid: int, fb: Feedback):
        reject(store, jid, pipeline.STAGES, fb.feedback)
        return {"ok": True}

    app.mount("/projects", StaticFiles(directory=home), name="projects")
    if DIST.exists():
        app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
    return app
```

Run: `uv run pytest tests/test_server.py -v`. Expected: PASS.

Commit: `git add autovideo/server.py tests/test_server.py && git commit -m "feat: job API with background worker"`

- [ ] **Step 3: Scaffold do frontend (Vite + Tailwind v4 + shadcn)**

```bash
npm create vite@latest web -- --template react-ts
npm --prefix web install
npm --prefix web install -D tailwindcss @tailwindcss/vite @types/node
```

`web/vite.config.ts`:

```ts
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { proxy: { "/api": "http://127.0.0.1:8765", "/projects": "http://127.0.0.1:8765" } },
})
```

Em `web/tsconfig.json` e `web/tsconfig.app.json`, adicione em `compilerOptions`: `"baseUrl": ".", "paths": { "@/*": ["./src/*"] }`.

`web/src/index.css` deve conter apenas `@import "tailwindcss";`. O `shadcn init` acrescenta os tokens.

```bash
cd web && npx shadcn@latest init --base-color neutral --yes
```

Edite `web/components.json` e adicione o registry da Kobra. O header só é usado se `KOBRA_TOKEN` existir no ambiente; o formato exato do token está no checkout da Kobra Pro (confirme na doc deles e ajuste `Authorization` se for diferente):

```json
"registries": {
  "@kobra": {
    "url": "https://kobra.systems/r/{name}.json",
    "headers": { "Authorization": "Bearer ${KOBRA_TOKEN}" }
  }
}
```

Instale os componentes. Os do shadcn base valem sempre; os Kobra free também. Os Kobra Pro entram só com token:

```bash
cd web
npx shadcn@latest add button card badge select textarea input label progress scroll-area separator skeleton tabs table toggle-group sonner tooltip
npx shadcn@latest add @kobra/video @kobra/sound @kobra/conversation @kobra/halftone-dots @kobra/command-menu
# Com KOBRA_TOKEN (Pro): troca dos equivalentes, conforme docs/ui-components.md
npx shadcn@latest add @kobra/magnetic-dropzone @kobra/grouped-table @kobra/task-list @kobra/reasoning-steps @kobra/question-card @kobra/plan-card @kobra/code-block @kobra/toast --overwrite
```

Expected: arquivos em `web/src/components/ui/`. Os comandos Pro falham com 401 se não houver token, e isso é esperado.

- [ ] **Step 4: Cliente da API `web/src/api.ts`**

```ts
export type Job = {
  id: number; project_dir: string; recipe: string; auto: number; status: string; stage: string; error: string
  created: number; updated: number
}
export type Decision = { ts: number; role: string; attempt: number; cost_usd: number | null; turns: number | null; is_error: boolean; result: string }
export type JobDetail = Job & {
  rel: string
  files: { brief: string | null; post: { title: string; caption: string; hashtags: string[] } | null; has_final: boolean; decisions: Decision[] }
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<T>
}

export const api = {
  recipes: () => j<string[]>("/api/recipes"),
  stages: () => j<string[]>("/api/stages"),
  jobs: () => j<Job[]>("/api/jobs"),
  job: (id: number) => j<JobDetail>(`/api/jobs/${id}`),
  create: (fd: FormData) => j<{ id: number }>("/api/jobs", { method: "POST", body: fd }),
  approve: (id: number) => j<{ ok: boolean }>(`/api/jobs/${id}/approve`, { method: "POST" }),
  reject: (id: number, feedback: string) =>
    j<{ ok: boolean }>(`/api/jobs/${id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }),
    }),
}
```

- [ ] **Step 5: Componentes do painel**

O código abaixo usa shadcn base mais os Kobra free (`Video`, `SoundEffects`). Com Pro instalado, troque cada elemento pelo equivalente da tabela em `docs/ui-components.md` (por exemplo, a lista de etapas vira `task-list`, o bloco de aprovação vira `question-card`, a lista de decisões vira `reasoning-steps`), lendo o `docs` de cada item.

`web/src/components/NewJobForm.tsx`:

```tsx
import { useEffect, useState } from "react"
import { api } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function NewJobForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [recipes, setRecipes] = useState<string[]>([])
  const [recipe, setRecipe] = useState("talking-head-punchy")
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.recipes().then(setRecipes) }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("recipe", recipe)
    fd.set("auto", fd.get("auto") ? "true" : "false")
    if (!(fd.get("script") as File | null)?.size) fd.delete("script")
    setBusy(true)
    try {
      const { id } = await api.create(fd)
      e.currentTarget.reset()
      onCreated(id)
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Novo vídeo</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="videos">Gravações</Label>
            <Input id="videos" name="videos" type="file" accept="video/*" multiple required /></div>
          <div className="grid gap-2"><Label htmlFor="script">Roteiro (opcional)</Label>
            <Input id="script" name="script" type="file" accept=".md,.txt" /></div>
          <div className="grid gap-2"><Label htmlFor="assets">B-roll, música, sfx (opcional)</Label>
            <Input id="assets" name="assets" type="file" multiple /></div>
          <div className="grid gap-2"><Label>Receita</Label>
            <Select value={recipe} onValueChange={setRecipe}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{recipes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select></div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="auto" /> 100% automático (sem aprovação)</label>
          <Button disabled={busy}>{busy ? "Enviando…" : "Criar"}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

`web/src/components/JobList.tsx`:

```tsx
import type { Job } from "@/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const tone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default", awaiting_approval: "secondary", failed: "destructive", in_progress: "outline", queued: "outline",
}

export function JobList({ jobs, current, onSelect }: { jobs: Job[]; current: number | null; onSelect: (id: number) => void }) {
  if (!jobs.length) return <p className="text-sm text-muted-foreground">Nenhum job ainda.</p>
  return (
    <ul className="grid gap-1">
      {jobs.map((j) => (
        <li key={j.id}>
          <button onClick={() => onSelect(j.id)}
            className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted",
              current === j.id && "bg-muted")}>
            <span className="text-sm">#{j.id} · {j.recipe}</span>
            <Badge variant={tone[j.status] ?? "outline"}>{j.status === "awaiting_approval" ? `aprovar · ${j.stage}` : j.status}</Badge>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

`web/src/components/JobDetail.tsx`:

```tsx
import { useState } from "react"
import { api, type JobDetail as JD } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Video } from "@/components/ui/video"

export function JobDetail({ job, stages, onChange }: { job: JD; stages: string[]; onChange: () => void }) {
  const [fb, setFb] = useState("")
  const idx = job.status === "completed" ? stages.length : Math.max(0, stages.indexOf(job.stage))
  const gate = job.status === "awaiting_approval"
  const cost = job.files.decisions.reduce((s, d) => s + (d.cost_usd ?? 0), 0)

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Job #{job.id} · {job.recipe}</CardTitle>
        <Progress value={(idx / stages.length) * 100} />
        <p className="text-sm text-muted-foreground">
          {job.status} · etapa {job.stage || "-"} · custo ${cost.toFixed(2)}{job.error && ` · erro: ${job.error}`}
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {job.files.has_final && <Video src={`/projects/${job.rel}/out/final.mp4?t=${job.updated}`} />}
        {gate && (
          <div className="grid gap-2 rounded-lg border p-4">
            <p className="text-sm">Aguardando sua aprovação em <b>{job.stage}</b>.</p>
            <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Feedback (para rejeitar)" />
            <div className="flex gap-2">
              <Button onClick={() => api.approve(job.id).then(onChange)}>Aprovar</Button>
              <Button variant="secondary" disabled={!fb.trim()}
                onClick={() => api.reject(job.id, fb).then(() => { setFb(""); onChange() })}>Rejeitar com feedback</Button>
            </div>
          </div>
        )}
        <Tabs defaultValue="brief">
          <TabsList><TabsTrigger value="brief">Brief</TabsTrigger><TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger></TabsList>
          <TabsContent value="brief"><pre className="whitespace-pre-wrap text-sm">{job.files.brief ?? "—"}</pre></TabsContent>
          <TabsContent value="post">
            {job.files.post ? <pre className="whitespace-pre-wrap text-sm">
              {`${job.files.post.title}\n\n${job.files.post.caption}\n${job.files.post.hashtags.join(" ")}`}</pre> : "—"}
          </TabsContent>
          <TabsContent value="agents">
            <ScrollArea className="h-64"><ul className="grid gap-2 text-sm">
              {job.files.decisions.map((d, i) => (
                <li key={i} className="rounded-md border p-2"><b>{d.role}</b> · tentativa {d.attempt} · ${(d.cost_usd ?? 0).toFixed(3)}
                  <p className="text-muted-foreground">{d.result}</p></li>))}
            </ul></ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

`web/src/App.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react"
import { api, type Job, type JobDetail as JD } from "@/api"
import { JobDetail } from "@/components/JobDetail"
import { JobList } from "@/components/JobList"
import { NewJobForm } from "@/components/NewJobForm"
import { SoundEffects } from "@/components/ui/sound"

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  const [detail, setDetail] = useState<JD | null>(null)

  const refresh = useCallback(async () => {
    setJobs(await api.jobs())
    if (current !== null) setDetail(await api.job(current))
  }, [current])

  useEffect(() => { api.stages().then(setStages) }, [])
  useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t) }, [refresh])

  return (
    <SoundEffects>
      <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[340px_1fr] md:p-8">
        <div className="grid content-start gap-6">
          <NewJobForm onCreated={setCurrent} />
          <JobList jobs={jobs} current={current} onSelect={setCurrent} />
        </div>
        {detail ? <JobDetail job={detail} stages={stages} onChange={refresh} />
          : <p className="text-sm text-muted-foreground">Selecione ou crie um job.</p>}
      </main>
    </SoundEffects>
  )
}
```

`web/src/main.tsx`: mantenha o gerado pelo Vite, garantindo `import "./index.css"` e adicionando `document.documentElement.classList.add("dark")` antes do `createRoot`.

Se a assinatura de `SoundEffects` ou de `Video` divergir do uso acima, siga o `docs` do item (`curl -s https://kobra.systems/r/<nome>.json`) e ajuste.

- [ ] **Step 6: Build e verificação visual**

Run: `npm --prefix web run build`. Expected: `web/dist/` sem erros de TypeScript.

Run: `uv run autovideo serve` e abra `http://127.0.0.1:8765` no browser. Expected:
- o formulário lista as 3 receitas;
- criar um job (com `--auto` desmarcado) mostra o progresso, que para em `gate1`, e o bloco de aprovação aparece;
- funciona em largura de celular (375 px) sem scroll horizontal.

Adicione `web/node_modules/` e `web/dist/` ao `.gitignore`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: React/shadcn/Kobra panel for jobs, approvals and playback"
```

---

### Task 12: README + verificação ponta a ponta com Claude real

**Files:**
- Create: `README.md`

- [ ] **Step 1: README**

````markdown
# AutoVideo

Roteiro + gravação → vídeo editado, com uma equipe de agentes Claude: diretor, copywriter, designer e editor.
Render feito com [HyperFrames](https://github.com/heygen-com/hyperframes).

## Requisitos
- Python 3.11+ e [uv](https://docs.astral.sh/uv/)
- Node 22+
- FFmpeg 7
- Claude Code instalado (`claude --version`)

## Autenticação
O AutoVideo não tem login próprio. Ele usa o Claude Agent SDK, que herda a autenticação do Claude Code da sua máquina:
- **Uso pessoal:** `claude login` com a sua assinatura.
- **Qualquer outro uso:** defina `ANTHROPIC_API_KEY`. A Anthropic não permite que produtos de terceiros ofereçam login claude.ai sem aprovação.

Opcional: `ELEVENLABS_API_KEY` ativa o Voice Isolator para limpar a voz.

## Setup
```bash
uv venv && uv pip install -e ".[dev]"
npx --yes hyperframes@0.8.158 skills update talking-head-recut embedded-captions music-to-video
uv run autovideo doctor
```

## Uso
```bash
uv run autovideo edit gravacao.mp4 --script roteiro.md --recipe talking-head-punchy
uv run autovideo approve <job>           # libera o gate
uv run autovideo reject <job> "menos zoom, hook mais forte"
uv run autovideo edit tela.mp4 --recipe screen-tutorial --auto
uv run autovideo edit c1.mp4 c2.mp4 c3.mp4 --assets musica.mp3 --recipe montage-beat --auto
uv run autovideo serve                   # painel em http://127.0.0.1:8765
```

Saída em `projects/<job>/out/`: `final.mp4`, `cover.jpg`, `post.json` e `review.json`.
Custo e decisões de cada agente ficam em `projects/<job>/decisions.log`.
SFX: coloque arquivos com "sfx" no nome (ou `.wav`) em `--assets`.

## Receitas
Ficam em `recipes/*.yaml`. Cada uma define parâmetros travados e um prompt-mestre por papel; para criar uma nova, copie uma existente.
````

- [ ] **Step 2: E2E com Claude real: talking head**

Grave um vídeo vertical de 45–60 s no celular com 2–3 erros propositais (repita uma frase, diga "é…", fique 2 s em silêncio). Escreva o roteiro em `roteiro.md`.

Run: `uv run autovideo edit grav.mp4 --script roteiro.md --recipe talking-head-punchy`
Expected: `awaiting_approval (etapa gate1)`. Leia `brief.md`.

Run: `uv run autovideo approve <job>`
Expected: `awaiting_approval (etapa gate2)` com `out/final.mp4`.

Checklist ao assistir:
- a frase repetida aparece uma vez só;
- não há "é…" nem silêncio de 2 s;
- nenhuma palavra cortada no começo ou no fim;
- sem estalos nos cortes;
- a legenda segue a fala, fica na faixa segura e destaca as ênfases;
- há hook nos 0–2.5 s;
- `out/review.json` mostra `lufs` entre −15.5 e −12.5.

- [ ] **Step 3: E2E: reject → nova versão**

Run: `uv run autovideo reject <job> "legenda maior e menos zoom"`. Expected: nova versão no gate2 que respeita o feedback; `feedback.md` registrado.

- [ ] **Step 4: E2E: tela e montagem**

Run: `uv run autovideo edit tela.mp4 --recipe screen-tutorial --auto`. Expected: `completed`, com os zooms apontando para a região de ação.

Run: `uv run autovideo edit c1.mp4 c2.mp4 c3.mp4 c4.mp4 --assets musica.mp3 --recipe montage-beat --auto`. Expected: `completed`, com 15–30 s de cortes na música.

- [ ] **Step 5: E2E: painel**

Em `autovideo serve`: upload → gate1 → aprovar → gate2 → rejeitar com feedback → nova versão no player.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: README with setup, auth policy and usage"
```
