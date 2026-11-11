import json
import time
from pathlib import Path

import modal
import teste_turbo as baseline

BASE = Path(__file__).resolve().parent
ENCODER = "text_encoders/qwen3vl_32b_minimax_h3_bf16.safetensors"
MODEL_REV = "54472221d27c695fca9621b0c3ed52f06c4af707"
app = modal.App("teste-h3-32b-bf16-turbo8-768-cena01")


def baixar_encoder():
    import shutil
    from huggingface_hub import hf_hub_download

    cached = hf_hub_download("Comfy-Org/MiniMax-H3", ENCODER, revision=MODEL_REV)
    target = Path("/opt/ComfyUI/models") / ENCODER
    shutil.copyfile(cached, target)
    assert target.is_file() and not target.is_symlink() and target.stat().st_size > 10**10
    print(f"Encoder 32B BF16 validado: {target.stat().st_size} bytes")


image = baseline.image.run_function(baixar_encoder, timeout=3600)


def grafo(prompt):
    workflow = baseline.grafo(prompt)
    workflow["2"] = {"class_type": "CLIPLoader", "inputs": {
        "clip_name": Path(ENCODER).name, "type": "minimax", "device": "default"}}
    workflow["6"]["inputs"].update(width=768, height=1344)
    workflow["11"]["inputs"]["steps"] = 8
    workflow["16"]["inputs"]["filename_prefix"] = "teste32b8"
    return workflow


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
                               "--disable-auto-launch", "--use-pytorch-cross-attention",
                               "--preview-method", "none"], cwd=root)
    workflow = grafo(prompt)
    try:
        for _ in range(120):
            if server.poll() is not None:
                raise RuntimeError("ComfyUI encerrou ao iniciar")
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
            raise RuntimeError(response.text)
        pid = response.json()["prompt_id"]
        while time.perf_counter() - started < 830:
            if server.poll() is not None:
                raise RuntimeError("ComfyUI encerrou durante a geração")
            history = requests.get(f"http://127.0.0.1:8188/history/{pid}", timeout=10).json().get(pid)
            if history:
                if history["status"]["status_str"] != "success":
                    raise RuntimeError(json.dumps(history["status"]))
                break
            time.sleep(2)
        else:
            raise TimeoutError("Geração excedeu 830s")
        videos = list((root / "output").rglob("teste32b8*.mp4"))
        assert len(videos) == 1, videos
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
        print(json.dumps({"remote_seconds_including_shutdown": elapsed,
                          "estimated_requested_resource_usd": elapsed * baseline.RATE}))
    return video, dict(remote_seconds_including_shutdown=elapsed,
                       estimated_requested_resource_usd=elapsed * baseline.RATE,
                       workflow=workflow, history=history, system_stats=stats, probe=probe,
                       encoder=dict(file=ENCODER, revision=MODEL_REV, precision="BF16", parameters="32B"),
                       revisions=dict(comfy=baseline.COMFY, turbo=baseline.TURBO),
                       configuration="H3 FL2VA BF16, Qwen3VL32B BF16, Larry Turbo8, 768x1344, 124f24fps, seed42")


@app.local_entrypoint()
def main(ok: bool = False):
    manifest = BASE.parent / "segunda_marmita/cenas_video.json"
    selected = next(s for s in json.loads(manifest.read_text(encoding="utf-8"))["scenes"] if s["id"] == "01")
    first = manifest.parent / selected["image"]
    output = BASE.parent / "resultado/cena_01_32b_bf16_turbo8_768"
    print("Teste único: cena01, encoder32B BF16, Turbo8,768x1344,124f24fps,seed42,start-only")
    print(f"Timeout900s: teto aproximado da função US${900 * baseline.RATE:.2f}; preparação/inicialização adicionais.")
    if not ok:
        return
    if (output / "h3.mp4").exists():
        raise FileExistsError("Resultado já existe; não repetir geração")
    output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    video, metrics = gerar.remote(first.read_bytes(), selected["prompt"])
    metrics.update(client_call_seconds=time.perf_counter() - started, first_image=str(first), last_image=None)
    (output / "h3.mp4").write_bytes(video)
    (output / "metricas.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Salvo: {output}")
