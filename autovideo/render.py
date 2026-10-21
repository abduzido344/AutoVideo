import json
import re
from pathlib import Path
from autovideo.hf import HF, ToolError, run
from autovideo.media import integrated_lufs, normalize_final
from autovideo.project import Project

FORMATS = {"9:16": (1080, 1920, "portrait")}  # (largura, altura, resolução do hyperframes init)
# READY_MS: teto de espera de prontidão do player (os padrões de 3 s check, 5 s snapshot e 45 s render estouram
# em máquina lenta); é teto, não atraso fixo.
READY_MS = "240000"
CHECK_CATEGORIES = ("lint", "runtime", "layout", "motion", "contrast")


def init_composition(project: Project, aspect: str) -> None:
    if (project.comp / "hyperframes.json").exists():
        return
    # "composition" é o NAME posicional do init: cria project.root/composition
    run([*HF, "init", project.comp.name, "--example", "blank", "--resolution", FORMATS[aspect][2],
         "--non-interactive", "--skip-transcribe"], cwd=project.root, env={"HYPERFRAMES_SKIP_SKILLS": "1"})
    (project.comp / "compositions").mkdir(exist_ok=True)
    (project.comp / "assets").mkdir(exist_ok=True)


def caption_zone(aspect: str) -> str:
    if aspect == "9:16":
        return "x0=0.05;y0=0.55;x1=0.95;y1=0.80;severity=error"
    return "x0=0.05;y0=0.72;x1=0.95;y1=0.95;severity=error"


def _check_failed(message: str) -> dict:
    return {"category": "check", "code": "check_failed", "message": message,
            "selector": None, "at": None, "hint": None}


def summarize_check(data: dict) -> list[dict]:
    """`check --json` guarda os findings por categoria (lint/runtime/layout/motion/contrast), cada uma com
    `findings: [{severity, code, message, selector, firstSeen|time, fixHint}]`. Devolve só os de severity error."""
    issues = [{"category": cat, "code": f.get("code"), "message": f.get("message"), "selector": f.get("selector"),
               "at": f.get("firstSeen", f.get("time")), "hint": f.get("fixHint")}
              for cat in CHECK_CATEGORIES for f in (data.get(cat) or {}).get("findings", [])
              if f.get("severity") == "error"]
    if not issues and data.get("ok") is not True:
        issues.append(_check_failed("check terminou com ok != true sem findings de erro"))
    return issues


def check(comp: Path, aspect: str) -> list[dict]:
    # com erros o check sai com código 1 e ainda imprime o JSON; o stdout também pode trazer linhas de log antes dele
    p = run([*HF, "check", str(comp), "--json", "--caption-zone", caption_zone(aspect), "--at-transitions",
            "--timeout", READY_MS], timeout=1800, ok_codes=(0, 1))
    m = re.search(r"^\{$", p.stdout, re.M)
    if not m:
        raise ToolError(f"hyperframes check sem JSON (código {p.returncode}):\n{(p.stderr or p.stdout)[-2000:]}")
    try:
        data = json.JSONDecoder().raw_decode(p.stdout[m.start():])[0]
    except json.JSONDecodeError as e:
        raise ToolError(f"hyperframes check com JSON inválido ({e}):\n{(p.stderr or p.stdout)[-2000:]}") from e
    issues = summarize_check(data)
    if not issues and p.returncode != 0:
        issues.append(_check_failed(f"check saiu com código {p.returncode} sem findings de erro"))
    return issues


def snapshots(comp: Path, times: list[float], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.png"):  # só os PNGs desta chamada voltam
        old.unlink()
    run([*HF, "snapshot", str(comp), "--at", ",".join(f"{t:.2f}" for t in times), "--no-end",
         "--describe", "false", "--timeout", READY_MS, "-o", str(out_dir)], timeout=1800)
    return sorted(out_dir.glob("*.png"))


def render_final(comp: Path, out: Path, lufs: float | None) -> float | None:
    """lufs=None: composição sem nenhuma faixa de áudio, nada a medir (devolve None).
    Renderiza em <out>.part.mp4 e só move para `out` depois de medido/normalizado: `out` nunca fica parcial."""
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_name(out.stem + ".part.mp4")
    part.unlink(missing_ok=True)
    out.unlink(missing_ok=True)
    try:
        run([*HF, "render", str(comp), "-o", str(part), "--quality", "delivery", "--fps", "30", "--quiet",
             "--player-ready-timeout", READY_MS], timeout=7200)
        if not part.exists():
            raise ToolError(f"hyperframes render saiu com 0 mas não gerou {part.name}")
        if lufs is None:
            part.replace(out)
            return None
        measured = integrated_lufs(part)
        if abs(measured - lufs) > 1.5:
            normalize_final(part, lufs)
            measured = integrated_lufs(part)
            if abs(measured - lufs) > 1.5:
                raise ToolError(f"loudness {measured} LUFS fora de {lufs} ±1.5 mesmo após normalizar")
        part.replace(out)
        return measured
    finally:
        part.unlink(missing_ok=True)


def make_cover(video: Path, at: float, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", str(video), "-frames:v", "1",
         "-q:v", "2", str(out)])
    if not out.exists():
        raise ToolError(f"ffmpeg não gerou a capa (talvez {at:.2f}s esteja além do fim do vídeo): {out}")
