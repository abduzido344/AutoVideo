import json
import pytest
from autovideo import agents, fila
from fastapi.testclient import TestClient
from autovideo import config, data, episode, server
from autovideo.jobs import JobStore
from autovideo.server import create_app


@pytest.fixture(autouse=True)
def store(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.setattr(server, "STORE", JobStore(tmp_path / "jobs.db"), raising=False)
    return server.STORE


def _client():
    return TestClient(create_app(server.STORE, start_worker=False), base_url="http://127.0.0.1")


def test_blocks_foreign_origin_and_host(monkeypatch):
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: None)
    c = _client()
    assert c.post("/api/auth/login", headers={"Origin": "http://evil.example"}).status_code == 403
    assert c.post("/api/auth/login", headers={"Origin": "http://127.0.0.1"}).status_code == 200
    assert c.get("/api/auth", headers={"Host": "evil.example"}).status_code == 400


def test_vite_dev_proxy_origin_allowed(monkeypatch):
    # proxy com changeOrigin:false mantém Host=localhost:5173 e Origin=http://localhost:5173
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: None)
    h = {"Host": "localhost:5173", "Origin": "http://localhost:5173"}
    assert _client().post("/api/auth/login", headers=h).status_code == 200


def test_old_job_endpoints_are_gone():
    c = _client()
    assert c.get("/api/jobs").status_code == 404 and c.get("/api/recipes").status_code == 404


def test_doctor_caches_success_but_rechecks_failure(monkeypatch):
    calls, logged = [], [False]
    monkeypatch.setattr(server.doctor, "run_checks", lambda: calls.append(1) or [
        ("ffmpeg", True, "7.1"), ("claude auth", logged[0], "ok" if logged[0] else "rode claude login")])
    monkeypatch.setattr(server, "_doctor_ok", None)
    c = _client()
    a, b = c.get("/api/doctor").json(), c.get("/api/doctor").json()
    assert a == b == {"ok": False, "checks": [{"name": "ffmpeg", "ok": True, "detail": "7.1"},
                                             {"name": "claude auth", "ok": False, "detail": "rode claude login"}]}
    assert len(calls) == 2  # falha não fica em cache
    logged[0] = True  # usuário rodou claude login
    assert c.get("/api/doctor").json()["ok"] is True
    assert c.get("/api/doctor").json()["ok"] is True
    assert len(calls) == 3  # sucesso fica em cache


def test_auth_status_and_login_terminal(monkeypatch):
    c = _client()
    monkeypatch.setattr(server.doctor, "claude_auth", lambda: "logado (claude.ai)")
    assert c.get("/api/auth").json() == {"ok": True, "detail": "logado (claude.ai)"}

    def fail():
        raise server.doctor.hf.ToolError("sem autenticação do Claude" + chr(10) + "mais")
    monkeypatch.setattr(server.doctor, "claude_auth", fail)
    assert c.get("/api/auth").json() == {"ok": False, "detail": "sem autenticação do Claude"}

    opened = []
    monkeypatch.setattr(server.doctor, "open_login_terminal", lambda: opened.append(1))
    assert c.post("/api/auth/login").json() == {"ok": True} and opened == [1]
    # POST vindo de outra página é barrado pelo Origin
    assert c.post("/api/auth/login", headers={"origin": "http://evil.example"}).status_code == 403 and opened == [1]


def test_open_login_terminal_runs_claude_auth_login(monkeypatch):
    from autovideo import doctor
    calls = []
    monkeypatch.setattr(doctor.subprocess, "Popen", lambda args, **kw: calls.append(args))
    doctor.open_login_terminal()
    assert len(calls) == 1 and "claude auth login" in " ".join(calls[0])


def _ep():
    p = data.create_perfil("Benji")
    serie = data.create_serie(p.slug, "Apagão", "log", [("t1", "s1"), ("t2", "s2")])
    return p, serie


