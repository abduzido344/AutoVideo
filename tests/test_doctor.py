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
    with pytest.raises(ToolError, match=r"rode `claude login` \(uso pessoal\) ou defina ANTHROPIC_API_KEY"):
        doctor.parse_claude_auth(json.dumps(OUT))
    with pytest.raises(ToolError, match="claude login"):
        doctor.parse_claude_auth("lixo sem json")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    assert "ANTHROPIC_API_KEY" in doctor.parse_claude_auth(json.dumps(OUT))
