---
name: motion-design
description: Motion 2D dos vídeos (rig SVG do canal → resvg → ffmpeg) — personagem animado, motion graphics, tempos e easing. Use ao animar cenas MOTION, personagem 2D ou transições de vídeo.
license: MIT (base LottieFiles, ver LICENSE)
---

# Motion 2D

Personagem em cena: ler **`director/personagem.md`** (12 princípios no rig, limites do corpo, IK, receitas, conferência). Motion graphics que funcionam e números de tela: `../video-longo/edicao.md` › Motion graphics.

## Base (24 qps)
- Entrada 500–800 ms ease-out, saída 300–500 ms ease-in, sem overshoot. Nunca linear em movimento espacial (só em contador/barra).
- Mudança importante nunca só por opacidade: junto com posição ou escala.
- Três camadas: principal (a ação) + secundária (sombra, reação) + ambiente (respiração, leve deriva).
- Antecipação antes de gesto grande; follow-through no fim. Escalonar elementos em 60–120 ms.
- Movimento maior que 1/3 da tela ganha quadro intermediário (arco).
- Uma personalidade por vídeo (do `canal.md`), igual em todas as cenas.

## Prévia antes do render
1 quadro por cena → folha de contato numa imagem → revisar → só então renderizar.

## Consulta (abrir só se precisar)
`reference/timing-easing-tables.md` (durações e curvas) · `director/choreography.md` (vários elementos) · `director/disney-principles.md` · `director/emotion-mapping.md` · `reference/troubleshooting.md` · `reference/lottiefiles-skill-original.md` (skill original completa).
