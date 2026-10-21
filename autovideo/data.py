import json
import logging
import re
import threading
import unicodedata
import uuid
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from autovideo.project import home

ScreenType = Literal["chat", "alerta", "bateria", "bloqueio", "notificacao"]
Rede = Literal["youtube", "tiktok", "instagram", "facebook"]
FABRICA = Path(__file__).parent / "estilos"
log = logging.getLogger("autovideo.data")
# read-modify-write de serie.json (postado, pausa, sinopse): um por vez no processo
# ponytail: lock global, por série se a contenção aparecer
SERIE_LOCK = threading.Lock()


class Estilo(BaseModel):
    titulo: str
    duracao_alvo_s: tuple[int, int] = (150, 180)
    segundos_por_cena: float = 4.0
    legenda: bool = False
    paleta: list[str]
    telas: list[ScreenType] = []
    imagem_prefixo: str
    folha_prefixo: str = ""  # traço do personagem para a folha, sem formato nem fundo
    gancho: str = "Segue pra ver a Parte {n}"
    voz_padrao: str = ""


def _hhmm(v: str) -> str:
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", v):
        raise ValueError(f"horário inválido: {v!r} (use HH:MM)")
    return v


class Agenda(BaseModel):
    gerar_as: str = "09:00"
    por_dia: int = Field(1, ge=1, le=5)
    postar_as: list[str] = ["18:00"]
    episodios_por_serie: int = Field(3, ge=1, le=10)

    @field_validator("gerar_as")
    @classmethod
    def _v1(cls, v): return _hhmm(v)

    @field_validator("postar_as")
    @classmethod
    def _v2(cls, v): return [_hhmm(x) for x in v]


class Conta(BaseModel):
    conectada: bool = False
    usuario: str = ""


class Perfil(BaseModel):
    slug: str
    nome: str
    assunto: str = ""
    publico: str = ""
    estilo: str = "benji"
    voz_id: str = Field("", pattern=r"^[A-Za-z0-9]*$")
    ativo: bool = False
    agenda: Agenda = Agenda()
    contas: dict[Rede, Conta] = {r: Conta() for r in ("youtube", "tiktok", "instagram", "facebook")}
    onboarding: int = Field(0, ge=0, le=6)  # última etapa concluída


class Ideia(BaseModel):
    id: str
    texto: str
    origem: Literal["usuario", "claude"]
    usada: bool = False


class EpisodioRef(BaseModel):
    n: int
    titulo: str
    sinopse: str
    job: int | None = None
    postado: list[Rede] = []


class Serie(BaseModel):
    slug: str
    titulo: str
    logline: str
    ideia: str | None = None
    paused: bool = False
    episodios: list[EpisodioRef]


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(p)


def _write_json(p: Path, obj) -> None:
    _write(p, json.dumps(obj, ensure_ascii=False, indent=2))


def slugify(text: str) -> str:
    s = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40].strip("-") or "perfil"


def perfis_dir() -> Path:
    return home() / "perfis"


def create_perfil(nome: str) -> Perfil:
    base = slugify(nome)
    perfis_dir().mkdir(parents=True, exist_ok=True)
    for i in range(1, 1000):
        slug = base if i == 1 else f"{base}-{i}"
        try:
            (perfis_dir() / slug).mkdir()  # atômico: falha se já existe
            break
        except FileExistsError:
            continue
    else:
        raise RuntimeError(f"não consegui um slug livre para {nome!r}")
    root = perfis_dir() / slug
    (root / "universo").mkdir()
    (root / "universo" / "mundo.md").write_text("", encoding="utf-8")
    (root / "universo" / "historico.md").write_text("", encoding="utf-8")
    _write_json(root / "ideias.json", [])
    p = Perfil(slug=slug, nome=nome)
    save_perfil(p)
    return p


def load_perfil(slug: str) -> Perfil:
    f = perfis_dir() / slug / "perfil.json"
    if not f.exists():
        raise KeyError(slug)
    return Perfil.model_validate_json(f.read_text(encoding="utf-8"))


def save_perfil(p: Perfil) -> None:
    _write_json(perfis_dir() / p.slug / "perfil.json", p.model_dump(mode="json"))


def list_perfis() -> list[Perfil]:
    if not perfis_dir().exists():
        return []
    out = []
    for d in sorted(perfis_dir().iterdir()):
        if (d / "perfil.json").exists():
            try:
                out.append(load_perfil(d.name))
            except ValueError:  # JSON inválido ou fora do schema: um perfil quebrado não derruba os outros
                log.warning("perfil %s ignorado: perfil.json inválido", d.name)
    return out


def load_ideias(slug: str) -> list[Ideia]:
    return [Ideia(**i) for i in json.loads((perfis_dir() / slug / "ideias.json").read_text(encoding="utf-8"))]


def save_ideias(slug: str, ideias: list[Ideia]) -> None:
    _write_json(perfis_dir() / slug / "ideias.json", [i.model_dump() for i in ideias])


def add_ideia(slug: str, texto: str, origem: str = "usuario") -> Ideia:
    i = Ideia(id=uuid.uuid4().hex[:8], texto=texto, origem=origem)
    save_ideias(slug, [*load_ideias(slug), i])
    return i


