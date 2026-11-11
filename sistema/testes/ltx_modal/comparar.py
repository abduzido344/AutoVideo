import hashlib
import json
import time
from pathlib import Path

import modal
from teste import MODEL, MODEL_REV, PROMPT, REV, image

app = modal.App("teste-ltx23-referencia-gpus")
RATES = {"RTX-PRO-6000": 0.000842, "L40S": 0.000542}


def executar(reference: bytes, placa: str, runs: int):
    import subprocess
    import traceback
    import torch
    from fastvideo import VideoGenerator
    from fastvideo.configs.pipelines.base import PipelineConfig

    started = time.perf_counter()
    root = "/models/ltx23"
    Path("/tmp/referencia.png").write_bytes(reference)
    low_memory = placa == "L40S"
    config = PipelineConfig.from_pretrained(root)
    config.dit_config.quant_config = None
    if low_memory:
        from fastvideo.layers.quantization.fp8_config import FP8Config
        config.dit_config.quant_config = FP8Config()
        from fastvideo.models.loader.component_loader import PipelineComponentLoader
        from fastvideo.pipelines.basic.ltx2.stages.ltx2_text_encoding import LTX2TextEncodingStage
        from fastvideo.pipelines.basic.ltx2.stages.ltx2_denoising import LTX2DenoisingStage

        original_load = PipelineComponentLoader.load_module
        original_text = LTX2TextEncodingStage.forward
        original_denoise = LTX2DenoisingStage.forward

        def load_parked(*args, **kwargs):
            module = original_load(*args, **kwargs)
            name = kwargs.get("module_name", args[0] if args else "")
            if name in ("transformer", "transformer_refine"):
                module.to("cpu")
                torch.cuda.empty_cache()
            return module

        def text_sequential(stage, batch, fastvideo_args):
            try:
                return original_text(stage, batch, fastvideo_args)
            finally:
                for encoder in stage.text_encoders:
                    encoder.to("cpu")
                torch.cuda.empty_cache()

        def denoise_sequential(stage, batch, fastvideo_args):
            stage.transformer.to("cuda")
            try:
                return original_denoise(stage, batch, fastvideo_args)
            finally:
                stage.transformer.to("cpu")
                torch.cuda.empty_cache()

        PipelineComponentLoader.load_module = staticmethod(load_parked)
        LTX2TextEncodingStage.forward = text_sequential
        LTX2DenoisingStage.forward = denoise_sequential
    settings = dict(
        ltx2_refine_enabled=True, ltx2_refine_upsampler_path=f"{root}/spatial_upscaler",
        ltx2_refine_lora_path="", ltx2_refine_num_inference_steps=3,
        ltx2_refine_guidance_scale=1.0, ltx2_refine_add_noise=True,
        enable_torch_compile=False, enable_torch_compile_text_encoder=False,
        enable_torch_compile_vae=False, dit_cpu_offload=low_memory,
        dit_layerwise_offload=False, text_encoder_cpu_offload=True,
        vae_cpu_offload=low_memory, ltx2_vae_tiling=True,
        ltx2_vae_spatial_tile_size_in_pixels=512,
        ltx2_vae_spatial_tile_overlap_in_pixels=64,
        ltx2_vae_temporal_tile_size_in_frames=64,
        ltx2_vae_temporal_tile_overlap_in_frames=24,
    )
    metrics = dict(
        model=MODEL, model_revision=MODEL_REV, fastvideo_revision=REV,
        requested_gpu=placa, gpu=torch.cuda.get_device_name(0),
        vram_gib=torch.cuda.get_device_properties(0).total_memory / 1024**3,
        prompt=PROMPT, reference_sha256=hashlib.sha256(reference).hexdigest(),
        conditioning="first frame image, strength=1.0", seed=42,
        precision="FP8 linear layers / BF16" if low_memory else "BF16",
        sequential_component_swap=low_memory,
        settings=settings, attention="TORCH_SDPA", runs=[], status="initializing",
    )
    generator = None
    videos = []
    try:
        generator = VideoGenerator.from_pretrained(root, num_gpus=1, pipeline_config=config, **settings)
        metrics["load_seconds"] = time.perf_counter() - started
        for index in range(runs):
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.synchronize()
            t = time.perf_counter()
            result = generator.generate_video(
                prompt=PROMPT, negative_prompt="", output_path=f"/tmp/raw_{index}.mp4",
                height=1088, width=1920, num_frames=121, fps=24,
                num_inference_steps=8, guidance_scale=1.0, seed=42, save_video=True,
                ltx2_images=[("/tmp/referencia.png", 0, 1.0)], ltx2_image_crf=0.0,
            )
            torch.cuda.synchronize()
            elapsed = time.perf_counter() - t
            output = f"/tmp/final_{index}.mp4"
            subprocess.run(["ffmpeg", "-y", "-i", f"/tmp/raw_{index}.mp4", "-vf",
                            "crop=1920:1080:0:4", "-c:v", "libx264", "-preset", "fast",
                            "-crf", "18", "-c:a", "copy", output], check=True, capture_output=True)
            probe = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", output
            ], text=True))
            stages = getattr(result.get("logging_info"), "stages", {}) if isinstance(result, dict) else {}
            item = dict(index=index + 1, kind="first" if index == 0 else "warm",
                        wall_seconds=elapsed, gpu_generation_usd=elapsed * RATES[placa],
                        peak_allocated_gib=max(
                            [torch.cuda.max_memory_allocated() / 1024**3] +
                            [float(stage.get("peak_allocated_mb", 0)) / 1024 for stage in stages.values()]),
                        stages=stages, probe=probe)
            metrics["runs"].append(item)
            videos.append(Path(output).read_bytes())
            print("RUN_RESULT " + json.dumps(item, default=str), flush=True)
        metrics["status"] = "success"
    except Exception:
        metrics["status"] = "error"
        metrics["error"] = traceback.format_exc()
        print(metrics["error"], flush=True)
    finally:
        if generator is not None:
            generator.shutdown()
        metrics["remote_seconds"] = time.perf_counter() - started
        metrics["gpu_remote_estimate_usd"] = metrics["remote_seconds"] * RATES[placa]
    return videos, metrics


