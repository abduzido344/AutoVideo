# Execução por subagentes

Ordem: P (orquestrador) → onda 1 (4 tarefas em paralelo) → onda 2 → revisão → pilotos. Nenhuma tarefa roda GPU, faz commit ou mexe em vídeo existente. Todo brief = bloco **Comum** + o bloco da tarefa.

```
Comum: Projeto em C:\Users\Abduzido\OneDrive\Documentos\Auto_Video (leia CLAUDE.md). Português do Brasil, arquivos curtos,
sem comentários nem explicações. Não faça commit, não rode Modal/GPU, não toque em nada fora da lista de arquivos da tarefa.
Há mudanças não commitadas do usuário: altere só os trechos pedidos, com Edit, sem reescrever o arquivo inteiro.
Termine com: arquivos alterados, resultado de cada verificação, dúvidas.
```

## P · Preparação (orquestrador)
- **P1 Snapshot.** Recomendado: o usuário faz um commit da árvore atual (44 arquivos pendentes). Sem commit: copiar `.claude/skills/`, `sistema/pipeline/ep.py` e `CLAUDE.md` para `sistema/plano/backup/`. Nos dois casos: `python sistema/pipeline/ep.py > sistema/plano/backup/ep-antes.txt`.
- **P2 Frontmatter.** Perguntar ao agente `claude-code-guide` quais campos `.claude/agents/*.md` aceita hoje (`skills`, `effort`, nomes de modelo) e colar a resposta no brief de A1.
- **P3 Decisões** do usuário (lista no `00-resumo.md`). Mudam S1 (gancho, pausa, `competicao.md`), A1 (modelos) e O1 (portões).

## Onda 1 (paralelo; arquivos sem sobreposição)

### S1 · Regras de roteiro nas skills — Sonnet · baixo
Arquivos: `.claude/skills/video-longo/SKILL.md`, `video-longo/voz.md`, `video-longo/competicao.md` (novo), `video-vertical/SKILL.md`, `video-3d/SKILL.md`, `publicacao/SKILL.md`.
```
Aplique os blocos B1 a B6 de sistema/plano/02-mudancas-skills.md, exatamente com o texto-alvo de cada um (o texto dentro
de ">"), nos arquivos indicados em cada bloco. "Troca" = substituir a linha atual citada; "acrescenta" = inserir no lugar
dito. Não mude mais nada, não reordene seções, não copie para as skills as explicações que estão fora dos blocos ">".
```
Verificar: `git diff --stat` mostra só esses 5 arquivos + 1 novo · somem "133 palavras", "19 frases/min", "Logo depois da abertura, CTA", "Um subagente por regra" · aparecem "0:30" e "2:30" em `video-longo/SKILL.md`, "Teste de CTA" em `publicacao`, "competicao.md" em 3 skills · `competicao.md` ≤ 14 linhas · nenhum arquivo cresce mais de 1 KB.
Rollback: `git checkout <snapshot> -- .claude/skills/` (ou copiar do backup) e apagar `competicao.md`.

### M1 · `medir.py` — Sonnet · médio
Arquivo: `sistema/pipeline/medir.py` (novo).
```
Crie sistema/pipeline/medir.py conforme a seção "Checagem automática" de sistema/plano/02-mudancas-skills.md (uso, entradas,
tabela de limites). Estilo dos scripts vizinhos (veja ep.py e narrar.py: docstring curta de uso, sem comentários, sem
dependência nova; reaproveite a limpeza de tags de narrar.py e comum.vertical). Não grava arquivo: só imprime uma linha por
checagem com "ok" ou "FORA" e sai com código 1 se houver FORA. Número ímpar/par vem do NNN da pasta. Sem áudio, estima o
tempo por palavras acumuladas ÷ ppm e marca com "~". Até ~120 linhas. Teste só lendo os vídeos existentes, sem criar nada
dentro de canais/.
```
Verificar: no 006 do manual-do-quase-adulto com `--marcos=promessa:7,revelacao:26` → 151 ppm (±1), promessa 1:44 FORA, revelação 4:15 FORA, CTA no parágrafo 6 (1:31) · AOA `videos/002` → 160 ppm · AOA `shorts/001` → 169 ppm e "inscrev" ausente · cópia do `narracao.txt` numa pasta temporária sem `audio/` → tempos com `~` · `echo $?` = 1 quando há FORA.
Rollback: apagar o arquivo.

