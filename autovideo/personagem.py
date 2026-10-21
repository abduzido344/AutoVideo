from autovideo import data, images

# 2 painéis grandes servem de referência melhor que muitas vistas pequenas
SHEET_PROMPT = ("character reference sheet, two panels side by side on pure white background: left panel tight face close-up, "
                "right panel full body front view, arms relaxed at the sides, neutral expression looking at camera, "
                "identical character, outfit and lighting in both panels, soft even light, no text, no logos")


def _dir(perfil: str, p: str):
    return data.perfis_dir() / perfil / "personagens" / p


def gerar_folha(perfil: str, p: str) -> None:
    d = _dir(perfil, p)
    _, estilo = data.load_estilo(data.load_perfil(perfil).estilo)
    if not (d / "ficha.md").exists():
        raise ValueError("o personagem não tem ficha.md")
    ficha = (d / "ficha.md").read_text(encoding="utf-8")
    # folha_prefixo, não imagem_prefixo: este traz formato (9:16) e cenário que brigam com a folha
    prompt = ", ".join(x for x in (estilo.folha_prefixo, SHEET_PROMPT, data.aparencia(ficha)) if x)
    images.generate(prompt, [], d / "folha.png", aspect="16:9")
    (d / "aprovada").unlink(missing_ok=True)  # folha nova = aprovação nova (só depois de gerar com sucesso)


def aprovar_folha(perfil: str, p: str) -> None:
    d = _dir(perfil, p)
    if not (d / "folha.png").exists():
        raise ValueError("gere a folha antes de aprovar")
    (d / "aprovada").write_text("ok", encoding="utf-8")
