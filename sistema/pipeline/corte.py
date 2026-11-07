"""Short a partir de um trecho de um vídeo longo, reaproveitando áudio, cenas e sons.

Uso: python sistema/pipeline/corte.py <pasta do longo> <p_ini>-<p_fim> <nome>
Parágrafos de audio/tempos.csv. Cria canais/<canal>/shorts/NNN_<nome>/ com narracao.txt, audio/, midia/edl.csv,
sfx.csv e numeros.txt; as cenas apontam para a midia/ do longo. Depois: legendar.py e montar.py (saem 9:16).
"""
import csv, json, os, shutil, subprocess, sys
from pathlib import Path


def main(longo, faixa, nome):
    lv = Path(longo).resolve()
    p0, p1 = map(int, faixa.split("-"))
    tempos = list(csv.DictReader(open(lv / "audio/tempos.csv", encoding="utf8")))
    sel = [t for t in tempos if p0 <= int(t["paragrafo"]) <= p1]
    a, b = float(sel[0]["inicio"]), float(sel[-1]["fim"]) + 0.3
    pasta = lv.parents[1] / "shorts"
    pasta.mkdir(exist_ok=True)
    n = max([int(p.name[:3]) for p in pasta.glob("[0-9][0-9][0-9]_*")] or [0]) + 1
    sv = pasta / f"{n:03d}_{nome}"
    (sv / "audio").mkdir(parents=True); (sv / "midia").mkdir()
    paras = [p for p in (lv / "narracao.txt").read_text(encoding="utf8").split("\n\n") if p.strip()]
    (sv / "narracao.txt").write_text("\n\n".join(paras[p0 - 1:p1]) + "\n", encoding="utf8")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(lv / "audio/narracao.wav"),
                    "-c:a", "pcm_s16le", str(sv / "audio/narracao.wav")], check=True)
    with open(sv / "audio/tempos.csv", "w", newline="", encoding="utf8") as f:
        w = csv.writer(f); w.writerow(["paragrafo", "inicio", "fim", "texto"])
        for i, t in enumerate(sel, 1):
            w.writerow([i, f"{float(t['inicio']) - a:.2f}", f"{float(t['fim']) - a:.2f}", t["texto"]])
    ws = json.load(open(lv / "audio/palavras.json", encoding="utf8"))
    json.dump([[p, round(t - a, 2)] for p, t in ws if a - 0.05 <= t < b], open(sv / "audio/palavras.json", "w", encoding="utf8"), ensure_ascii=False)
    rel = os.path.relpath(lv / "midia", sv / "midia").replace("\\", "/")
    edl = list(csv.DictReader(open(lv / "midia/edl.csv", encoding="utf8")))
    out = []
    for i, k in enumerate(edl):
        ki = float(k["inicio"]); kf = float(edl[i + 1]["inicio"]) if i + 1 < len(edl) else float(k["fim"])
        if kf <= a or ki >= b:
            continue
        k = dict(k)
        if ki < a and k["de"] and not k["fonte"].lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            k["de"] = f"{float(k['de']) + a - ki:.2f}"
        k["inicio"], k["fim"] = f"{max(ki, a) - a:.2f}", f"{min(kf, b) - a:.2f}"
        k["fonte"] = f"{rel}/{k['fonte']}"
        out.append(k)
    out[-1]["trans"] = "fim"
    with open(sv / "midia/edl.csv", "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=edl[0].keys()); w.writeheader(); w.writerows(out)
    if (lv / "midia/sfx.csv").exists():
        sfx = list(csv.DictReader(open(lv / "midia/sfx.csv", encoding="utf8")))
        with open(sv / "midia/sfx.csv", "w", newline="", encoding="utf8") as f:
            w = csv.DictWriter(f, fieldnames=sfx[0].keys()); w.writeheader()
            w.writerows({**s, "tempo": f"{float(s['tempo']) - a:.2f}"} for s in sfx if a <= float(s["tempo"]) < b)
    if (lv / "midia/numeros.txt").exists():
        shutil.copy(lv / "midia/numeros.txt", sv / "midia/numeros.txt")
    raiz = Path(__file__).resolve().parents[2]
    r = sv.relative_to(raiz).as_posix()
    print(f"{r}: {b - a:.1f}s, {len(out)} cenas")
    if b - a > 90:
        print("aviso: passou de 90 s")
    print(f"próximo: python sistema/pipeline/legendar.py {r} 3 && python sistema/pipeline/montar.py {r}")
    print("conferir a folha de contato: motion 16:9 com texto pode cortar nas bordas em 9:16")


if __name__ == "__main__":
    main(*sys.argv[1:4])
