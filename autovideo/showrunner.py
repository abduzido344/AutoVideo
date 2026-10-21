from pathlib import Path
from pydantic import BaseModel, field_validator
from autovideo import agents, data
from autovideo.data import Ideia


class PlanoEp(BaseModel):
    titulo: str
    sinopse: str


class Plano(BaseModel):
    titulo: str
    logline: str
    episodios: list[PlanoEp]


class NovasIdeias(BaseModel):
    ideias: list[str]

    @field_validator("ideias")
    @classmethod
    def _tres(cls, v):
        if len(v) != 3 or not all(i.strip() for i in v):
            raise ValueError(f"preciso de exatamente 3 ideias não vazias, vieram {len(v)}")
        return v


def _work(base: Path) -> Path:
    w = base / ".showrunner"
    w.mkdir(parents=True, exist_ok=True)
    return w


def _run(perfil: str, work: Path, task: str, out: Path, validate) -> None:
    out.unlink(missing_ok=True)
    agents.run_role(agents.ROLES["showrunner"], work, task, out, validate=validate, context=data.context_for(perfil))


def ensure_ideia(perfil: str) -> Ideia:
    for i in data.load_ideias(perfil):
        if not i.usada:
            return i
    work = _work(data.perfis_dir() / perfil)
    out = work / "ideias.json"
    p = data.load_perfil(perfil)
    task = (f"Tarefa: ideias. Perfil \"{p.nome}\", assunto: {p.assunto or 'livre'}, público: {p.publico or 'geral'}.\n"
            f"Grave {out.name} com exatamente 3 ideias originais de série, neste formato: "
            '{"ideias": ["ideia 1", "ideia 2", "ideia 3"]}. Cada ideia tem 1 a 3 frases.')
    _run(perfil, work, task, out, agents.validate_model(NovasIdeias))
    textos = NovasIdeias.model_validate_json(out.read_text(encoding="utf-8")).ideias
    return [data.add_ideia(perfil, t.strip(), "claude") for t in textos][0]


def plan_series(perfil: str) -> Path:
    ideia = ensure_ideia(perfil)
    n = data.load_perfil(perfil).agenda.episodios_por_serie
    work = _work(data.perfis_dir() / perfil)
    out = work / "plano.json"

    def valida(p: Path) -> None:
        plano = Plano.model_validate_json(p.read_text(encoding="utf-8"))
        if len(plano.episodios) != n:
            raise ValueError(f"o plano precisa de exatamente {n} episódios, veio com {len(plano.episodios)}")

    task = (f"Tarefa: série. Ideia escolhida:\n\"\"\"\n{ideia.texto}\n\"\"\"\n"
            f"Planeje um arco fechado de exatamente {n} episódios e grave {out.name} neste formato: "
            '{"titulo": "...", "logline": "...", "episodios": [{"titulo": "...", "sinopse": "..."}]}.')
    _run(perfil, work, task, out, valida)
    plano = Plano.model_validate_json(out.read_text(encoding="utf-8"))
    path = data.create_serie(perfil, plano.titulo, plano.logline, [(e.titulo, e.sinopse) for e in plano.episodios], ideia=ideia.id)
    data.save_ideias(perfil, [i.model_copy(update={"usada": True}) if i.id == ideia.id else i for i in data.load_ideias(perfil)])
    return path


def rewrite_synopsis(serie_path: Path, n: int) -> None:
    serie_path = Path(serie_path)
    perfil = serie_path.parent.parent.name
    s = data.Serie.model_validate_json((serie_path / "serie.json").read_text(encoding="utf-8"))
    ref = next(e for e in s.episodios if e.n == n)
    work = _work(serie_path)
    out = work / "sinopse.md"
    viz = "\n".join(f"- Episódio {e.n} \"{e.titulo}\": {e.sinopse}" for e in s.episodios if e.n != n)

    def valida(p: Path) -> None:
        novo = p.read_text(encoding="utf-8").strip()
        if not novo or novo == ref.sinopse.strip():
            raise ValueError("a sinopse nova está vazia ou igual à anterior")

    task = (f"Tarefa: reescrever sinopse. Série \"{s.titulo}\": {s.logline}\n"
            f"O episódio {n} \"{ref.titulo}\" foi descartado. Sinopse descartada:\n\"\"\"\n{ref.sinopse}\n\"\"\"\n"
            f"Demais episódios do arco, em ordem (não mude):\n{viz or '(nenhum)'}\n"
            f"Reescreva só a sinopse do episódio {n} com outra abordagem, mantendo o título, o número e a coerência com o arco. "
            f"Grave só o texto da nova sinopse em {out.name}.")
    _run(perfil, work, task, out, valida)
    novo = out.read_text(encoding="utf-8").strip()
    data._write(data.ep_dir(serie_path, n) / "sinopse.md", novo)
    ref.sinopse = novo
    data.save_serie(serie_path, s)
