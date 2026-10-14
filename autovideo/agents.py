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
    tools = ["Read(./**)", "Edit(./**)", "Write(./**)", "Glob", "Grep", "Read(~/.claude/skills/**)"]
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
