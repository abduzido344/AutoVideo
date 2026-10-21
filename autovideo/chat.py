"""Conversas com agente: onboarding de perfil e criação de estilo. O histórico e o session_id ficam em
<cwd>/.chat/<kind>.json; cada envio é um turno que retoma a sessão do SDK."""
import asyncio
import json
from pathlib import Path
from typing import Literal
from autovideo import agents, data
from autovideo.project import Project, home

Kind = Literal["onboarding", "estilo"]
ROLE = {"onboarding": "onboarding", "estilo": "estilo_chat"}


def _cwd(kind: str, slug: str) -> Path:
    return data.perfis_dir() / slug if kind == "onboarding" else home() / "estilos" / data.slugify(slug)


def _state(cwd: Path, kind: str) -> dict:
    f = cwd / ".chat" / f"{kind}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"session_id": None, "historico": []}


def _save(cwd: Path, kind: str, st: dict) -> None:
    data._write_json(cwd / ".chat" / f"{kind}.json", st)


def history(kind: Kind, slug: str) -> list[dict]:
    return _state(_cwd(kind, slug), kind)["historico"]


def _etapa(kind: str, cwd: Path, slug: str) -> int:
    if kind == "onboarding":
        return data.load_perfil(slug).onboarding
    return int((cwd / "estilo.json").exists())


def _check(kind: str, cwd: Path, slug: str) -> str | None:
    """Valida o que o agente gravou; devolve a mensagem de erro (None se ok)."""
    try:
        if kind == "onboarding":
            f = cwd / "perfil.json"
            raw = json.loads(f.read_text(encoding="utf-8"))
            if raw.get("slug") != slug:  # o slug é a pasta: o servidor restaura
                raw["slug"] = slug
                data._write_json(f, raw)
            data.Perfil.model_validate(raw)
        elif (cwd / "estilo.json").exists():
            data.Estilo.model_validate_json((cwd / "estilo.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001 — JSON quebrado também volta ao agente
        return str(e)
    return None


async def _turn(prompt: str, opts) -> tuple[str, object]:
    text, res = "", None
    async for msg in agents._query(prompt=prompt, options=opts):
        if hasattr(msg, "total_cost_usd"):
            res = msg
        for b in getattr(msg, "content", None) or []:
            if getattr(b, "text", None):
                text = b.text
    return text, res


def send(kind: Kind, slug: str, mensagem: str) -> dict:
    role = agents.ROLES[ROLE[kind]]
    if kind == "estilo":
        slug = data.slugify(slug)
    cwd = _cwd(kind, slug)
    project = Project(cwd)  # cria a pasta do estilo no 1º envio
    st = _state(cwd, kind)
    ctx = ""
    if kind == "onboarding":
        ctx = "## Estilos existentes\n" + "\n".join(f"- {e['slug']}: {e['titulo']}" for e in data.list_estilos())
    opts = agents.options_for(role, cwd, ctx)
    prompt, resposta, err = mensagem, "", None
    for attempt in (1, 2):
        opts.resume = st["session_id"]
        try:
            text, res = asyncio.run(_turn(prompt, opts))
        except Exception as e:
            project.log({"role": role.name, "model": role.model, "attempt": attempt, "is_error": True,
                         "result": repr(e)[:500]})
            raise agents.AgentOutputError(f"{role.name}: falha no SDK: {e}") from e
        project.log({"role": role.name, "model": role.model, "attempt": attempt,
                     "cost_usd": getattr(res, "total_cost_usd", None), "is_error": getattr(res, "is_error", True),
                     "result": str(getattr(res, "result", ""))[:500]})
        if res is None or res.is_error:
            raise agents._failure(role, res)
        st["session_id"] = res.session_id
        _save(cwd, kind, st)  # a sessão vale mesmo se a validação falhar
        resposta = text or str(res.result or "")
        err = _check(kind, cwd, slug)
        if err is None:
            break
        prompt = f"O arquivo gravado falhou na validação:\n{err}\nCorrija o arquivo e termine."
    st["historico"] += [{"autor": "voce", "texto": mensagem}, {"autor": "claude", "texto": resposta}]
    _save(cwd, kind, st)
    if err:
        raise agents.AgentOutputError(f"{role.name}: saída inválida após retentativa: {err}")
    return {"resposta": resposta, "historico": st["historico"], "etapa": _etapa(kind, cwd, slug)}