### A1 · Definições dos agentes — Sonnet · baixo
Arquivos: `.claude/agents/{pesquisador,roteirista,narrador,diretor,cenografo,animador-2d,animador-3d,sonoplasta,montador,publicador,revisor}.md` (novos).
```
Crie os 11 arquivos de .claude/agents/ a partir de sistema/plano/01-arquitetura-subagentes.md: seções "Agentes" (tabela de
modelo e o parágrafo de cada um), "Passagem", "Posse de arquivos" e "Definições" (modelo de arquivo). Frontmatter: name,
description (quando acionar, 1 frase), tools, model; use skills/effort só se a nota abaixo disser que existem.
Corpo ≤ 20 linhas com os títulos Papel · Lê · Escreve (só isto) · Pronto · Devolve quando · Retorno. Aponte para a skill e a
seção em vez de copiar regra. revisor sem Write/Edit; roteirista sem WebSearch/WebFetch; só narrador e cenógrafo citam
scripts de GPU. [colar aqui a resposta de P2 sobre o frontmatter]
```
Verificar: 11 arquivos, cada um ≤ 25 linhas, `name` = nome do arquivo · `tools` e `model` iguais à tabela do `01` · nenhum caminho de "Escreve" aparece em dois agentes · numa sessão nova, os 11 aparecem na lista de agentes.
Rollback: apagar `.claude/agents/`.

### O1 · Skill `producao` — Sonnet · médio
Arquivos: `.claude/skills/producao/SKILL.md`, `.claude/skills/producao/passagem.md` (novos).
```
Crie a skill producao (orquestração por subagentes) a partir de sistema/plano/01-arquitetura-subagentes.md: seções
"Orquestrador", "Cadeias", "Passagem" e "Posse de arquivos". SKILL.md ≤ 60 linhas: frontmatter (name, description com
"produzir vídeo", "próxima etapa", "continuar vídeo"); frase dizendo que o usuário pediu produção por subagentes e que os
agentes de .claude/agents/ devem ser acionados pelo nome; os 6 passos do orquestrador; as 3 cadeias com → ‖ [G]; regra de
GPU em fila; regra de devolução (máx. 2 por portão); o que o orquestrador não abre. passagem.md: modelo de brief.md,
marcos.txt e passagem/<etapa>.md, só os campos. Não repita regras das skills de etapa. Os portões são os da decisão do
usuário: [colar a decisão de P3].
```
Verificar: frontmatter válido · as 3 cadeias batem com o `01` · todo agente citado existe em A1 · sem regra de roteiro, voz ou edição copiada.
Rollback: apagar `.claude/skills/producao/`.

## Onda 2

### E2 · `ep.py` com dono, etapas novas e pendências — Sonnet · médio (depois de M1 e O1)
Arquivo: `sistema/pipeline/ep.py`.
```
Estenda sistema/pipeline/ep.py conforme a seção "ep.py (proposta)" de sistema/plano/01-arquitetura-subagentes.md. Só quando
a pasta do vídeo tem brief.md: etapas imagens (prompts_ia.md → midia/cenas/), motion (midia/motion/), som (midia/sfx.csv) e
revisão (passagem/revisao-final.md mais novo que midia/final.mp4); "dono: <agente>" no próximo passo (tabela de posse);
pendências abertas lidas de passagem/*.md (linha "estado: devolve:..." ou "bloqueado"); uma linha com o resumo do medir.py.
Sem brief.md a saída tem de ser byte a byte a de hoje: compare com sistema/plano/backup/ep-antes.txt. Para testar o modo
novo use uma pasta canais/_teste/videos/001_x criada por você e apague-a no fim. Arquivo final ≤ 110 linhas.
```
Verificar: `python sistema/pipeline/ep.py | diff - sistema/plano/backup/ep-antes.txt` vazio · na pasta de teste aparecem as 4 etapas, o dono e uma pendência plantada · `canais/_teste` não existe no fim.
Rollback: `git checkout <snapshot> -- sistema/pipeline/ep.py`.

