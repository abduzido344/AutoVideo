import hashlib, json, os, re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def carregar_env(arq=RAIZ / ".env"):
    """Lê .env da raiz (CHAVE=valor) para os.environ, sem sobrescrever o que já está no ambiente."""
    if arq.exists():
        for linha in arq.read_text(encoding="utf8").splitlines():
            k, _, v = linha.partition("=")
            if k.strip() and not k.lstrip().startswith("#") and v.strip():
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


carregar_env()

TEMA = {"fonte": "Segoe UI", "cor": "#FFFFFF", "destaque": "#F2D15A", "borda": "#141414",
        "thumb_fonte": "C:/Windows/Fonts/seguibl.ttf", "thumb_fonte2": "C:/Windows/Fonts/segoeuib.ttf",
        "thumb_cores": {"tinta": "#1b1b1b", "turq": "#4fa383", "verm": "#d9654b", "branco": "#fbfaf7", "creme": "#fbf3e0", "fundo": "#f7efd9"}}


def vertical(v, argv=()):
    return "--vertical" in argv or "shorts" in Path(v).resolve().parts


def canal(v):
    p = Path(v).resolve()
    return next((q for q in [p, *p.parents] if q.parent.name == "canais"), p)


def tema(v):
    t = dict(TEMA)
    arq = canal(v) / "tema.json"
    if arq.exists():
        t.update(json.loads(arq.read_text(encoding="utf8")))
    return t


def ass_cor(h):
    h = h.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def h(*partes):
    s = hashlib.sha1()
    for p in partes:
        s.update(p if isinstance(p, bytes) else str(p).encode())
    return s.hexdigest()[:16]


class Cache:
    def __init__(self, pasta):
        self.arq = Path(pasta) / ".hashes.json"
        self.d = json.loads(self.arq.read_text()) if self.arq.exists() else {}

    def novo(self, nome, chave, existe):
        return not existe or self.d.get(nome) not in (None, chave)

    def marca(self, nome, chave):
        self.d[nome] = chave
        self.arq.write_text(json.dumps(self.d, indent=0))


def pedidos(arq, bloco=None):
    s = Path(arq).read_text(encoding="utf8")
    if bloco:
        m = re.search(rf"```{bloco}\n(.*?)```", s, re.S)
        if not m:
            raise SystemExit(f"bloco ```{bloco} não encontrado em {arq}")
        s = m.group(1)
    return [(n.strip(), p.strip()) for n, p in re.findall(r"^\s*([A-Za-z][\w-]*)\s*:\s*(.+)$", s, re.M)]
