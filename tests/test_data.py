import json
import pytest
from pydantic import ValidationError
from autovideo import config, data
from autovideo.data import Agenda


@pytest.fixture(autouse=True)
def _home(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))


def test_slug_ascii_and_dedupe():
    assert data.create_perfil("Terror à Noite").slug == "terror-a-noite"
    assert data.create_perfil("Terror à Noite").slug == "terror-a-noite-2"


def test_agenda_limits():
    with pytest.raises(ValidationError):
        Agenda(episodios_por_serie=11)
    with pytest.raises(ValidationError):
        Agenda(gerar_as="25:00")


def test_estilos_lists_benji_and_user_overrides(tmp_path):
    assert {"slug": "benji", "titulo": "Benji — terror narrado", "origem": "fabrica"} in data.list_estilos()
    d = tmp_path / "estilos" / "benji"
    d.mkdir(parents=True)
    (d / "estilo.json").write_text(json.dumps({"titulo": "Meu", "paleta": [], "imagem_prefixo": "x"}), encoding="utf-8")
    assert [e["origem"] for e in data.list_estilos() if e["slug"] == "benji"] == ["usuario"]


def test_benji_valid():
    assert "alerta" in data.load_estilo("benji")[1].telas
    with pytest.raises(KeyError):
        data.estilo_dir("nao-existe")


def test_create_serie_writes_synopses():
    p = data.create_perfil("Canal")
    path = data.create_serie(p.slug, "Apagão", "log", [("A", "sa"), ("B", "sb"), ("C", "sc")])
    for n in (1, 2, 3):
        assert (data.ep_dir(path, n) / "sinopse.md").exists()
    s = data.series(p.slug)[0][1]
    assert len(s.episodios) == 3 and all(e.job is None for e in s.episodios)
    assert data.series(p.slug)[0][0] == path


def test_context_order():
    p = data.create_perfil("Canal")
    root = data.perfis_dir() / p.slug
    (root / "universo" / "mundo.md").write_text("MUNDO", encoding="utf-8")
    (root / "universo" / "historico.md").write_text("HISTORICO", encoding="utf-8")
    ctx = data.context_for(p.slug)
    assert ctx.index("Benji") < ctx.index("MUNDO") < ctx.index("HISTORICO")


def test_ideias_and_perfis():
    p = data.create_perfil("Canal")
    i = data.add_ideia(p.slug, "algo")
    assert data.load_ideias(p.slug)[0].id == i.id and len(i.id) == 8
    assert [x.slug for x in data.list_perfis()] == [p.slug]
    with pytest.raises(KeyError):
        data.load_perfil("nada")


def test_get_key_env_wins(monkeypatch):
    config.save({"openrouter_api_key": "b"})
    assert config.get_key("OPENROUTER_API_KEY") == "b"
    monkeypatch.setenv("OPENROUTER_API_KEY", "a")
    assert config.get_key("OPENROUTER_API_KEY") == "a"
    assert config.setting("max_imagens", 40) == 40


def test_personagens_and_context_alphabetical():
    p = data.create_perfil("Canal")
    root = data.perfis_dir() / p.slug
    (root / "universo" / "mundo.md").write_text("MUNDO", encoding="utf-8")
    (root / "universo" / "historico.md").write_text("HISTORICO", encoding="utf-8")
    for nome, ficha in (("zeca", "FICHA_Z"), ("ana", "FICHA_A")):
        (root / "personagens" / nome).mkdir(parents=True)
        (root / "personagens" / nome / "ficha.md").write_text(ficha, encoding="utf-8")
    (root / "personagens" / "ana" / "folha.png").write_bytes(b"x")
    (root / "personagens" / "ana" / "aprovada").write_text("", encoding="utf-8")
    ps = data.personagens(p.slug)
    assert [(c["slug"], c["folha"], c["aprovada"]) for c in ps] == [("ana", True, True), ("zeca", False, False)]
    ctx = data.context_for(p.slug)
    assert ctx.index("MUNDO") < ctx.index("FICHA_A") < ctx.index("FICHA_Z") < ctx.index("HISTORICO")


def test_voz_id_alphanumeric_only():
    data.Perfil(slug="a", nome="A", voz_id="Abc123")
    with pytest.raises(ValidationError):
        data.Perfil(slug="a", nome="A", voz_id="../x")


def test_list_perfis_skips_corrupt(caplog):
    a = data.create_perfil("Bom")
    b = data.create_perfil("Ruim")
    (data.perfis_dir() / b.slug / "perfil.json").write_text("{x", encoding="utf-8")
    assert [p.slug for p in data.list_perfis()] == [a.slug]
    assert "ruim" in caplog.text


def _char(slug, nome, folha=True, aprovada=True):
    d = data.perfis_dir() / slug / "personagens" / nome
    d.mkdir(parents=True)
    if folha:
        (d / "folha.png").write_bytes(b"png")
    if aprovada:
        (d / "aprovada").write_text("ok")


def test_ready_requires_estilo_and_approved_characters():
    p = data.create_perfil("Canal")
    assert "etapa 0 de 6" in data.ready(p.slug)
    p.onboarding = 5
    data.save_perfil(p)
    assert "etapa 5 de 6" in data.ready(p.slug)
    p.onboarding = 6
    data.save_perfil(p)
    assert "personagem" in data.ready(p.slug)
    _char(p.slug, "ana")
    assert data.ready(p.slug) is None
    _char(p.slug, "zeca", aprovada=False)
    assert "zeca" in data.ready(p.slug)
    (data.perfis_dir() / p.slug / "personagens" / "zeca" / "aprovada").write_text("ok")
    assert data.ready(p.slug) is None
    p.estilo = "nao-existe"
    data.save_perfil(p)
    assert "estilo" in data.ready(p.slug)
