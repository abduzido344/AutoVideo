"""Imagem → malha 3D (GLB) com TripoSG (MIT) na Modal, L4 sob demanda. Só geometria, sem textura.

Uso: python sistema/pipeline/modal_3d.py imagem.png saida.glb [--faces 20000] [--seed 42] [--ok]
L4 ~US$ 0,80/h: ~US$ 0,05 por modelo (+ build da imagem na 1ª vez, só CPU).
"""
import sys
from pathlib import Path
import modal

app = modal.App("estudio-3d")
img = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install("git", "libgl1", "libglib2.0-0", "libgomp1", "clang")
    .pip_install("torch==2.4.1", "torchvision==0.19.1", index_url="https://download.pytorch.org/whl/cu121")
    .pip_install("numpy<2", "diffusers==0.32.2", "transformers==4.47.1", "huggingface_hub[hf_xet]==0.27.1",
                 "peft==0.14.0", "einops", "opencv-python-headless<4.11", "trimesh", "omegaconf",
                 "scikit-image<0.25", "jaxtyping", "typeguard", "pymeshlab", "setuptools", "wheel", "ninja")
    .env({"TORCH_CUDA_ARCH_LIST": "8.6;8.9", "HF_HUB_DOWNLOAD_TIMEOUT": "60",
          "CUDA_HOME": "/usr/local/cuda", "FORCE_CUDA": "1", "CPATH": "/usr/local/cuda/include", "LIBRARY_PATH": "/usr/local/cuda/lib64"})
    .pip_install("diso", extra_options="--no-build-isolation")
    .run_commands(
        "git clone --depth 1 https://github.com/VAST-AI-Research/TripoSG.git /TripoSG",
        "huggingface-cli download VAST-AI/TripoSG --local-dir /TripoSG/pretrained_weights/TripoSG",
        "huggingface-cli download briaai/RMBG-1.4 --local-dir /TripoSG/pretrained_weights/RMBG-1.4",
    )
    .pip_install("fast_simplification")
)


@app.function(image=img, gpu="L4", timeout=600, max_containers=1)
def modelar(png: bytes, faces: int, seed: int) -> bytes:
    import os, time
    t = time.time()
    os.chdir("/TripoSG")
    sys.path[:0] = ["/TripoSG", "/TripoSG/scripts"]
    import torch
    from triposg.pipelines.pipeline_triposg import TripoSGPipeline
    from briarmbg import BriaRMBG
    from inference_triposg import run_triposg
    rmbg = BriaRMBG.from_pretrained("pretrained_weights/RMBG-1.4").to("cuda").eval()
    pipe = TripoSGPipeline.from_pretrained("pretrained_weights/TripoSG").to("cuda", torch.float16)
    print(f"modelos na GPU em {time.time() - t:.0f}s", flush=True)
    Path("/tmp/entrada.png").write_bytes(png)
    malha = run_triposg(pipe, "/tmp/entrada.png", rmbg, seed)
    if 0 < faces < len(malha.faces):
        try:
            malha = malha.simplify_quadric_decimation(face_count=faces)
        except Exception as e:
            print(f"sem simplificar: {e}", flush=True)
    print(f"malha: {len(malha.vertices)} vértices, {len(malha.faces)} faces em {time.time() - t:.0f}s", flush=True)
    return malha.export(file_type="glb")


def arg(nome, padrao):
    return int(sys.argv[sys.argv.index(nome) + 1]) if nome in sys.argv else padrao


if __name__ == "__main__":
    entrada, saida = Path(sys.argv[1]), Path(sys.argv[2])
    print(f"TripoSG na L4: {entrada.name} → {saida.name} · ≈ US$ 0,05 (+1ª build só CPU)")
    if "--ok" not in sys.argv:
        sys.exit("rode de novo com --ok para gerar")
    with modal.enable_output(), app.run():
        chamada = modelar.spawn(entrada.read_bytes(), arg("--faces", 20000), arg("--seed", 42))
        try:
            dados = chamada.get(timeout=15 * 60)
        except (TimeoutError, modal.exception.TimeoutError):
            chamada.cancel()
            sys.exit("sem resposta a tempo, cancelado")
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_bytes(dados)
    print(f"pronto: {saida}")
