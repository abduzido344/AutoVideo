---
name: producao
description: Orquestra a produção de um vídeo por subagentes (produzir vídeo, próxima etapa, continuar vídeo) — cadeias, portões de aprovação, GPU em fila e devolução entre agentes.
---

# Produção por subagentes

O usuário pediu que a produção seja feita por subagentes: acione os agentes de `.claude/agents/` pelo nome (pesquisador, roteirista, narrador, diretor, cenografo, animador-2d, animador-3d, sonoplasta, montador, publicador, revisor). O chat principal não escreve roteiro, cena nem EDL.

## Orquestrador
1. `python sistema/pipeline/ep.py <canal|pasta>` → etapa e dono.
2. Escrever ou atualizar `brief.md` da pasta (campos em `passagem.md`).
3. Acionar o agente pelo nome com brief de 5 linhas: pasta, etapa, o que ler, o que entregar, portão seguinte.
4. Ler só o retorno (≤8 linhas); conferir `git status`: ninguém escreveu fora da sua lista.
5. No portão, mostrar o arquivo ou a folha de contato, perguntar e gravar `aprovado:` no `brief.md`.
6. Levar `aprendizado` para a skill da etapa e pendências de canal para `canal.md`.

## Cadeias (→ sequencial, ‖ paralelo, [G] aprovação)
**Longo 2D**
```
pesquisador(ideias) → [G1 ideia] → pesquisador(fatos) → roteirista → revisor R1 → [G2 roteiro]
→ narrador ‖ pesquisador(prints) ‖ publicador(rascunho)
→ diretor → [G3 storyboard]
→ cenografo ‖ animador-2d ‖ sonoplasta ‖ publicador(thumbnails)
→ montador → revisor R2 → [G4 final] → publicador(fecha) → revisor R3 → [G5 postar] → orquestrador posta
```
Cena MOTION que usa imagem espera a passagem do cenógrafo; o animador faz essas por último.

**Vertical 2D**: a cadeia do longo sem G1 e G3 (ideia vem do `novo-video`; storyboard aparece junto do final). Corte de longo: `montador(corte.py)` → R2 → [G4] → publicador → [G5].

**3D (short ou longo)**
```
pesquisador(fatos, só em vídeo de escala) → roteirista → R1 → [G2] → narrador → diretor → [G3 storyboard + elenco]
→ animador-3d(elenco, teste 4 s) → [G3b teste] → animador-3d(animação, render) ‖ sonoplasta ‖ publicador(rascunho)
→ montador → R2 → [G4] → publicador → R3 → [G5]
```

## Portões
Longo: G1 ideia, G2 roteiro, G3 storyboard, G4 final, G5 postar. Vertical: sem G1 e G3. 3D: G3 também aprova o elenco, e G3b é o teste de 4 s. Fora dos portões o orquestrador segue sem pedir aprovação.

## Modelo por chamada
O parâmetro `model` da chamada sobrepõe o do arquivo do agente: revisor no roteiro (R1) em Opus · alto; diretor em short em Sonnet.

## GPU
Só narrador e cenógrafo chamam Modal, nunca na mesma fase; com dois vídeos abertos, em fila. Rodar com `--ok` e informar o custo real depois (`medidas` da passagem e relatório do portão).

## Devolução
- Ninguém edita arquivo de outro: `estado: devolve:<agente>` + pendência com lugar e menor mudança. O orquestrador reabre o dono (SendMessage se a instância existir; senão nova, com `brief.md` + a passagem).
- Máximo 2 devoluções por portão; depois vai ao usuário.
- Correção de até ~10 linhas em um arquivo: o orquestrador faz e anota na passagem da etapa.

## Posse (resumo; tabela completa em `passagem.md`)
orquestrador: `brief.md`, arquivos do canal, skills · pesquisador: `fontes.md`, `midia/fontes/` · roteirista: `narracao.txt`, `marcos.txt` · narrador: `audio/` · diretor: `storyboard.md` · cenógrafo: `prompts_ia.md`, `midia/cenas/` · animadores: motion/3D · sonoplasta: som · montador: EDL, legendas, `final.mp4` · publicador: `publicacao.md`, `thumbs/`.

## Não abrir
`audio/palavras.json`, `legendas.ass`, `.mjs`, `.tsx`: quem lê é o agente dono.

## Fora desta skill
`novo-canal`, `criar-personagem` e `novo-video` continuam no chat (precisam de perguntas ao usuário). Vídeo sem `brief.md` segue o fluxo antigo das skills de etapa (`video-longo`, `video-vertical`, `video-3d`, `publicacao`), que valem para fazer um trecho no chat.
