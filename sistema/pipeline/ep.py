"""Etapa de cada vídeo e próximo passo.

Uso: python sistema/pipeline/ep.py                  todos os canais
     python sistema/pipeline/ep.py canais/<canal>    um canal
     python sistema/pipeline/ep.py <pasta do vídeo>  detalhe e próximo comando
"""
import re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
P = "python sistema/pipeline/"
ETAPAS = [
    ("roteiro", "narracao.txt", [], "escrever narracao.txt (skill video-longo / video-vertical / video-3d)"),
    ("voz", "audio/narracao.wav", ["narracao.txt"], P + "narrar.py {v}"),
    ("palavras", "audio/palavras.json", ["audio/narracao.wav"], P + "palavras.py {v}"),
    ("storyboard", "storyboard.md", [], "storyboard.md a partir de audio/palavras.json"),
    ("edl", "midia/edl.csv", [], "midia/edl.csv (+ cor.txt, sfx.csv) · checar: " + P + "montar.py {v} --checar"),
    ("legenda", "midia/legendas.ass", ["audio/palavras.json", "narracao.txt"], P + "legendar.py {v}"),
    ("final", "midia/final.mp4", ["midia/edl.csv", "midia/legendas.ass", "midia/sfx.csv", "midia/cor.txt", "audio/narracao.wav"], P + "montar.py {v}"),
    ("publicação", "midia/publicacao.md", ["midia/final.mp4"], "skill publicacao"),
]


def estado(v):
    out = []
    for nome, arq, deps, cmd in ETAPAS:
        a = v / arq
        if not a.exists():
            out.append((nome, "falta", cmd)); continue
        velhos = [d for d in deps if (v / d).exists() and (v / d).stat().st_mtime > a.stat().st_mtime + 1]
        out.append((nome, "velho:" + ",".join(Path(d).name for d in velhos) if velhos else "ok", cmd))
    pub = v / "midia/publicacao.md"
    m = re.search(r"Postado: (\S+)(?: \((\w+)\))?", pub.read_text(encoding="utf8")) if pub.exists() else None
    out.append(("postado", f"ok {m.group(1)} {m.group(2) or ''}".strip() if m else "falta",
                P + "postar.py {v} --quando=AAAA-MM-DDTHH:MM"))
    return out


def videos(c):
    return sorted(p for s in ("videos", "shorts") for p in (c / s).glob("[0-9]*") if p.is_dir())


def resumo(v):
    e = estado(v)
    if not (v / "narracao.txt").exists() and any(v.glob("0*_*")):
        return "legado"
    if e[-1][1].startswith("ok"):
        return "postado"
    prox = next(((n, s) for n, s, _ in e if s != "ok" and not s.startswith("ok ")), None)
    return "postado" if prox is None else "pronto, falta postar" if prox[0] == "postado" else f"{prox[0]} ({prox[1]})"


def detalhe(v):
    rel = v.resolve().relative_to(RAIZ).as_posix()
    print(rel)
    e = estado(v)
    for n, s, _ in e:
        print(f"  {'✓' if s.startswith('ok') else '·' if s == 'falta' else '!'} {n:<11} {s}")
    prox = next(((n, s, c) for n, s, c in e if not s.startswith("ok")), None)
    if prox:
        print("próximo:", prox[2].format(v=rel))


def main(alvo=None):
    if alvo and (Path(alvo) / "narracao.txt").exists() or alvo and Path(alvo).parent.name in ("videos", "shorts"):
        return detalhe(Path(alvo))
    canais = [Path(alvo)] if alvo else sorted(p for p in (RAIZ / "canais").iterdir() if p.is_dir() and not p.name.startswith("_"))
    for c in canais:
        print(c.name)
        for v in videos(c):
            print(f"  {v.parent.name[0]} {v.name[:40]:<40} {resumo(v)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1] if len(sys.argv) > 1 else None)
