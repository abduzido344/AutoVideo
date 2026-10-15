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


def test_doctor_skills_checks_union_of_recipe_skills(tmp_path, monkeypatch):
    from pathlib import Path
    from autovideo.recipes import list_recipes, load_recipe
    names = sorted({s for r in list_recipes() for s in load_recipe(r).skills})
    assert {"music-to-video", "talking-head-recut", "embedded-captions"} <= set(names)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    for n in names:
        if n != "music-to-video":
            (tmp_path / ".claude" / "skills" / n).mkdir(parents=True)
    with pytest.raises(ToolError, match=r"music-to-video\. Rode: npx --yes hyperframes@0\.8\.158 skills update music-to-video$"):
        doctor.skills()
    (tmp_path / ".claude" / "skills" / "music-to-video").mkdir()
    assert str(len(names)) in doctor.skills()
