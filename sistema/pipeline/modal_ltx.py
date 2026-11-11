"""Anima um quadro inicial com LTX-2.3 Distilled (FastVideo) na Modal, RTX PRO 6000 sob demanda.

Uso: python sistema/pipeline/modal_ltx.py lista.txt pasta_saida [--ok]
lista.txt: "nome | imagem.png | segundos | prompt" por linha. Sai pasta_saida/nome.mp4, 1920x1080, 24 fps, sem áudio,
cortado na duração pedida. Pula o que já existe com o mesmo pedido. ~US$ 0,10–0,15 por clipe + ~1 min para subir.
"""
import math, sys, time
from pathlib import Path
import modal

REV = "4deb3a50fff8fff8c469d686c8e40fe6d9b03551"
MODEL = "FastVideo/LTX-2.3-Distilled-Diffusers"
MODEL_REV = "22b09fb1860a944bf10fa21f033d957d9ab9ec20"
app = modal.App("estudio-ltx")


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
NEG = "text, letters, watermark, realistic photo, 3d render, extra fingers, deformed hands, face morphing, flicker"


@app.cls(image=image, gpu="RTX-PRO-6000", cpu=8, memory=98304, timeout=1500,
         retries=0, max_containers=1, scaledown_window=60)
class Animador:
    @modal.method()
    def gerar(self, quadro: bytes, prompt: str, quadros: int, seed: int = 42) -> bytes:
        import hashlib, subprocess
        tag = hashlib.sha1(quadro + prompt.encode() + str(quadros).encode()).hexdigest()[:12]
        ref, raw = f"/tmp/ref_{tag}.png", f"/tmp/raw_{tag}.mp4"
        Path(ref).write_bytes(quadro)
        if not hasattr(self, "g"):
            from fastvideo import VideoGenerator
            from fastvideo.configs.pipelines.base import PipelineConfig
            root = "/models/ltx23"
            cfg = PipelineConfig.from_pretrained(root)
            cfg.dit_config.quant_config = None
            self.g = VideoGenerator.from_pretrained(
                root, num_gpus=1, pipeline_config=cfg,
                ltx2_refine_enabled=True, ltx2_refine_upsampler_path=f"{root}/spatial_upscaler",
                ltx2_refine_lora_path="", ltx2_refine_num_inference_steps=3,
                ltx2_refine_guidance_scale=1.0, ltx2_refine_add_noise=True,
                enable_torch_compile=False, enable_torch_compile_text_encoder=False,
                enable_torch_compile_vae=False, dit_cpu_offload=False, dit_layerwise_offload=False,
                text_encoder_cpu_offload=True, vae_cpu_offload=False, ltx2_vae_tiling=True,
                ltx2_vae_spatial_tile_size_in_pixels=512, ltx2_vae_spatial_tile_overlap_in_pixels=64,
                ltx2_vae_temporal_tile_size_in_frames=64, ltx2_vae_temporal_tile_overlap_in_frames=24)
        self.g.generate_video(
            prompt=prompt, negative_prompt=NEG, output_path=raw,
            height=1088, width=1920, num_frames=quadros, fps=24,
            num_inference_steps=8, guidance_scale=1.0, seed=seed, save_video=True,
            ltx2_images=[(ref, 0, 1.0)], ltx2_image_crf=0.0)
        subprocess.run(["ffmpeg", "-y", "-i", raw, "-vf", "crop=1920:1080:0:4", "-an",
                        "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", "/tmp/fim.mp4"],
                       check=True, capture_output=True)
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
    saida.mkdir(parents=True, exist_ok=True)
    cache = Cache(saida)
    todos = [(n, img, s, p, min(8 * math.ceil((s * 24 - 1) / 8) + 1, 241)) for n, img, s, p in ler(lista)]
    chave = lambda img, p, q: h(img.read_bytes(), p, q)
    faltam = [t for t in todos if cache.novo(t[0], chave(t[1], t[3], t[4]), (saida / f"{t[0]}.mp4").exists())]
    if faltam:
        seg = sum(q for *_, q in faltam) / 24
        print(f"gerar {len(faltam)} clipes ({seg:.0f} s) na RTX PRO 6000 · ≈ US$ {0.08 + 0.025 * seg:.2f}")
        if "--ok" not in sys.argv:
            sys.exit("rode de novo com --ok para gerar")
        t0 = time.time()
        with modal.enable_output(), app.run():
            anim, primeiro = Animador(), True
            for nome, img, s, prompt, q in faltam:
                chamada = anim.gerar.spawn(img.read_bytes(), prompt, q)
                try:
                    dados = chamada.get(timeout=(20 if primeiro else 6) * 60)
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
        print(f"GPU ligada ~{time.time() - t0:.0f}s · ≈ US$ {(time.time() - t0) * 0.00116:.2f} (RTX + CPU/RAM)")
    print("pronto")
