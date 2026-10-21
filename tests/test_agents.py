import json
import os
import time
import pytest
from pathlib import Path
from pydantic import BaseModel
from autovideo import agents
from autovideo.agents import run_role, AgentOutputError, Role, ROLES, UsageLimit

T = Role("teste", "haiku", max_turns=7, max_usd=0.5)


class Edit(BaseModel):
    hook_text: str


V = agents.validate_model(Edit)


class FakeResult:  # imita ResultMessage
    def __init__(self, sid, is_error=False, result="ok"):
        self.session_id, self.is_error, self.total_cost_usd, self.num_turns, self.result = sid, is_error, 0.01, 2, result


def fake_query_factory(writes, prompts_seen):
    def fake_query(*, prompt, options):
        prompts_seen.append((prompt, options))
        async def gen():
            writes.pop(0)()
            yield FakeResult("s1")
        return gen()
    return fake_query


_clock = [0]


def w(p, text):  # writes and guarantees a strictly increasing mtime (coarse FS clocks)
    p.write_text(text, encoding="utf-8")
    _clock[0] = max(_clock[0] + 1, time.time_ns())
    os.utime(p, ns=(_clock[0], _clock[0]))


def valid_edit(p):
    return lambda: w(p, json.dumps({"hook_text": "3 erros"}))


def _err_query(text):
    def q(*, prompt, options):
        async def gen():
            yield FakeResult("s1", True, text)
        return gen()
    return q


def test_validates_and_logs(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([valid_edit(out)], seen))
    run_role(T, tmp_path, "faça", out, V)
    entry = json.loads((tmp_path / "decisions.log").read_text(encoding="utf-8").splitlines()[-1])
    assert entry["role"] == "teste" and entry["model"] == "haiku" and entry["cost_usd"] == 0.01


def test_retries_once_with_error_then_succeeds(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    bad = lambda: w(out, "{nope")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, valid_edit(out)], seen))
    run_role(T, tmp_path, "faça", out, V)
    assert len(seen) == 2 and "falhou na validação" in seen[1][0] and seen[1][1].resume == "s1"


def test_fails_after_second_invalid_output(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    bad = lambda: w(out, "{}")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, bad], seen))
    with pytest.raises(AgentOutputError, match="hook_text"):
        run_role(T, tmp_path, "faça", out, V)


def test_options_put_context_before_role_prompt(tmp_path):
    o = agents.options_for(T, tmp_path, "CTX")
    assert o.system_prompt.startswith("CTX")
    assert (agents.PROMPTS / "teste.md").read_text(encoding="utf-8").strip() in o.system_prompt
    assert o.model == "haiku" and o.max_turns == 7 and o.max_budget_usd == 0.5


def test_options_restrict_paths_no_bash(tmp_path):
    o = agents.options_for(Role("teste", "sonnet", skills=("a",)), tmp_path)
    assert o.permission_mode == "dontAsk" and o.setting_sources == ["project"] and o.skills == ["a"]
    assert o.allowed_tools == ["Read(./**)", "Edit(./**)", "Glob", "Grep"]


def test_no_bash_no_skills(tmp_path):
    o = agents.options_for(T, tmp_path)
    assert not any(t.startswith("Bash") for t in o.allowed_tools) and o.skills is None


def test_roles_table():
    assert {n for n, r in ROLES.items() if r.model == "opus"} == {"roteirista", "revisor", "showrunner", "analista"}
    assert {n for n, r in ROLES.items() if r.model == "sonnet"} == {"diretor_arte", "onboarding", "estilo_chat"}
    assert ROLES["triagem"] == Role("triagem", "haiku", max_turns=5, max_usd=0.2)
    assert all(r.name == n for n, r in ROLES.items())


def test_agent_error_result_raises(tmp_path, monkeypatch):
    monkeypatch.setattr(agents, "_query", _err_query("boom"))
    with pytest.raises(AgentOutputError, match="boom") as ei:
        run_role(T, tmp_path, "x", tmp_path / "brief.md")
    assert not isinstance(ei.value, UsageLimit)
    assert '"is_error": true' in (tmp_path / "decisions.log").read_text(encoding="utf-8")


def test_usage_limit_raises_with_retry_at(tmp_path, monkeypatch):
    monkeypatch.setattr(agents, "_query", _err_query("Claude AI usage limit reached|1760000000"))
    with pytest.raises(UsageLimit) as ei:
        run_role(T, tmp_path, "x", tmp_path / "o.md")
    assert ei.value.retry_at == 1760000000


