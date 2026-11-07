"""Fish Audio Drama 3 na Modal: GPU sob demanda para o narrar.py.

Não rode direto: o narrar.py abre este app (efêmero), chama um parágrafo por vez e desliga ao terminar.
O modelo carrega uma vez por container e serve todos os parágrafos do episódio.
O Fish corta o texto em pedaços de ~300 bytes e a [direção] do começo só entraria no primeiro: aqui ela é repetida em cada pedaço.
Licença: Fish Audio Community License (comercial grátis abaixo de US$ 500 mil/ano; exibir "Built with Fish Audio").
"""
from pathlib import Path
import modal

app = modal.App("manual-tts")

FISH_COMMIT = "541566932abbaebcb0a40e562a1f846738383f38"  # main fixado em 2026-10-29
img = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "portaudio19-dev", "libsox-dev", "ffmpeg")
    # venv separado: as dependências do Fish (protobuf) quebram o runtime da Modal se instaladas no Python do sistema
    .run_commands(
        f"git clone https://github.com/fishaudio/fish-speech.git /fish && cd /fish && git checkout {FISH_COMMIT}",
        "python -m venv /fish/.venv",
        "cd /fish && .venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cu128 -e '.[cu128]'",
    )
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "60"})
    # pesos baixam na montagem da imagem (só CPU): download travado não deixa GPU ligada à toa
    .run_commands("/fish/.venv/bin/hf download fishaudio/s2-pro --local-dir /modelos/s2-pro")  # codec, 11 GB
    .run_commands("/fish/.venv/bin/hf download fishaudio/drama-3 --local-dir /modelos/drama-3")  # 41 GB
)

# Roda no Python do venv do Fish: carrega o modelo uma vez e atende pedidos (JSON por linha no stdin).
# Responde no stdout só com linhas "PRONTO", "OK" ou "ERRO ..."; o log do Fish vai para o stderr.
TRABALHADOR = r'''
import json, sys, traceback
from pathlib import Path
import soundfile as sf, torch
sys.path.insert(0, "/fish")
from fish_speech.models.text2semantic.inference import (
    FishOmniModel, decode_to_audio, encode_audio, generate_long, init_model, load_codec_model)
from fish_speech.models.text2semantic import inference as inf
from fish_speech.models.text2semantic.fish_omni.chunking import split_by_length
import re

DIRECAO = re.compile(r"\s*(?:\[[^\]]*\]\s*)+")

def dividir(texto):
    m = DIRECAO.match(texto)
    direcao, corpo = (m.group(0).strip() + " ", texto[m.end():]) if m else ("", texto)
    pedacos = split_by_length(corpo, max(100, 300 - len(direcao.encode())))
    return [direcao + p for p in pedacos] or [texto]

inf.split_drama3_text = dividir

model, decode_one_token = init_model(Path("/modelos/drama-3"), "cuda", torch.bfloat16, compile=False)
if isinstance(model, FishOmniModel):
    dev, prec = str(model.device), model.dtype
else:
    dev, prec = "cuda", torch.bfloat16
    with torch.device("cuda"):
        model.setup_caches(max_batch_size=1, max_seq_len=model.config.max_seq_len, dtype=next(model.parameters()).dtype)
codec = load_codec_model(Path("/modelos/s2-pro/codec.pth"), dev, prec)
refs = {}
print("PRONTO", flush=True)

for linha in sys.stdin:
    try:
        p = json.loads(linha)
        if p["ref"] and p["ref"] not in refs:  # codifica cada voz de referência uma vez só
            refs[p["ref"]] = encode_audio(Path(p["ref"]), codec, dev).cpu()
        pt, pk = ([p["ref_texto"]], [refs[p["ref"]]]) if p["ref"] else (None, None)
        torch.manual_seed(p["seed"]); torch.cuda.manual_seed(p["seed"])
        codes = []
        for r in generate_long(model=model, device=dev, decode_one_token=decode_one_token, text=p["texto"],
                               prompt_text=pt, prompt_tokens=pk):
            if r.action == "sample":
                codes.append(r.codes)
            elif r.action == "next":
                break
        audio = decode_to_audio(torch.cat(codes, dim=1).to(dev), codec)
        sf.write(p["saida"], audio.cpu().float().numpy(), codec.sample_rate)
        print("OK", flush=True)
    except Exception:
        traceback.print_exc()
        print("ERRO " + traceback.format_exc().splitlines()[-1], flush=True)
'''


# H100: o Drama 3 usa 41,5 GB e pede no mínimo 48 GB. Sem @modal.enter: o modelo sobe na primeira
# chamada, então uma falha derruba só aquela chamada, em vez de a Modal reiniciar o container em loop.
@app.cls(image=img, gpu="H100", timeout=600, scaledown_window=120, max_containers=1)
class Narrador:
    @modal.method()
    def gerar(self, texto: str, ref: bytes, ref_texto: str, seed: int = 42) -> bytes:
        import hashlib, json, subprocess
        if not hasattr(self, "proc"):
            Path("/tmp/trabalhador.py").write_text(TRABALHADOR)
            self.proc = subprocess.Popen(["/fish/.venv/bin/python", "/tmp/trabalhador.py"], cwd="/fish",
                                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            self._resposta()  # espera o "PRONTO"
        ref_path = Path(f"/tmp/ref_{hashlib.sha1(ref).hexdigest()[:12]}.wav") if ref else ""
        if ref:
            ref_path.write_bytes(ref)
        saida = Path("/tmp/saida.wav")
        self.proc.stdin.write(json.dumps({"texto": texto, "ref": str(ref_path), "ref_texto": ref_texto,
                                          "seed": seed, "saida": str(saida)}) + "\n")
        self.proc.stdin.flush()
        self._resposta()
        return saida.read_bytes()

    def _resposta(self):
        for linha in self.proc.stdout:
            if linha.startswith(("PRONTO", "OK")):
                return
            if linha.startswith("ERRO"):
                raise RuntimeError(linha.strip())
        raise RuntimeError("o processo do Fish morreu")  # stdout fechou
