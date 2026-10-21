import json
import re
import types
from pathlib import Path
import pytest
from autovideo import agents, config, data, eleven, episode, images, jobs, montage, render
from autovideo.jobs import JobStore

ALERTA = {"titulo": "Tempestade", "orgao": "Defesa Civil", "texto": "Procure abrigo.", "hora": "14:02"}
ROTEIRO = "# Apagão\nÀs 3h47, a luz cai.\n\nVocê acorda no escuro.\nO celular grita."


class Fake:
    """Agente fake: grava arquivos fixos por função e roda a validação como o run_role de verdade."""

    def __init__(self):
        self.calls = {}
        self.tasks = {}
        self.reviews = [{"ok": True}]
        self.images = 2
        self.triagem = {"role": "roteirista", "note": "texto"}

    def __call__(self, role, cwd, task, output, validate=None, context=""):
        k = self.calls[role.name] = self.calls.get(role.name, 0) + 1
        self.tasks.setdefault(role.name, []).append(task)
        cwd = Path(cwd)
        if role.name == "roteirista":
            (cwd / "roteiro.md").write_text(ROTEIRO, encoding="utf-8")
            out = {"titulo": "Apagão", "resumo": "A luz caiu no prédio.", "post": {"caption": "c", "hashtags": ["#x"]}}
        elif role.name == "diretor_arte":
            cenas = [{"id": "s01", "kind": "image", "narration": "Às 3h47, a luz cai.", "prompt": "dark building",
                      "characters": ["benji"], "sfx": "thunder"},
                     {"id": "s02", "kind": "image", "narration": "Você acorda no escuro.", "prompt": f"bedroom v{k}"},
                     {"id": "s03", "kind": "screen", "narration": "O celular grita.",
                      "screen": {"type": "alerta", "data": ALERTA}}]
            if self.images == 3:
                cenas[2] = {"id": "s03", "kind": "image", "narration": "O celular grita.", "prompt": "phone"}
            out = {"cenas": cenas, "ambiente": "rain"}
        elif role.name == "revisor":
            out = self.reviews[min(k, len(self.reviews)) - 1]
        else:
            out = self.triagem
        Path(output).write_text(json.dumps(out), encoding="utf-8")
        if validate:
            validate(Path(output))


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    p = data.create_perfil("Benji")
    p.voz_id = "voz1"
    data.save_perfil(p)
    ch = data.perfis_dir() / p.slug / "personagens" / "benji"
    ch.mkdir(parents=True)
    (ch / "ficha.md").write_text("cabeça grande", encoding="utf-8")
    (ch / "folha.png").write_bytes(b"png")
    (ch / "aprovada").write_text("ok")
    serie = data.create_serie(p.slug, "Apagão", "log", [("t1", "sinopse 1"), ("t2", "sinopse 2"), ("t3", "sinopse 3")])
    fake = Fake()
    monkeypatch.setattr(agents, "run_role", fake)
    calls = {"tts": [], "gen": [], "sfx": []}

    def tts(text, voice_id, out, previous_text="", next_text="", client=None):
        calls["tts"].append(text)
        out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(b"mp3")
        return 2.0

    def sfx(prompt, seconds, out, client=None):
        calls["sfx"].append(prompt)
        out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(b"mp3")

    def gen(prompt, refs, out, aspect="9:16", client=None):
        calls["gen"].append((prompt, refs))
        out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(b"png")
        return {"provider": "fake", "model": "m", "cost_usd": 0.01}

    def build(ep, cenas, voz, imgs, sfx, ambiente, legenda=False):
        calls["build"] = (imgs, sfx, ambiente, legenda)
        (ep / "composition" / "index.html").write_text("<html>", encoding="utf-8")

    def final(comp, out, lufs):
        calls["lufs"] = lufs
        out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(b"mp4")

    def cover(video, at, out):
        calls["cover"] = at
        out.write_bytes(b"jpg")

    def snaps(comp, times, out_dir):
        calls["snaps"] = times
        return []

    monkeypatch.setattr(eleven, "tts", tts)
    monkeypatch.setattr(eleven, "sfx", sfx)
    monkeypatch.setattr(images, "generate", gen)
    monkeypatch.setattr(montage, "build", build)
    monkeypatch.setattr(render, "init_composition", lambda project, aspect: (project.root / "composition").mkdir(exist_ok=True))
    monkeypatch.setattr(render, "render_final", final)
    monkeypatch.setattr(render, "make_cover", cover)
    monkeypatch.setattr(render, "snapshots", snaps)
    monkeypatch.setattr(render, "check", lambda comp, aspect: calls.setdefault("check", []).append(aspect) or [])
    store = JobStore(tmp_path / "jobs.db")
    jid = episode.new_episode_job(store, serie, 1)
    return types.SimpleNamespace(store=store, jid=jid, fake=fake, calls=calls, serie=serie, perfil=p.slug,
                                 ep=data.ep_dir(serie, 1), ch=ch)


