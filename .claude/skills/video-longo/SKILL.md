---
name: video-longo
description: Produz um vídeo horizontal 16:9 longo (~8 min) de um canal em canais/<canal>/ — ideia, roteiro, narração, storyboard e prompts de IA. Use para novo vídeo, novo episódio ou roteiro de vídeo longo.
---

# Vídeo longo (16:9, ~8 min)

Ler `canais/<canal>/canal.md` antes. Pasta: `canais/<canal>/videos/NNN_tema/`. Cenas: `formatos.md`. Edição: `edicao.md`. Uma etapa por vez; mostrar o resultado e esperar aprovação. Estado e próximo comando: `python sistema/pipeline/ep.py <pasta>`.

## 1. Ideia → `canais/<canal>/ideias.md`
Fontes: vídeos gringos (busca em inglês, `&hl=en&gl=US`) do último ano com ≥500 mil views (ideal ≥1 mi) ou muito acima da média do próprio canal = tema provado; ou temas de `sistema/referencias/MODEL PDF.pdf`. Trazer a dor concreta do público com exemplos reais dele.
Uma linha por ideia: título · prova (link, views) · gancho · ação visual (personagem + objeto). Só entra o que dá para mostrar com o personagem e um objeto.

## 2. Roteiro → `narracao.txt`
~1100 palavras (≈133 palavras/min → ~8 min). Parágrafos separados por linha em branco, números por extenso.
- Pontuação de fala e direção de voz (ironia, entusiasmo, tom baixo, tensão…): `voz.md`. Frases corridas, poucos sinais; uma `[direção]` em cada parágrafo que tem intenção própria.
- Abertura em 3 tempos: curiosidade de filosofia/história → fato crítico do problema → fato que aponta a solução ("guarda essa ideia", pago depois com "lembra da ideia que eu pedi para você guardar?"). Primeira frase em um padrão: contrário, pergunta, número, erro ou história.
- Logo depois da abertura, CTA curto (~10 s, `[warm, friendly]`): like e inscrição ligados ao tema.
- Promessa até ~30 s; re-gancho (pergunta) no meio; fecho volta à cena de abertura e ao primeiro tempo.
- Um parágrafo = uma ideia que vira cena. Segunda pessoa, situações e números concretos.
- Variar o ritmo pela direção (`<slow>`, `<fast>`, tom baixo), não por frases picadas.
- Nunca inventar estudo, número ou autor: conferir os estudos centrais online antes de narrar. Anedota fora do estudo entra como "a história conta". Tema de saúde mental: uma linha indicando um profissional.

## 3. Narração → `audio/`
`PYTHONIOENCODING=utf8 python sistema/pipeline/narrar.py canais/<canal>/videos/NNN_tema --enxuto` mostra a densidade de pontuação e o custo (~US$ 1 por 10 min); corrigir o texto se a meta não bate, pedir ok e rodar com `--ok`. `--enxuto` corta silêncios longos dentro dos parágrafos (vídeos novos; em vídeo já editado muda os tempos). Refaz só parágrafo mudado (`--refazer=3,5` força). `audio/palavras.json` sai junto. Ouvir os parágrafos com tag e os nomes estrangeiros (se a voz errar, grafar foneticamente).

## 4. Storyboard → `storyboard.md`
A partir de `audio/palavras.json`. Agrupar parágrafos em blocos; nem toda frase vira cena. ≈6–8 cenas-mestre, cada uma voltando 2–4×. Coluna Som preenchida (vira `sfx.csv`).
Cada fonte citada (estudo, livro, autor): achar a página real (artigo, capa do livro), salvar o print recortado em `midia/fontes/` e virar cena MOTION com o print no momento em que é citada.

## 5. Prompts → `prompts_ia.md`
Só as cenas IMAGEM, nos blocos ```img / ```edit de `formatos.md`; imagens em `midia/cenas/`.

## 6. Motion e montagem (`edicao.md`)
MOTION com a skill `motion-design` e o rig do canal (`motion/`); entradas 500–800 ms ease-out, sem overshoot. Personagem animado: `motion-design/director/personagem.md`. Montar sobre `audio/narracao.wav`: `midia/edl.csv`, `midia/cor.txt` (`fria>quente` em segundos) `montar.py <pasta> --checar` e `python sistema/pipeline/montar.py <pasta do vídeo>` → `midia/final.mp4`.
- Legenda e som fazem parte do entregável: `python sistema/pipeline/legendar.py <pasta>` (com `midia/numeros.txt`) e `midia/sfx.csv` com ids/apelidos do Mixkit (`sons.py buscar`; ver edicao.md). Só refazer legenda/som: `montar.py <pasta> --acabamento`.
- Na descrição do YouTube: fontes e "Built with Fish Audio".

## 7. Publicação
Skill `publicacao`: 3 thumbnails e 3 títulos A/B, descrição com capítulos, tags → `midia/publicacao.md`. Depois, 2–3 shorts com `corte.py` (skill `video-vertical`).
