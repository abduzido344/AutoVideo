"""Imagens com referência via Qwen-Image-2.1-Turbo na Modal, L40S sob demanda.

Uso: python sistema/pipeline/modal_edit.py prompts.txt pasta_saida [--vertical | --tam=LxA] ref1.png [ref2.png ...]
prompts.txt: uma imagem por linha, "nome: prompt". Pula as que já existem.
16:9 = 1376x768; --vertical = 768x1376 (metade do 2K nativo). L40S ~US$ 2/h.
Licença: Qwen Research (só pesquisa/avaliação). Não publicar saídas sem licença comercial.
"""
import sys, zlib
from pathlib import Path
import modal

app = modal.App("estudio-edit")
MODELO = "Qwen/Qwen-Image-2.1-Turbo"
img = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install("torch==2.8.0", "torchvision==0.23.0", "transformers>=5.17.0", "accelerate", "pillow", "huggingface_hub[hf_xet]",
                 "git+https://github.com/huggingface/diffusers.git")
    .env({"HF_HUB_DOWNLOAD_TIMEOUT": "60"})
    .run_commands(f"hf download {MODELO} --local-dir /modelos/qwen21")
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})
)


# ~33 GB em bf16: cabe inteiro na L40S (48 GB). Sem @modal.enter (evita loop de reinício).
@app.cls(image=img, gpu="L40S", timeout=900, scaledown_window=60, max_containers=1)
class Editor:
    @modal.method()
    def gerar(self, prompt: str, refs: list[bytes], largura: int, altura: int, seed: int = 42) -> bytes:
        import io, time
        t = time.time()
        print("container ligado", flush=True)
        import torch
        from PIL import Image
        from diffusers import QwenImage21Pipeline
        if not hasattr(self, "pipe"):
            print(f"importou em {time.time() - t:.0f}s, carregando", flush=True)
            # 2K + referências estoura 44 GB com tudo na GPU: cada parte sobe só quando é usada
            self.pipe = QwenImage21Pipeline.from_pretrained("/modelos/qwen21", dtype=torch.bfloat16)
            self.pipe.enable_model_cpu_offload()
            print(f"modelo pronto em {time.time() - t:.0f}s", flush=True)
        imagens = []
        for r in refs:
            im = Image.open(io.BytesIO(r)).convert("RGBA")
            im.thumbnail((1024, 1024))
            imagens.append(im)
        args = {"image": imagens if len(imagens) > 1 else imagens[0]} if imagens else {}
        im = self.pipe(prompt=prompt, width=largura, height=altura, use_kv_cache=True,
                       generator=torch.Generator("cpu").manual_seed(seed), **args).images[0]
        print(f"imagem em {time.time() - t:.0f}s", flush=True)
        buf = io.BytesIO()
        im.save(buf, "PNG")
        return buf.getvalue()


if __name__ == "__main__":
    LIMITE_PRIMEIRO, LIMITE = 20 * 60, 4 * 60
    from comum import Cache, h, pedidos, vertical
    lista, saida = Path(sys.argv[1]), Path(sys.argv[2])
    largura, altura = (768, 1376) if vertical(saida, sys.argv) else (1376, 768)
    tam = next((a[6:] for a in sys.argv if a.startswith("--tam=")), None)
    if tam:
        largura, altura = map(int, tam.split("x"))
    refs = [Path(a).read_bytes() for a in sys.argv[3:] if not a.startswith("--")]
    if not refs:
        sys.exit("faltam as imagens de referência do personagem")
    saida.mkdir(parents=True, exist_ok=True)
    cache, hrefs = Cache(saida), h(*refs)
    chave = lambda p: h(p, largura, altura, hrefs)
    todos = pedidos(lista, "edit" if lista.suffix == ".md" else None)
    faltam = [(n, p) for n, p in todos if cache.novo(n, chave(p), (saida / f"{n}.png").exists())]
    if faltam:
        print(f"gerar {len(faltam)} imagens na L40S · ≈ US$ {0.10 + 0.02 * len(faltam):.2f}")
        if "--ok" not in sys.argv:
            sys.exit("rode de novo com --ok para gerar")
        with modal.enable_output(), app.run():
            editor, primeiro = Editor(), True
            for nome, prompt in faltam:
                chamada = editor.gerar.spawn(prompt, refs, largura, altura, zlib.crc32(nome.encode()) % 10000)
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
