import os
import subprocess
import sys
from datetime import date, datetime, time as dtime, timedelta
from pathlib import Path
import pytest
from autovideo import agents, analise, data, episode, fila, showrunner
from autovideo.jobs import JobStore

EPS = [("t1", "s1"), ("t2", "s2"), ("t3", "s3")]


def at(h, m, days=0):
    return datetime.combine(date.today() + timedelta(days=days), dtime(h, m))


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.setattr(fila, "_cooldown", {})
    monkeypatch.setattr(fila, "_producer", None)
    p = data.create_perfil("Benji")
    p.ativo, p.onboarding, p.voz_id = True, 6, "V1"
    data.save_perfil(p)
    ch = data.perfis_dir() / p.slug / "personagens" / "benji"
    ch.mkdir(parents=True)
    (ch / "folha.png").write_bytes(b"png")
    (ch / "aprovada").write_text("ok")
    serie = data.create_serie(p.slug, "Apagão", "log", EPS)
    planned = []

    def plan(perfil):
        path = data.create_serie(perfil, f"Nova {len(planned) + 2}", "log", EPS)
        planned.append(path)
        return path

    monkeypatch.setattr(showrunner, "plan_series", plan)
    yield type("Env", (), dict(store=JobStore(tmp_path / "jobs.db"), perfil=p.slug, ch=ch, serie=serie, planned=planned))
    if fila._producer is not None:
        fila._producer.close()


def approve(store, jid, when: datetime | None = None):
    """Aprovado = gate gravado (com marcador) e o worker levou o job a completed."""
    ep = Path(store.get(jid)["project_dir"])
    for f in ("approvals/aprovado.ok", ".stages/aprovacao.ok"):
        (ep / f).parent.mkdir(parents=True, exist_ok=True)
        (ep / f).write_text("ok")
    store.set(jid, status="completed", stage="aprovacao", **({"created": when.timestamp()} if when else {}))


def test_one_job_per_day_after_days_closed(env):
    j1 = episode.new_episode_job(env.store, env.serie, 1)
    approve(env.store, j1, at(10, 0, days=-3))
    jid = fila.tick(env.store, at(10, 0))
    assert jid and env.store.get(jid)["project_dir"] == str(data.ep_dir(env.serie, 2))
    assert fila.tick(env.store, at(10, 5)) is None                       # já tem job na fila
    approve(env.store, jid)
    assert fila.tick(env.store, at(10, 5)) is None                       # cota do dia (por_dia=1)
    assert len(env.store.list()) == 2


def test_before_hour_does_nothing(env):
    assert fila.tick(env.store, at(8, 59)) is None and env.store.list() == []
    assert fila.tick(env.store, at(9, 0)) is not None


def test_inactive_profile_does_nothing(env):
    p = data.load_perfil(env.perfil); p.ativo = False; data.save_perfil(p)
    assert fila.tick(env.store, at(10, 0)) is None


def test_waits_for_approval(env):
    j1 = fila.tick(env.store, at(10, 0, days=-1))
    env.store.set(j1, status="awaiting_approval", stage="aprovacao", created=at(10, 0, days=-1).timestamp())
    assert fila.tick(env.store, at(10, 0)) is None
    approve(env.store, j1)
    j2 = fila.tick(env.store, at(10, 0))
    assert env.store.get(j2)["project_dir"] == str(data.ep_dir(env.serie, 2))


def test_failed_job_blocks_new_ones(env):
    j1 = fila.tick(env.store, at(10, 0, days=-1))
    env.store.set(j1, status="failed", error="x", created=at(10, 0, days=-1).timestamp())
    assert fila.tick(env.store, at(10, 0)) is None
    assert fila.tick(env.store, at(10, 0), force=env.perfil) is None    # nem forçando: o ep01 não foi aprovado


def test_series_end_plans_next(env):
    for n in (1, 2, 3):
        approve(env.store, episode.new_episode_job(env.store, env.serie, n), at(10, 0, days=-3))
    jid = fila.tick(env.store, at(10, 0))
    assert len(env.planned) == 1
    assert env.store.get(jid)["project_dir"] == str(data.ep_dir(env.planned[0], 1))


def test_paused_series_waits(env):
    fila.set_series_paused(env.serie, True)
    assert fila.next_episode(env.perfil) is None and env.planned == []
    fila.set_series_paused(env.serie, False)
    assert fila.next_episode(env.perfil) == (env.serie, 1)


