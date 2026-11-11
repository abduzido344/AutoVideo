import json
import time
from pathlib import Path

import modal

REV = "4deb3a50fff8fff8c469d686c8e40fe6d9b03551"
MODEL = "FastVideo/LTX-2.3-Distilled-Diffusers"
MODEL_REV = "22b09fb1860a944bf10fa21f033d957d9ab9ec20"
PROMPT = (
    "A small orange robot stands on a wooden workbench in a bright workshop. "
    "The robot slowly raises its right hand and waves toward the camera, then "
    "turns its head slightly to the left. Its metal joints move smoothly. "
    "A locked medium shot, neutral daylight, realistic materials, soft shadows, "
    "shallow depth of field. Gentle mechanical whirring and quiet room ambience. "
    "No dialogue, no text, no logos."
)
app = modal.App("teste-isolado-ltx23")


def baixar():
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL, revision=MODEL_REV, local_dir="/models/ltx23",
                      ignore_patterns=["download/*"], max_workers=8)


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .uv_pip_install(f"git+https://github.com/hao-ai-lab/FastVideo.git@{REV}",
                    extra_options="--torch-backend=cu130")
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "120", "FASTVIDEO_ATTENTION_BACKEND": "TORCH_SDPA",
          "FASTVIDEO_STAGE_LOGGING": "1", "TOKENIZERS_PARALLELISM": "false"})
    .run_function(baixar, timeout=1800)
)


@app.function(image=image, gpu="B200", cpu=8, memory=98304, timeout=900,
              retries=0, max_containers=1, min_containers=0, scaledown_window=2)
def gerar():
    import subprocess
    import torch
    from fastvideo import VideoGenerator
    from fastvideo.configs.pipelines.base import PipelineConfig

    started = time.perf_counter()
    root = "/models/ltx23"
    config = PipelineConfig.from_pretrained(root)
    config.dit_config.quant_config = None
    generator = VideoGenerator.from_pretrained(
        root, num_gpus=1, pipeline_config=config,
        ltx2_refine_enabled=True,
        ltx2_refine_upsampler_path=f"{root}/spatial_upscaler",
        ltx2_refine_lora_path="", ltx2_refine_num_inference_steps=3,
        ltx2_refine_guidance_scale=1.0, ltx2_refine_add_noise=True,
        enable_torch_compile=False, enable_torch_compile_text_encoder=False,
        enable_torch_compile_vae=False, dit_cpu_offload=False,
        text_encoder_cpu_offload=False, vae_cpu_offload=False, ltx2_vae_tiling=False,
    )
    loaded = time.perf_counter()
    try:
        torch.cuda.synchronize()
        t = time.perf_counter()
        result = generator.generate_video(
            prompt=PROMPT, negative_prompt="", output_path="/tmp/ltx23.mp4",
            height=1088, width=1920, num_frames=121, fps=24,
            num_inference_steps=8, guidance_scale=1.0, seed=42, save_video=True,
        )
        torch.cuda.synchronize()
        generation = time.perf_counter() - t
        subprocess.run(["ffmpeg", "-y", "-i", "/tmp/ltx23.mp4", "-vf",
                        "crop=1920:1080:0:4", "-c:v", "libx264", "-preset", "fast",
                        "-crf", "18", "-c:a", "copy", "/tmp/final.mp4"],
                       check=True, capture_output=True)
        probe = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", "/tmp/final.mp4"
        ], text=True)
        metrics = {
            "model": MODEL, "model_revision": MODEL_REV, "fastvideo_revision": REV,
            "prompt": PROMPT, "gpu": torch.cuda.get_device_name(0),
            "configuration": "BF16, TORCH_SDPA, no torch.compile, 8+3 steps",
            "load_seconds": loaded - started, "generation_wall_seconds": generation,
            "remote_seconds_before_shutdown": time.perf_counter() - started,
            "benchmark_4_5_seconds_reproduced": False,
            "probe": json.loads(probe),
        }
        if isinstance(result, dict):
            metrics["reported_generation_seconds"] = result.get("generation_time")
            metrics["reported_e2e_seconds"] = result.get("e2e_latency")
        print(json.dumps(metrics, indent=2), flush=True)
        return Path("/tmp/final.mp4").read_bytes(), metrics
    finally:
        generator.shutdown()


@app.local_entrypoint()
def main(ok: bool = False):
    if not ok:
        print("Teste isolado: 1 B200, 1 clipe, 121 frames/24fps, 1920x1080.")
        print("Limite da chamada GPU: 900 s (~US$1,56 de GPU, mais CPU/RAM e inicializacao).")
        print("Execute com --ok. Sem deploy permanente ou volume pago de pesos.")
        return
    output = Path(__file__).resolve().parent / "resultado"
    output.mkdir(parents=True, exist_ok=True)
    t = time.perf_counter()
    video, metrics = gerar.remote()
    metrics["client_call_seconds"] = time.perf_counter() - t
    (output / "ltx23_1080p.mp4").write_bytes(video)
    (output / "metricas.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Salvo em {output}")


if __name__ == "__main__":
    print("Use modal run sistema/testes/ltx_modal/teste.py --ok")
