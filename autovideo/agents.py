import asyncio
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from pydantic import BaseModel
from claude_agent_sdk import ClaudeAgentOptions, query
from autovideo.hf import HF
from autovideo.project import Project

_query = query
PROMPTS = Path(__file__).parent / "prompts"
LIMIT_RE = re.compile(r"usage limit|limit reached|rate.?limit", re.I)


class AgentOutputError(RuntimeError):
    pass


class UsageLimit(AgentOutputError):
    def __init__(self, msg: str, retry_at: float | None = None):
        super().__init__(msg)
        self.retry_at = retry_at


@dataclass(frozen=True)
class Role:
    name: str  # prompt em autovideo/prompts/<name>.md
    model: str  # "opus" | "sonnet" | "haiku"
    max_turns: int = 30
    max_usd: float = 2.0
    skills: tuple[str, ...] = ()


ROLES: dict[str, Role] = {r.name: r for r in (
    *(Role(n, "opus") for n in ("roteirista", "revisor", "showrunner", "analista")),
    *(Role(n, "sonnet") for n in ("diretor_arte", "onboarding", "estilo_chat")),
    Role("triagem", "haiku", max_turns=5, max_usd=0.2))}


def validate_model(model: type[BaseModel]) -> Callable[[Path], None]:
    def v(path: Path) -> None:
        model.model_validate_json(path.read_text(encoding="utf-8"))
    return v


def options_for(role: Role, cwd: Path, context: str = "") -> ClaudeAgentOptions:
    # contexto primeiro: prefixo estável entre chamadas aproveita o cache de prompt
    system = (context + "\n\n" if context else "") + (PROMPTS / f"{role.name}.md").read_text(encoding="utf-8")
    # Docs: path rules on Write/Glob are never consulted (Edit/Read rules cover all edit/read tools,
    # Grep/Glob included), so Write/Glob/Grep are listed bare and scoped via Read/Edit rules + cwd.
    tools = ["Read(./**)", "Edit(./**)", "Glob", "Grep"]  # nenhum agente roda Bash
    # agentes nunca escrevem aprovação humana, saída final nem marcadores de etapa (nem a config do projeto),
    # em qualquer profundidade: o onboarding roda na raiz do perfil, acima de series/*/epNN
    deny = [f"Edit(./{d}/**)" for d in (".claude", "approvals", "out", ".stages")]
    deny += [f"Edit(./**/{d}/**)" for d in (".claude", "approvals", "out", ".stages")]
    # aprovação da folha é humana (painel); o histórico do chat é do servidor
    deny += ["Edit(./personagens/**/aprovada)", "Edit(./personagens/**/folha.png)", "Edit(./.chat/**)"]
    if role.name in ("onboarding", "estilo_chat"):
        deny.append("Edit(./series/**)")  # conversa não mexe em episódios
    return ClaudeAgentOptions(
        system_prompt=system, model=role.model, cwd=str(cwd), permission_mode="dontAsk",
        allowed_tools=tools,
        disallowed_tools=deny,
        setting_sources=["project"],  # not "user": user hooks (e.g. rtk) would rewrite Bash and break allow rules
        skills=list(role.skills) or None,
        max_turns=role.max_turns, max_budget_usd=role.max_usd)


def missing_skills(names) -> str | None:
    """Mensagem com as skills ausentes de ~/.claude/skills e o comando que as instala (None se nada falta)."""
    src = Path.home() / ".claude" / "skills"
    missing = [n for n in names if not (src / n).is_dir()]
    if missing:
        return f"skills não instaladas: {', '.join(missing)}. Rode: {' '.join(HF)} skills update {' '.join(missing)}"
    return None


def install_skills(cwd: Path, names) -> None:
    src = Path.home() / ".claude" / "skills"
    if err := missing_skills(names):
        raise AgentOutputError(err)
    for n in names:
        shutil.copytree(src / n, cwd / ".claude" / "skills" / n, dirs_exist_ok=True)


async def _run(prompt: str, opts: ClaudeAgentOptions):
    last = None
    async for msg in _query(prompt=prompt, options=opts):
        if hasattr(msg, "total_cost_usd"):
            last = msg
    return last


def _mtime(p: Path):
    return p.stat().st_mtime_ns if p.exists() else None


def _failure(role: Role, res) -> AgentOutputError:
    text = str(getattr(res, "result", "sem resultado"))
    msg = f"{role.name}: execução do agente falhou ({text})"
    if res is not None and LIMIT_RE.search(text):
        m = re.search(r"\|(\d{10})", text)
        return UsageLimit(msg, int(m.group(1)) if m else None)
    return AgentOutputError(msg)


def run_role(role: Role, cwd: Path, task: str, output: Path,
             validate: Callable[[Path], None] | None = None, context: str = "") -> None:
    project = Project(cwd)
    if role.skills:
        install_skills(project.root, role.skills)
    opts = options_for(role, project.root, context)
    prompt = task
    for attempt in (1, 2):
        before = _mtime(output)
        try:
            res = asyncio.run(_run(prompt, opts))
        except Exception as e:
            project.log({"role": role.name, "model": role.model, "attempt": attempt, "is_error": True,
                         "result": repr(e)[:500]})
            raise AgentOutputError(f"{role.name}: falha no SDK: {e}") from e
        entry = {"role": role.name, "model": role.model, "attempt": attempt,
                 "cost_usd": getattr(res, "total_cost_usd", None), "turns": getattr(res, "num_turns", None),
                 "is_error": getattr(res, "is_error", True), "result": str(getattr(res, "result", ""))[:500]}
        if res is None or res.is_error:
            project.log(entry)
            raise _failure(role, res)
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
    raise AgentOutputError(f"{role.name}: saída inválida após retentativa: {err}")