### P4 · Ponteiros (orquestrador, mecânico, ~10 linhas no total)
`CLAUDE.md`: `medir.py` no mapa do pipeline e uma linha "Produção: skill `producao`; agentes em `.claude/agents/`" · `novo-video/SKILL.md`: "depois seguir `producao`" · `canal.md` dos dois canais: ppm medido; AOA: ponteiro para `competicao.md` · memória: entrada nova "produção por subagentes" e ajuste em `gancho-tres-tempos` (fecha em 1:00, promessa até 0:30).

## Onda 3

### R1 · Revisão independente — Opus · alto, só leitura
Arquivo: `sistema/plano/04-revisao.md` (novo; único que escreve).
```
Revise a implementação contra sistema/plano/01, 02 e 03 sem corrigir nada. Confira: (1) cada bloco B1–B6 aplicado com o
texto-alvo, sem sobra das regras antigas e sem duplicar o que o 02 lista em "Já coberto"; (2) contradições entre skills,
CLAUDE.md e canal.md (palavras/min, lugar do CTA, promessa, competição); (3) agentes: posse sem sobreposição, ferramentas e
modelo como no 01, nenhum agente escrevendo arquivo de canal ou skill; (4) producao: cadeias e portões coerentes com os
agentes; (5) medir.py e ep.py: rode as verificações de M1 e E2 e reporte a saída; (6) git status: nada alterado fora das
listas das tarefas. Escreva sistema/plano/04-revisao.md: uma linha por achado com arquivo:linha, regra do plano e
gravidade; no fim "aprovado" ou "corrigir".
```
Verificar: o arquivo existe e termina em um veredito. Achados voltam para o dono da tarefa (S1, M1, A1, O1, E2); segunda rodada só nos itens apontados.

## Onda 4 · Pilotos (um por vez)
1. **Vertical 2D, 30–45 s, `manual-do-quase-adulto/shorts/002_…`**: roteiro novo (não corte) de uma ideia `[vertical]` de `ideias.md` escolhida pelo usuário, com pelo menos uma cena IMAGEM para o cenógrafo rodar. Passa por 10 dos 11 agentes. Custo fora dos tokens: voz ≈ US$ 0,25 e imagens em centavos.
2. **Short 3D de competição, ~40 s, `ate-onde-aguenta/shorts/003_…`**: uma eliminação do longo 002, reaproveitando câmara, trajes e Remendo. Testa `animador-3d`, `competicao.md` e a correção por dono de regra.
3. **Primeiro longo**: MQA 007 (ímpar: CTA depois da primeira revelação).

Medir em cada um: tokens por agente · devoluções por portão · arquivos escritos fora da posse (meta 0) · `medir.py` sem FORA · minutos do usuário aprovando · nota do usuário contra o short 001 / o 002. Generaliza se: ≤2 devoluções por portão, 0 escrita fora da posse, orquestrador sem compactar contexto e qualidade pelo menos igual. Se falhar, ajusta as definições (A1) e repete o mesmo piloto antes do seguinte.

## Quem decide o quê
| Usuário | Orquestrador | Mecânico (subagente) |
|---|---|---|
| decisões do `00-resumo.md`; ideia; os portões; postar | P1–P4; ordem das ondas; fila de GPU; aceitar ou devolver pareceres; `canal.md`, memória, `CLAUDE.md` | S1, M1, A1, O1, E2 (texto e spec já definidos); R1 julga, não decide |
