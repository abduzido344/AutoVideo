"""Anima um quadro inicial com MiniMax H3 FL2VA (ComfyUI + ClipProj 4B + Turbo LoRA) na Modal, RTX PRO 6000 sob demanda.

Uso: python sistema/pipeline/modal_h3.py lista.txt pasta_saida [--passos=6] [--ok]
lista.txt: "nome | imagem.png | segundos | prompt" por linha. Gera em 1344x768 e sai pasta_saida/nome.mp4 em 1920x1080,
24 fps, sem áudio, cortado na duração pedida. Pula o que já existe com o mesmo pedido. ~US$ 0,10–0,20 por clipe + subida.
Receita validada em sistema/testes/h3_modal/otimizado/teste_turbo.py.
"""
import math, sys, time
from pathlib import Path
import modal

COMFY = "0228a9d73cd7c2daf8f61fe13d56b12efe307171"
TURBO = "4274783a23afcfdbea3b4876cb79effd6c510785"
CLIPPROJ = "c01ba8fb8f41b4f2094dbd0b185cdc238fb6134c"
FILES = [
    ("Comfy-Org/MiniMax-H3", "54472221d27c695fca9621b0c3ed52f06c4af707", "diffusion_models/minimax_h3_fl2va_bf16.safetensors"),
    ("Comfy-Org/MiniMax-H3", "54472221d27c695fca9621b0c3ed52f06c4af707", "vae/minimax_h3_video_vae_fp16.safetensors"),
    ("Comfy-Org/MiniMax-H3", "54472221d27c695fca9621b0c3ed52f06c4af707", "vae/minimax_h3_audio_vae_fp32.safetensors"),
    ("Comfy-Org/Krea-2", "588feaf955b08b9ac4723eeb751752ab045dba71", "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"),
    ("NicoLab28/ClipProj-MiniMax-H3", "2ebdbcdc27a29a9607efdb221a9afcb9a0cdd808", "mmh3-4b-ClipProj-v3.1.safetensors"),
    ("larryvrh/MiniMax-H3-Turbo-Lora", "43a74557ac3f6539db8e0f2a959d03feb7a81480", "minimax_h3_turbo_v4_step600_ema.safetensors"),
]
RATE = 0.000842 + 8 * 0.0000131 + 192 * 0.00000222
LARG, ALT = 1344, 768
app = modal.App("estudio-h3")


def baixar():
    from huggingface_hub import hf_hub_download
    import shutil

    for repo, revision, filename in FILES:
        subfolder = filename.split("/")[0] if "/" in filename else (
            "clip_projections" if "ClipProj" in filename else "loras")
        target = Path("/opt/ComfyUI/models") / subfolder / Path(filename).name
        target.parent.mkdir(parents=True, exist_ok=True)
        cached = hf_hub_download(repo, filename, revision=revision)
        shutil.move(cached, target)


def materializar():
    import os

    for repo, revision, filename in FILES:
        subfolder = filename.split("/")[0] if "/" in filename else (
            "clip_projections" if "ClipProj" in filename else "loras")
        target = Path("/opt/ComfyUI/models") / subfolder / Path(filename).name
        if target.is_symlink():
            blob = Path(os.readlink(target)).name
            source = Path("/root/.cache/huggingface/hub") / ("models--" + repo.replace("/", "--")) / "blobs" / blob
            assert source.is_file(), source
            target.unlink()
            os.link(source, target)
        if not target.is_file():
            from huggingface_hub import hf_hub_download
            import shutil
            cached = hf_hub_download(repo, filename, revision=revision)
            if target.is_symlink():
                target.unlink()
            shutil.copyfile(cached, target)
        assert target.is_file() and target.stat().st_size > 1000, target


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /opt/ComfyUI",
        f"cd /opt/ComfyUI && git checkout {COMFY}",
        "git clone https://github.com/Larryvrh/ComfyUI-MiniMax-H3-Turbo.git /opt/ComfyUI/custom_nodes/h3_turbo",
        f"cd /opt/ComfyUI/custom_nodes/h3_turbo && git checkout {TURBO}",
        "git clone https://github.com/nicolab28/ComfyUI-ClipProj.git /opt/ComfyUI/custom_nodes/clipproj",
        f"cd /opt/ComfyUI/custom_nodes/clipproj && git checkout {CLIPPROJ}",
    )
    .uv_pip_install("huggingface_hub", extra_options="--torch-backend=cu130 -r /opt/ComfyUI/requirements.txt")
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "120", "TOKENIZERS_PARALLELISM": "false"})
    .run_function(baixar, timeout=3600)
    .run_function(materializar, timeout=1800)
)


def grafo(prompt, quadros, passos, seed, prefixo):
    def node(kind, **inputs):
        return {"class_type": kind, "inputs": inputs}
    return {
        "1": node("UNETLoader", unet_name="minimax_h3_fl2va_bf16.safetensors", weight_dtype="default"),
        "2": node("ClipProjLoader", clip_name="qwen3vl_4b_fp8_scaled.safetensors", type="auto",
                  projection="mmh3-4b-ClipProj-v3.1.safetensors", device="cuda:0", mode="streaming"),
        "3": node("VAELoader", vae_name="minimax_h3_video_vae_fp16.safetensors"),
        "5": node("LoadImage", image=f"{prefixo}.png"),
        "6": node("MiniMaxH3ImageToVideo", clip=["2", 0], vae=["3", 0], prompt=prompt,
                  width=LARG, height=ALT, length=quadros, first_frame=["5", 0]),
        "7": node("MiniMaxH3TurboLoRA", model=["1", 0],
                  lora_name="minimax_h3_turbo_v4_step600_ema.safetensors", strength=1.0, low_vram=False),
        "8": node("BasicGuider", model=["7", 0], conditioning=["6", 0]),
        "9": node("RandomNoise", noise_seed=seed),
        "10": node("MiniMaxH3TurboSampler"),
        "11": node("BasicScheduler", model=["7", 0], scheduler="simple", steps=passos, denoise=1.0),
        "12": node("SamplerCustomAdvanced", noise=["9", 0], guider=["8", 0], sampler=["10", 0],
                   sigmas=["11", 0], latent_image=["6", 1]),
        "13": node("VAEDecode", samples=["12", 0], vae=["3", 0]),
        "15": node("CreateVideo", images=["13", 0], fps=24),
        "16": node("SaveVideo", video=["15", 0], filename_prefix=prefixo, format="mp4", codec="h264"),
    }


