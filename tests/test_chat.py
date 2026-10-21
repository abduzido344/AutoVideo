import json
import pytest
from fastapi.testclient import TestClient
from autovideo import agents, chat, data, server
from autovideo.jobs import JobStore


class Block:
    def __init__(self, text): self.text = text


class Assist:  # imita AssistantMessage
    def __init__(self, text): self.content = [Block(text)]


class Res:  # imita ResultMessage
    def __init__(self, sid, result="fim", is_error=False):
        self.session_id, self.result, self.is_error, self.total_cost_usd = sid, result, is_error, 0.02


@pytest.fixture(autouse=True)
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.setattr(server, "STORE", JobStore(tmp_path / "jobs.db"), raising=False)


def fake(monkeypatch, steps):
    """steps: funções chamadas uma por query; devolvem o texto da resposta. Retorna a lista de (prompt, resume)."""
    seen = []

    def q(*, prompt, options):
        seen.append((prompt, options.resume))
        text = steps.pop(0)()

        async def gen():
            yield Assist(text)
            yield Res(f"s{len(seen)}")
        return gen()
    monkeypatch.setattr(agents, "_query", q)
    return seen


def test_resumes_session(monkeypatch):
    p = data.create_perfil("Casa")
    seen = fake(monkeypatch, [lambda: "oi", lambda: "tchau"])
    chat.send("onboarding", p.slug, "a")
    chat.send("onboarding", p.slug, "b")
    assert [r for _, r in seen] == [None, "s1"]


def test_history_persisted(monkeypatch):
    p = data.create_perfil("Casa")
    fake(monkeypatch, [lambda: "r1", lambda: "r2"])
    chat.send("onboarding", p.slug, "m1")
    out = chat.send("onboarding", p.slug, "m2")
    h = chat.history("onboarding", p.slug)
    assert h == out["historico"] and [(x["autor"], x["texto"]) for x in h] == [
        ("voce", "m1"), ("claude", "r1"), ("voce", "m2"), ("claude", "r2")]


def _perfil_json(p, **over):
    f = data.perfis_dir() / p.slug / "perfil.json"
    d = json.loads(f.read_text(encoding="utf-8"))
    d.update(over)
    f.write_text(json.dumps(d), encoding="utf-8")


def test_invalid_profile_triggers_fix_turn(monkeypatch):
    p = data.create_perfil("Casa")
    bad = lambda: _perfil_json(p, agenda={"episodios_por_serie": 20}) or "gravei"
    good = lambda: _perfil_json(p, agenda={"episodios_por_serie": 5}) or "corrigi"
    seen = fake(monkeypatch, [bad, good])
    out = chat.send("onboarding", p.slug, "agenda")
    assert len(seen) == 2 and "episodios_por_serie" in seen[1][0] and seen[1][1] == "s1"
    assert out["resposta"] == "corrigi" and data.load_perfil(p.slug).agenda.episodios_por_serie == 5


def test_invalid_after_retry_is_502(monkeypatch):
    p = data.create_perfil("Casa")
    bad = lambda: _perfil_json(p, agenda={"episodios_por_serie": 20}) or "x"
    fake(monkeypatch, [bad, bad])
    c = TestClient(server.create_app(server.STORE, start_worker=False), base_url="http://127.0.0.1")
    assert c.post(f"/api/chat/onboarding/{p.slug}", json={"mensagem": "a"}).status_code == 502
    assert len(chat.history("onboarding", p.slug)) == 2  # o turno fica no histórico


def test_slug_preserved(monkeypatch):
    p = data.create_perfil("Casa")
    fake(monkeypatch, [lambda: _perfil_json(p, slug="outro", nome="Nova") or "feito"])
    out = chat.send("onboarding", p.slug, "nome")
    got = data.load_perfil(p.slug)
    assert got.slug == p.slug and got.nome == "Nova" and out["resposta"] == "feito"


def test_estilo_chat_creates_dir_and_validates(monkeypatch):
    def write():
        d = data.home() / "estilos" / "meu-estilo"
        (d / "estilo.json").write_text(json.dumps({"titulo": "Meu", "paleta": ["#000"], "imagem_prefixo": "cartoon"}),
                                       encoding="utf-8")
        (d / "estilo.md").write_text("tom seco", encoding="utf-8")
        return "pronto"
    fake(monkeypatch, [write])
    out = chat.send("estilo", "Meu Estilo", "vamos")
    assert out["etapa"] == 1
    assert "meu-estilo" in {e["slug"] for e in data.list_estilos()}


def test_endpoints(monkeypatch):
    p = data.create_perfil("Casa")
    c = TestClient(server.create_app(server.STORE, start_worker=False), base_url="http://127.0.0.1")
    assert c.get("/api/chat/outro/x").status_code == 404
    assert c.get("/api/chat/onboarding/nao-existe").status_code == 404
    assert c.post("/api/chat/onboarding/x", json={"mensagem": "a"}, headers={"Origin": "http://evil.example"}).status_code == 403
    assert c.get(f"/api/chat/onboarding/{p.slug}").json() == []
    fake(monkeypatch, [lambda: "oi"])
    r = c.post(f"/api/chat/onboarding/{p.slug}", json={"mensagem": "a"})
    assert r.status_code == 200 and r.json()["resposta"] == "oi"


def test_usage_limit_is_429(monkeypatch):
    p = data.create_perfil("Casa")

    def q(*, prompt, options):
        async def gen():
            yield Res("s", result="Claude usage limit reached|1900000000", is_error=True)
        return gen()
    monkeypatch.setattr(agents, "_query", q)
    c = TestClient(server.create_app(server.STORE, start_worker=False), base_url="http://127.0.0.1")
    r = c.post(f"/api/chat/onboarding/{p.slug}", json={"mensagem": "a"})
    assert r.status_code == 429 and r.json()["detail"] == "Limite de uso do Claude atingido"
    assert chat.history("onboarding", p.slug) == [] and chat._state(chat._cwd("onboarding", p.slug), "onboarding")["session_id"] is None


def test_estilo_slug_traversal_stays_inside(monkeypatch):
    fake(monkeypatch, [lambda: "oi"])
    chat.send("estilo", "../x", "a")
    assert (data.home() / "estilos" / "x" / ".chat" / "estilo.json").exists()
    assert chat._cwd("estilo", "../../etc").parent == data.home() / "estilos"


def test_options_block_human_files():
    o = agents.options_for(agents.ROLES["onboarding"], data.home())
    for r in ("Edit(./personagens/**/aprovada)", "Edit(./personagens/**/folha.png)", "Edit(./.chat/**)"):
        assert r in o.disallowed_tools

