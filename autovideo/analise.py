"""Estilo a partir de um perfil do Instagram: Apify → vídeos → transcrição + folha de frames → Analista."""
import math
import re
from pathlib import Path
from urllib.parse import urlsplit
import httpx
from autovideo import agents, config, data, media, transcribe
from autovideo.data import Estilo
from autovideo.eleven import MissingKey
from autovideo.hf import run
from autovideo.project import home

APIFY = "https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items"
MAX_FRAMES = 24  # ponytail: só os primeiros 72 s por vídeo (6 linhas); a folha inteira estouraria a visão


def normalizar_handle(raw: str) -> str:
    h = raw.strip()
    if "instagram.com" in h:
        h = next((s for s in urlsplit(h if "//" in h else "//" + h).path.split("/") if s), "")
    h = h.lstrip("@")
    if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", h):
        raise ValueError(f"perfil do Instagram inválido: {raw!r}")
    return h


def criar_job(store, handle: str) -> int:
    h = normalizar_handle(handle)
    d = home() / "estilos" / data.slugify(h) / ".analise"
    d.mkdir(parents=True, exist_ok=True)
    (d / "perfil.txt").write_text(h, encoding="utf-8")
    return store.create(str(d), "estilo", False)


def _baixar(h: str, work: Path, client: httpx.Client) -> list[Path]:
    token = config.get_key("APIFY_TOKEN")
    if not token:
        raise MissingKey("falta APIFY_TOKEN (defina a variável ou salve em Configurações)")
    r = client.post(APIFY, json={"username": [h], "resultsLimit": 3}, headers={"Authorization": f"Bearer {token}"})
    if not r.is_success:
        raise RuntimeError(f"Apify {r.status_code}: {r.text[:300]}")
    urls = [i["videoUrl"] for i in r.json() if isinstance(i, dict) and i.get("videoUrl")]
    if not urls:
        raise RuntimeError(f"o Apify não devolveu vídeos de @{h} (perfil privado ou sem reels?)")
    out = []
    for n, u in enumerate(urls, 1):
        v = work / f"v{n}" / "video.mp4"
        v.parent.mkdir(parents=True, exist_ok=True)
        resp = client.get(u)
        if not resp.is_success:
            raise RuntimeError(f"download do vídeo {n} falhou: {resp.status_code}")
        part = v.with_name(v.name + ".part")
        part.write_bytes(resp.content)
        part.replace(v)
        out.append(v)
    return out


def _folha(video: Path) -> None:
    frames = media.extract_frames(video, video.parent / "frames", 3)[:MAX_FRAMES]
    if not frames:
        raise RuntimeError(f"nenhum frame extraído de {video.name}")
    rows = math.ceil(len(frames) / 4)
    run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1", "-i", str(frames[0].parent / "f_%04d.jpg"),
         "-vf", f"tile=4x{rows}", "-frames:v", "1", "-q:v", "3", str(video.parent / "folha.jpg")])


def run_job(store, jid: int, client: httpx.Client | None = None) -> str:
    job = store.get(jid)
    work = Path(job["project_dir"])
    est = work.parent
    own = client is None
    c = client or httpx.Client(timeout=300, follow_redirects=True)
    try:
        h = (work / "perfil.txt").read_text(encoding="utf-8")
        for v in _baixar(h, work, c):
            words = transcribe.transcribe(v, v.parent.name, v.parent)
            (v.parent / "transcricao.txt").write_text(" ".join(w.text for w in words), encoding="utf-8")
            _folha(v)
        task = (f"Analise os vídeos do perfil @{h} em .analise/ (v1, v2, ...: folha.jpg e transcricao.txt) e grave "
                "estilo.md e estilo.json na pasta atual. Só o estilo; nunca copie personagem, mundo ou história.")
        (est / "estilo.json").unlink(missing_ok=True)
        agents.run_role(agents.ROLES["analista"], est, task, est / "estilo.json", validate=agents.validate_model(Estilo))
        status, err = "completed", ""
    except agents.UsageLimit:
        store.set(jid, status="queued", error="")  # a fila pausa e o job recomeça
        raise
    except Exception as e:  # noqa: BLE001 — qualquer falha vira job failed, visível no painel
        status, err = "failed", str(e)[:500]
    finally:
        if own:
            c.close()
    store.set(jid, status=status, stage="analise", error=err)
    return status