def test_usage_limit_pauses_queue(env, monkeypatch):
    T = 1_000_000.0

    def limit(*a, **k):
        raise agents.UsageLimit("usage limit", retry_at=T)

    monkeypatch.setattr(agents, "run_role", limit)
    jid = episode.new_episode_job(env.store, env.serie, 1)
    assert fila.run_next(env.store, T - 100) is False                   # o loop dorme
    job = env.store.get(jid)
    assert (job["status"], job["stage"]) == ("queued", "roteiro")
    assert fila.state()["reason"] == "limite de uso"
    assert fila.is_paused(T - 1) and fila.run_next(env.store, T - 1) is False
    assert not fila.is_paused(T) and fila.state()["paused"] is False   # passado o until, despausa sozinho


def test_usage_limit_without_retry_waits_an_hour(env, monkeypatch):
    def produce(store, jid):
        store.set(jid, status="queued")
        raise agents.UsageLimit("usage limit")

    monkeypatch.setattr(episode, "produce", produce)
    episode.new_episode_job(env.store, env.serie, 1)
    fila.run_next(env.store, 500.0)
    assert fila.state()["paused_until"] == 500.0 + 3600


def test_manual_pause_resume(env):
    fila.pause()
    assert fila.is_paused(1e12)                                          # sem until: só despausa no resume
    fila.resume()
    assert not fila.is_paused(0)


def test_requeue_stale_keeps_stage(env):
    jid = env.store.create("x", "episodio", False)
    env.store.set(jid, status="in_progress", stage="imagens")
    assert env.store.requeue_stale() == 1
    job = env.store.get(jid)
    assert (job["status"], job["stage"]) == ("queued", "imagens")
    assert [j["id"] for j in env.store.queued()] == [jid]


def test_paused_series_skipped(env, monkeypatch):
    other = data.create_serie(env.perfil, "Outra", "log", EPS)
    j1 = episode.new_episode_job(env.store, env.serie, 1)
    j2 = episode.new_episode_job(env.store, other, 1)
    fila.set_series_paused(env.serie, True)
    ran = []
    monkeypatch.setattr(episode, "produce", lambda store, jid: ran.append(jid) or "awaiting_approval")
    assert fila.run_next(env.store, 0.0) is True and ran == [j2]
    assert env.store.get(j1)["status"] == "queued"


def test_unknown_kinds_stay_queued(env, monkeypatch):
    jid = env.store.create("x", "outro", False)
    monkeypatch.setattr(episode, "produce", lambda store, j: pytest.fail("não é episódio"))
    assert fila.run_next(env.store, 0.0) is False
    assert env.store.get(jid)["status"] == "queued"


def test_estilo_job_dispatched_and_limit_pauses(env, monkeypatch):
    jid = env.store.create("estilos/x/.analise", "estilo", False)
    ran = []
    monkeypatch.setattr(analise, "run_job", lambda store, j: ran.append(j) or store.set(j, status="completed"))
    assert fila.run_next(env.store, 0.0) is True and ran == [jid]
    assert env.store.get(jid)["status"] == "completed"

    def limit(store, j):
        store.set(j, status="queued")
        raise agents.UsageLimit("usage limit", retry_at=900.0)

    j2 = env.store.create("estilos/y/.analise", "estilo", False)
    monkeypatch.setattr(analise, "run_job", limit)
    assert fila.run_next(env.store, 100.0) is False
    assert env.store.get(j2)["status"] == "queued" and fila.state()["paused_until"] == 900.0


def test_force_ignores_hour_and_quota(env):
    j1 = episode.new_episode_job(env.store, env.serie, 1)
    approve(env.store, j1)                                               # cota de hoje já usada
    p = data.load_perfil(env.perfil); p.ativo = False; data.save_perfil(p)
    assert fila.tick(env.store, at(8, 0)) is None
    jid = fila.tick(env.store, at(8, 0), force=env.perfil)
    assert env.store.get(jid)["project_dir"] == str(data.ep_dir(env.serie, 2))


