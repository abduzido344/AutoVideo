---
name: video-3d
description: Produz um short 3D cartoon por código (Three.js + Remotion em C:/Users/Abduzido/AutoVideo_local/tres/, sem Blender) — história, roteiro, narração marcada palavra a palavra, elenco, teste de 4 s, animação por agentes donos de regra, revisão e som. Use para vídeo 3D, short 3D ou canal ate-onde-aguenta.
---

# Short 3D (9:16, ~60 s)

Estilo e números: `C:/Users/Abduzido/AutoVideo_local/tres/regras.md` (6 regras, cada uma com um dono). Pasta `canais/<canal>/shorts/NNN_tema/`. Estado: `python sistema/pipeline/ep.py <pasta>`. Uma etapa por vez, mostrar e esperar aprovação.

## 1. História
Tem que caber em 3D: ≤3 personagens, ≤4 lugares, objetos concretos (roda de queijo, martelo, cofre). Fato real e verificável, curioso, com uma virada. Se não dá para listar o elenco em uma linha, trocar de história.

## 2. Roteiro → `narracao.txt` (~19 frases/min)
1ª frase é o gancho, sem introdução · segunda pessoa ("imagina que você…") · cada frase é uma imagem desenhável · número dito vira objeto · fim fecha a virada. Um parágrafo por frase. Conferir os fatos online.
Fala corrida, poucos sinais (sem `:` `;` `—` `…`), e `[direção]` de voz em cada frase com intenção própria (ironia, susto, tom baixo): `.claude/skills/video-longo/voz.md`.

## 3. Voz → `audio/`
`narrar.py <pasta>` (custo; `--ok` gera). Short corta silêncios longos e grava `palavras.json` (início de cada palavra), que comanda gesto, expressão, corte e legenda. Copiar `audio/narracao.wav` para `tres/public/audio/<id>.wav` (o render não usa `--public-dir`).

## 4. Storyboard → `storyboard.md`
Uma linha por frase: palavra-gatilho · quem · onde · faz o quê · câmera (enquadramento + movimento) · objeto-informação · som do acontecimento. No topo, o elenco: personagens e lugares, cada um construído uma vez e reaproveitado.

## 5. Elenco
Padrão em `regras.md` › "Padrão de personagem e cenário": pessoas = `gente3d/Heroi.tsx` (corpo e animações Quaternius CC0 + cabeça cartoon por código, `Visual` troca cores de pele, roupa e cabelo); cenários e texturas de Poly Haven, ambientCG, Kenney, Quaternius ou Solar System Scope antes de modelar à mão. Lugar novo em `tres/src/cenarios/`. Still de cada um; juntos numa folha: mesma família (proporção, material, luz)? Só então animar.

## 6. Teste de 4 s
Só o primeiro plano: cabeça no tamanho, luz suave, gesto terminando antes da palavra. Corrigir pela regra dona antes de seguir.

## 7. Animação → `C:/Users/Abduzido/AutoVideo_local/tres/src/videos/<canal>/sNNN.tsx`
Copiar `Teste.tsx`, registrar em `src/Root.tsx`. `gestos`, `caras` e `planos` amarrados às palavras. Contato físico: o que rola gira no chão, a mão toca no instante do impacto, a câmera acompanha o que abre. O `.tsx` fica salvo: é a fonte do vídeo.

## 8. Revisão
Render inteiro → folha de contato (uma imagem, `tile=8x2`, escala 0,5) em vez de vários stills. Quatro perguntas: atravessa objeto? pé desliza? expressão atrasada? câmera mostra o que importa? Corrigir só a cena, só pelo dono da regra; o resto não muda.

## 9. Som e montagem
`out/sNNN.mp4` → `midia/`; `edl.csv` de uma linha; `sfx.csv` com um efeito por acontecimento (coluna som do storyboard); `midia/trilha.*` opcional sob a voz. `legendar.py` → `montar.py --checar` → `montar.py`.

## 10. Publicação
Skill `publicacao` (modo short).

## Agentes
Um subagente por regra só quando há correção em várias regras ao mesmo tempo; cada um mexe apenas nos arquivos da sua regra e renderiza antes de dizer que terminou. Uma correção simples se faz aqui mesmo.
