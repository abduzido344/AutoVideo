import json
import pytest
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
