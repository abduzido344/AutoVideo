# Teste único — cena 01, encoder original 32B, Turbo8, 768p

11/11/2026. Motivação: usuário reprovou rostos ao fundo no reel anterior (olhos/boca distorcidos). A aprovação técnica anterior não comprovou qualidade facial suficiente.

## Receita executada

Uma única geração da cena01, mesma imagem `01_duas_marmitas_vertical.png`, prompt do manifesto e seed42. Start-only, 124quadros/24fps, 5,166667s. H3 FL2VA BF16, encoder original Qwen3VL32B com pesos BF16 (51.506.295.256bytes), sem ClipProj. ComfyUI registrou cálculo FP16 para o encoder e BF16 para o transformer; não houve quantização FP8 do encoder.

Resolução nativa768×1344, superior a720p e múltipla de32. Larry Turbo v4 step600 EMA, força1, scheduler simple,8passos. Não usados12passos: o autor recomenda4–8 e alerta para artefatos de excesso de nitidez acima8. Não encontrada opção16B compatível no pacote oficial; ClipProj documenta4B/8B.

Runtime/revisões e grafo exato em `metricas.json`. Uma RTX PRO6000 de96GB,8CPUs,192GiB solicitados, timeout900s,0retries,1container máximo,0mínimos. ComfyUI apenas loopback; nenhum endpoint público ou volume permanente.

## Tempo e custo

- Função com inicialização do servidor, carregamentos e shutdown:193,482721s.
- Estimativa da função pelos recursos solicitados:US$0,2656595.
- Grafo ComfyUI:177,45s;8passos:96,7s.
- Comparação com cena01 anterior:76,835s eUS$0,10550; nova função aproximadamente2,52× o custo.
- Exclui download/build, inicialização fora da função e demais adicionais; total faturado não consultado.
- App inteiro incluiu preparação extensa, criado08:43:24 e encerrado09:07:44(-03). Salvamento da camada439,80s. Esses24min20s não são tempo de geração nem permitem inferir cobrança deGPU durante todo o período.

## Arquivos e validação

`h3.mp4`:768×1344,H.264,124quadros contados,24fps,5,166667s, áudio original presente mas não avaliado.

`h3_1080x1920.mp4`:ampliação local Lanczos com pequeno recorte central para9:16, sem áudio,1080×1920,124quadros,24fps. Não há detalhe novo criado por esse upscale, nem interpolação de quadros, congelamento ou montagem.

Ambos decodificaram integralmente sem erros (logsffmpeg vazios). `contato.jpg`:seis amostras0–5s. `comparacao_rosto.jpg`:linha superior versão480p/4B/6passos; inferior768p/32B/8passos. Recortes aproximadamente equivalentes, normalizados para192×240; amostragem não certifica estabilidade entre os quadros.

## Avaliação visual

Mais textura e definição no rosto/cabelo/roupa ao fundo. A filha permanece reconhecível e a boca fica fechada nas amostras. Contudo, ainda há pequenas alterações na forma/alinhamento dos olhos e na expressão; não considero comprovado que o problema facial do reel esteja resolvido. A melhoria de resolução não equivale a anatomia perfeita.

Mãe, ambiente e duas marmitas preservados nas amostras; colher e dedos variam durante o gesto. Mudamos encoder, resolução e passos juntos: o teste compara receitas completas e não identifica a contribuição isolada de cada mudança. Não aprovar automaticamente as outras cinco cenas com base nesta.

## Encerramento

App `ap-Hr4ClUgVnpz3nDfhKJVFuv`:stopped,0tasks,09:07:44(-03),evidência em `modal_apps_final.json`. Única geração concluída, sem refação. Houve timeout apenas na espera dos últimos logs locais após salvar oMP4; o app concluiu e o estado final foi confirmado.

Fontes: [encoders oficiais](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/54472221d27c695fca9621b0c3ed52f06c4af707/text_encoders), [Turbo](https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora), [ClipProj](https://huggingface.co/NicoLab28/ClipProj-MiniMax-H3).
