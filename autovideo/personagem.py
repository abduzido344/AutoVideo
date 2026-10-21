from autovideo import data, images

SHEET_PROMPT = ("character reference sheet, same character in front, 3/4, side and back views, plus 3 facial expressions, "
                "neutral light grey background, full body, consistent outfit and proportions")


def _dir(perfil: str, p: str):
    return data.perfis_dir() / perfil / "personagens" / p


def gerar_folha(perfil: str, p: str) -> None:
    d = _dir(perfil, p)
    _, estilo = data.load_estilo(data.load_perfil(perfil).estilo)
    ficha = (d / "ficha.md").read_text(encoding="utf-8")
    images.generate(f"{estilo.imagem_prefixo}, {SHEET_PROMPT}, {ficha}", [], d / "folha.png", aspect="16:9")
    (d / "aprovada").unlink(missing_ok=True)  # folha nova = aprovação nova (só depois de gerar com sucesso)


def aprovar_folha(perfil: str, p: str) -> None:
    d = _dir(perfil, p)
    if not (d / "folha.png").exists():
        raise ValueError("gere a folha antes de aprovar")
    (d / "aprovada").write_text("ok", encoding="utf-8")
