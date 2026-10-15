import json
import os
import time
import pytest
from pathlib import Path
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

_clock = [0]

def w(p, text):  # writes and guarantees a strictly increasing mtime (coarse FS clocks)
    p.write_text(text, encoding="utf-8")
    _clock[0] = max(_clock[0] + 1, time.time_ns())
    os.utime(p, ns=(_clock[0], _clock[0]))

def valid_edit(p):
    return lambda: w(p, json.dumps({"drop": [[1, 1]], "hook_text": "3 erros", "post":
                                            {"title": "t", "caption": "c", "hashtags": ["#a"]}}))

def test_validates_and_logs(tmp_path, monkeypatch):
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([valid_edit(out)], seen))
    run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))
    log = (tmp_path / "decisions.log").read_text(encoding="utf-8")
    assert '"role": "copywriter"' in log and '"cost_usd": 0.01' in log

def test_retries_once_with_error_then_succeeds(tmp_path, monkeypatch):
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    bad = lambda: w(out, "{nope")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, valid_edit(out)], seen))
    run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))
    assert len(seen) == 2 and "falhou na validação" in seen[1][0] and seen[1][1].resume == "s1"

def test_fails_after_second_invalid_output(tmp_path, monkeypatch):   # Review Focus 4
    proj, out, seen = Project(tmp_path), tmp_path / "edit.json", []
    bad = lambda: w(out, "{}")
    monkeypatch.setattr(agents, "_query", fake_query_factory([bad, bad], seen))
    with pytest.raises(AgentOutputError, match="hook_text"):
        run_role("copywriter", proj, load_recipe("talking-head-punchy"), "faça", out, agents.validate_model(EditDecisions))

def test_options_restrict_bash_and_paths(tmp_path):
    r = load_recipe("talking-head-punchy")
    o = agents.options_for("editor", Project(tmp_path), r, bash=True)
    assert o.permission_mode == "dontAsk" and o.setting_sources == ["project"]
    hf_rules = [t for t in o.allowed_tools if t.startswith("Bash(npx")]
    assert "Bash(npx --yes hyperframes@0.8.158 *)" not in hf_rules  # nada de render/init/publish/cloud/upgrade...
    for sub in ("catalog", "add", "lint", "check", "snapshot", "media-treatment", "beats"):
        assert f"Bash(npx --yes hyperframes@0.8.158 {sub} *)" in hf_rules
    assert "Bash(npx --yes hyperframes@0.8.158 catalog)" in hf_rules
    assert not any(x in t for t in hf_rules for x in ("render", "publish", "cloud", "upgrade", "init", "lambda"))
    assert "Bash(ffprobe *)" in o.allowed_tools
    assert not any(t == "Bash" for t in o.allowed_tools)
    assert "Read(./**)" in o.allowed_tools and "Edit(./**)" in o.allowed_tools
    assert not any("skills" in t or "~" in t for t in o.allowed_tools)
    assert "Edit(./.claude/**)" in o.disallowed_tools
    assert "talking-head-recut" in o.skills
    assert o.max_turns == r.budget.max_turns and o.max_budget_usd == r.budget.max_usd

def test_no_bash_and_director_has_no_skills(tmp_path):
    o = agents.options_for("director", Project(tmp_path), load_recipe("talking-head-punchy"), bash=False)
    assert not any(t.startswith("Bash") for t in o.allowed_tools) and o.skills is None

def test_agent_error_result_raises(tmp_path, monkeypatch):
    class Err(FakeResult):
        def __init__(self): super().__init__("s1"); self.is_error = True; self.result = "boom"
    def q(*, prompt, options):
        async def gen(): yield Err()
        return gen()
    monkeypatch.setattr(agents, "_query", q)
    with pytest.raises(AgentOutputError, match="boom"):
        run_role("director", Project(tmp_path), load_recipe("talking-head-punchy"), "x", tmp_path / "brief.md")
    assert '"is_error": true' in (tmp_path / "decisions.log").read_text(encoding="utf-8")

