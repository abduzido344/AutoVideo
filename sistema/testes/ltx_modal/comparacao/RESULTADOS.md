# LTX-2.3 com referência — RTX PRO 6000 e L40S

Teste realizado em 10/11/2026, no Modal, sem integrar ao pipeline de produção.

As duas placas geraram vídeos a partir de `../referencia_robo.png`, extraída do primeiro quadro do teste B200. Imagem condicionada no quadro inicial com força 1,0, mesmo prompt e seed 42. Cada placa fez duas gerações, a primeira e outra com o ambiente carregado.

Saída validada: 1920×1080, 121 frames, 24 fps, 5,04 segundos, H.264 e áudio AAC estéreo 48 kHz. Geração-base 960×544, upscale/refinamento em 1920×1088 e crop central para 1080. Ambos os vídeos da segunda geração foram decodificados integralmente com FFmpeg sem erros.

| Medida | RTX PRO 6000 Blackwell Server Edition | L40S |
|---|---:|---:|
| VRAM informada pelo CUDA | 95,01 GiB | 44,42 GiB |
| Precisão | BF16 | Lineares FP8, restante BF16 |
| Carregamento inicial da pipeline | 42,76 s | 48,01 s |
| Primeira geração até MP4 | 123,90 s | 245,66 s |
| Segunda geração até MP4 | 108,18 s | 236,01 s |
| GPU: primeira geração | US$ 0,1043 | US$ 0,1331 |
| GPU: segunda geração | US$ 0,0911 | US$ 0,1279 |
| GPU + CPU/RAM solicitadas: segunda geração | ≈ US$ 0,1255 | ≈ US$ 0,2030 |
| Pico de memória alocada observado | 72,67 GiB | 31,36 GiB |
| Duração remota das duas gerações, carga e shutdown | 277,21 s | 532,47 s |
| GPU estimada dessa duração remota | US$ 0,2334 | US$ 0,2886 |

Preços usados: RTX US$0,000842/s; L40S US$0,000542/s; CPU US$0,0000131/core/s; RAM US$0,00000222/GiB/s. Ambas solicitaram 8 cores e 96 GiB de RAM. Estimativa auxiliar: US$0,00031792/s. Fonte: https://modal.com/pricing

Os custos por geração excluem carregamento inicial da pipeline, imports, inicialização do container, fila, crop posterior, shutdown e demais despesas. A estimativa de CPU/RAM usa os recursos solicitados; consumo acima disso pode alterar a cobrança. Não são valores finais de fatura. Tempo de geração inclui encoder, condicionamento da imagem, geração, refinamento, decode e gravação do MP4 original.

## Configurações e limite da comparação

Ambas: TORCH_SDPA, 8 passos de base + 3 de refinamento, sem torch.compile, VAE em blocos de 512 pixels e 64 frames. RTX: offload do encoder de texto. L40S: FP8 e alternância explícita de componentes entre CPU e GPU. Portanto, a comparação avalia duas configurações viáveis; não isola apenas a diferença entre placas.

A L40S falhou na primeira tentativa por falta de memória durante a leitura do prompt. As flags comuns de offload deixavam gerador e encoder juntos na GPU. O script de teste foi ajustado para estacionar o gerador na RAM durante o prompt, retirar o encoder após usá-lo e trazer o gerador para a GPU somente durante cada etapa de denoising. Essa falha consumiu 102,74 s remotos, aproximadamente US$0,0557 de GPU, preservados em `l40s/metricas_tentativa1.json`.

Somando as durações remotas medidas dos testes autorizados: GPU ≈ US$0,578 e GPU + recursos de CPU/RAM solicitados ≈ US$0,868. Não inclui inicialização e despesas fora das durações medidas, nem o teste B200 anterior.

## Avaliação

LTX aceita referência de imagem e preservou o personagem e o cenário nos quadros inspecionados. A RTX manteve melhor a composição da cena; a L40S apresentou mais variação na posição do robô. A folha de contato não permite afirmar equivalência de fluidez ou qualidade de áudio.

Nesta cena e nestas receitas, a RTX foi 2,18 vezes mais rápida na geração aquecida e custou cerca de 29% menos em GPU por clipe. Incluindo a estimativa de CPU/RAM solicitadas, a economia foi de aproximadamente 38%. A L40S funcionou em Full HD com o ajuste de memória, mas não compensou economicamente neste teste. Não há evidência para generalizar esse resultado a todos os prompts ou a uma receita otimizada com outros kernels.

O teste B200 anterior era texto→vídeo, sem referência, com outra política de memória e sem medição aquecida. Seus 73,14 s não constituem comparação controlada com estes resultados.

## Arquivos

- `rtx_pro_6000/referencia_1080p_2.mp4`: vídeo da segunda geração RTX.
- `l40s/referencia_1080p_2.mp4`: vídeo da segunda geração L40S.
- `*/metricas.json`: métricas completas, revisões, prompt, hash da referência, etapas e ffprobe.
- `*/contato.jpg`: folhas de contato de cinco instantes de cada vídeo.
- Script: `../comparar.py`.

Confirmado por `modal app list --json`: ambos os apps parados, zero tarefas. Nenhum endpoint permanente ou volume de pesos criado.

Execuções: https://modal.com/apps/abduzido344/main/ap-WP2XlJH6Jv1OPf0POT4Dw4 e https://modal.com/apps/abduzido344/main/ap-9AB3pa8pzo6jhydb39069d

Receita de referência: https://github.com/hao-ai-lab/FastVideo/blob/4deb3a50fff8fff8c469d686c8e40fe6d9b03551/examples/inference/basic/basic_ltx2_3_distilled_i2v.py
