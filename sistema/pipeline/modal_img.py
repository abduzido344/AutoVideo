"""Imagens com Z-Image-Turbo (Apache 2.0) na Modal, L4 sob demanda.

Uso: python sistema/pipeline/modal_img.py prompts.txt pasta_saida [--vertical]
prompts.txt: uma imagem por linha, "nome: prompt". Pula as que já existem em pasta_saida/nome.png.
16:9 = 1280x720; --vertical = 720x1280. L4 ~US$ 0,80/h: ~US$ 0,002 por imagem + 1–2 min para subir.
"""
import sys
from pathlib import Path
import modal

app = modal.App("estudio-img")
MODELO = "Tongyi-MAI/Z-Image-Turbo"
img = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch==2.8.0", "diffusers>=0.36.0", "transformers>=4.57", "accelerate", "huggingface_hub[hf_xet]")
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "60"})
    .run_commands(f"hf download {MODELO} --local-dir /modelos/zimage")  # pesos na imagem, só CPU
)


# sem @modal.enter: falha ao carregar derruba só a chamada, sem loop de reinício
@app.cls(image=img, gpu="L4", timeout=600, scaledown_window=60, max_containers=1)
class Pintor:
    @modal.method()
    def gerar(self, prompt: str, largura: int, altura: int, seed: int = 42) -> bytes:
        import io, time
        t = time.time()
        print("container ligado", flush=True)
        import torch
        from diffusers import ZImagePipeline
        if not hasattr(self, "pipe"):
            print(f"importou em {time.time() - t:.0f}s, carregando", flush=True)
            self.pipe = ZImagePipeline.from_pretrained("/modelos/zimage", torch_dtype=torch.bfloat16).to("cuda")
            print(f"modelo na GPU em {time.time() - t:.0f}s", flush=True)
        im = self.pipe(prompt=prompt, width=largura, height=altura, num_inference_steps=9, guidance_scale=0.0,
                       generator=torch.Generator("cuda").manual_seed(seed)).images[0]
        buf = io.BytesIO()
        im.save(buf, "PNG")
        return buf.getvalue()


if __name__ == "__main__":
    LIMITE_PRIMEIRO, LIMITE = 15 * 60, 2 * 60  # o primeiro inclui fila de L4 (já passou de 10 min)
    from comum import Cache, h, pedidos, vertical
    lista, saida = Path(sys.argv[1]), Path(sys.argv[2])
    largura, altura = (720, 1280) if vertical(saida, sys.argv) else (1280, 720)
    saida.mkdir(parents=True, exist_ok=True)
    cache = Cache(saida)
    chave = lambda p: h(p, largura, altura)
    todos = pedidos(lista, "img" if lista.suffix == ".md" else None)
    faltam = [(n, p) for n, p in todos if cache.novo(n, chave(p), (saida / f"{n}.png").exists())]
    if faltam:
        print(f"gerar {len(faltam)} imagens na L4 · ≈ US$ {0.05 + 0.005 * len(faltam):.2f}")
        if "--ok" not in sys.argv:
            sys.exit("rode de novo com --ok para gerar")
        with modal.enable_output(), app.run():
            pintor, primeiro = Pintor(), True
            for nome, prompt in faltam:
                chamada = pintor.gerar.spawn(prompt, largura, altura)
                try:
                    dados = chamada.get(timeout=LIMITE_PRIMEIRO if primeiro else LIMITE)
                except (TimeoutError, modal.exception.TimeoutError):
                    chamada.cancel()
                    sys.exit(f"{nome}: sem resposta a tempo, cancelado")
                primeiro = False
                (saida / f"{nome}.png").write_bytes(dados)
                cache.marca(nome, chave(prompt))
                print(f"{nome} ok", flush=True)
    print("pronto")
