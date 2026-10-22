"""Invariantes da edição: o editor pode enfeitar a composição, mas não mexer na sincronia da montagem."""
import shutil
from html.parser import HTMLParser
from pathlib import Path

TIMED_PREFIXES = ("voz-", "img-", "screen-", "sfx-", "legenda-", "ambiente")


class _Coleta(HTMLParser):
    """Guarda os atributos de todo elemento (tag, dict)."""

    def __init__(self, html: str):
        super().__init__()
        self.els: list[tuple[str, dict[str, str | None]]] = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.els.append((tag, dict(attrs)))


def timed(html: str) -> dict[str, tuple[str | None, str | None]]:
    return {a["id"]: (a.get("data-start"), a.get("data-duration")) for _, a in _Coleta(html).els
            if a.get("id", "").startswith(TIMED_PREFIXES)}


def root_duration(html: str) -> str | None:
    return next((a.get("data-duration") for _, a in _Coleta(html).els if a.get("data-composition-id") == "main"), None)


def media_srcs(html: str) -> set[str]:
    return {a["src"] for t, a in _Coleta(html).els if t in ("img", "audio") and a.get("src")}


def invariantes(base: Path, comp: Path) -> list[str]:
    """Violações em português ao comparar o index.html da edição com o da base; lista vazia = ok."""
    b, c = (d / "index.html" for d in (base, comp))
    b, c = b.read_text(encoding="utf-8"), c.read_text(encoding="utf-8")
    erros = []
    tb, tc = timed(b), timed(c)
    for i, par in tb.items():
        if i not in tc:
            erros.append(f"O elemento {i} foi removido.")
        elif tc[i] != par:
            erros.append(f"O tempo de {i} mudou: início/duração {par} viraram {tc[i]}.")
    if root_duration(b) != root_duration(c):
        erros.append(f"A duração total mudou: {root_duration(b)} virou {root_duration(c)}.")
    for s in sorted(media_srcs(b) - media_srcs(c)):
        erros.append(f"A mídia {s} foi removida.")
    if not any(i.startswith("legenda-") for i in tb):
        if any(i.startswith("legenda-") for i in tc):
            erros.append("Foi adicionada legenda, mas o perfil não usa legenda.")
        if any("caption" in (a.get("data-composition-src") or "") for _, a in _Coleta(c).els):
            erros.append("Foi adicionada uma composição de legenda (caption), mas o perfil não usa legenda.")
    return erros


def restaurar_base(ep: Path) -> None:
    shutil.rmtree(ep / "composition")
    shutil.copytree(ep / "composition.base", ep / "composition")