@app.cls(image=image, gpu="RTX-PRO-6000", cpu=8, memory=196608, timeout=1500,
         retries=0, max_containers=1, scaledown_window=60)
class Animador:
    def _servidor(self):
        import subprocess, requests
        if getattr(self, "srv", None) and self.srv.poll() is None:
            return
        self.srv = subprocess.Popen([sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
                                     "--disable-auto-launch", "--use-pytorch-cross-attention", "--preview-method", "none"],
                                    cwd="/opt/ComfyUI")
        for _ in range(180):
            if self.srv.poll() is not None:
                raise RuntimeError("ComfyUI encerrou durante a inicialização")
            try:
                if requests.get("http://127.0.0.1:8188/system_stats", timeout=2).ok:
                    return
            except requests.RequestException:
                pass
            time.sleep(1)
        raise TimeoutError("ComfyUI não iniciou em 180 s")

    @modal.method()
    def gerar(self, quadro: bytes, prompt: str, quadros: int, passos: int, seed: int) -> bytes:
        import hashlib, json, subprocess, requests
        self._servidor()
        prefixo = "c" + hashlib.sha1(quadro + prompt.encode() + f"{quadros}{passos}{seed}".encode()).hexdigest()[:12]
        Path(f"/opt/ComfyUI/input/{prefixo}.png").write_bytes(quadro)
        r = requests.post("http://127.0.0.1:8188/prompt", json={"prompt": grafo(prompt, quadros, passos, seed, prefixo)}, timeout=30)
        if not r.ok:
            raise RuntimeError(f"grafo inválido: {r.text}")
        pid, t = r.json()["prompt_id"], time.time()
        while time.time() - t < 1200:
            hist = requests.get(f"http://127.0.0.1:8188/history/{pid}", timeout=10).json().get(pid)
            if hist:
                if hist["status"]["status_str"] != "success":
                    raise RuntimeError(json.dumps(hist["status"]))
                break
            time.sleep(2)
        else:
            raise TimeoutError("geração passou de 1200 s")
        video = next(Path("/opt/ComfyUI/output").rglob(f"{prefixo}*.mp4"))
        subprocess.run(["ffmpeg", "-y", "-i", str(video), "-an", "-vf",
                        "scale=1920:1097:flags=lanczos,crop=1920:1080:0:8", "-c:v", "libx264", "-preset", "fast",
                        "-crf", "16", "-pix_fmt", "yuv420p", "/tmp/fim.mp4"], check=True, capture_output=True)
        return Path("/tmp/fim.mp4").read_bytes()


def ler(lista):
    for linha in Path(lista).read_text(encoding="utf8").splitlines():
        partes = [p.strip() for p in linha.split("|", 3)]
        if len(partes) == 4 and not linha.lstrip().startswith("#"):
            yield partes[0], Path(partes[1]), float(partes[2]), partes[3]


if __name__ == "__main__":
    import subprocess
    from comum import Cache, h
    lista, saida = Path(sys.argv[1]), Path(sys.argv[2])
    passos = int(next((a[9:] for a in sys.argv if a.startswith("--passos=")), 6))
    saida.mkdir(parents=True, exist_ok=True)
    cache = Cache(saida)
    todos = [(n, img, s, p, min(8 * math.ceil((s * 24 - 4) / 8) + 4, 244)) for n, img, s, p in ler(lista)]
    chave = lambda img, p, q: h(img.read_bytes(), p, q, passos)
    faltam = [t for t in todos if cache.novo(t[0], chave(t[1], t[3], t[4]), (saida / f"{t[0]}.mp4").exists())]
    if faltam:
        seg = sum(q for *_, q in faltam) / 24
        print(f"gerar {len(faltam)} clipes ({seg:.0f} s) com H3 na RTX PRO 6000 · ≈ US$ {0.10 + 0.03 * seg:.2f}")
        if "--ok" not in sys.argv:
            sys.exit("rode de novo com --ok para gerar")
        t0 = time.time()
        with modal.enable_output(), app.run():
            anim, primeiro = Animador(), True
            for nome, img, s, prompt, q in faltam:
                chamada = anim.gerar.spawn(img.read_bytes(), prompt, q, passos, 42)
                try:
                    dados = chamada.get(timeout=(40 if primeiro else 12) * 60)
                except (TimeoutError, modal.exception.TimeoutError):
                    chamada.cancel()
                    sys.exit(f"{nome}: sem resposta a tempo, cancelado")
                primeiro = False
                bruto = saida / f"{nome}_bruto.mp4"
                bruto.write_bytes(dados)
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(bruto), "-t", f"{s:.3f}",
                                "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", str(saida / f"{nome}.mp4")],
                               check=True)
                bruto.unlink()
                cache.marca(nome, chave(img, prompt, q))
                print(f"{nome} ok ({time.time() - t0:.0f}s)", flush=True)
        print(f"GPU ligada ~{time.time() - t0:.0f}s · ≈ US$ {(time.time() - t0) * RATE:.2f} (RTX + CPU/RAM)")
    print("pronto")