def personagens(slug: str) -> list[dict]:
    # perfis/<slug>/personagens/<p>/{ficha.md, folha.png, aprovada (arquivo marcador)}
    base = perfis_dir() / slug / "personagens"
    if not base.exists():
        return []
    return [{"slug": d.name, "ficha": (d / "ficha.md").read_text(encoding="utf-8") if (d / "ficha.md").exists() else "",
             "folha": (d / "folha.png").exists(), "aprovada": (d / "aprovada").exists()}
            for d in sorted(base.iterdir()) if d.is_dir()]


def aparencia(ficha: str) -> str:
    """Ficha em uma linha, sem títulos markdown (o nome do personagem viraria texto na imagem)."""
    return " ".join(" ".join(ln for ln in ficha.splitlines() if not ln.lstrip().startswith("#")).split())


def ready(slug: str, estilo: str | None = None) -> str | None:
    """Motivo (em português) de o perfil não poder produzir; None se está pronto. `estilo`: o que vai ser salvo."""
    try:
        load_estilo(estilo or load_perfil(slug).estilo)
    except (KeyError, ValueError, OSError):
        return "o estilo do perfil não existe ou está inválido"
    if (feito := load_perfil(slug).onboarding) < 6:
        return f"termine o onboarding (etapa {feito} de 6 concluída)"
    cs = personagens(slug)
    if not cs:
        return "crie ao menos um personagem"
    if bad := [c["slug"] for c in cs if not (c["folha"] and c["aprovada"])]:
        return f"aprove a folha de: {', '.join(bad)}"
    return None


def _estilo_dirs() -> list[tuple[Path, str]]:
    return [(home() / "estilos", "usuario"), (FABRICA, "fabrica")]  # o do usuário vence


def list_estilos() -> list[dict]:
    seen: dict[str, dict] = {}
    for base, origem in _estilo_dirs():
        if not base.exists():
            continue
        for d in sorted(base.iterdir()):
            if d.name not in seen and (d / "estilo.json").exists():
                try:
                    titulo = Estilo.model_validate_json((d / "estilo.json").read_text(encoding="utf-8")).titulo
                except ValueError:  # JSON inválido ou fora do schema (UnicodeDecodeError também é ValueError)
                    log.warning("estilo %s ignorado: estilo.json inválido", d.name)
                    continue
                seen[d.name] = {"slug": d.name, "origem": origem, "titulo": titulo}
    return sorted(seen.values(), key=lambda e: e["slug"])


def estilo_dir(slug: str) -> Path:
    for base, _ in _estilo_dirs():
        if (base / slug / "estilo.json").exists():
            return base / slug
    raise KeyError(slug)


def load_estilo(slug: str) -> tuple[str, Estilo]:
    d = estilo_dir(slug)
    md = (d / "estilo.md").read_text(encoding="utf-8") if (d / "estilo.md").exists() else ""
    return md, Estilo.model_validate_json((d / "estilo.json").read_text(encoding="utf-8"))


def _series_dir(perfil: str) -> Path:
    return perfis_dir() / perfil / "series"


def series(slug: str) -> list[tuple[Path, Serie]]:
    base = _series_dir(slug)
    if not base.exists():
        return []
    return [(d, Serie.model_validate_json((d / "serie.json").read_text(encoding="utf-8")))
            for d in sorted(base.iterdir()) if (d / "serie.json").exists()]


def create_serie(perfil: str, titulo: str, logline: str, episodios: list[tuple[str, str]], ideia: str | None = None) -> Path:
    base = _series_dir(perfil)
    base.mkdir(parents=True, exist_ok=True)
    nn = max((int(d.name[:2]) for d in base.iterdir() if d.name[:2].isdigit()), default=0) + 1
    slug = slugify(titulo)
    path = base / f"{nn:02d}-{slug}"
    path.mkdir()
    for n, (_, sinopse) in enumerate(episodios, 1):
        _write(ep_dir(path, n) / "sinopse.md", sinopse)
    refs = [EpisodioRef(n=n, titulo=t, sinopse=s) for n, (t, s) in enumerate(episodios, 1)]
    save_serie(path, Serie(slug=slug, titulo=titulo, logline=logline, ideia=ideia, episodios=refs))
    return path


def save_serie(path: Path, s: Serie) -> None:
    _write_json(path / "serie.json", s.model_dump(mode="json"))


def ep_dir(serie_path: Path, n: int) -> Path:
    return serie_path / f"ep{n:02d}"


def context_for(perfil: str) -> str:
    """Prefixo estável dos agentes (cache): estilo, mundo, personagens, histórico, nessa ordem."""
    md, est = load_estilo(load_perfil(perfil).estilo)
    u = perfis_dir() / perfil / "universo"

    def rd(f):
        return (u / f).read_text(encoding="utf-8") if (u / f).exists() else ""

    parts = [f"## Estilo\n{md}", f"## Parâmetros do estilo\n{est.model_dump_json(indent=2)}", f"## Mundo\n{rd('mundo.md')}"]
    parts += [f"## Personagem: {c['slug']}\n{c['ficha']}" for c in personagens(perfil)]
    parts.append(f"## Histórico\n{rd('historico.md')}")
    return "\n\n".join(parts)