def done(ep, name, rel):
    return jobs.stage_done(ep, name, rel, legacy=False)


def test_full_run_stops_at_approval(env):
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert env.store.get(env.jid)["stage"] == "aprovacao"
    for name, rel, fn in episode.STAGES:
        assert done(env.ep, name, rel) == (fn is not None), name
    assert (env.ep / "out/capa.jpg").exists()
    imgs, sfx, amb, leg = env.calls["build"]
    assert set(imgs) == {"s01", "s02"} and set(sfx) == {"s01"} and amb and leg is False
    assert env.calls["lufs"] == -14 and env.calls["check"] == ["9:16"]
    assert "150 e 180 s" in env.fake.tasks["revisor"][0]          # alvo de duração vem do estilo
    assert (env.ep / "review/refs/benji.png").read_bytes() == b"png"   # folha aprovada ao alcance do revisor
    assert "review/refs/benji.png" in env.fake.tasks["revisor"][0]
    assert env.calls["snaps"] == [1.125, 3.375, 5.625]          # meio de cada cena (2 s + respiro)
    assert env.calls["gen"][0][1] == [env.ch / "folha.png"]      # folha do personagem como referência
    assert env.calls["gen"][0][0].startswith("2D cartoon")       # prefixo do estilo
    assert env.calls["gen"][0][0].endswith("dark building. Character from reference image 1: cabeça grande.")
    assert "Character" not in env.calls["gen"][1][0]             # cena sem personagem não ganha aparência
    s = json.loads(data.ep_dir(env.serie, 1).parent.joinpath("serie.json").read_text(encoding="utf-8"))
    assert s["episodios"][0]["job"] == env.jid
    log = (env.ep / "decisions.log").read_text(encoding="utf-8")
    assert '"stage": "imagens"' in log and '"cost_usd": 0.01' in log


def test_reviewer_fix_redoes_from_cenas_only(env):
    env.fake.reviews = [{"ok": False, "fixes": [{"role": "diretor_arte", "scene": "s02", "note": "mais escuro"}]},
                        {"ok": True}]
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert env.fake.calls == {"roteirista": 1, "diretor_arte": 2, "revisor": 2}
    assert [p for p, _ in env.calls["gen"][2:]] == [env.calls["gen"][1][0].replace("v1", "v2")]
    assert len(env.calls["tts"]) == 3                             # voz em cache
    assert "mais escuro" in (env.ep / "ajustes.md").read_text(encoding="utf-8")
    assert "ajustes.md" in env.fake.tasks["diretor_arte"][1]


def test_review_rounds_capped(env):
    env.fake.reviews = [{"ok": False, "fixes": [{"role": "diretor_arte", "scene": "s01", "note": "x"}]}]
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert env.fake.calls["diretor_arte"] == 3
    assert len(re.findall(r"^## Ajuste \(revisor", (env.ep / "ajustes.md").read_text(encoding="utf-8"), re.M)) == 2
    assert not json.loads((env.ep / "revisao.json").read_text(encoding="utf-8"))["ok"]  # fixes visíveis


def test_too_many_images_fails_before_generating(env):
    config.save({"max_imagens": 2})
    env.fake.images = 3
    assert episode.produce(env.store, env.jid) == "failed"
    job = env.store.get(env.jid)
    assert job["stage"] == "cenas" and "max_imagens" in job["error"]
    assert env.calls["gen"] == []


def test_unapproved_sheet_blocks_images(env):
    (env.ch / "aprovada").unlink()
    assert episode.produce(env.store, env.jid) == "failed"
    job = env.store.get(env.jid)
    assert job["stage"] == "imagens" and "benji" in job["error"]
    assert env.calls["gen"] == []


def test_usage_limit_requeues_same_stage(env, monkeypatch):
    real = eleven.tts

    def boom(*a, **k):
        raise agents.UsageLimit("limite", 123)

    monkeypatch.setattr(eleven, "tts", boom)
    with pytest.raises(agents.UsageLimit):
        episode.produce(env.store, env.jid)
    job = env.store.get(env.jid)
    assert job["status"] == "queued" and job["stage"] == "voz"
    monkeypatch.setattr(eleven, "tts", real)
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert env.fake.calls["roteirista"] == 1


def test_missing_voice_fails(env):
    p = data.load_perfil(env.perfil); p.voz_id = ""; data.save_perfil(p)
    assert episode.produce(env.store, env.jid) == "failed"
    assert "defina a voz do perfil" in env.store.get(env.jid)["error"]


