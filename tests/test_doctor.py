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


def test_doctor_key(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    with pytest.raises(ToolError, match="ELEVENLABS_API_KEY"):
        doctor.key("ELEVENLABS_API_KEY")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "x")
    assert doctor.key("ELEVENLABS_API_KEY") == "definida"


def test_doctor_skills_checks_required_skills(tmp_path, monkeypatch):
    from autovideo import skills_sync
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    names = skills_sync.EDITOR_SKILLS

    def put(n):
        (skills_sync.skills_dir() / n).mkdir(parents=True)
        (skills_sync.skills_dir() / n / "SKILL.md").write_text("x", encoding="utf-8")
    for n in names[:-1]:
        put(n)
    with pytest.raises(ToolError, match=r"hyperframes-cli\. Rode: autovideo skills$"):
        doctor.skills()
    put(names[-1])
    assert str(len(names)) in doctor.skills()
