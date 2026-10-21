import pytest
from autovideo import data, images, personagem


@pytest.fixture
def perfil(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    p = data.create_perfil("Benji")
    d = data.perfis_dir() / p.slug / "personagens" / "ze"
    d.mkdir(parents=True)
    (d / "ficha.md").write_text("homem de bigode", encoding="utf-8")
    return p.slug, d


def test_sheet_regeneration_clears_approval(perfil, monkeypatch):
    slug, d = perfil
    calls = []

    def gen(prompt, refs, out, aspect="9:16", client=None):
        calls.append((prompt, refs, aspect))
        out.write_bytes(b"png")

    monkeypatch.setattr(images, "generate", gen)
    personagem.gerar_folha(slug, "ze")
    personagem.aprovar_folha(slug, "ze")
    assert (d / "aprovada").exists()
    personagem.gerar_folha(slug, "ze")
    assert not (d / "aprovada").exists() and (d / "folha.png").exists()
    prompt, refs, aspect = calls[0]
    _, est = data.load_estilo(data.load_perfil(slug).estilo)
    assert prompt == f"{est.folha_prefixo}, {personagem.SHEET_PROMPT}, homem de bigode" and refs == [] and aspect == "16:9"
    assert est.folha_prefixo.startswith("2D cartoon") and "9:16" not in prompt and "rainy" not in prompt


def test_failed_regeneration_keeps_approval(perfil, monkeypatch):
    slug, d = perfil
    (d / "folha.png").write_bytes(b"x")
    personagem.aprovar_folha(slug, "ze")
    monkeypatch.setattr(images, "generate", lambda *a, **k: (_ for _ in ()).throw(images.ImageError("x")))
    with pytest.raises(images.ImageError):
        personagem.gerar_folha(slug, "ze")
    assert (d / "aprovada").exists()


def test_approve_requires_sheet(perfil):
    slug, d = perfil
    with pytest.raises(ValueError):
        personagem.aprovar_folha(slug, "ze")
    assert not (d / "aprovada").exists()
