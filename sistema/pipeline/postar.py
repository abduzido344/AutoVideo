"""Sobe o vídeo no YouTube a partir de midia/publicacao.md.

Uso: python sistema/pipeline/postar.py <pasta> [--teste] [--thumb=thumbs/x.png] [--quando=2026-11-12T18:00] [--publico] [--de-novo]
Sem --quando sobe privado; --quando agenda (horário de Brasília); --publico publica na hora.
Recusa se publicacao.md já tem "Postado:" (use --de-novo para forçar).
"""
import re, subprocess, sys, tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

CRED = Path.home() / ".auto_video"
ESCOPOS = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"]


def ler(v):
    s = (v / "midia" / "publicacao.md").read_text(encoding="utf8")
    a = re.search(r"^\| A \| `([^`]+)`[^|]*\| (.+?) \|$", s, re.M)
    sec = lambda n: (re.search(rf"^#{{1,3}} {n}[^\n]*\n(.*?)(?=^#{{1,3}} \S|\Z)", s, re.M | re.S) or sys.exit(f"publicacao.md sem seção '{n}'")).group(1).strip()
    desc = sec("Descrição").replace("<", "").replace(">", "")
    tags = [t.strip() for t in next(l for l in sec("Tags").splitlines() if l.strip() and not l.startswith(">")).split(",")]
    titulo = (a.group(2) if a else next(l for l in sec("Título").splitlines() if l.strip())).strip().strip("*")[:100]
    boas = [p for p in sorted((v / "midia/thumbs").glob("*.png")) if not re.search(r"-(base|preview|sombra)$", p.stem)]
    escolha = next((a_[8:] for a_ in sys.argv if a_.startswith("--thumb=")), None)
    thumb = v / "midia" / escolha if escolha else v / "midia" / a.group(1) if a else next(iter(boas), None)
    return {"titulo": titulo, "thumb": thumb if thumb and thumb.exists() else None, "desc": desc[:5000], "tags": tags, "postado": "Postado:" in s}


def servico():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    tok = CRED / "token.json"
    c = Credentials.from_authorized_user_file(str(tok), ESCOPOS) if tok.exists() else None
    if not c or not c.valid:
        if c and c.expired and c.refresh_token:
            c.refresh(Request())
        else:
            c = InstalledAppFlow.from_client_secrets_file(str(CRED / "client_secret.json"), ESCOPOS).run_local_server(port=0)
        tok.write_text(c.to_json())
    return build("youtube", "v3", credentials=c)


def status(quando, publico):
    if quando:
        t = datetime.fromisoformat(quando).replace(tzinfo=timezone(timedelta(hours=-3)))
        if t < datetime.now(timezone.utc) + timedelta(minutes=15):
            sys.exit("--quando precisa ser pelo menos 15 min no futuro")
        return {"privacyStatus": "private", "publishAt": t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    return {"privacyStatus": "public" if publico else "private"}


def main(v, teste=False, quando=None, publico=False, de_novo=False):
    v = Path(v).resolve()
    m = ler(v)
    if m["postado"] and not de_novo:
        sys.exit("já postado (linha 'Postado:' em publicacao.md); use --de-novo para subir outra vez")
    st_ = status(quando, publico)
    print("Título:", m["titulo"]); print("Thumb:", m["thumb"].name if m["thumb"] else "nenhuma"); print("Tags:", len(", ".join(m["tags"])), "caracteres")
    print("Status:", st_.get("publishAt", st_["privacyStatus"]))
    print(m["desc"][:300], "…")
    if teste:
        return
    from googleapiclient.http import MediaFileUpload
    yt = servico()
    corpo = {"snippet": {"title": m["titulo"], "description": m["desc"], "tags": m["tags"], "categoryId": "27", "defaultLanguage": "pt-BR", "defaultAudioLanguage": "pt-BR"},
             "status": {**st_, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": False}}
    req = yt.videos().insert(part="snippet,status", body=corpo, media_body=MediaFileUpload(str(v / "midia" / "final.mp4"), chunksize=8 << 20, resumable=True))
    r = None
    while r is None:
        st, r = req.next_chunk()
        if st:
            print(f"enviando {st.progress() * 100:.0f}%", flush=True)
    vid = r["id"]
    rotulo = st_.get("publishAt", r["status"]["privacyStatus"])
    with open(v / "midia" / "publicacao.md", "a", encoding="utf8") as f:
        f.write(f"\nPostado: https://youtu.be/{vid} ({rotulo}) em {datetime.now():%Y-%m-%d %H:%M}\n")
    print("vídeo:", f"https://youtu.be/{vid}", "·", rotulo)
    if m["thumb"]:
        jpg = Path(tempfile.gettempdir()) / f"thumb_{vid}.jpg"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(m["thumb"]), "-vf", "scale=1280:720", "-q:v", "3", str(jpg)], check=True)
        try:
            yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(jpg))).execute(); print("thumbnail ok")
        except Exception as e:
            print("thumbnail falhou (canal precisa de verificação por telefone?):", e)
    srt = v / "midia" / "legendas.srt"
    if srt.exists():
        yt.captions().insert(part="snippet", body={"snippet": {"videoId": vid, "language": "pt-BR", "name": "Português"}}, media_body=MediaFileUpload(str(srt))).execute(); print("legendas ok")


if __name__ == "__main__":
    q = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--quando=")), None)
    main(sys.argv[1], "--teste" in sys.argv, q, "--publico" in sys.argv, "--de-novo" in sys.argv)
