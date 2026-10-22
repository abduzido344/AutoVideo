"""Estilo a partir de um perfil do Instagram: Apify → vídeos → transcrição + folha de frames → Analista."""
import ipaddress
from contextlib import closing
import math
import re
import shutil
import socket
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import httpx
from autovideo import agents, config, data, media, transcribe
from autovideo.data import Estilo
from autovideo.eleven import MissingKey
from autovideo.hf import run
from autovideo.project import home

APIFY = "https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items"
MAX_BYTES = 100 * 1024 * 1024  # ponytail: teto fixo por vídeo (URL vem de terceiro); configurável se reels longos estourarem
MAX_VIDEOS = 3
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
    base = data.slugify(h)
    for i in range(1, 1000):  # a_b e a.b dão o mesmo slug: handle diferente no mesmo dir ganha sufixo
        d = home() / "estilos" / (base if i == 1 else f"{base}-{i}") / ".analise"
        if not (d / "perfil.txt").exists() or (d / "perfil.txt").read_text(encoding="utf-8") == h:
            break
    d.mkdir(parents=True, exist_ok=True)
    (d / "perfil.txt").write_text(h, encoding="utf-8")
    return store.create(str(d), "estilo", False)


def _ips(host: str) -> list[str]:
    return [i[4][0] for i in socket.getaddrinfo(host, None)]


def _publica(url: str) -> None:
    """SSRF: a URL vem de terceiro (Apify); só http(s) para host público."""
    u = urlsplit(url)
    if u.scheme not in ("http", "https") or not u.hostname:
        raise RuntimeError("URL de vídeo recusada: esquema inválido")
    try:
        ips = _ips(u.hostname)
    except OSError as e:
        raise RuntimeError("URL de vídeo recusada: host não resolve") from e
    for ip in ips:
        a = ipaddress.ip_address(ip.split("%")[0])
        if a.is_loopback or a.is_private or a.is_link_local or a.is_reserved or a.is_multicast or a.is_unspecified:
            raise RuntimeError("URL de vídeo recusada: endereço local ou privado")


def _abrir(client: httpx.Client, url: str) -> httpx.Response:
    # redirects manuais (máx. 3): cada salto é revalidado
    # ponytail: DNS rebinding entre a checagem e a conexão não é coberto; fixar o IP se o risco importar
    for _ in range(4):
        _publica(url)
        resp = client.send(client.build_request("GET", url), stream=True)
        if not resp.is_redirect:
            return resp
        url = urljoin(url, resp.headers.get("location", ""))
        resp.close()
    raise RuntimeError("redirecionamentos demais no download do vídeo")


def _baixar(h: str, work: Path, client: httpx.Client) -> list[Path]:
    token = config.get_key("APIFY_TOKEN")
    if not token:
        raise MissingKey("falta APIFY_TOKEN (defina a variável ou salve em Configurações)")
    r = client.post(APIFY, json={"username": [h], "resultsLimit": 3}, headers={"Authorization": f"Bearer {token}"})
    if not r.is_success:
        raise RuntimeError(f"Apify {r.status_code}: {r.text[:300]}")
    urls = [u for i in r.json() if isinstance(i, dict) and isinstance(u := i.get("videoUrl"), str)
            and urlsplit(u).scheme in ("http", "https")][:MAX_VIDEOS]
    if not urls:
        raise RuntimeError(f"o Apify não devolveu vídeos de @{h} (perfil privado ou sem reels?)")
    out = []
    for n, u in enumerate(urls, 1):
        v = work / f"v{n}" / "video.mp4"
        v.parent.mkdir(parents=True, exist_ok=True)
        part = v.with_name(v.name + ".part")
        try:
            with closing(_abrir(client, u)) as resp, part.open("wb") as f:
                if not resp.is_success:
                    raise RuntimeError(f"download do vídeo {n} falhou: {resp.status_code}")
                size = 0
                for chunk in resp.iter_bytes():
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise RuntimeError(f"vídeo {n} maior que {MAX_BYTES // 2**20} MB: abortado")
                    f.write(chunk)
        except BaseException:
            part.unlink(missing_ok=True)
            raise
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


def _valida(json_path: Path) -> None:
    """estilo.json no schema e estilo.md com as 10 seções; falha aqui ganha a nova tentativa do run_role."""
    agents.validate_model(Estilo)(json_path)
    md = json_path.parent / "estilo.md"
    if not md.exists():
        raise FileNotFoundError("o analista não gravou estilo.md")
    if falta := data.secoes_faltando(md.read_text(encoding="utf-8")):
        raise ValueError(f"estilo.md sem as seções: {', '.join(falta)}")


def run_job(store, jid: int, client: httpx.Client | None = None) -> str:
    job = store.get(jid)
    work = Path(job["project_dir"])
    est = work.parent
    own = client is None
    c = client or httpx.Client(timeout=300)
    try:
        h = (work / "perfil.txt").read_text(encoding="utf-8")
        for v in _baixar(h, work, c):
            words = transcribe.transcribe(v, v.parent.name, v.parent)
            (v.parent / "transcricao.txt").write_text(" ".join(w.text for w in words), encoding="utf-8")
            _folha(v)
        task = (f"Analise os vídeos do perfil @{h} em .analise/ (v1, v2, ...: folha.jpg e transcricao.txt) e grave "
                "estilo.md e estilo.json em .analise/saida/. Só o estilo; nunca copie personagem, mundo ou história.")
        saida = work / "saida"  # staging: o estilo existente só é trocado depois da validação
        shutil.rmtree(saida, ignore_errors=True)
        saida.mkdir()
        agents.run_role(agents.ROLES["analista"], est, task, saida / "estilo.json", validate=_valida)
        (saida / "estilo.md").replace(est / "estilo.md")
        (saida / "estilo.json").replace(est / "estilo.json")
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
