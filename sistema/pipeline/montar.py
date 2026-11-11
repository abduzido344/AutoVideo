"""Edição final em ffmpeg a partir de midia/edl.csv.

Uso: python sistema/pipeline/montar.py <pasta> [ini-fim] [--acabamento] [--checar] [--vertical]
--checar só valida a EDL. Segmentos ficam em cache: só refaz o que mudou.
Opcional em midia/: cor.txt, sfx.csv, legendas.ass, trilha.(mp3|wav|m4a) (fica sob a voz, com ducking).
Se todas as fontes são vídeo com o mesmo fps, mantém esse fps (senão 24). sfx.csv: tempo,som,vol[,fim] (fim corta com fade); som = id, apelido ou caminho de .wav em midia/.
Vídeo sempre yuv420p, faixa TV, H.264 nível 4.1 e fps fixo (confere no fim e falha se sair diferente).
Áudio final normalizado a -14 LUFS. Shorts (pasta shorts/) saem em 1080x1920.
"""
import csv, glob, json, os, shutil, subprocess, sys, tempfile, wave
import numpy as np
import sons
from comum import h, tema, vertical

FPS = 24
PADRAO = "scale=out_range=tv,format=yuv420p"
H264 = ["-c:v", "libx264", "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p", "-color_range", "tv", "-bsf:v", "h264_metadata=video_full_range_flag=0"]
W, H = 1920, 1080
IMAGEM = (".png", ".jpg", ".jpeg", ".webp")
TRANS = {"", "corte", "whip", "flash", "fim"}
COR = {
    "fria": "colorbalance=rs=-.2:gs=-.04:bs=.22:rm=-.15:bm=.18:rh=-.08:bh=.1,eq=saturation=.85",
    "neutra": "null",
    "quente": "colorbalance=rs=.12:gs=.02:bs=-.14:rm=.1:bm=-.12:rh=.06:bh=-.08,eq=saturation=1.1",
}


def duracao(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout
    return float(r) if r.strip() else 0.0


def fps_de(f):
    if f.lower().endswith(IMAGEM):
        return None
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip().strip(",")
    a, _, b = r.partition("/")
    return round(int(a) / int(b or 1)) if a.isdigit() else None


def validar(v, linhas):
    erros, durs = [], {}
    for i, k in enumerate(linhas, 2):
        try:
            a = float(k["inicio"])
            if i > 2 and a <= float(linhas[i - 3]["inicio"]):
                erros.append(f"linha {i}: inicio {a} não é maior que o anterior")
        except ValueError:
            erros.append(f"linha {i}: inicio inválido '{k['inicio']}'")
        f = os.path.join(v, "midia", k["fonte"])
        if not os.path.exists(f):
            erros.append(f"linha {i}: fonte não existe: {k['fonte']}"); continue
        if k["trans"] not in TRANS:
            erros.append(f"linha {i}: trans '{k['trans']}' (use corte|whip|flash|fim)")
        if k["zoom"]:
            try:
                zz, *c = k["zoom"].split("@")
                list(map(float, zz.split(">")))
                if c:
                    list(map(float, c[0].split(";")))
            except ValueError:
                erros.append(f"linha {i}: zoom '{k['zoom']}' (formato 1>1.08@0.5;0.3)")
        if not f.lower().endswith(IMAGEM) and k["de"]:
            d = durs.setdefault(f, duracao(f))
            if float(k["de"]) >= d:
                erros.append(f"linha {i}: de={k['de']} além da duração de {k['fonte']} ({d:.2f}s)")
    if not os.path.exists(os.path.join(v, "audio", "narracao.wav")):
        erros.append("falta audio/narracao.wav")
    return erros


def seg(v, k, a, b, prox, ant, out, cor):
    n = round(b * FPS) - round(a * FPS)
    fonte = os.path.join(v, "midia", k["fonte"])
    de, ate = float(k["de"] or 0), float(k["ate"] or 0)
    imagem = fonte.lower().endswith(IMAGEM)
    z0, z1, cx, cy = 1, 1, .5, .5
    if k["zoom"]:
        zz, *c = k["zoom"].split("@")
        z0, z1 = map(float, zz.split(">"))
        if c:
            cx, cy = map(float, c[0].split(";"))
    cobrir = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1"
    f = []
    if imagem:
        entrada = ["-loop", "1", "-framerate", str(FPS), "-i", fonte]
        f.append(cobrir)
    else:
        entrada = ["-ss", str(de), "-i", fonte]
        f.append(f"fps={FPS},{cobrir}")
        total = duracao(fonte)
        n1 = min(round(((ate if ate > de else de + n / FPS) - de) * FPS), int((total - de) * FPS) - 1)
        f.append(f"trim=end_frame={n1},setpts=PTS-STARTPTS,loop=loop={max(n - n1, 0)}:size=1:start={n1 - 1},setpts=N/{FPS}/TB")
    if z0 != 1 or z1 != 1:
        z = f"({z0}+({z1}-{z0})*on/{max(n - 1, 1)})"
        f.append(f"scale={W * 2}:{H * 2},zoompan=z='{z}':x='(iw-iw/zoom)*{cx}':y='(ih-ih/zoom)*{cy}':d=1:s={W}x{H}:fps={FPS}")
    f.append(f"trim=end_frame={n},setpts=PTS-STARTPTS")
    f.append(COR[cor])
    f.append(PADRAO)
    d = n / FPS
    if prox == "whip":
        f.append(f"avgblur=sizeX=48:sizeY=1:enable='gte(t,{d - .17:.3f})'")
    if ant == "whip":
        f.append("avgblur=sizeX=48:sizeY=1:enable='lte(t,.17)'")
    if prox == "flash":
        f.append(f"fade=out:st={d - 0.2:.3f}:d=0.2:color=white")
    if ant == "flash":
        f.append("fade=in:st=0:d=0.45:color=white")
    tmp = out + ".tmp.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *entrada, "-vf", ",".join(f), "-frames:v", str(n), "-an",
                    *H264, "-preset", "fast", "-crf", "17", "-r", str(FPS), tmp], check=True)
    os.replace(tmp, out)