def test_approve_appends_history(env):
    episode.produce(env.store, env.jid)
    episode.approve(env.store, env.jid)
    h = (data.perfis_dir() / env.perfil / "universo" / "historico.md").read_text(encoding="utf-8")
    assert "## Parte 1 — Apagão\nA luz caiu no prédio." in h
    assert episode.produce(env.store, env.jid) == "completed"


def test_adjust_routes_by_triage(env):
    episode.produce(env.store, env.jid)
    episode.adjust(env.store, env.jid, "quero mais medo")
    for name, rel, _ in episode.STAGES:
        assert not done(env.ep, name, rel), name
    assert not (env.ep / "episodio.json").exists()
    assert "quero mais medo" in (env.ep / "ajustes.md").read_text(encoding="utf-8")
    assert env.store.get(env.jid)["status"] == "queued"
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert "ajustes.md" in env.fake.tasks["roteirista"][1]


def test_adjust_to_art_keeps_script(env):
    episode.produce(env.store, env.jid)
    env.fake.triagem = {"role": "diretor_arte", "scene": "s02", "note": "x"}
    episode.adjust(env.store, env.jid, "cena 2 mais clara")
    assert done(env.ep, "roteiro", "episodio.json") and not done(env.ep, "cenas", "cenas.json")


def test_discard_keeps_only_synopsis(env, monkeypatch):
    seen = []
    monkeypatch.setattr("autovideo.showrunner.rewrite_synopsis", lambda serie, n: seen.append((serie, n)))
    episode.produce(env.store, env.jid)
    episode.discard(env.store, env.jid)
    assert seen == [(env.serie, 1)]
    assert sorted(p.name for p in env.ep.iterdir() if p.name != ".stages") == ["sinopse.md"]
    job = env.store.get(env.jid)
    assert job["status"] == "queued" and job["stage"] == ""


def test_last_episode_has_no_hook_instruction(env):
    for n in (1, 3):
        jid = env.jid if n == 1 else episode.new_episode_job(env.store, env.serie, 3)
        episode.roteiro(episode.make_ctx(env.store.get(jid)))
    first, last = env.fake.tasks["roteirista"]
    assert "gancho" in first and "Segue pra ver a Parte 2" in first and "sem gancho" not in first
    assert "sem gancho" in last and "Parte 3 de 3" in last


def test_make_ctx_derives_from_dir(env):
    ctx = episode.make_ctx(env.store.get(env.jid))
    assert ctx.recipe == {"perfil": env.perfil, "serie": env.serie, "n": 1}


def test_new_episode_job_rejects_unknown_episode(env):
    with pytest.raises(ValueError, match="episódio 7"):
        episode.new_episode_job(env.store, env.serie, 7)


def test_check_issues_fail_render_before_rendering(env, monkeypatch):
    monkeypatch.setattr(render, "check", lambda comp, aspect: [{"category": "layout", "message": "legenda cortada"}])
    assert episode.produce(env.store, env.jid) == "failed"
    job = env.store.get(env.jid)
    assert job["stage"] == "render" and "legenda cortada" in job["error"] and "lufs" not in env.calls


def test_killed_mid_stage_resumes_and_redoes_partial(env, monkeypatch):
    # Review Focus 3: processo morto no meio da etapa cenas (job in_progress, cenas.json parcial sem marcador)
    real = episode.cenas

    def killed(ctx):
        (ctx.project.root / "cenas.json").write_text("{parcial", encoding="utf-8")
        raise KeyboardInterrupt  # BaseException: o run_job relança, como um kill

    monkeypatch.setattr(episode, "STAGES", [(n, r, killed if n == "cenas" else f) for n, r, f in episode.STAGES])
    with pytest.raises(KeyboardInterrupt):
        episode.produce(env.store, env.jid)
    env.store.set(env.jid, status="in_progress")                 # hard kill: nada chegou a marcar failed
    (env.ep / "cenas.json").write_text("{parcial", encoding="utf-8")
    assert env.store.requeue_stale() == 1
    monkeypatch.setattr(episode, "STAGES", [(n, r, real if n == "cenas" else f) for n, r, f in episode.STAGES])
    assert episode.produce(env.store, env.jid) == "awaiting_approval"
    assert env.fake.calls["roteirista"] == 1 and env.fake.calls["diretor_arte"] == 1
    assert json.loads((env.ep / "cenas.json").read_text(encoding="utf-8"))["cenas"][0]["id"] == "s01"


def test_aparencia_drops_headings_and_joins_lines():
    assert episode._aparencia("# Benji\nbig head,\n  dot eyes\n\n## Notas\nred cap") == "big head, dot eyes red cap"
