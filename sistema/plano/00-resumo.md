# Resumo do plano (2026-11-09)

Só plano: nada foi implementado. Detalhe em `01-arquitetura-subagentes.md`, `02-mudancas-skills.md`, `03-execucao.md`.

## Decisões tomadas
- O chat principal vira orquestrador (skill nova `producao`): lê `ep.py` e retornos de 8 linhas, não escreve roteiro, cena nem EDL.
- 11 agentes em `.claude/agents/`: pesquisador, roteirista, narrador, diretor, cenógrafo, animador-2d, animador-3d, sonoplasta, montador, publicador, revisor. Um dono por arquivo; arquivo de canal, skill e postagem ficam com o orquestrador.
- Passagem na pasta do vídeo: `brief.md` (orquestrador), `marcos.txt` (roteirista), `fontes.md` (pesquisador), `passagem/<etapa>.md` com 6 campos fixos. Ninguém edita arquivo de outro: devolve ao dono, no máximo 2 vezes por portão.
- Paralelo depois do storyboard: imagens ‖ motion ‖ som ‖ thumbnails. GPU só no narrador e no cenógrafo, nunca juntos.
- Revisor independente, sem Write, em três pontos: roteiro, final, publicação.
- `novo-canal`, `criar-personagem` e `novo-video` continuam no chat (são interativos).
- Regras de roteiro: promessa até 0:30 e gancho de 3 tempos fechado em 1:00; primeira revelação até 2:30; palavras pelo ppm medido do canal (155 sem medida); competição com 1ª ação e escada até 0:30, num arquivo único `competicao.md`; `[pausa 1.5]` em até 2 revelações; teste de CTA por paridade do número do vídeo.
- Checagem automática proposta: `medir.py` (marcos, ppm, CTA) e `ep.py` com dono, etapas novas e pendências.

## Custo
- Modelos: Opus no roteirista, no diretor, na revisão do roteiro e nos animadores 2D e 3D (Opus médio, decisão do usuário em 09/11); Haiku no narrador; Sonnet no resto. Como a animação é o maior volume, cerca de metade dos tokens continua em Opus, com +10–15% de releitura por agente: o ganho principal é contexto, não preço. É estimativa: o piloto mede.
- Implementar: 5 tarefas Sonnet pequenas + 1 revisão Opus, menos que a produção de um vídeo.
- Piloto 1 fora dos tokens: ≈ US$ 0,25 de voz e centavos de imagem.

## Ordem
1. Preparação: snapshot da árvore, conferir frontmatter dos agentes, decisões abaixo.
2. Onda 1 em paralelo: skills de roteiro (S1) · `medir.py` (M1) · agentes (A1) · skill `producao` (O1).
3. Onda 2: `ep.py` (E2) e ponteiros em `CLAUDE.md`, `novo-video`, `canal.md`, memória.
4. Revisão independente (Opus, só leitura).
5. Pilotos, um por vez: short vertical 2D no Manual do Quase Adulto → short 3D de competição no Até Onde Aguenta → longo 007.

## Achados da leitura
- O 006 tem a promessa em 1:44 (parágrafo 7) e a primeira revelação em 4:15; a voz mede 151 ppm no MQA e 160–169 no AOA, contra os 133 da skill.
- Longo 3D (AOA 001 e 002) não tem skill: as regras de competição vivem só em `canal.md` e na memória.
- `ep.py` não enxerga imagens, motion, som nem revisão.

## Para o usuário decidir
1. **Portões**: 5 por longo (ideia, roteiro, storyboard, final, postar) ou aprovar toda etapa como hoje? Recomendo 5.
2. **Snapshot**: fazer um commit da árvore atual (44 arquivos pendentes) antes de implementar, ou só cópia de backup? Recomendo o commit.
3. **Gancho de 3 tempos**: aceita fechar em 1:00 com a promessa dita até 0:30, logo depois do 1º tempo?
4. **Silêncio**: aceita `[pausa 1.5]` depois de até 2 revelações, mesmo com a regra de voz sem pausa dramática?
5. **CTA**: tirar da abertura já no próximo longo e testar por paridade (ímpar depois da 1ª revelação, par na última cena)?
6. **Competição**: regra geral sai do `canal.md` do AOA para `video-longo/competicao.md`?
7. **Modelos**: animadores já definidos em Opus médio. Roteirista, diretor e revisão do roteiro também em Opus, ou em Sonnet para gastar menos?
8. **Piloto 1**: qual ideia `[vertical]` do Manual do Quase Adulto?