def test_config_never_returns_secret(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    c = _client()
    assert c.put("/api/config", json={"OPENROUTER_API_KEY": "sk-x", "max_imagens": 10}).status_code == 200
    r = c.get("/api/config")
    assert "sk-x" not in r.text and r.json()["keys"]["OPENROUTER_API_KEY"] == {"mascara": "••••", "ambiente": False}
    assert r.json()["max_imagens"] == 10
    c.put("/api/config", json={"OPENROUTER_API_KEY": "sk_abcdefgh1234"})
    r = c.get("/api/config")
    assert "abcdefgh" not in r.text and r.json()["keys"]["OPENROUTER_API_KEY"]["mascara"] == "sk_••••1234"
    c.put("/api/config", json={"OPENROUTER_API_KEY": ""})  # excluir = salvar vazio
    assert c.get("/api/config").json()["keys"]["OPENROUTER_API_KEY"] is None
    assert c.put("/api/config", json={"foo": 1}).status_code == 400
    assert c.put("/api/config", json={"max_imagens": 0}).status_code == 400
    assert c.put("/api/config", json={"APIFY_TOKEN": 5}).status_code == 400
    assert c.put("/api/config", json={"image_model": "  "}).status_code == 400
    c.put("/api/config", json={"OPENAI_API_KEY": " sk-abcdefgh9876\n"})
    assert config.get_key("OPENAI_API_KEY") == "sk-abcdefgh9876"
    for f in ("config.json", "jobs.db"):
        g = c.get("/projects/" + f)
        assert g.status_code == 404 and b"sk-x" not in g.content


def test_profile_crud_and_bad_slug():
    c = _client()
    slug = c.post("/api/perfis", json={"nome": "Benji"}).json()["slug"]
    assert c.get(f"/api/perfis/{slug}").json()["perfil"]["nome"] == "Benji"
    assert c.put(f"/api/perfis/{slug}", json={"nome": "B", "slug": "x"}).json()["slug"] == slug
    assert c.put(f"/api/perfis/{slug}", json={"onboarding": 99}).status_code == 422
    iid = c.post(f"/api/perfis/{slug}/ideias", json={"texto": "oi"}).json()["id"]
    assert c.delete(f"/api/perfis/{slug}/ideias/{iid}").status_code == 200
    assert c.get(f"/api/perfis/{slug}").json()["ideias"] == []
    assert c.get("/api/perfis/..%5Cx").status_code == 404 and c.get("/api/perfis/..").status_code == 404
    assert c.get("/api/perfis/nao-existe").status_code == 404
    assert c.post("/api/perfis/nao-existe/gerar").status_code == 404


def test_path_rel_traversal_rejected():
    _ep()
    c = _client()
    assert c.post("/api/series/pausar", json={"path_rel": "../../x", "paused": True}).status_code == 404
    assert c.post("/api/series/pausar", json={"path_rel": "benji/series/01-apagao", "paused": True}).status_code == 200
    assert c.get("/api/perfis/benji").json()["series"][0]["serie"]["paused"] is True


def test_episode_actions_conflict():
    _, serie = _ep()
    c = _client()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    assert c.post(f"/api/episodios/{jid}/aprovar").status_code == 409
    assert c.post(f"/api/episodios/{jid}/retomar").status_code == 409
    assert c.post("/api/episodios/999/aprovar").status_code == 404


def test_episode_detail_urls_and_postado():
    _, serie = _ep()
    c = _client()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    ep = data.ep_dir(serie, 1)
    assert c.get(f"/api/episodios/{jid}").json()["final"] is None
    (ep / "out").mkdir()
    (ep / "out" / "final.mp4").write_bytes(b"x")
    d = c.get(f"/api/episodios/{jid}").json()
    assert d["final"].startswith("/projects/benji/") and d["n"] == 1 and d["titulo"] == "t1"
    assert c.get(d["final"]).content == b"x"
    assert c.get(f"/api/episodios/{jid}").json()["aprovado"] is False
    r = c.post(f"/api/episodios/{jid}/postado", json={"rede": "tiktok"})
    assert r.status_code == 409 and "aprovado" in r.json()["detail"]      # só depois de aprovar
    for f in ("approvals/aprovado.ok", ".stages/aprovacao.ok"):
        (ep / f).parent.mkdir(parents=True, exist_ok=True)
        (ep / f).write_text("ok")
    assert c.get(f"/api/episodios/{jid}").json()["aprovado"] is True
    assert c.post(f"/api/episodios/{jid}/postado", json={"rede": "tiktok"}).json()["postado"] == ["tiktok"]
    assert c.post(f"/api/episodios/{jid}/postado", json={"rede": "orkut"}).status_code == 422
    assert c.get(f"/api/episodios/{jid}").json()["postado"] == ["tiktok"]
    j = c.get("/api/fila").json()["jobs"][0]
    assert j["titulo"] == "t1" and j["video"] is True and j["capa"] is None
    assert j["aprovado"] is True and j["postado"] == ["tiktok"]
    (ep / "out" / "capa.jpg").write_bytes(b"x")
    assert c.get("/api/fila").json()["jobs"][0]["capa"].endswith("/out/capa.jpg")


def test_vozes_endpoint(monkeypatch):
    c = _client()
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    r = c.get("/api/vozes")
    assert r.status_code == 400 and "ElevenLabs" in r.json()["detail"]
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    monkeypatch.setattr(server, "vozes", lambda: [{"voice_id": "a", "nome": "Ana", "preview_url": None, "descricao": ""}])
    assert c.get("/api/vozes").json()[0]["nome"] == "Ana"

    def boom():
        raise RuntimeError("ElevenLabs 401")
    monkeypatch.setattr(server, "vozes", boom)
    assert c.get("/api/vozes").status_code == 502


def test_cli_gerar_refuses_when_serve_produces(monkeypatch, capsys):
    from autovideo import cli, fila
    monkeypatch.setattr(fila, "acquire_producer", lambda: False)
    assert cli.main(["gerar", "benji"]) == 1
    assert "autovideo serve está produzindo" in capsys.readouterr().err


def test_detail_survives_corrupt_artifacts_and_postado_guards():
    _, serie = _ep()
    c = _client()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    ep = data.ep_dir(serie, 1)
    (ep / "episodio.json").write_text("{x", encoding="utf-8")
    (ep / "decisions.log").write_bytes(b'{"a": 1}' + bytes([10]) + b'{"t": "' + "é".encode()[:1])
    d = c.get(f"/api/episodios/{jid}").json()
    assert d["episodio"] is None and d["decisions"] == [{"a": 1}]
    (serie / "serie.json").unlink()
    assert c.post(f"/api/episodios/{jid}/postado", json={"rede": "tiktok"}).status_code == 404


def test_character_sheet_endpoints(monkeypatch):
    from autovideo import images
    c = _client()
    slug = c.post("/api/perfis", json={"nome": "Benji"}).json()["slug"]
    d = data.perfis_dir() / slug / "personagens" / "ze"
    d.mkdir(parents=True)
    (d / "ficha.md").write_text("x", encoding="utf-8")
    base = f"/api/perfis/{slug}/personagens"
    assert c.post(f"{base}/nope/folha").status_code == 404 and c.post(f"{base}/nope/aprovar").status_code == 404
    assert c.post(f"{base}/ze/aprovar").status_code == 409            # sem folha
    monkeypatch.setattr(images, "generate", lambda p, r, out, aspect="9:16", client=None: out.write_bytes(b"png"))
    assert c.post(f"{base}/ze/folha").status_code == 200
    assert c.post(f"{base}/ze/aprovar").status_code == 200 and (d / "aprovada").exists()
    monkeypatch.setattr(images, "generate", lambda *a, **k: (_ for _ in ()).throw(server.MissingKey("falta OPENROUTER_API_KEY")))
    r = c.post(f"{base}/ze/folha")
    assert r.status_code == 400 and "OPENROUTER" in r.json()["detail"]


def test_analisar_endpoint(monkeypatch):
    monkeypatch.delenv("APIFY_TOKEN", raising=False)
    monkeypatch.setattr(server.config, "load", lambda: {})
    c = _client()
    assert "APIFY_TOKEN" in c.post("/api/estilos/analisar", json={"handle": "abc"}).json()["detail"]
    monkeypatch.setenv("APIFY_TOKEN", "t")
    assert c.post("/api/estilos/analisar", json={"handle": "../x"}).status_code == 422
    jid = c.post("/api/estilos/analisar", json={"handle": "@abc"}).json()["job"]
    assert server.STORE.get(jid)["recipe"] == "estilo"


def test_folha_without_ficha_is_409_without_paths():
    c = _client()
    slug = c.post("/api/perfis", json={"nome": "Benji"}).json()["slug"]
    (data.perfis_dir() / slug / "personagens" / "ze").mkdir(parents=True)
    r = c.post(f"/api/perfis/{slug}/personagens/ze/folha")
    assert r.status_code == 409 and str(data.perfis_dir()) not in r.json()["detail"]


def _ready(slug):
    p = data.load_perfil(slug)
    p.onboarding, p.voz_id = 6, "V1"
    data.save_perfil(p)
    d = data.perfis_dir() / slug / "personagens" / "ze"
    d.mkdir(parents=True)
    (d / "folha.png").write_bytes(b"png")
    (d / "aprovada").write_text("ok")


def test_activate_requires_ready_profile():
    c = _client()
    slug = c.post("/api/perfis", json={"nome": "Benji"}).json()["slug"]
    r = c.put(f"/api/perfis/{slug}", json={"ativo": True})
    assert r.status_code == 409 and "onboarding" in r.json()["detail"]
    assert c.put(f"/api/perfis/{slug}", json={"estilo": "nao-existe"}).status_code == 400
    _ready(slug)
    assert c.put(f"/api/perfis/{slug}", json={"ativo": True}).json()["ativo"] is True
    assert c.put(f"/api/perfis/{slug}", json={"ativo": False}).json()["ativo"] is False


def test_gerar_conflicts(monkeypatch):
    monkeypatch.setattr(fila, "_forced", set())
    p, serie = _ep()
    c = _client()
    r = c.post(f"/api/perfis/{p.slug}/gerar")
    assert r.status_code == 409 and "onboarding" in r.json()["detail"]
    _ready(p.slug)
    fila.pause()
    assert "pausada" in c.post(f"/api/perfis/{p.slug}/gerar").json()["detail"]
    fila.resume()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    assert "andamento" in c.post(f"/api/perfis/{p.slug}/gerar").json()["detail"]
    server.STORE.set(jid, status="completed")
    fila.set_series_paused(serie, True)  # série em andamento pausada: o clique não geraria nada
    r = c.post(f"/api/perfis/{p.slug}/gerar")
    assert r.status_code == 409 and '"Apagão" está pausada' in r.json()["detail"] and fila._take_forced() == []
    fila.set_series_paused(serie, False)
    assert c.post(f"/api/perfis/{p.slug}/gerar").status_code == 200 and fila._take_forced() == [p.slug]


def test_fila_lists_estilo_jobs_and_resumes_them(monkeypatch):
    monkeypatch.setenv("APIFY_TOKEN", "t")
    c = _client()
    jid = c.post("/api/estilos/analisar", json={"handle": "@abc"}).json()["job"]
    server.STORE.create("/tmp/velho", "director", False)  # receita do M1: fora da fila
    jobs = c.get("/api/fila").json()["jobs"]
    assert [(j["id"], j["recipe"], j["titulo"]) for j in jobs] == [(jid, "estilo", "@abc")]
    server.STORE.set(jid, status="failed", error="x")
    assert c.post(f"/api/episodios/{jid}/retomar").status_code == 200
    assert server.STORE.get(jid)["status"] == "queued"


@pytest.mark.parametrize("err,code", [(agents.UsageLimit("limit"), 429), (agents.AgentOutputError("ruim"), 502)])
def test_adjust_discard_agent_errors(monkeypatch, err, code):
    _, serie = _ep()
    jid = episode.new_episode_job(server.STORE, serie, 1)

    def boom(*a):
        raise err
    monkeypatch.setattr(episode, "adjust", boom)
    monkeypatch.setattr(episode, "discard", boom)
    c = _client()
    for r in (c.post(f"/api/episodios/{jid}/ajustar", json={"texto": "x"}), c.post(f"/api/episodios/{jid}/descartar")):
        assert r.status_code == code
        if code == 429:
            assert r.json()["detail"] == "Limite de uso do Claude atingido"


def test_profile_with_missing_job_shows_null_status():
    p, serie = _ep()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    server.STORE.con.execute("delete from jobs where id=?", (jid,))
    eps = _client().get(f"/api/perfis/{p.slug}").json()["series"][0]["episodios"]
    assert eps[0]["job"] == jid and eps[0]["status"] is None


def test_artefatos_junta_cena_imagem_e_voz():
    _, serie = _ep()
    c = _client()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    ep = data.ep_dir(serie, 1)
    (ep / "img").mkdir(); (ep / "voz").mkdir()
    (ep / "cenas.json").write_text(json.dumps({"cenas": [
        {"id": "s01", "kind": "image", "narration": "n1", "prompt": "p1", "camera": "zoom", "sfx": "x"},
        {"id": "s02", "kind": "screen", "narration": "n2", "prompt": "", "camera": "", "sfx": ""}]}), encoding="utf-8")
    (ep / "img" / "manifest.json").write_text(json.dumps({"s01": "img/a.png"}), encoding="utf-8")
    (ep / "img" / "a.png").write_bytes(b"x")
    (ep / "voz.json").write_text(json.dumps({"cenas": [{"id": "s01", "file": "voz/a.mp3", "dur": 3.5, "sha": "x"}]}), encoding="utf-8")
    (ep / "voz" / "a.mp3").write_bytes(b"x")
    cs = {x["id"]: x for x in c.get(f"/api/episodios/{jid}/artefatos").json()["cenas"]}
    assert cs["s01"]["imagem"].endswith("/img/a.png") and cs["s01"]["audio"].endswith("/voz/a.mp3")
    assert cs["s01"]["dur"] == 3.5 and cs["s01"]["kind"] == "image" and cs["s01"]["camera"] == "zoom"
    assert cs["s02"]["imagem"] is None and cs["s02"]["audio"] is None and cs["s02"]["dur"] is None


def test_artefatos_episodio_vazio():
    _, serie = _ep()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    r = _client().get(f"/api/episodios/{jid}/artefatos")
    assert r.status_code == 200 and r.json() == {"cenas": []}


def test_artefatos_job_inexistente():
    assert _client().get("/api/episodios/999/artefatos").status_code == 404


def _rel(serie):
    return serie.relative_to(data.perfis_dir()).as_posix()


def test_serie_detalhe_soma_custo_e_status():
    p, serie = _ep()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    server.STORE.set(jid, status="awaiting_approval")
    ep = data.ep_dir(serie, 1)
    (ep / "decisions.log").write_text('{"cost_usd": 0.3}\n{"cost_usd": 0.1}\n{"x": 1}\nlixo\n', encoding="utf-8")
    d = _client().get("/api/series/detalhe", params={"path_rel": _rel(serie)}).json()
    assert d["perfil"] == p.slug and d["serie"]["titulo"] == "Apagão"
    e1, e2 = d["episodios"]
    assert e1["job"] == jid and e1["status"] == "awaiting_approval" and e1["custo_usd"] == pytest.approx(0.4)
    assert d["custo_usd"] == pytest.approx(0.4)
    assert e2["status"] is None and e2["custo_usd"] == 0 and e2["capa"] is None and e2["aprovado"] is False


def test_serie_detalhe_path_invalido():
    assert _client().get("/api/series/detalhe", params={"path_rel": "../x"}).status_code == 404


def test_serie_detalhe_job_apagado():
    _, serie = _ep()
    jid = episode.new_episode_job(server.STORE, serie, 1)
    server.STORE.con.execute("delete from jobs where id=?", (jid,))
    r = _client().get("/api/series/detalhe", params={"path_rel": _rel(serie)})
    assert r.status_code == 200 and r.json()["episodios"][0]["status"] is None
