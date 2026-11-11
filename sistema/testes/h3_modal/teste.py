import argparse
import io
import json
import time
from pathlib import Path

import modal

REV = "4deb3a50fff8fff8c469d686c8e40fe6d9b03551"
MODEL = "MiniMaxAI/MiniMax-H3"
MODEL_REV = "0919fb684102ef115126612f3fbb84d1027e7317"
BASE = Path(__file__).resolve().parent
TIMEOUT = 1800
GPU_RATE = 0.000842
CPU_RATE = 8 * 0.0000131
RAM_RATE = 192 * 0.00000222
app = modal.App("teste-isolado-minimax-h3-fl2va")


def baixar():
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL, revision=MODEL_REV, local_dir="/models/h3",
                      ignore_patterns=["FL2VA/*", "Ref2VA/*", "transformer_ref/*", "*.md", "*.mp4"],
                      max_workers=8)


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .uv_pip_install(f"git+https://github.com/hao-ai-lab/FastVideo.git@{REV}",
                    extra_options="--torch-backend=cu130")
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "120", "FASTVIDEO_ATTENTION_BACKEND": "TORCH_SDPA",
          "FASTVIDEO_STAGE_LOGGING": "1", "FASTVIDEO_FA4": "0",
          "FASTVIDEO_MINIMAX_H3_FUSIONS": "0", "TOKENIZERS_PARALLELISM": "false"})
    .run_function(baixar, timeout=3600)
)


@app.function(image=image, gpu="RTX-PRO-6000", cpu=8, memory=196608,
              timeout=TIMEOUT, retries=0, max_containers=1, min_containers=0,
              scaledown_window=2)
def gerar(first: bytes, last: bytes | None, prompt: str, width: int, height: int):
    import subprocess
    import torch
    from PIL import Image
    from fastvideo import VideoGenerator
    from fastvideo.api import (CompileConfig, EngineConfig, GenerationRequest, GeneratorConfig,
                               InputConfig, OffloadConfig, OutputConfig, ParallelismConfig,
                               SamplingConfig)

    started = time.perf_counter()
    generator = VideoGenerator.from_config(GeneratorConfig(
        model_path="/models/h3",
        engine=EngineConfig(num_gpus=1, use_fsdp_inference=False,
                            parallelism=ParallelismConfig(tp_size=1, sp_size=1),
                            compile=CompileConfig(enabled=False, text_encoder_enabled=False,
                                                  vae_enabled=False, audio_vae_enabled=False),
                            offload=OffloadConfig(dit=False, dit_layerwise=False,
                                                  text_encoder=True, vae=True,
                                                  pin_cpu_memory=False, lazy_module_load=True)),
    ))
    loaded = time.perf_counter()
    try:
        torch.cuda.reset_peak_memory_stats()
        torch.cuda.synchronize()
        t = time.perf_counter()
        result = generator.generate(GenerationRequest(
            prompt=prompt, negative_prompt="",
            inputs=InputConfig(pil_image=Image.open(io.BytesIO(first)).convert("RGB"),
                               last_image=Image.open(io.BytesIO(last)).convert("RGB") if last else None),
            sampling=SamplingConfig(height=height, width=width, num_frames=124, fps=24,
                                    num_inference_steps=50, guidance_scale=1.0,
                                    batch_cfg=False, seed=42),
            output=OutputConfig(output_path="/tmp/h3.mp4", save_video=True, return_frames=False),
        ))
        torch.cuda.synchronize()
        generation = time.perf_counter() - t
        video_path = Path(result.video_path)
        probe = json.loads(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video_path)
        ], text=True))
        metrics = {
            "model": MODEL, "model_revision": MODEL_REV, "fastvideo_revision": REV,
            "gpu": torch.cuda.get_device_name(0), "prompt": prompt,
            "mode": "first_last" if last else "first_only", "seed": 42,
            "configuration": "BF16, TORCH_SDPA, no compile, lazy modules, encoder/VAE CPU offload",
            "requested_frames": 124, "fps": 24, "sigma_grid_points": 50,
            "load_seconds": loaded - started,
            "generation_seconds_including_lazy_loads": generation,
            "peak_allocated_gib_final_stage": torch.cuda.max_memory_allocated() / 2**30,
            "probe": probe,
        }
        return video_path.read_bytes(), metrics
    finally:
        generator.shutdown()
        elapsed = time.perf_counter() - started
        if "metrics" in locals():
            metrics["remote_seconds_including_shutdown"] = elapsed
            metrics["estimated_requested_resource_usd"] = elapsed * (GPU_RATE + CPU_RATE + RAM_RATE)
        print(json.dumps({"remote_seconds_including_shutdown": elapsed,
                          "estimated_requested_resource_usd": elapsed * (GPU_RATE + CPU_RATE + RAM_RATE)}))


def preparar(scene: str, first_image: str, last_image: str, prompt: str, resolution: str):
    manifest = BASE / "segunda_marmita" / "cenas_video.json"
    scenes = json.loads(manifest.read_text(encoding="utf-8"))["scenes"]
    selected = next((s for s in scenes if s["id"] == scene.zfill(2)), None)
    if selected is None:
        raise ValueError("Cena deve ser 01 a 06.")
    first = Path(first_image).resolve() if first_image else manifest.parent / selected["image"]
    last = Path(last_image).resolve() if last_image else None
    for path in (first, last):
        if path is not None and not path.is_file():
            raise FileNotFoundError(path)
    if resolution not in ("480", "768"):
        raise ValueError("resolution deve ser 480 ou 768.")
    width, height = (480, 832) if resolution == "480" else (768, 1344)
    return first, last, prompt or selected["prompt"], width, height


def executar(ok=False, scene="01", first_image="", last_image="", prompt="", resolution="480"):
    first, last, text, width, height = preparar(scene, first_image, last_image, prompt, resolution)
    print(f"MiniMax H3 FL2VA: 1 RTX PRO 6000, 1 clipe, {width}x{height}, 124 frames/24fps.")
    print(f"Referencia inicial: {first}; final: {last or 'nenhuma'}")
    print(f"Limite GPU: {TIMEOUT}s; GPU ~US${TIMEOUT * GPU_RATE:.2f}; "
          f"GPU+8CPU+192GiB RAM ~US${TIMEOUT * (GPU_RATE + CPU_RATE + RAM_RATE):.2f}.")
    print("Estimativa por recursos solicitados; build, inicializacao e adicionais fora deste teto aproximado.")
    if not ok:
        print("Preview local: nenhum download, build, upload ou chamada GPU. Execute com --ok para rodar.")
        return
    output = BASE / "resultado" / f"cena_{scene.zfill(2)}_{resolution}"
    output.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    video, metrics = gerar.remote(first.read_bytes(), last.read_bytes() if last else None, text, width, height)
    metrics.update(client_call_seconds=time.perf_counter() - start, first_image=str(first),
                   last_image=str(last) if last else None)
    (output / "h3.mp4").write_bytes(video)
    (output / "metricas.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Salvo em {output}")


@app.local_entrypoint()
def main(ok: bool = False, scene: str = "01", first_image: str = "", last_image: str = "",
         prompt: str = "", resolution: str = "480"):
    executar(ok, scene, first_image, last_image, prompt, resolution)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", default="01")
    parser.add_argument("--first-image", default="")
    parser.add_argument("--last-image", default="")
    parser.add_argument("--prompt", default="")
    parser.add_argument("--resolution", choices=("480", "768"), default="480")
    args = parser.parse_args()
    executar(**vars(args))
