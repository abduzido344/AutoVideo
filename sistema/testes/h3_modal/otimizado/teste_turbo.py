import json
import time
from pathlib import Path

import modal

BASE = Path(__file__).resolve().parent
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
app = modal.App("teste-h3-clipproj4b-turbo6-i2v")


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
        print(f"Diagnóstico: {target}, exists={target.exists()}, symlink={target.is_symlink()}")
        print(list(target.parent.iterdir()))
        if not target.is_file():
            from huggingface_hub import hf_hub_download
            import shutil
            cached = hf_hub_download(repo, filename, revision=revision)
            if target.is_symlink():
                target.unlink()
            shutil.copyfile(cached, target)
        assert target.is_file() and target.stat().st_size > 1000, target
        print(f"Peso validado: {target.name}, {target.stat().st_size} bytes")


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


def grafo(prompt):
    def node(kind, **inputs):
        return {"class_type": kind, "inputs": inputs}
    return {
        "1": node("UNETLoader", unet_name="minimax_h3_fl2va_bf16.safetensors", weight_dtype="default"),
        "2": node("ClipProjLoader", clip_name="qwen3vl_4b_fp8_scaled.safetensors", type="auto",
                  projection="mmh3-4b-ClipProj-v3.1.safetensors", device="cuda:0", mode="streaming"),
        "3": node("VAELoader", vae_name="minimax_h3_video_vae_fp16.safetensors"),
        "4": node("VAELoader", vae_name="minimax_h3_audio_vae_fp32.safetensors"),
        "5": node("LoadImage", image="start.png"),
        "6": node("MiniMaxH3ImageToVideo", clip=["2", 0], vae=["3", 0], prompt=prompt,
                  width=480, height=832, length=124, first_frame=["5", 0]),
        "7": node("MiniMaxH3TurboLoRA", model=["1", 0],
                  lora_name="minimax_h3_turbo_v4_step600_ema.safetensors", strength=1.0, low_vram=False),
        "8": node("BasicGuider", model=["7", 0], conditioning=["6", 0]),
        "9": node("RandomNoise", noise_seed=42),
        "10": node("MiniMaxH3TurboSampler"),
        "11": node("BasicScheduler", model=["7", 0], scheduler="simple", steps=6, denoise=1.0),
        "12": node("SamplerCustomAdvanced", noise=["9", 0], guider=["8", 0], sampler=["10", 0],
                   sigmas=["11", 0], latent_image=["6", 1]),
        "13": node("VAEDecode", samples=["12", 0], vae=["3", 0]),
        "14": node("VAEDecodeAudio", samples=["12", 0], vae=["4", 0]),
        "15": node("CreateVideo", images=["13", 0], audio=["14", 0], fps=24),
        "16": node("SaveVideo", video=["15", 0], filename_prefix="turbo6", format="mp4", codec="h264"),
    }


@app.function(image=image, gpu="RTX-PRO-6000", cpu=8, memory=196608, timeout=900,
              retries=0, max_containers=1, min_containers=0, scaledown_window=2)
def gerar(first: bytes, prompt: str):
    import subprocess
    import sys
    import requests

    started = time.perf_counter()
    root = Path("/opt/ComfyUI")
    (root / "input/start.png").write_bytes(first)
    server = subprocess.Popen([sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
                               "--disable-auto-launch", "--use-pytorch-cross-attention", "--preview-method", "none"], cwd=root)
    workflow = grafo(prompt)
    try:
        for _ in range(120):
            if server.poll() is not None:
                raise RuntimeError("ComfyUI encerrou durante inicialização")
            try:
                if requests.get("http://127.0.0.1:8188/system_stats", timeout=2).ok:
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        else:
            raise TimeoutError("ComfyUI não iniciou em 120s")
        stats = requests.get("http://127.0.0.1:8188/system_stats", timeout=10).json()
        response = requests.post("http://127.0.0.1:8188/prompt", json={"prompt": workflow}, timeout=30)
        if not response.ok:
            raise RuntimeError(f"Grafo inválido: {response.text}")
        pid = response.json()["prompt_id"]
        while time.perf_counter() - started < 830:
            history = requests.get(f"http://127.0.0.1:8188/history/{pid}", timeout=10).json().get(pid)
            if history:
                if history["status"]["status_str"] != "success":
                    raise RuntimeError(json.dumps(history["status"]))
                break
            time.sleep(2)
        else:
            raise TimeoutError("Geração excedeu 830s")
        videos = list((root / "output").rglob("turbo6*.mp4"))
        if len(videos) != 1:
            raise RuntimeError(f"Esperado um MP4, encontrado {videos}")
        video = videos[0].read_bytes()
        probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                                                    "-of", "json", str(videos[0])]))
    finally:
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        elapsed = time.perf_counter() - started
        print(json.dumps({"remote_seconds_including_shutdown": elapsed, "estimated_requested_resource_usd": elapsed * RATE}))
    return video, dict(remote_seconds_including_shutdown=elapsed, estimated_requested_resource_usd=elapsed * RATE,
                       workflow=workflow, history=history, system_stats=stats, probe=probe,
                       revisions=dict(comfy=COMFY, turbo=TURBO, clipproj=CLIPPROJ), model_files=FILES)


@app.local_entrypoint()
def main(ok: bool = False, scene: str = "04"):
    manifest = BASE.parent / "segunda_marmita/cenas_video.json"
    scene_id = scene.zfill(2)
    selected = next(s for s in json.loads(manifest.read_text(encoding="utf-8"))["scenes"] if s["id"] == scene_id)
    first = manifest.parent / selected["image"]
    assert first.is_file()
    if scene_id == "04":
        assert first.name == "04_o_professor_v3.png"
    print(f"1 clipe I2V start-only: {first}; ClipProj4B FP8 + H3 BF16 Turbo6, 480x832,124f,24fps,seed42")
    print(f"Timeout900s, teto aproximado função US${900 * RATE:.2f}; build/inicialização adicionais. Meta US$0.10 não garantida.")
    if not ok:
        return
    output = BASE.parent / f"resultado/cena_{scene_id}_clipproj4b_turbo6"
    if (output / "h3.mp4").exists():
        print(f"Resultado já existe, preservado: {output}")
        return
    output.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    video, metrics = gerar.remote(first.read_bytes(), selected["prompt"])
    metrics.update(client_call_seconds=time.perf_counter() - start, first_image=str(first), last_image=None)
    (output / "h3.mp4").write_bytes(video)
    (output / "metricas.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Salvo: {output}")
