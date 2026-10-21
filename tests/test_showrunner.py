import json
from pathlib import Path
import pytest
from autovideo import agents, data, showrunner


class Fake:
    def __init__(self, plans=None):
        self.roles = []
        self.tasks = []
        self.plans = plans or []  # nº de episódios por tentativa

    def __call__(self, role, cwd, task, output, validate=None, context=""):
        self.roles.append(role.name)
        self.tasks.append(task)
        out = Path(output)
        assert Path(cwd) == out.parent and "Estilo" in context
        if out.name == "ideias.json":
            out.write_text(json.dumps({"ideias": ["a", "b", "c"]}), encoding="utf-8")
        elif out.name == "plano.json":
            for eps in self.plans:  # simula a retentativa do run_role
                out.write_text(json.dumps({"titulo": "Apagão", "logline": "log", "episodios": [
                    {"titulo": f"t{i}", "sinopse": f"s{i}"} for i in range(eps)]}), encoding="utf-8")
                try:
                    validate(out)
                    return
                except ValueError:
                    continue
            raise agents.AgentOutputError("inválido")
        else:
            out.write_text("outra abordagem", encoding="utf-8")
            validate(out)


@pytest.fixture
def perfil(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path))
    return data.create_perfil("Benji")


def test_uses_bank_before_creating(perfil, monkeypatch):
    fake = Fake([3])
    monkeypatch.setattr(agents, "run_role", fake)
    i = data.add_ideia(perfil.slug, "minha ideia")
    showrunner.plan_series(perfil.slug)
    assert fake.roles == ["showrunner"] and "minha ideia" in fake.tasks[0]  # só o plano, sem pedir ideias
    assert [(x.id, x.usada) for x in data.load_ideias(perfil.slug)] == [(i.id, True)]
    assert data.series(perfil.slug)[0][1].ideia == i.id


def test_creates_ideas_when_bank_empty(perfil, monkeypatch):
    monkeypatch.setattr(agents, "run_role", Fake([3]))
    showrunner.plan_series(perfil.slug)
    ideias = data.load_ideias(perfil.slug)
    assert [(x.texto, x.origem, x.usada) for x in ideias] == [("a", "claude", True), ("b", "claude", False), ("c", "claude", False)]


def test_plan_size_matches_agenda(perfil, monkeypatch):
    perfil.agenda.episodios_por_serie = 5
    data.save_perfil(perfil)
    monkeypatch.setattr(agents, "run_role", Fake([4, 5]))  # 4 falha na validação, 5 na retentativa
    path = showrunner.plan_series(perfil.slug)
    assert len(data.Serie.model_validate_json((path / "serie.json").read_text(encoding="utf-8")).episodios) == 5


def test_rewrite_keeps_numbering(perfil, monkeypatch):
    fake = Fake([3])
    monkeypatch.setattr(agents, "run_role", fake)
    path = showrunner.plan_series(perfil.slug)
    before = {n: (data.ep_dir(path, n) / "sinopse.md").read_text(encoding="utf-8") for n in (1, 2, 3)}
    showrunner.rewrite_synopsis(path, 2)
    assert "s0" in fake.tasks[-1] and "s2" in fake.tasks[-1]  # vizinhos vão na tarefa
    after = {n: (data.ep_dir(path, n) / "sinopse.md").read_text(encoding="utf-8") for n in (1, 2, 3)}
    assert after[2] == "outra abordagem" and after[1] == before[1] and after[3] == before[3]
    s = data.series(perfil.slug)[0][1]
    assert [(e.n, e.titulo, e.sinopse) for e in s.episodios] == [(1, "t0", "s0"), (2, "t1", "outra abordagem"), (3, "t2", "s2")]
