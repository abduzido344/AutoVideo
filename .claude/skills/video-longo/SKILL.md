---
name: video-longo
description: Produz um vídeo horizontal 16:9 longo (~8 min) de um canal em canais/<canal>/ — ideia, roteiro, narração, storyboard e prompts de IA. Use para novo vídeo, novo episódio ou roteiro de vídeo longo.
---

# Vídeo longo (16:9, ~8 min)

Ler `canais/<canal>/canal.md` antes. Pasta: `canais/<canal>/videos/NNN_tema/`. Cenas: `formatos.md`. Edição: `edicao.md`. Agentes e portões de aprovação: skill `producao`. Estado e próximo comando: `python sistema/pipeline/ep.py <pasta>`.

## 1. Ideia → `canais/<canal>/ideias.md`
Fontes: vídeos gringos (busca em inglês, `&hl=en&gl=US`) do último ano com ≥500 mil views (ideal ≥1 mi) ou muito acima da média do próprio canal = tema provado; ou temas de `sistema/referencias/MODEL PDF.pdf`. Trazer a dor concreta do público com exemplos reais dele.
Uma linha por ideia: título · prova (link, views) · gancho · ação visual (personagem + objeto). Só entra o que dá para mostrar com o personagem e um objeto.

## 2. Roteiro → `narracao.txt`
Palavras = minutos × ppm do canal (`canal.md` › Voz; sem medida, 155): 8 min ≈ 1.250. Parágrafos separados por linha em branco, números por extenso.
- Pontuação de fala e direção de voz (ironia, entusiasmo, tom baixo, tensão…): `voz.md`. Frases corridas, poucos sinais; uma `[direção]` em cada parágrafo que tem intenção própria.
- Abertura até ~1:00 (≈150 palavras) em 3 tempos: curiosidade de filosofia/história → fato crítico do problema → fato que aponta a solução, pago depois sem bordão (nunca "guarda essa ideia" nem "lembra da ideia que eu pedi para você guardar"). **A promessa do vídeo é dita até 0:30**, em uma frase, logo depois do 1º tempo. Primeira frase em um padrão: contrário, pergunta, número, erro ou história.
- CTA de inscrição (~10 s, `[warm, friendly]`, ligado ao tema) nunca antes da promessa. Em teste (`publicacao` › Teste de CTA): pasta de número ímpar, logo depois da primeira revelação (2–3 min); par, dentro da última cena.
- Primeira revelação da promessa (uma resposta, não mais contexto) até 2:30; re-gancho (pergunta) no meio; fecho volta à cena de abertura e ao primeiro tempo.
- Ideia tirada de um vídeo viral: manter o hook, o arco e o tom dele (ex.: motivacional) adaptados ao público; não se afastar do original.
- Um parágrafo = uma ideia que vira cena. Segunda pessoa, situações e números concretos.
- Variar o ritmo pela direção (`<slow>`, `<fast>`, tom baixo), não por frases picadas.
- Nunca inventar estudo, número ou autor: escrever a partir do `dossie.md`; fato novo volta ao pesquisador. Anedota fora do estudo entra como "a história conta". Tema de saúde mental: uma linha indicando um profissional.
- Competição ("último que…", "um vs outro") não usa esta estrutura: `competicao.md`.
- Marcar em `marcos.txt` o parágrafo de cada marco (`promessa 3`, `gancho 5`, `revelacao 9`, `virada 31`) e rodar `python sistema/pipeline/medir.py <pasta>` antes de pedir aprovação.

## 3. Narração → `audio/`
`PYTHONIOENCODING=utf8 python sistema/pipeline/narrar.py canais/<canal>/videos/NNN_tema --enxuto` mostra a densidade de pontuação e o custo (~US$ 1 por 10 min); corrigir o texto se a meta não bate, rodar com `--ok` e informar o custo depois. `--enxuto` corta silêncios longos dentro dos parágrafos (vídeos novos; em vídeo já editado muda os tempos). Refaz só parágrafo mudado (`--refazer=3,5` força). `audio/palavras.json` sai junto. Ouvir os parágrafos com tag e os nomes estrangeiros (se a voz errar, grafar foneticamente).

## 4. Storyboard → `storyboard.md`
A partir de `audio/palavras.json`. Agrupar parágrafos em blocos; nem toda frase vira cena. ≈6–8 cenas-mestre, cada uma voltando 2–4×. Coluna Som preenchida (vira `sfx.csv`).
Cada fonte citada ganha crédito na tela; o tratamento sai do cardápio de `producao/pesquisa.md` (o padrão é sem print; print só entra a pedido do diretor, no máximo 3 por vídeo, em português ou com legenda traduzida; nunca dois tratamentos iguais em sequência).

## 5. Prompts → `prompts_ia.md`
Só as cenas IMAGEM, nos blocos ```img / ```edit de `formatos.md`; imagens em `midia/cenas/`.

## 6. Motion e montagem (`edicao.md`)
MOTION com a skill `motion-design` e o rig do canal (`motion/`); entradas 500–800 ms ease-out, sem overshoot. Personagem animado: `motion-design/director/personagem.md`. Montar sobre `audio/narracao.wav`: `midia/edl.csv`, `midia/cor.txt` (`fria>quente` em segundos) `montar.py <pasta> --checar` e `python sistema/pipeline/montar.py <pasta do vídeo>` → `midia/final.mp4`.
- Legenda e som fazem parte do entregável: `python sistema/pipeline/legendar.py <pasta>` (com `midia/numeros.txt`) e `midia/sfx.csv` com ids/apelidos do Mixkit (`sons.py buscar`; ver edicao.md). Só refazer legenda/som: `montar.py <pasta> --acabamento`.
- Na descrição do YouTube: fontes e "Built with Fish Audio".

## 7. Publicação
Skill `publicacao`: 3 thumbnails e 3 títulos A/B, descrição com capítulos, tags → `midia/publicacao.md`. Depois, 2–3 shorts com `corte.py` (skill `video-vertical`).
