import httpx
import pytest
from autovideo import hf, skills_sync

TREE = "https://api.github.com/repos/heygen-com/hyperframes/git/trees/v0.8.163?recursive=1"
RAW = "https://raw.githubusercontent.com/heygen-com/hyperframes/v0.8.163/"
PATHS = ["skills/hyperframes-core/SKILL.md", "skills/hyperframes-core/references/a.md", "skills/slideshow/SKILL.md"]


def _client(fail: str | None = None):
    def handler(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        if url == TREE:
            return httpx.Response(200, json={"tree": [{"path": p, "type": "blob"} for p in PATHS]
                                             + [{"path": "skills/hyperframes-core", "type": "tree"}]})
        if url.startswith(RAW) and url[len(RAW):] != fail:
            return httpx.Response(200, text="novo " + url[len(RAW):])
        return httpx.Response(500)
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_sync_downloads_only_named_skills(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    out = skills_sync.sync(("hyperframes-core",), client=_client())
    assert out == skills_sync.skills_dir()
    assert (out / "hyperframes-core" / "SKILL.md").read_text(encoding="utf-8") == "novo " + PATHS[0]
    assert (out / "hyperframes-core" / "references" / "a.md").is_file()
    assert not (out / "slideshow").exists()


def test_failed_download_keeps_previous(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    old = skills_sync.skills_dir() / "hyperframes-core"
    old.mkdir(parents=True)
    (old / "SKILL.md").write_text("antigo", encoding="utf-8")
    with pytest.raises(hf.ToolError):
        skills_sync.sync(("hyperframes-core",), client=_client(fail=PATHS[1]))
    assert (old / "SKILL.md").read_text(encoding="utf-8") == "antigo"
    assert not list((tmp_path / "skills").glob("*.tmp*"))


def test_missing_lists_absent(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    (skills_sync.skills_dir() / "a").mkdir(parents=True)
    (skills_sync.skills_dir() / "a" / "SKILL.md").write_text("x", encoding="utf-8")
    assert skills_sync.missing(("a", "b")) == ["b"]


def test_ensure_syncs_only_when_missing_and_never_raises(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    calls = []

    def boom():
        calls.append(1)
        raise hf.ToolError("sem rede")
    monkeypatch.setattr(skills_sync, "sync", boom)
    skills_sync.ensure()  # faltando: tenta e engole o erro
    assert calls == [1]
    for n in skills_sync.EDITOR_SKILLS:
        (skills_sync.skills_dir() / n).mkdir(parents=True)
        (skills_sync.skills_dir() / n / "SKILL.md").write_text("x", encoding="utf-8")
    skills_sync.ensure()  # completas: não baixa
    assert calls == [1]


@pytest.mark.parametrize("resp", [httpx.Response(200, json={"truncated": True, "tree": []}),
                                  httpx.Response(200, text="<html>não é json</html>")])
def test_bad_tree_response_is_tool_error(tmp_path, monkeypatch, resp):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    c = httpx.Client(transport=httpx.MockTransport(lambda req: resp))
    with pytest.raises(hf.ToolError):
        skills_sync.sync(("hyperframes-core",), client=c)
    assert not list((tmp_path / "skills").glob("*.tmp*"))
