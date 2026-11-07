"""Efeitos do Mixkit sob demanda. Índice local (sons/indice.tsv), WAV só quando usado.
  python sistema/pipeline/sons.py indexar            recria o índice (~300 categorias)
  python sistema/pipeline/sons.py buscar casa porta  busca em inglês no nome/categoria
  python sistema/pipeline/sons.py pegar 1485         baixa e converte (mono 48 kHz, pico 0,9)
"""
import json, os, re, subprocess, sys, time, urllib.error, urllib.request, wave
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(AQUI, "..", "sons")
INDICE = os.path.join(PASTA, "indice.tsv")
ALIAS = os.path.join(PASTA, "alias.tsv")
SITE = "https://mixkit.co"
CARD = re.compile(r'data-audio-player-preview-url-value="[^"]*/sfx/(\d+)/.*?item-grid-card__title">\s*([^<]+?)\s*</h2>(.*?)(?=data-audio-player-preview-url-value=|\Z)', re.S)
CAT = re.compile(r'href="/free-sound-effects/([a-z0-9-]+)/"')


def web(url):
    r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for espera in (30, 90, 240, 0):
        try:
            return urllib.request.urlopen(r, timeout=30).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 403) or not espera:
                raise
            print("bloqueado, aguardando", espera, "s", flush=True)
            time.sleep(espera)


def indexar():
    home = web(SITE + "/free-sound-effects/").decode()
    cats = sorted(set(CAT.findall(home)))
    parcial = os.path.join(PASTA, ".parcial.json")
    os.makedirs(PASTA, exist_ok=True)
    est = json.load(open(parcial)) if os.path.exists(parcial) else {"feitas": [], "sons": {}}
    sons = {i: [n, set(c)] for i, (n, c) in est["sons"].items()}
    for c in cats:
        if c in est["feitas"]:
            continue
        for p in range(1, 40):
            try:
                h = web(f"{SITE}/free-sound-effects/{c}/" + (f"?page={p}" if p > 1 else "")).decode()
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    break
                raise
            time.sleep(1.5)
            novos = 0
            for i, nome, resto in CARD.findall(h):
                if i not in sons:
                    sons[i] = [nome, set()]
                    novos += 1
                resto = re.split(r"item-grid__item|<footer|</main", resto)[0]
                sons[i][1].update(CAT.findall(resto))
                sons[i][1].add(c)
            if not novos:
                break
        est["feitas"].append(c)
        est["sons"] = {i: [n, sorted(k)] for i, (n, k) in sons.items()}
        json.dump(est, open(parcial, "w", encoding="utf8"))
        print(c, len(sons), flush=True)
    with open(INDICE, "w", encoding="utf8") as f:
        for i in sorted(sons, key=int):
            f.write(f"{i}\t{sons[i][0]}\t{' '.join(sorted(sons[i][1]))}\n")


def linhas():
    return [l.rstrip("\n").split("\t") for l in open(INDICE, encoding="utf8")]


def buscar(termos, n=30):
    t = [x.lower() for x in termos]
    for i, nome, cats in linhas():
        if all(x in (nome + " " + cats).lower() for x in t):
            print(f"{i}\t{nome}\t{cats}")
            n -= 1
            if not n:
                break


def alias():
    if not os.path.exists(ALIAS):
        return {}
    return dict(l.split()[:2] for l in open(ALIAS, encoding="utf8") if l.strip() and not l.startswith("#"))


def obter(som):
    i = alias().get(som, som)
    wav = os.path.join(PASTA, f"{i}.wav")
    if os.path.exists(wav):
        return wav
    if not i.isdigit():
        sys.exit(f"som desconhecido: {som} (sons.py buscar <termo>)")
    mp3 = os.path.join(PASTA, f"{i}.mp3")
    with open(mp3, "wb") as f:
        f.write(web(f"https://assets.mixkit.co/active_storage/sfx/{i}/{i}-preview.mp3"))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w:
        y = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float)
    y *= .9 * 32767 / max(abs(y).max(), 1)
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)
        w.writeframes(y.astype("<i2").tobytes())
    return wav


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["indexar"]:
        indexar()
    elif a[:1] == ["buscar"]:
        buscar(a[1:])
    elif a[:1] == ["pegar"]:
        for s in a[1:]:
            print(obter(s))
    else:
        print(__doc__)
