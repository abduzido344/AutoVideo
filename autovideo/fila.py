"""Fila de geração e agendador diário: vivem no `autovideo serve`, um episódio por vez em todo o app."""
import json
import logging
import os
import threading
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
MIN_WAIT_S = 60
ERROR_COOLDOWN_S = 3600
_state_lock = threading.RLock()
# ponytail: cooldown só em memória (some no restart), persiste em fila.json se o restart virar laço de gasto
_cooldown: dict[str, float] = {}
_producer = None  # handle do producer.lock, aberto pela vida do processo
_forced: set[str] = set()  # perfis que o painel pediu para gerar agora; o loop consome (nada roda em thread de request)


def _file() -> Path:
    return home() / "fila.json"


def state() -> dict:
    st = {"paused": False, "paused_until": None, "reason": ""}
    if _file().exists():
        st.update(json.loads(_file().read_text(encoding="utf-8")))
    return st


def pause(reason: str = "pausado", until: float | None = None) -> None:
    with _state_lock:
        data._write_json(_file(), {"paused": True, "paused_until": until, "reason": reason})


def resume() -> None:
    with _state_lock:
        data._write_json(_file(), {"paused": False, "paused_until": None, "reason": ""})


def is_paused(now: float) -> bool:
    with _state_lock:
        st = state()
        if st["paused"] and st["paused_until"] is not None and now >= st["paused_until"]:
            resume()
            return False
        return st["paused"]


def _limit(e: agents.UsageLimit, now: float) -> None:
    # retry_at no passado (ou agora) faria a fila girar sem parar: no mínimo 60 s
    pause("limite de uso", now + LIMIT_WAIT_S if e.retry_at is None else max(e.retry_at, now + MIN_WAIT_S))


def acquire_producer() -> bool:
    """Um só produtor entre processos (serve e `autovideo gerar`): trava producer.lock pela vida do processo."""
    global _producer
    if _producer is not None:
        return True
    f = home() / "producer.lock"
    f.parent.mkdir(parents=True, exist_ok=True)
    fh = open(f, "a+b")
    try:
        if os.name == "nt":
            import msvcrt
            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        fh.close()
        return False
    _producer = fh
    return True


def request_force(slug: str) -> None:
    with _state_lock:
        _forced.add(slug)


def _take_forced() -> list[str]:
    with _state_lock:
        out = sorted(_forced)
        _forced.clear()
        return out


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
    created, ts = None, now.timestamp()
    if is_paused(ts):
        return None
    for p in data.list_perfis():
        if (p.slug != force) if force else not p.ativo:
            continue
        if ts < _cooldown.get(p.slug, 0):
            continue
        mine = [j for j in store.list() if _perfil(j) == p.slug]
        if any(j["status"] in BUSY for j in mine):
            continue
        if not force:
            today = sum(datetime.fromtimestamp(j["created"]).date() == now.date() for j in mine)
            if now.strftime("%H:%M") < p.agenda.gerar_as or today >= p.agenda.por_dia:
                continue
        try:
            if nxt := next_episode(p.slug):
                created = episode.new_episode_job(store, *nxt)
        except agents.UsageLimit as e:
            _limit(e, ts)
            return created
        except Exception:  # noqa: BLE001 — showrunner falhando não pode rodar Opus a cada 30 s nem travar os outros
            log.exception("erro ao preparar o próximo episódio de %s", p.slug)
            _cooldown[p.slug] = ts + ERROR_COOLDOWN_S
    return created


def run_next(store: JobStore, now: float) -> bool:
    if is_paused(now):
        return False
    for j in store.queued():
        if j["recipe"] != "episodio":
            continue  # "estilo" (analise.run_job) entra na Task 12; até lá fica na fila
        try:
            paused = _serie(Path(j["project_dir"]).parent).paused
        except (OSError, ValueError) as e:  # série sumiu ou serie.json corrompido: não trava a cabeça da fila
            store.set(j["id"], status="failed", error=f"série do episódio ausente ou corrompida: {e}")
            continue
        if paused or not store.claim(j["id"]):
            continue
        try:
            episode.produce(store, j["id"])
        except agents.UsageLimit as e:  # produce já devolveu o job para a fila na mesma etapa
            _limit(e, now)
            return False  # o loop dorme
        return True
    return False


def loop(store: JobStore) -> None:
    """Alvo da thread daemon do serve: nunca morre."""
    while not acquire_producer():
        log.warning("outro processo já produz episódios (producer.lock); esta fila fica parada")
        time.sleep(IDLE_S)
    store.requeue_stale()
    while True:
        busy = False
        try:
            tick(store, datetime.now())
            for slug in _take_forced():
                tick(store, datetime.now(), force=slug)
        except Exception:  # noqa: BLE001 — um erro num ciclo não pode derrubar a fila
            log.exception("erro no agendador")
        try:
            busy = run_next(store, time.time())
        except Exception:  # noqa: BLE001
            log.exception("erro na fila")
        if not busy:
            time.sleep(IDLE_S)
