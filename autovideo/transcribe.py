import json
import re
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from autovideo.hf import HF, ToolError, run


class Word(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    start: float
    end: float
    src: str


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


def _last_json(stdout: str):
    """Último documento JSON do stdout (tolera linhas de progresso antes dele)."""
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        for line in reversed(stdout.strip().splitlines()):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    raise ValueError(f"hyperframes transcribe: stdout sem JSON: {stdout[-500:]!r}")


def transcribe(media: Path, src: str, workdir: Path, language: str = "pt", model: str = "small") -> list[Word]:
    workdir.mkdir(parents=True, exist_ok=True)
    p = run([*HF, "transcribe", str(media), "--dir", str(workdir), "--language", language,
             "--model", model, "--json"], cwd=workdir, timeout=7200)
    out = _last_json(p.stdout)
    # 0.8.158: o stdout é só um resumo {ok, engine, transcriptPath, ...}; as palavras ficam no arquivo
    if isinstance(out, dict) and out.get("ok") is False:  # falha com código 0: não é "sem fala"
        raise ToolError(f"hyperframes transcribe falhou: {json.dumps(out, ensure_ascii=False)[:500]}")
    if isinstance(out, dict) and "transcriptPath" in out:
        out = json.loads((workdir / out["transcriptPath"]).read_text(encoding="utf-8"))  # relativo = ao workdir
    return parse_transcript(out, src)


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