def test_usage_limit_without_epoch(tmp_path, monkeypatch):
    monkeypatch.setattr(agents, "_query", _err_query("rate limit"))
    with pytest.raises(UsageLimit) as ei:
        run_role(T, tmp_path, "x", tmp_path / "o.md")
    assert ei.value.retry_at is None


def test_logs_model_and_cost(tmp_path, monkeypatch):
    out = tmp_path / "o.md"
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: w(out, "x")], []))
    run_role(T, tmp_path, "x", out)
    last = json.loads((tmp_path / "decisions.log").read_text(encoding="utf-8").splitlines()[-1])
    assert {"role", "model", "cost_usd"} <= set(last)


def test_sdk_exception_is_wrapped_and_logged(tmp_path, monkeypatch):
    def q(*, prompt, options):
        async def gen():
            yield FakeResult("s1")
            raise RuntimeError("stream quebrou")
        return gen()
    monkeypatch.setattr(agents, "_query", q)
    with pytest.raises(AgentOutputError, match="falha no SDK.*stream quebrou"):
        run_role(T, tmp_path, "x", tmp_path / "brief.md")
    log = (tmp_path / "decisions.log").read_text(encoding="utf-8")
    assert '"is_error": true' in log and "stream quebrou" in log


def test_stale_output_is_not_accepted(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    w(out, "{}")  # arquivo antigo; o agente não escreve nada
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: None, lambda: None], seen))
    with pytest.raises(AgentOutputError, match="não foi"):
        run_role(T, tmp_path, "x", out)
    assert len(seen) == 2 and "validation_error" in (tmp_path / "decisions.log").read_text(encoding="utf-8")


def test_first_attempt_has_no_resume(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([valid_edit(out)], seen))
    run_role(T, tmp_path, "x", out)
    assert seen[0][1].resume is None


def test_validator_arbitrary_exception_goes_to_retry(tmp_path, monkeypatch):
    out, seen, calls = tmp_path / "t.json", [], []

    def v(p):
        calls.append(1)
        if len(calls) == 1:
            raise KeyError("segments")
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: w(out, "{}"), lambda: w(out, "{}")], seen))
    run_role(T, tmp_path, "x", out, v)
    assert len(seen) == 2


def _skills_home(tmp_path, monkeypatch, names):
    home = tmp_path / "home"
    for n in names:
        (home / ".claude" / "skills" / n).mkdir(parents=True)
        (home / ".claude" / "skills" / n / "SKILL.md").write_text("# " + n, encoding="utf-8")
    monkeypatch.setattr(Path, "home", lambda: home)


def test_install_skills_copies_into_cwd(tmp_path, monkeypatch):
    _skills_home(tmp_path, monkeypatch, ["a-skill", "b-skill"])
    cwd = tmp_path / "proj"
    agents.install_skills(cwd, ("a-skill", "b-skill"))
    agents.install_skills(cwd, ("a-skill", "b-skill"))  # idempotente
    assert (cwd / ".claude" / "skills" / "a-skill" / "SKILL.md").read_text(encoding="utf-8") == "# a-skill"


def test_install_skills_lists_missing(tmp_path, monkeypatch):
    _skills_home(tmp_path, monkeypatch, ["a-skill"])
    with pytest.raises(AgentOutputError, match=r"x1, x2.*skills update x1 x2"):
        agents.install_skills(tmp_path / "proj", ("a-skill", "x1", "x2"))


def test_role_with_skills_installs_before_query(tmp_path, monkeypatch):
    _skills_home(tmp_path, monkeypatch, ["a-skill"])
    cwd, out, seen = tmp_path / "proj", tmp_path / "proj" / "o.md", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: w(out, "x")], seen))
    run_role(Role("teste", "sonnet", skills=("a-skill",)), cwd, "x", out)
    assert (cwd / ".claude" / "skills" / "a-skill").is_dir()


@pytest.mark.parametrize("role", [T, *ROLES.values()])
def test_every_role_denies_gate_out_and_stage_markers(tmp_path, role):
    # recursivo: o onboarding roda na raiz do perfil, acima de series/*/epNN
    o = agents.options_for(role, tmp_path)
    for d in (".claude", "approvals", "out", ".stages"):
        assert f"Edit(./{d}/**)" in o.disallowed_tools and f"Edit(./**/{d}/**)" in o.disallowed_tools
    assert ("Edit(./series/**)" in o.disallowed_tools) == (role.name in ("onboarding", "estilo_chat"))
