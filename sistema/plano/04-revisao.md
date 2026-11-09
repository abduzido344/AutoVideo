# Revisão independente (2026-11-09)

Conferido: B1–B6 contra `diff -r backup/skills .claude/skills` (texto-alvo aplicado e no lugar certo, nada antigo sobrando, crescimento <1 KB); 11 agentes (frontmatter, modelo/esforço/ferramentas como no 01, posse, caminhos de "Lê"); `producao` + `passagem.md`; CLAUDE.md e `canal.md` dos dois canais.
`medir.py`: 006 com `--marcos=promessa:7,revelacao:26` → 151 ppm, promessa 1:44 FORA, revelação 4:15 FORA, CTA par. 6 (1:31), saída 1 · AOA `videos/002` → 160 ppm · AOA `shorts/001` → 167 ppm, inscrev ausente, 1:24 · pasta temporária sem áudio → `~`, saída 0 quando tudo ok.
`ep.py`: saída sem `brief.md` idêntica a `ep-antes.txt`; modo novo testado em `canais/_teste/videos/001_x` (dono, pendências, 4 etapas), pasta apagada e confirmada; `git status`: só os arquivos da lista mudaram hoje depois das 20:23.

## Achados
| # | Onde | Regra do plano | Grav. | Menor correção |
|---|---|---|---|---|
| 1 | `sistema/pipeline/ep.py:37` | 01 › ep.py; cadeia 3D e vertical | alta | `motion` entra sempre com `brief.md`, mas o animador-3d grava `midia/<id>.mp4`, nunca `midia/motion/`; vídeo 3D (piloto 2) e vertical sem MOTION ficam presos em "motion (falta)", com dono errado para o próximo passo. Incluir `motion` só se `"MOTION" in sb` e formato ≠ 3d (no 3D o render já é a entrada do `edl`). |
| 2 | `sistema/pipeline/ep.py:23-25` | 01:83 "ep.py já marca como velho o que depende do arquivo mudado" | média | `imagens`/`motion`/`som` não dependem de `storyboard.md`: devolução ao diretor não marca nada velho. Pôr `["storyboard.md"]` nos deps das três (imagens: + `prompts_ia.md`). |
| 3 | `.claude/skills/producao/passagem.md:35` × `ep.py:26` | 01 › Passagem; E2 | média | `ep.py` só reconhece `passagem/revisao-final.md`; a skill diz `revisao-*.md` sem nomes. Escrever: `revisao-roteiro.md` (R1), `revisao-final.md` (R2), `revisao-publicacao.md` (R3). |
| 4 | `CLAUDE.md:38`, `.claude/skills/video-longo/SKILL.md:27` × `producao/SKILL.md:45`, `agents/narrador.md:11`, `agents/cenografo.md:11` | 02 › Coerência (GPU liberada) | média | "pedir ok antes de `--ok`" contradiz "`--ok` direto"; o narrador lê o §3 que manda pedir ok. Trocar as duas linhas por "rodar com `--ok` e informar o custo depois". |
| 5 | `.claude/skills/video-3d/SKILL.md:8` | 01 › portões; B1/B3 trocaram a mesma frase | média | Sobrou "Uma etapa por vez, mostrar e esperar aprovação", contra os portões de `producao:39`. Mesma troca do B1: "Agentes e portões de aprovação: skill `producao`." |
| 6 | `.claude/agents/animador-3d.md:7-8` | 01 › Princípios (lê só a sua parte; só narrador e cenógrafo citam GPU) | média | `skills: video-3d` pré-carrega a skill inteira (roteiro, `narrar.py --ok`, montagem, "esperar aprovação"). Tirar o `skills:`; o "Lê" já aponta §5–8. |
| 7 | `.claude/agents/animador-3d.md:12` × `video-3d/SKILL.md:31` | 01 › Posse | média | O §7 manda registrar em `tres/src/Root.tsx`, fora do "Escreve (só isto)" e da tabela de posse. Acrescentar `tres/src/Root.tsx` (só o registro) nos dois. |
| 8 | `.claude/agents/animador-2d.md:10-11` | tarefa: caminhos de "Lê" existem | média | `kit/mg/vetor.mjs` não existe em lugar nenhum; `motion/manual_poses.md` está em `canais/<canal>/motion/effectcraft/`. Trocar por `canais/<canal>/motion/effectcraft/vetor.mjs` e `.../manual_poses.md`. |
| 9 | `.claude/skills/video-longo/competicao.md:1,9` × `publicacao/SKILL.md:33`, `video-vertical/SKILL.md:24` | B5 × B6/B3 (shorts fora do teste, sem inscrição) | média | O arquivo vale para "longo, short, 3D" e manda CTA pelo teste sem excluir short. Linha 9: "CTA (só longo): …". |
| 10 | `sistema/pipeline/medir.py:98-99` × `competicao.md:9` | 02 › CTA ímpar 2:00–3:00 × B5 "depois da 1ª eliminação" | média | Longo de competição ímpar com a 1ª eliminação fora de 2–3 min dá FORA e o roteirista não fecha "sem FORA". Com `acao`/`escada` no `marcos.txt`, checar só CTA depois de `acao`. |
| 11 | `sistema/pipeline/medir.py:88` | 02 › marcos | média | Parágrafo inexistente vira 0:00 e passa como ok (testado: `revelacao:99` → ok). `t = inicio.get(...)`; se None, FORA "parágrafo inexistente". |
| 12 | `.claude/skills/producao/SKILL.md:33` (= 01:117) | roteirista "acionar com fontes.md pronto"; `video-3d` §1 "fato real e verificável" | média | A cadeia 3D não tem pesquisador e o roteirista não tem web: short 3D de escala fica sem conferência de fato. Começar com "pesquisador(fatos, se escala) →". |
| 13 | `sistema/pipeline/medir.py:95` | robustez | baixa | Pasta sem número com CTA quebra (`AttributeError`, testado); `inicio[cta]` dá KeyError com `tempos.csv` velho. `re.search(r"\d+", …)` com padrão 0 e `inicio.get`. |
| 14 | `sistema/pipeline/medir.py:39,81` | 02 › "palavras e ppm: alvo ±10%"; B2 ppm do canal | baixa | Alvo fixo 155: estimativa sem áudio do AOA (160–167) sai ~5% curta e o tamanho do roteiro nunca é checado antes de narrar. Ler `Medido: N ppm` do `canal.md` quando `--ppm` faltar. |
| 15 | `sistema/pipeline/medir.py:43` | reaproveitar a limpeza do `narrar.py` | baixa | Conta palavras em `limpo(p)` e sinais em `limpo(fala(p))`; `narrar.py` conta tudo em `fala`: "palavras por sinal" pode divergir. Usar `limpo(fala(p))` nos dois. |
| 16 | `sistema/pipeline/ep.py:92-95` | E2 | baixa | Com `brief.md` e sem `narracao.txt` imprime "medir: erro". Chamar `medida` só se `narracao.txt` existe. |
| 17 | `ep.py:23-26` × `producao/passagem.md:35` | tarefa 4: nomes de etapa | baixa | ep: `voz`, `imagens`, `edl/legenda/final`; passagem: `narracao`, `cenas`, `montagem`. Funciona (ep só lista o `stem`), mas a pendência "cenas" aparece ao lado da etapa "imagens". Alinhar `imagens` → `cenas` no ep. |
| 18 | `.claude/skills/video-longo/SKILL.md:22`, `video-3d/SKILL.md:14` × `agents/roteirista.md:8` | 01 › roteirista sem web | baixa | "conferir … online" no roteiro; o agente não tem web. Acrescentar "(na produção: pesquisador)". |
| 19 | `.claude/skills/video-vertical/SKILL.md:17` × `voz.md:18` | B2/B3 | baixa | Padrão sem medida: × 2,4 = 144 ppm no vertical, 155 no resto e no `medir.py`. Usar 155 ÷ 60 ≈ 2,6 (texto do B3 vem do plano). |
| 20 | `.claude/agents/revisor.md:9` | 01 › R1 "formato certo, promessa cumprida" | baixa | A lista de leitura não tem `video-longo/SKILL.md` §2, `video-vertical` §3 nem `competicao.md`. Acrescentar. |
| 21 | `.claude/agents/publicador.md:12`, `montador.md:11` | 01 › Posse | baixa | `thumbNNN.mjs` sem pasta (fica em `canais/<canal>/motion/effectcraft/`); `corte.py` grava `audio/`, `sfx.csv`, `narracao.txt`, que são de outros donos: anotar na posse "corte: montador cria tudo". |
| 22 | `02-mudancas-skills.md:3` × `canais/ate-onde-aguenta/canal.md:11` | M1: "169 ppm" | baixa | `medir.py` dá 167 (236 palavras ÷ 84,7 s até o fim do último parágrafo); 169 vinha do início da última palavra. `canal.md` já usa 167: só registrar. |

corrigir

## Depois da revisão (orquestrador)
Corrigidos: 1–13, 15, 16, 20 e o caminho do `thumbNNN.mjs` do 21; 14 feito lendo `Medido: N ppm` do `canal.md`. Ficam como estão: 17 (nome `imagens` no ep), 18, 19 (texto do plano), `corte.py` do 21, 22 (só registro).
