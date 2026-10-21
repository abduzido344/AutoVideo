"""Fila de geração e agendador diário: vivem no `autovideo serve`, um episódio por vez em todo o app."""
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from autovideo import agents, data, episode, jobs, showrunner
from autovideo.jobs import JobStore
from autovideo.project import home

log = logging.getLogger("autovideo.fila")
BUSY = ("queued", "in_progress", "awaiting_approval", "failed")
IDLE_S = 30
LIMIT_WAIT_S = 3600


def _file() -> Path:
    return home() / "fila.json"


def state() -> dict:
    st = {"paused": False, "paused_until": None, "reason": ""}
    if _file().exists():
        st.update(json.loads(_file().read_text(encoding="utf-8")))
    return st


def pause(reason: str = "pausado", until: float | None = None) -> None:
    data._write_json(_file(), {"paused": True, "paused_until": until, "reason": reason})


def resume() -> None:
    data._write_json(_file(), {"paused": False, "paused_until": None, "reason": ""})


def is_paused(now: float) -> bool:
    st = state()
    if st["paused"] and st["paused_until"] is not None and now >= st["paused_until"]:
        resume()
        return False
    return st["paused"]


def _serie(path: Path) -> data.Serie:
    return data.Serie.model_validate_json((path / "serie.json").read_text(encoding="utf-8"))


def set_series_paused(serie_path: Path, paused: bool) -> None:
    s = _serie(serie_path)
    s.paused = paused
    data.save_serie(serie_path, s)


def _approved(serie_path: Path, n: int) -> bool:
    # aprovado = gate gravado com marcador; é o que vale como "foi ao ar" para a continuidade
    return jobs.stage_done(data.ep_dir(serie_path, n), "aprovacao", "approvals/aprovado.ok")


def next_episode(perfil: str) -> tuple[Path, int] | None:
    pend = [(p, s) for p, s in data.series(perfil) if any(not _approved(p, e.n) for e in s.episodios)]
    if pend:
        path, s = pend[-1]
    else:
        path = showrunner.plan_series(perfil)
        s = _serie(path)
    if s.paused:
        return None
    e = next(e for e in s.episodios if not _approved(path, e.n))  # os anteriores a ele estão aprovados
    return None if e.job is not None else (path, e.n)  # já tem job: espera ele (revisão, falha, fila)


def _perfil(job: dict) -> str | None:
    try:
        return Path(job["project_dir"]).relative_to(data.perfis_dir()).parts[0]
    except ValueError:
        return None


def tick(store: JobStore, now: datetime, force: str | None = None) -> int | None:
    created = None
    for p in data.list_perfis():
        if (p.slug != force) if force else not p.ativo:
            continue
        mine = [j for j in store.list() if _perfil(j) == p.slug]
        if any(j["status"] in BUSY for j in mine):
            continue
        if not force:
            today = sum(datetime.fromtimestamp(j["created"]).date() == now.date() for j in mine)
            if now.strftime("%H:%M") < p.agenda.gerar_as or today >= p.agenda.por_dia:
                continue
        if nxt := next_episode(p.slug):
            created = episode.new_episode_job(store, *nxt)
    return created


def run_next(store: JobStore, now: float) -> bool:
    if is_paused(now):
        return False
    for j in store.queued():
        if j["recipe"] != "episodio":
            continue  # "estilo" (analise.run_job) entra na Task 12; até lá fica na fila
        if _serie(Path(j["project_dir"]).parent).paused or not store.claim(j["id"]):
            continue
        try:
            episode.produce(store, j["id"])
        except agents.UsageLimit as e:  # produce já devolveu o job para a fila na mesma etapa
            pause("limite de uso", e.retry_at or now + LIMIT_WAIT_S)
        return True
    return False


def loop(store: JobStore) -> None:
    """Alvo da thread daemon do serve: nunca morre."""
    store.requeue_stale()
    while True:
        busy = False
        try:
            tick(store, datetime.now())
            busy = run_next(store, time.time())
        except Exception:  # noqa: BLE001 — um erro num ciclo não pode derrubar a fila
            log.exception("erro no ciclo da fila")
        if not busy:
            time.sleep(IDLE_S)