def test_loop_survives_errors(env, monkeypatch):
    jid = env.store.create("estilos/x", "estilo", False)
    env.store.set(jid, status="in_progress", stage="analise")
    monkeypatch.setattr(fila, "tick", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    runs, sleeps = [], []
    monkeypatch.setattr(fila, "run_next", lambda store, now: runs.append(now) or False)

    def sleep(s):
        sleeps.append(s)
        if len(sleeps) == 2:
            raise SystemExit

    monkeypatch.setattr(fila.time, "sleep", sleep)
    with pytest.raises(SystemExit):
        fila.loop(env.store)
    assert sleeps == [30, 30] and len(runs) == 2                         # tick quebrado não impede a fila
    assert env.store.get(jid)["status"] == "queued" and fila._producer is not None


def test_plan_failure_cools_down_and_others_run(env, monkeypatch):
    for n in (1, 2, 3):
        approve(env.store, episode.new_episode_job(env.store, env.serie, n), at(10, 0, days=-3))
    calls = []
    monkeypatch.setattr(showrunner, "plan_series", lambda perfil: calls.append(perfil) or 1 / 0)
    outro = data.create_perfil("Outro")
    s2 = data.create_serie(outro.slug, "X", "log", EPS)
    j = episode.new_episode_job(env.store, s2, 1)
    ran = []
    monkeypatch.setattr(episode, "produce", lambda store, jid: ran.append(jid) or "awaiting_approval")
    assert fila.tick(env.store, at(10, 0)) is None
    assert fila.tick(env.store, at(10, 30)) is None and calls == [env.perfil]   # cooldown de 1 h
    assert fila.run_next(env.store, 0.0) is True and ran == [j]
    fila.tick(env.store, at(11, 1))
    assert len(calls) == 2


def test_plan_usage_limit_pauses(env, monkeypatch):
    for n in (1, 2, 3):
        approve(env.store, episode.new_episode_job(env.store, env.serie, n), at(10, 0, days=-3))

    def plan(perfil):
        raise agents.UsageLimit("usage limit", retry_at=at(12, 0).timestamp())

    monkeypatch.setattr(showrunner, "plan_series", plan)
    assert fila.tick(env.store, at(10, 0)) is None
    assert fila.state() == {"paused": True, "paused_until": at(12, 0).timestamp(), "reason": "limite de uso"}


def test_tick_respects_queue_pause(env, monkeypatch):
    monkeypatch.setattr(fila, "next_episode", lambda perfil: pytest.fail("pausado não chama agentes"))
    fila.pause()
    assert fila.tick(env.store, at(10, 0)) is None
    assert fila.tick(env.store, at(10, 0), force=env.perfil) is None and env.store.list() == []


def test_usage_limit_in_the_past_waits_a_minute(env, monkeypatch):
    def produce(store, jid):
        store.set(jid, status="queued")
        raise agents.UsageLimit("usage limit", retry_at=100.0)

    monkeypatch.setattr(episode, "produce", produce)
    episode.new_episode_job(env.store, env.serie, 1)
    assert fila.run_next(env.store, 500.0) is False
    assert fila.state()["paused_until"] == 560.0


def test_broken_series_fails_job_and_queue_moves_on(env, monkeypatch):
    other = data.create_serie(env.perfil, "Outra", "log", EPS)
    j1 = episode.new_episode_job(env.store, env.serie, 1)
    j2 = episode.new_episode_job(env.store, other, 1)
    (env.serie / "serie.json").write_text("{corrompido", encoding="utf-8")
    ran = []
    monkeypatch.setattr(episode, "produce", lambda store, jid: ran.append(jid) or "awaiting_approval")
    assert fila.run_next(env.store, 0.0) is True and ran == [j2]
    job = env.store.get(j1)
    assert job["status"] == "failed" and "série do episódio" in job["error"]


def test_single_producer(env):
    assert fila.acquire_producer() and fila.acquire_producer()            # o mesmo processo já é o dono
    code = "from autovideo import fila; print(fila.acquire_producer())"
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True,
                         env={**os.environ}).stdout.strip()
    assert out == "False"


def test_request_force_is_consumed_by_loop(env, monkeypatch):
    calls = []
    monkeypatch.setattr(fila, "tick", lambda store, now, force=None: calls.append(force))
    monkeypatch.setattr(fila, "run_next", lambda store, now: False)

    class Stop(Exception):
        pass

    def stop(_):
        raise Stop
    monkeypatch.setattr(fila.time, "sleep", stop)
    fila.request_force(env.perfil)
    with pytest.raises(Stop):
        fila.loop(env.store)
    assert calls == [None, env.perfil] and fila._take_forced() == []


def test_request_force_clears_cooldown(env):
    fila._cooldown[env.perfil] = at(10, 0).timestamp() + 3600  # o showrunner falhou há pouco
    fila.request_force(env.perfil)
    assert env.perfil not in fila._cooldown and fila._take_forced() == [env.perfil]


def test_unready_profile_skipped_even_forced(env, monkeypatch):
    monkeypatch.setattr(fila, "next_episode", lambda perfil: pytest.fail("perfil sem folha aprovada não gera"))
    (env.ch / "aprovada").unlink()
    assert fila.tick(env.store, at(10, 0)) is None
    assert fila.tick(env.store, at(10, 0), force=env.perfil) is None
    (env.ch / "aprovada").write_text("ok")
    p = data.load_perfil(env.perfil); p.estilo = "sumiu"; data.save_perfil(p)
    assert fila.tick(env.store, at(10, 0), force=env.perfil) is None and env.store.list() == []


def test_pausado_covers_queue_and_series(env):
    jid = episode.new_episode_job(env.store, env.serie, 1)
    job = env.store.get(jid)
    assert episode._pausado(job) is False
    fila.pause()
    assert episode._pausado(job) is True
    fila.resume()
    fila.set_series_paused(env.serie, True)
    assert episode._pausado(job) is True