def test_sdk_exception_is_wrapped_and_logged(tmp_path, monkeypatch):
    def q(*, prompt, options):
        async def gen():
            yield FakeResult("s1")
            raise RuntimeError("stream quebrou")
        return gen()
    monkeypatch.setattr(agents, "_query", q)
    with pytest.raises(AgentOutputError, match="falha no SDK.*stream quebrou"):
        run_role("director", Project(tmp_path), load_recipe("talking-head-punchy"), "x", tmp_path / "brief.md")
    log = (tmp_path / "decisions.log").read_text(encoding="utf-8")
    assert '"is_error": true' in log and "stream quebrou" in log

def test_stale_output_is_not_accepted(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    w(out, "{}")  # arquivo antigo; o agente não escreve nada
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: None, lambda: None], seen))
    with pytest.raises(AgentOutputError, match="não foi"):
        run_role("copywriter", Project(tmp_path), load_recipe("talking-head-punchy"), "x", out)
    assert len(seen) == 2 and "validation_error" in (tmp_path / "decisions.log").read_text(encoding="utf-8")

def test_first_attempt_has_no_resume(tmp_path, monkeypatch):
    out, seen = tmp_path / "edit.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([valid_edit(out)], seen))
    run_role("copywriter", Project(tmp_path), load_recipe("talking-head-punchy"), "x", out)
    assert seen[0][1].resume is None

def test_validator_arbitrary_exception_goes_to_retry(tmp_path, monkeypatch):
    out, seen, calls = tmp_path / "t.json", [], []
    def v(p):
        calls.append(1)
        if len(calls) == 1: raise KeyError("segments")
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: w(out, "{}"), lambda: w(out, "{}")], seen))
    run_role("editor", Project(tmp_path), _recipe_with_skills(tmp_path, monkeypatch, []), "x", out, v)
    assert len(seen) == 2

def _recipe_with_skills(tmp_path, monkeypatch, names):
    home = tmp_path / "home"
    for n in names:
        (home / ".claude" / "skills" / n).mkdir(parents=True)
        (home / ".claude" / "skills" / n / "SKILL.md").write_text("# " + n, encoding="utf-8")
    monkeypatch.setattr(Path, "home", lambda: home)
    return load_recipe("talking-head-punchy").model_copy(update={"skills": names})

def test_install_skills_copies_into_project(tmp_path, monkeypatch):
    r = _recipe_with_skills(tmp_path, monkeypatch, ["a-skill", "b-skill"])
    proj = Project(tmp_path / "proj")
    agents.install_skills(proj, r)
    agents.install_skills(proj, r)  # idempotente
    assert (proj.root / ".claude" / "skills" / "a-skill" / "SKILL.md").read_text(encoding="utf-8") == "# a-skill"

def test_install_skills_lists_missing(tmp_path, monkeypatch):
    r = _recipe_with_skills(tmp_path, monkeypatch, ["a-skill"]).model_copy(update={"skills": ["a-skill", "x1", "x2"]})
    with pytest.raises(AgentOutputError, match=r"x1, x2.*skills update x1 x2"):
        agents.install_skills(Project(tmp_path / "proj"), r)

def test_editor_installs_skills_before_query(tmp_path, monkeypatch):
    r = _recipe_with_skills(tmp_path, monkeypatch, ["a-skill"])
    proj, out, seen = Project(tmp_path / "proj"), tmp_path / "proj" / "timeline.json", []
    monkeypatch.setattr(agents, "_query", fake_query_factory([lambda: w(out, "{}")], seen))
    run_role("editor", proj, r, "x", out)
    assert (proj.root / ".claude" / "skills" / "a-skill").is_dir()


def test_bash_prompts_demand_versioned_npx():
    for role in ("designer", "editor"):
        assert "`npx hyperframes` sem versão é negado" in (agents.PROMPTS / f"{role}.md").read_text(encoding="utf-8")


@pytest.mark.parametrize("role", ["director", "copywriter", "designer", "editor"])
def test_every_role_denies_gate_out_and_stage_markers(tmp_path, role):
    o = agents.options_for(role, Project(tmp_path), load_recipe("talking-head-punchy"), bash=role in ("designer", "editor"))
    for rule in ("Edit(./.claude/**)", "Edit(./approvals/**)", "Edit(./out/**)", "Edit(./.stages/**)"):
        assert rule in o.disallowed_tools
