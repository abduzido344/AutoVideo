import asyncio
import shutil
from pathlib import Path
from typing import Callable
from pydantic import BaseModel
from claude_agent_sdk import ClaudeAgentOptions, query
from autovideo.hf import HF
from autovideo.project import Project

_query = query
PROMPTS = Path(__file__).parent / "prompts"
# subcomandos do hyperframes que os prompts/receitas/skills usam (inspeção e edição local); render/init/publish/
# cloud/upgrade/skills/tts ficam de fora. BARE = os que também aparecem sem argumentos.
HF_SUBS = ("catalog", "add", "lint", "check", "snapshot", "media-treatment", "beats", "compositions", "info",
           "docs", "timeline")
HF_BARE = ("catalog", "docs", "info")


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
    # Docs: path rules on Write/Glob are never consulted (Edit/Read rules cover all edit/read tools,
    # Grep/Glob included), so Write/Glob/Grep are listed bare and scoped via Read/Edit rules + cwd.
    tools = ["Read(./**)", "Edit(./**)", "Glob", "Grep"]
    if bash:
        hf = " ".join(HF)
        tools += [f"Bash({hf} {sub} *)" for sub in HF_SUBS] + [f"Bash({hf} {sub})" for sub in HF_BARE]
        tools.append("Bash(ffprobe *)")
    return ClaudeAgentOptions(
        system_prompt=system, cwd=str(project.root), permission_mode="dontAsk",
        allowed_tools=tools,
        # agentes nunca escrevem aprovação humana, saída final nem marcadores de etapa (nem a config do projeto)
        disallowed_tools=["Edit(./.claude/**)", "Edit(./approvals/**)", "Edit(./out/**)", "Edit(./.stages/**)"],
        setting_sources=["project"],  # not "user": user hooks (e.g. rtk) would rewrite Bash and break allow rules
        skills=recipe.skills if role in ("designer", "editor") else None,
        max_turns=recipe.budget.max_turns, max_budget_usd=recipe.budget.max_usd)


def install_skills(project: Project, recipe) -> None:
    src = Path.home() / ".claude" / "skills"
    missing = [n for n in recipe.skills if not (src / n).is_dir()]
    if missing:
        raise AgentOutputError(f"skills não instaladas: {', '.join(missing)}. "
                               f"Rode: {' '.join(HF)} skills update {' '.join(missing)}")
    for n in recipe.skills:
        shutil.copytree(src / n, project.root / ".claude" / "skills" / n, dirs_exist_ok=True)


async def _run(prompt: str, opts: ClaudeAgentOptions):
    last = None
    async for msg in _query(prompt=prompt, options=opts):
        if hasattr(msg, "total_cost_usd"):
            last = msg
    return last


def _mtime(p: Path):
    return p.stat().st_mtime_ns if p.exists() else None


def run_role(role: str, project: Project, recipe, task: str, output: Path,
             validate: Callable[[Path], None] | None = None, bash: bool = False) -> None:
    if role in ("designer", "editor"):
        install_skills(project, recipe)
    opts = options_for(role, project, recipe, bash)
    prompt = task
    for attempt in (1, 2):
        before = _mtime(output)
        try:
            res = asyncio.run(_run(prompt, opts))
        except Exception as e:
            project.log({"role": role, "attempt": attempt, "is_error": True, "result": repr(e)[:500]})
            raise AgentOutputError(f"{role}: falha no SDK: {e}") from e
        entry = {"role": role, "attempt": attempt, "cost_usd": getattr(res, "total_cost_usd", None),
                 "turns": getattr(res, "num_turns", None), "is_error": getattr(res, "is_error", True),
                 "result": str(getattr(res, "result", ""))[:500]}
        if res is None or res.is_error:
            project.log(entry)
            raise AgentOutputError(f"{role}: execução do agente falhou ({getattr(res, 'result', 'sem resultado')})")
        try:
            after = _mtime(output)
            if after is None or (before is not None and after <= before):
                raise FileNotFoundError(f"{output.name} não foi (re)escrito")
            if validate:
                validate(output)
            project.log(entry)
            return
        except Exception as e:
            err = str(e)
            project.log({**entry, "validation_error": err[:500]})
            opts.resume = res.session_id
            prompt = f"O arquivo {output.name} falhou na validação:\n{err}\nCorrija o arquivo e termine."
    raise AgentOutputError(f"{role}: saída inválida após retentativa: {err}")
