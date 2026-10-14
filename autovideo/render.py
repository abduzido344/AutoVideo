import json
import re
from pathlib import Path
from autovideo.hf import HF, ToolError, run
from autovideo.media import integrated_lufs, normalize_final
from autovideo.project import Project
from autovideo.timeline import FORMATS

# Com color-grading o shader demora ~40 s para inicializar nesta máquina (Intel Iris): os timeouts padrão de
# prontidão (3 s check, 5 s snapshot, 45 s render) estouram. São tetos de espera, não atrasos fixos.
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


def apply_grading(comp: Path, grading: dict | None) -> None:
    # grava data-color-grading no index.html: chamar DEPOIS de compose.write_composition (que regenera o arquivo)
    if grading:
        run([*HF, "media-treatment", "--project", str(comp), "--selector", "#cam video",
             "--grading", json.dumps(grading), "--apply", "--json"])


def caption_zone(aspect: str) -> str:
    if aspect == "9:16":
        return "x0=0.05;y0=0.55;x1=0.95;y1=0.80;severity=error"
    return "x0=0.05;y0=0.72;x1=0.95;y1=0.95;severity=error"


def summarize_check(data: dict) -> list[dict]:
    """`check --json` guarda os findings por categoria (lint/runtime/layout/motion/contrast), cada uma com
    `findings: [{severity, code, message, selector, firstSeen|time, fixHint}]`. Devolve só os de severity error."""
    issues = [{"category": cat, "code": f.get("code"), "message": f.get("message"), "selector": f.get("selector"),
               "at": f.get("firstSeen", f.get("time")), "hint": f.get("fixHint")}
              for cat in CHECK_CATEGORIES for f in (data.get(cat) or {}).get("findings", [])
              if f.get("severity") == "error"]
    if not issues and data.get("ok") is False:
        issues.append({"category": "check", "code": "check_failed", "message": "check terminou com ok=false sem findings de erro",
                       "selector": None, "at": None, "hint": None})
    return issues


def check(comp: Path, aspect: str) -> list[dict]:
    # com erros o check sai com código 1 e ainda imprime o JSON; o stdout também pode trazer linhas de log antes dele
    p = run([*HF, "check", str(comp), "--json", "--caption-zone", caption_zone(aspect), "--at-transitions",
            "--timeout", READY_MS], timeout=1800, ok_codes=(0, 1))
    m = re.search(r"^\{$", p.stdout, re.M)
    if not m:
        raise ToolError(f"hyperframes check sem JSON (código {p.returncode}):\n{(p.stderr or p.stdout)[-2000:]}")
    return summarize_check(json.JSONDecoder().raw_decode(p.stdout[m.start():])[0])


def snapshots(comp: Path, times: list[float], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    run([*HF, "snapshot", str(comp), "--at", ",".join(f"{t:.2f}" for t in times), "--no-end",
         "--describe", "false", "--timeout", READY_MS, "-o", str(out_dir)], timeout=1800)
    return sorted(out_dir.glob("*.png"))


def render_final(comp: Path, out: Path, lufs: float) -> float:
    out.parent.mkdir(parents=True, exist_ok=True)
    run([*HF, "render", str(comp), "-o", str(out), "--quality", "delivery", "--fps", "30", "--quiet",
         "--player-ready-timeout", READY_MS],
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
