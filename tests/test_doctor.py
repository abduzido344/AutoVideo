import json
import pytest
from autovideo import doctor
from autovideo.doctor import parse_node_major
from autovideo.hf import ToolError

OUT = {"loggedIn": False, "authMethod": "none", "apiProvider": "firstParty"}


def test_parse_node_major():
    assert parse_node_major("v22.22.2\n") == 22
    assert parse_node_major("v18.0.0") == 18


def test_parse_claude_auth(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert doctor.parse_claude_auth(json.dumps({**OUT, "loggedIn": True, "authMethod": "claude.ai"})) == "logado (claude.ai)"
    with pytest.raises(ToolError, match=r"rode `claude auth login` \(uso pessoal\) ou defina ANTHROPIC_API_KEY"):
        doctor.parse_claude_auth(json.dumps(OUT))
    with pytest.raises(ToolError, match="claude auth login"):
        doctor.parse_claude_auth("lixo sem json")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    assert "ANTHROPIC_API_KEY" in doctor.parse_claude_auth(json.dumps(OUT))


def test_doctor_skills_checks_required_skills(tmp_path, monkeypatch):
    from pathlib import Path
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    for n in doctor.SKILLS[:-1]:
        (tmp_path / ".claude" / "skills" / n).mkdir(parents=True)
    with pytest.raises(ToolError, match=r"hyperframes-animation\. Rode: npx --yes hyperframes@0\.8\.158 skills update hyperframes-animation$"):
        doctor.skills()
    (tmp_path / ".claude" / "skills" / doctor.SKILLS[-1]).mkdir()
    assert str(len(doctor.SKILLS)) in doctor.skills()
