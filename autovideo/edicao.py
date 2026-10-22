"""Invariantes da edição: o editor pode enfeitar a composição, mas não mexer na sincronia da montagem."""
import shutil
from html.parser import HTMLParser
from pathlib import Path

TIMED_PREFIXES = ("voz-", "img-", "screen-", "sfx-", "legenda-", "ambiente")


VOID = {"img", "meta", "br", "link", "input", "hr", "source", "area", "base", "col", "embed", "track", "wbr"}


class _Coleta(HTMLParser):
    """Guarda os atributos de todo elemento (tag, dict) e os ids com ancestral cronometrado."""

    def __init__(self, html: str):
        super().__init__()
        self.els: list[tuple[str, dict[str, str | None]]] = []
        self.pilha: list[tuple[str, bool]] = []  # (tag, cronometrado) dos ancestrais abertos
        self.embrulhados: list[str] = []  # ids com tempo cronometrado (voz-, img-...) dentro de um wrapper com data-start
        self.feed(html)

    def _registra(self, tag, attrs):
        a = dict(attrs)
        self.els.append((tag, a))
        if a.get("id", "").startswith(TIMED_PREFIXES) and any(t for _, t in self.pilha):
            self.embrulhados.append(a["id"])
        return a

    def handle_starttag(self, tag, attrs):
        a = self._registra(tag, attrs)
        if tag not in VOID:
            # a raiz main é o único ancestral cronometrado permitido
            self.pilha.append((tag, "data-start" in a and a.get("data-composition-id") != "main"))

    def handle_startendtag(self, tag, attrs):
        self._registra(tag, attrs)

    def handle_endtag(self, tag):
        for i in range(len(self.pilha) - 1, -1, -1):
            if self.pilha[i][0] == tag:
                del self.pilha[i:]
                break


def timed(html: str) -> dict[str, tuple[str | None, str | None]]:
    return {a["id"]: (a.get("data-start"), a.get("data-duration")) for _, a in _Coleta(html).els
            if a.get("id", "").startswith(TIMED_PREFIXES)}


def root_duration(html: str) -> str | None:
    return next((a.get("data-duration") for _, a in _Coleta(html).els if a.get("data-composition-id") == "main"), None)


def media_srcs(html: str) -> set[str]:
    return {a["src"] for t, a in _Coleta(html).els if t in ("img", "audio") and a.get("src")}


def invariantes(base: Path, comp: Path) -> list[str]:
    """Violações em português ao comparar o index.html da edição com o da base; lista vazia = ok."""
    b = (base / "index.html").read_text(encoding="utf-8")
    try:
        c = (comp / "index.html").read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return ["index.html da edição ausente ou ilegível."]
    erros = []
    tb, tc = timed(b), timed(c)
    for i, par in tb.items():
        if i not in tc:
            erros.append(f"O elemento {i} foi removido.")
        elif tc[i] != par:
            erros.append(f"O tempo de {i} mudou: início/duração {par} viraram {tc[i]}.")
    for i in _Coleta(c).embrulhados:
        erros.append(f"O elemento {i} está dentro de um wrapper com data-start, o que desloca o tempo dele.")
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
    shutil.rmtree(ep / "composition", ignore_errors=True)
    shutil.copytree(ep / "composition.base", ep / "composition")
