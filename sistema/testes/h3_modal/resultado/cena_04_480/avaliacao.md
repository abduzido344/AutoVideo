# Cena 04 — primeiro FL2VA funcional

10/11/2026, horário de São Paulo. Somente start `04_o_professor_v3.png`, sem imagem final. Um clipe gerado, sem narração ou montagem.

## Resultado

`h3.mp4`: H.264 yuv420p, 480×832, 124 frames contados, 24 fps, 5,166667 s; AAC estéreo 32 kHz, 5,167 s; 1.709.672 bytes. ffprobe local em `ffprobe.json`; decodificação completa com ffmpeg sem erros (`ffmpeg_validacao.log` vazio). Áudio presente, mas conteúdo sonoro não foi ouvido/avaliado.

Folha `contato.jpg`: seis amostras em 0, 1, 2, 3, 4 e 5 s. Rostos e roupas da mãe e professor permanecem coerentes com a referência. Filha preservada ao fundo, com detalhe limitado pela resolução. Marmita e toalha continuam sustentadas. Braços conectados, sem duplicação grosseira visível; dedos na gola mudam discretamente de forma e merecem revisão em tamanho final. Movimento pequeno de mão/gola e expressão, sem corte evidente nas amostras. A mão permanece junto à gola; não há um gesto amplo de encerramento. Inspeção por amostras não garante ausência de artefatos entre elas nem permite certificar fluidez integral.

## Medidas

- GPU real: NVIDIA RTX PRO 6000 Blackwell Server Edition.
- BF16 oficial, 50 pontos de scheduler, seed 42, Torch SDPA, sem compile, lazy modules e encoder/VAE CPU offload.
- Geração incluindo carregamentos tardios: 268,406 s.
- Função incluindo shutdown: 269,736 s; chamada cliente: 286,799 s.
- Estimativa da função pelos recursos solicitados: US$0,37036. Não é a cobrança total: exclui primeira inicialização, build, tentativa inicial que falhou e demais adicionais. Total faturado não consultado.
- Maior pico alocado nos logs de estágio: 64,38 GiB; reservado no denoising: 72,97 GiB. O campo original de pico final em metricas.json não representa o máximo global.
- Condicionamento: 49,095 s; preparação de latentes: 12,868 s; denoising com carga do transformer: 198,184 s; decode vídeo: 4,072 s; decode áudio: 1,514 s.
- Primeira preparação: download dos 84 arquivos em ~347 s e salvamento da imagem em 214,07 s, além dos demais tempos de build.

## Correção e encerramento

Primeira chamada falhou antes da geração com `NotImplementedError: ... pipeline.preset`. Removido esse campo incompatível; o exemplo oficial no SHA fixado também deixa a seleção a cargo do modelo. Segunda chamada reutilizou o build e confirmou `MiniMaxH3ModularPipeline`, com transformer BF16 de 33,12B parâmetros. Não houve segunda geração de vídeo.

Logs completos em `../../execucao_cena04.log` e `../../execucao_cena04_erro_preset.log`. Revisões e prompt em `metricas.json`.

App final `ap-Mfdwu5UCpReVUeuBsz4Nea`: stopped, 0 tasks, encerrado às 22:07:18 -03:00. App inicial `ap-zIIAs1eIRSLyNql5vxzDe3`: stopped, 0 tasks. Evidência em `modal_apps_final.json`. Sem endpoint ou volume permanente criado. Imagem de build permanece no cache Modal.

Baseline funcional nesta cena/resolução; ainda não valida seis cenas, desempenho em 768, otimizações, GGUF ou checkpoints t2av como I2V.