@app.function(image=image, gpu="RTX-PRO-6000", cpu=8, memory=98304, timeout=1200,
              retries=0, max_containers=1, min_containers=0, scaledown_window=2)
def rtx(reference: bytes, runs: int):
    return executar(reference, "RTX-PRO-6000", runs)


@app.function(image=image, gpu="L40S", cpu=8, memory=98304, timeout=1800,
              retries=0, max_containers=1, min_containers=0, scaledown_window=2)
def l40s(reference: bytes, runs: int):
    return executar(reference, "L40S", runs)


@app.local_entrypoint()
def main(ok: bool = False, gpu: str = "both", runs: int = 2):
    if gpu not in ("both", "rtx", "l40s") or runs not in (1, 2):
        raise ValueError("Use --gpu both|rtx|l40s e --runs 1|2")
    if not ok:
        print("Referencia do robo; Full HD/121 frames/24fps; RTX PRO 6000 e L40S sequencialmente.")
        print("2 geracoes por placa: primeira e aquecida. Limites GPU combinados ~US$1,99, mais CPU/RAM/startup.")
        return
    base = Path(__file__).resolve().parent
    reference = (base / "referencia_robo.png").read_bytes()
    choices = [("rtx_pro_6000", rtx)] if gpu == "rtx" else [("l40s", l40s)] if gpu == "l40s" else [
        ("rtx_pro_6000", rtx), ("l40s", l40s)]
    for name, function in choices:
        output = base / "comparacao" / name
        output.mkdir(parents=True, exist_ok=True)
        t = time.perf_counter()
        try:
            videos, metrics = function.remote(reference, runs)
        except Exception as exc:
            videos, metrics = [], {"status": "remote_error", "error": str(exc)}
        metrics["client_call_seconds"] = time.perf_counter() - t
        for index, video in enumerate(videos, 1):
            (output / f"referencia_1080p_{index}.mp4").write_bytes(video)
        (output / "metricas.json").write_text(json.dumps(metrics, indent=2, default=str), encoding="utf-8")
        print(name, metrics["status"], output, flush=True)
