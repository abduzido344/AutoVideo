# Cena 04 — ClipProj 4B + Turbo6

Executado em 10/11/2026. Um clipe concluído. Apenas start `04_o_professor_v3.png`, mesmo prompt, seed 42, 480×832 e 124 frames. Sem imagem final, narração ou montagem.

## Comparação medida

| Medida | Baseline FastVideo | Otimizado ComfyUI |
|---|---:|---:|
| Encoder | Qwen3VL 32B BF16 | Qwen3VL 4B FP8 + ClipProj v3.1 |
| Gerador | H3 FL2VA 33,12B BF16 | H3 FL2VA BF16 + Larry Turbo v4 step600 EMA |
| Amostragem | 50 pontos scheduler | 6 passos, simple, sampler Turbo, força 1 |
| Função incluindo shutdown | 269,736 s | 69,572 s |
| Estimativa pelos recursos solicitados | US$0,37036 | US$0,09553 |
| Chamada cliente | 286,799 s | 75,586 s |

Redução aproximada de 74,2% no tempo da função e na estimativa pelos recursos solicitados. O H3 gerador continua grande: trocar o encoder não reduz seus 33B parâmetros. A receita também mudou runtime, sampler e encoder; não isola a contribuição de cada componente. Mesma seed entre implementações não significa mesmo ruído inicial.

ComfyUI reportou 57,86 s para executar o grafo; seis passos de amostragem em 31,4 s. Log confirmou encoder 4B com 4,88 GiB e projeção 2560→5120, 259 adaptadores LoRA e `BypassForwardHook` ativo nos seis forwards. O sampler detectou ModelSamplingAV nativo. Não foi instrumentado um pico global de VRAM nesta receita. O compilador interno do ComfyUI reportou uma quebra de grafo; isto não é uma reprodução idêntica do caminho FastVideo sem compile.

## Validação e avaliação

`h3.mp4`: H.264, 480×832, 124 frames contados, 24 fps, 5,166667 s; áudio AAC presente. Decodificação completa por ffmpeg sem erros. Detalhes em `ffprobe.json`; log de erros vazio em `ffmpeg_validacao.log`.

`contato.jpg`: amostras de 0 a 5 s. Identidades da mãe e professor coerentes com o início; filha reconhecível no fundo, com detalhe limitado. Marmita e toalha permanecem sustentadas; braços conectados, sem membro extra grosseiro visível. Dedos na gola variam de forma e contato, exigindo revisão em tamanho final. Movimento e sorrisos são mais amplos que no baseline: mãe mostra os dentes e professor abaixa/levanta a cabeça. A mão desce da gola para o peito. Mais ação, porém menos aderência ao pedido de expressão contida e movimento mínimo.

Qualidade avaliada por folha de contato reduzida, sem inspeção quadro a quadro; não certifica fluidez entre amostras. Conteúdo do áudio não ouvido nem avaliado. Não há demonstração de qualidade igual ao baseline, nem validação de outras cenas ou resoluções.

## Custo e preparação

US$0,09553 é uma estimativa da função bem-sucedida usando GPU RTX PRO6000 + 8 CPUs + 192 GiB solicitados. Exclui build, inicialização externa, chamadas anteriores que falharam e eventuais adicionais. Não representa o total faturado desta sessão, que não foi consultado. A preparação desta primeira integração foi longa e acrescenta custo.

Falhas corrigidas antes da amostragem: sintaxe local de instalação Modal; links simbólicos do cache HF movidos para outra pasta; tentativa de materialização com hardlink que ainda preservava link indireto. Arquivos foram finalmente copiados e validados no build CPU (66,28 GB gerador, 5,21 GB VAE vídeo, 0,61 GB VAE áudio, 5,24 GB encoder, 26 MB projeção, 780 MB LoRA). Não houve outras gerações concluídas.

## Encerramento e reprodução

App final `ap-agB0a3SqvI3cKjmZq2JYK0`: stopped, 0 tasks, encerrado às 22:28:41 -03:00. Apps anteriores da integração também stopped/0 tasks. Evidência: `modal_apps_final.json`. Servidor ComfyUI somente em loopback dentro da função, encerrado ao final; sem endpoint público, volume permanente ou container mínimo.

Script: `../../otimizado/teste_turbo.py`; log: `../../otimizado/execucao.log`. `metricas.json` contém grafo exato, revisões SHA dos três repositórios e dos seis pesos, histórico de execução e streams.

Fontes da integração: [ClipProj](https://huggingface.co/NicoLab28/ClipProj-MiniMax-H3), [Larry Turbo](https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora). Alegações dos autores não substituem esta medição.