def main(v, so=None, acabamento=False, checar=False):
    v = os.path.abspath(v)
    linhas = list(csv.DictReader(open(os.path.join(v, "midia", "edl.csv"), encoding="utf8")))
    erros = validar(v, linhas)
    if erros:
        sys.exit("EDL com problemas:\n  " + "\n  ".join(erros))
    global FPS
    taxas = {fps_de(os.path.join(v, "midia", k["fonte"])) for k in linhas}
    if len(taxas) == 1 and None not in taxas:
        FPS = taxas.pop()
    if checar:
        print(f"EDL ok: {len(linhas)} linhas, {FPS} fps"); return
    cortes = [tuple(map(float, c.split(">"))) for c in open(os.path.join(v, "midia", "cor.txt")).read().split()] if os.path.exists(os.path.join(v, "midia", "cor.txt")) else []
    tmp = os.path.join(tempfile.gettempdir(), "montagem_" + os.path.basename(os.path.normpath(v)))
    cache = os.path.join(tmp, "cache")
    corte = os.path.join(tmp, "corte.mp4")
    if not acabamento:
        os.makedirs(cache, exist_ok=True)
        partes, novos = [], 0
        for i, k in enumerate(linhas):
            a, b = float(k["inicio"]), float(linhas[i + 1]["inicio"]) if i + 1 < len(linhas) else float(k["fim"])
            cor = "neutra" if not cortes else "fria" if a < cortes[0][0] else "neutra" if a < cortes[0][1] else "quente"
            if so and not (so[0] <= a < so[1]):
                continue
            ant = linhas[i - 1]["trans"] if i else ""
            fonte = os.path.join(v, "midia", k["fonte"])
            out = os.path.join(cache, h(sorted(k.items()), a, b, ant, cor, W, H, FPS, PADRAO, os.path.getmtime(fonte), os.path.getsize(fonte)) + ".mp4")
            if not os.path.exists(out):
                seg(v, k, a, b, k["trans"], ant, out, cor); novos += 1
                print(i + 1, k["fonte"], f"{a:.2f}-{b:.2f}", flush=True)
            partes.append(out)
        print(f"{novos} segmentos novos, {len(partes) - novos} do cache")
        lista = os.path.join(tmp, "lista.txt")
        open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", corte], check=True)
        open(os.path.join(tmp, "inicio.txt"), "w").write(str(next(float(k["inicio"]) for k in linhas if not so or so[0] <= float(k["inicio"]))))
    t0 = float(open(os.path.join(tmp, "inicio.txt")).read())
    dur = duracao(corte)
    entradas = ["-i", corte, "-ss", str(t0), "-t", f"{dur:.3f}", "-i", os.path.join(v, "audio", "narracao.wav")]
    filtro, mix = ["[1:a]aresample=48000,asplit=2[n][k]"], ["[n]"]
    if os.path.exists(os.path.join(v, "midia", "sfx.csv")):
        sfx = os.path.join(tmp, "sfx.wav")
        efeitos(v, sfx, t0, dur)
        entradas += ["-i", sfx]
        mix.append(f"[{entradas.count('-i') - 1}:a]")
    trilha = next(iter(sorted(glob.glob(os.path.join(v, "midia", "trilha.*")))), None)
    if trilha:
        entradas += ["-stream_loop", "-1", "-ss", str(t0), "-t", f"{dur:.3f}", "-i", trilha]
        db = tema(v).get("trilha_db", -22)
        filtro.append(f"[{entradas.count('-i') - 1}:a]aresample=48000,volume={db}dB[m];[m][k]sidechaincompress=threshold=0.02:ratio={tema(v).get('trilha_ratio', 6)}:attack=30:release=500[md]")
        mix.append("[md]")
    else:
        filtro.append("[k]anullsink")
    filtro.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    ass = os.path.join(v, "midia", "legendas.ass")
    if os.path.exists(ass):
        shutil.copy(ass, os.path.join(tmp, "legendas.ass"))
        filtro.append(f"[0:v]setpts=PTS+{t0}/TB,subtitles=legendas.ass,setpts=PTS-{t0}/TB,{PADRAO}[v]")
    else:
        filtro.append(f"[0:v]{PADRAO}[v]")
    saida = os.path.join(v, "midia", "trecho.mp4" if so else "final.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *entradas, "-filter_complex", ";".join(filtro), "-map", "[v]", "-map", "[a]",
                    *H264, "-preset", "medium", "-crf", "18", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", saida], check=True, cwd=tmp)
    conferir(saida)
    print(saida)


def conferir(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=pix_fmt,level,r_frame_rate,color_range", "-of", "json", f], capture_output=True, text=True).stdout
    k = json.loads(r)["streams"][0]
    erros = [x for x, ok in (("pix_fmt " + k["pix_fmt"], k["pix_fmt"] == "yuv420p"), ("nível " + str(k["level"]), k["level"] <= 42),
                             ("fps " + k["r_frame_rate"], k["r_frame_rate"] == f"{FPS}/1"), ("faixa " + k.get("color_range", "?"), k.get("color_range") == "tv")) if not ok]
    if erros:
        sys.exit(f"{f} fora do padrão de player: " + ", ".join(erros))


def efeitos(v, saida, t0, dur, sr=48000, base=-14):
    mix = np.zeros(int(dur * sr) + sr)
    for k in csv.DictReader(open(os.path.join(v, "midia", "sfx.csv"), encoding="utf8")):
        arq = os.path.join(v, "midia", k["som"])
        with wave.open(arq if os.path.isfile(arq) else sons.obter(k["som"])) as w:
            y = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32767
            if w.getnchannels() == 2:
                y = y.reshape(-1, 2).mean(1)
            if w.getframerate() != sr:
                y = np.interp(np.arange(int(len(y) * sr / w.getframerate())) * w.getframerate() / sr, np.arange(len(y)), y)
        i = int((float(k["tempo"]) - t0) * sr)
        if k.get("fim"):
            y = y[:max(int((float(k["fim"]) - float(k["tempo"])) * sr), 1)].copy()
            q = min(len(y), int(.15 * sr))
            y[len(y) - q:] *= np.linspace(1, 0, q)
        if 0 <= i < len(mix):
            y = y[:len(mix) - i] * 10 ** ((base + float(k["vol"] or 0)) / 20)
            mix[i:i + len(y)] += y
    with wave.open(saida, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    flags = ("--acabamento", "--vertical", "--checar")
    args = [a for a in sys.argv[2:] if a not in flags]
    if vertical(sys.argv[1], sys.argv):
        W, H = 1080, 1920
    main(sys.argv[1], tuple(map(float, args[0].split("-"))) if args else None, "--acabamento" in sys.argv, "--checar" in sys.argv)
