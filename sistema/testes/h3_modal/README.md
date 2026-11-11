# Teste isolado MiniMax H3 no Modal

11/11/2026: usuário reprovou qualidade facial do reel480p. Teste único posterior `otimizado/teste_32b_768.py`: cena01,encoder original32B não quantizado,Turbo8,768×1344;193,48s eUS$0,26566 estimados pela função, exclui preparação/adicionais. Vídeo nativo e upscale1080 em `resultado/cena_01_32b_bf16_turbo8_768/`. Mais definição, mas pequenas variações nos olhos ao fundo persistem; não considerar qualidade facial resolvida. GPU encerrada/0tasks. Ver `avaliacao.md`.

Teste otimizado posterior: `otimizado/teste_turbo.py` usa ComfyUI + ClipProj4B FP8 + Larry Turbo6, mantendo H3 FL2VA BF16. Cena 04 concluída: 69,57 s de função, estimativa US$0,0955 por recursos solicitados (exclui preparação/adicionais). Resultado e avaliação em `resultado/cena_04_clipproj4b_turbo6/`. Movimento mais expressivo que o baseline. Apps parados/0 tasks. Não gera novamente se o MP4 já existir.

Primeiro teste executado em 10/11/2026: cena 04 com `04_o_professor_v3.png`, somente start. MP4 validado em `resultado/cena_04_480/`; medidas e limites em `avaliacao.md` nessa pasta. Função em 269,74 s (~US$0,37 pelos recursos solicitados, excluindo preparação e adicionais), pico alocado por estágio 64,38 GiB. Apps encerrados, 0 tasks. Removido `pipeline.preset`, incompatível com o adaptador do SHA fixado; seleção automática conforme exemplo oficial.

O teste usa **MiniMaxAI/MiniMax-H3 oficial, FL2VA**, com uma imagem inicial e imagem final opcional. O exemplo oficial do FastVideo fornece exatamente esses campos. Encoder e VAE ficam com offload CPU; módulos carregam por etapa para não manter encoder e transformer simultaneamente na GPU. O primeiro teste usa BF16 e atenção densa, sem compilação: é uma referência de compatibilidade/qualidade, ainda sem medida de velocidade.

Uma RTX PRO 6000 de 96 GB, 8 CPUs, 192 GiB RAM, um clipe de 124 frames a 24 fps (~5,17 s), seed 42. Saída inicial 480×832 vertical; opção 768×1344. Não gera 1080p nativo nem faz upscale. São 50 pontos do scheduler, conforme exemplo oficial; não usa o modelo destilado de oito passos.

Preview inteiramente local, sem download/build/uso de GPU:

```powershell
python sistema/testes/h3_modal/teste.py --scene 01
```

Execução efetiva (paga):

```powershell
$env:PYTHONIOENCODING='utf-8'
modal run sistema/testes/h3_modal/teste.py --ok --scene 01
```

`--scene 01` a `06` lê `segunda_marmita/cenas_video.json`. Alternativas: `--first-image CAMINHO`, `--last-image CAMINHO`, `--prompt TEXTO`, `--resolution 768`. Imagem final deve representar o mesmo plano/câmera da inicial; duas cenas diferentes não são endpoints adequados de uma única tomada.

Limite de chamada: 1800 s, sem retries, no máximo um container, sem endpoint permanente nem volume de pesos. A US$0,000842/s de GPU, teto aproximado US$1,52 de GPU ou US$2,47 com CPU/RAM solicitadas. Build e inicialização fora do tempo medido podem acrescentar custo; escalonamento da chamada não é um limite de cobrança absoluto. Pesos vão para uma imagem Modal construída em CPU; é um download grande, acima de 130 GiB antes de excluir componentes duplicados, e pode demorar na primeira preparação.

Saída: `resultado/cena_01_480/h3.mp4` e `metricas.json` com duração, streams, receita e tempo incluindo os carregamentos tardios. O pico CUDA registrado é o do último estágio, pois o logger reseta estatísticas por estágio; o log por estágio é necessário para apurar o máximo real. Não há comparação de desempenho até executar e validar o MP4.

## Versões rápidas e GGUF

O **FastH3-QAD-v2 NVFP4** foi treinado para reduzir o erro da quantização em Blackwell, mas seu contrato declara `task=t2av`. Embora a pipeline genérica aceite campos de keyframe, isso não valida a qualidade I2V desse checkpoint destilado. Por isso ele não foi usado silenciosamente nas imagens da história. Seu contrato usa nove pontos do scheduler para oito forwards; não basta reduzir o modelo original para oito passos.

GGUF FL2VA Q4_K/Q5 e encoder Q4 são uma alternativa futura via stable-diffusion.cpp. Exigem outra implementação e validação, e quantização não garante velocidade maior. Os GGUF Unsloth usam modelos podados; os full GGUF têm outro compromisso de tamanho. Nenhuma versão quantizada implica perda zero de qualidade. L40S não suporta o caminho nativo NVFP4 de Blackwell; um futuro teste nela precisa de outra receita.

Fontes consultadas em 10/11/2026:

- [Exemplo oficial FL2VA](https://github.com/hao-ai-lab/FastVideo/blob/4deb3a50fff8fff8c469d686c8e40fe6d9b03551/examples/inference/basic/basic_minimax_h3_fl2va.py)
- [MiniMax H3 oficial](https://huggingface.co/MiniMaxAI/MiniMax-H3)
- [FastH3-QAD-v2](https://huggingface.co/FastVideo/FastH3-QAD-v2) e [contrato do checkpoint](https://huggingface.co/FastVideo/FastH3-QAD-v2/blob/main/fastvideo_inference.json)
- [Receita e limites NVFP4](https://haoailab.com/blogs/fasth3-v21/)
- [GGUF Unsloth](https://huggingface.co/unsloth/MiniMax-H3-GGUF) e [GGUF completos](https://huggingface.co/realrebelai/MiniMax-H3_GGUFs)
- [Preços Modal](https://modal.com/pricing)

FastVideo e snapshot do modelo ficam fixados por SHA em `teste.py`. A cena 04 foi validada em CUDA; outras cenas, resoluções e otimizações continuam sem benchmark.
