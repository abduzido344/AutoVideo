# Passagem entre agentes

Na pasta do vídeo, além do que já existe.

## `brief.md` (só o orquestrador, ≤15 linhas)
```
canal:
formato: longo | vertical | 3d
tipo: informativo | competicao-fato | competicao-livre | historia
pesquisa: pulada (motivo)   # só se pulou
ideia:
duração e palavras-alvo: (ppm do canal)
braço do CTA:
decisões do usuário:
aprovado: <portão> <data> <observação>
```

## `marcos.txt` (roteirista)
```
promessa 3
gancho 5
revelacao 9
virada 31
```
Competição: `acao 2`, `escada 2`. O número é o do parágrafo.

## `passagem/<etapa>.md` (um por agente, ≤12 linhas)
```
estado: pronto | devolve:<agente> | bloqueado
entregue: arquivos
decisões: o que escolhi e por quê (1 linha cada)
medidas: palavras, ppm, duração, custo de GPU
pendências: [para quem] o quê, onde (parágrafo/cena)
aprendizado: regra reutilizável, se houver
```
Etapas: `dossie`, `fontes`, `roteiro`, `narracao`, `storyboard`, `cenas`, `motion`, `animacao3d`, `som`, `montagem`, `publicacao`. O retorno do agente ao orquestrador é o mesmo texto, ≤8 linhas. Pareceres do revisor, salvos pelo orquestrador: `passagem/revisao-roteiro.md` (R1), `revisao-final.md` (R2), `revisao-publicacao.md` (R3).

## Posse de arquivos
| Arquivo | Dono |
|---|---|
| `brief.md`, `passagem/revisao-*.md`, arquivos do canal, skills, `postar.py` real | orquestrador |
| `dossie.md`, `fontes.md`, `midia/fontes/` (`dados_*.csv`, figuras; print só a pedido do diretor) | pesquisador |
| `narracao.txt`, `marcos.txt` | roteirista |
| `audio/` | narrador |
| `storyboard.md` | diretor |
| `prompts_ia.md`, `midia/cenas/` | cenógrafo |
| `motion/effectcraft/mNNN*.mjs`, `midia/motion/` | animador-2d |
| `tres/src/videos/<canal>/<id>.*`, registro em `tres/src/Root.tsx`, `midia/<id>.mp4` | animador-3d |
| `midia/sfx.csv`, `midia/trilha.*`, `sistema/sons/alias.tsv` | sonoplasta |
| `midia/edl.csv`, `cor.txt`, `numeros.txt`, `legendas.*`, `final.mp4` | montador |
| `midia/publicacao.md`, `midia/thumbs/`, `motion/effectcraft/thumbNNN.mjs` | publicador |

Cada agente só escreve na pasta do vídeo e na sua área de código. A posse vale por instrução; o orquestrador confere com `git status` depois de cada onda.
