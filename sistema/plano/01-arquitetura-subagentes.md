# Arquitetura de subagentes (plano, 2026-11-09)

## Princípios
- O chat principal vira **orquestrador**: não escreve roteiro, cena nem EDL; lê `ep.py` e os retornos curtos dos agentes. Subagente não cria subagente.
- **Um dono por arquivo.** Agente só escreve na pasta do vídeo e na sua área de código. Arquivo de canal (`canal.md`, `ideias.md`, `tema.json`), skill e `CLAUDE.md` só o orquestrador altera.
- Regra mora na skill; a definição do agente só diz papel, o que lê, o que escreve, pronto e retorno. Nada duplicado.
- Modelo caro onde o texto é curto e decide o vídeo (roteiro, storyboard, revisão do roteiro); modelo barato onde o trabalho é mecânico (EDL, som, scripts). Animação 2D e 3D fica em Opus médio por decisão do usuário, mesmo sendo o maior volume.
- Interativo continua no chat principal: `novo-canal`, `criar-personagem`, `novo-video` usam AskUserQuestion, que subagente não tem.

## Equipe → pipeline real
| Função | Etapa e arquivos de hoje | Agente | Falta hoje |
|---|---|---|---|
| Pesquisa e ideia | `ideias.md`, conferência de fatos, prints em `midia/fontes/` | pesquisador | lista de fontes do vídeo (`fontes.md`) |
| Roteiro, storytelling, direção de voz | `narracao.txt` (`voz.md`) | roteirista | marcos mensuráveis (`marcos.txt`) |
| Voz | `narrar.py`, `palavras.py` → `audio/` | narrador | ninguém ouve: só Whisper confere |
| Storyboard e direção | `storyboard.md` (cor, mestres, Som, transição) | diretor | — |
| Cenário e luz | `prompts_ia.md`, `estilo.txt`, banco de cenas, `midia/cenas/` | cenógrafo | etapa "imagens" no `ep.py` |
| Personagem | `criar-personagem` (canal); pose por cena | chat principal; animadores | — |
| Motion 2D e efeitos | `motion/effectcraft/mNNN.mjs` → `midia/motion/` | animador-2d | etapa "motion" no `ep.py` |
| 3D | `tres/src/videos/<canal>/<id>.tsx` | animador-3d | skill só descreve short; longo 3D (AOA 001/002) vive em `canal.md` |
| Efeitos visuais | não é etapa: dentro do motion/3D e das transições do `montar.py` | animadores + montador | — |
| Efeitos sonoros e trilha | `midia/sfx.csv`, `midia/trilha.*`, `sons.py` | sonoplasta | critério de trilha por canal (só `trilha_db`) |
| Legenda e montagem | `edl.csv`, `cor.txt`, `numeros.txt`, `legendar.py`, `montar.py` | montador | — |
| Thumbnail, SEO, publicação | `publicacao.md`, `thumbs/`, `postar.py` | publicador (postar: orquestrador) | retorno de métricas do Studio |
| QA independente | hoje o mesmo chat revisa o que fez | revisor | checagem automática (`medir.py`) |

## Agentes
Custo: preço Haiku 1 · Sonnet ~3 · Opus ~5 por token (proporção das gerações anteriores; conferir a tabela atual) × volume P (<30 mil tokens), M (30–100 mil), G (>100 mil) por vídeo longo. Estimativa; o piloto mede.

| Agente | Modelo · esforço | Volume | Por quê |
|---|---|---|---|
| pesquisador | Sonnet · médio | M | busca e leitura de páginas; julgamento simples (fonte bate ou não) |
| roteirista | Opus · alto | P–M | ~4 mil tokens de saída decidem a retenção do vídeo inteiro |
| narrador | Haiku · baixo | P | roda script, lê números, compara texto × Whisper |
| diretor | Opus · médio (short: Sonnet) | M | ritmo, reaproveitamento e o que se vê; erro aqui multiplica nas 4 etapas seguintes |
| cenógrafo | Sonnet · médio | M | prompt + conferir imagem por lista |
| animador-2d | Opus · médio | G | decisão do usuário (09/11): anima melhor; é o maior volume (m006.mjs = 49 KB), logo o maior custo |
| animador-3d | Opus · médio | G | idem; regras numéricas com dono |
| sonoplasta | Sonnet · baixo | P | alinhar ~110 linhas de tempo sem errar |
| montador | Sonnet · médio | M | EDL de ~130 linhas + conferências |
| publicador | Sonnet · médio | M | opções de título/thumbnail; o usuário escolhe |
| revisor | Sonnet · médio; **Opus · alto no roteiro** | M | crítica do roteiro pesa; a técnica é lista |

Fable fica para o orquestrador ou segundo parecer quando um roteiro volta 2×. O parâmetro `model` da chamada sobrepõe o do arquivo (revisor no roteiro, diretor em short).

**pesquisador** — Quando: ideia nova; fatos antes do roteiro informativo; prints depois do roteiro aprovado. Competição: só confere a física que cria tensão (ponto de fusão, tempo), sem fontes nem prints. Lê `canal.md`, `ideias.md`, `video-longo` §1. Escreve `fontes.md` (afirmação · fonte · link · conferido) e `midia/fontes/*.png`; devolve as linhas de ideia para o orquestrador gravar. Ferramentas: Read, Grep, Glob, WebSearch, WebFetch, Write, Bash. Pronto: toda ideia com prova (link, views); todo número/autor com link aberto e lido ou marcado "sem fonte: cortar". Decide a fonte; a ideia é do usuário; nunca contorna bot-check (pede o print).

**roteirista** — Quando: ideia aprovada e `fontes.md` pronto. Lê `brief.md`, `fontes.md`, `canal.md`, `video-longo` §2 / `video-vertical` §3 / `video-3d` §1–2, `voz.md`, `competicao.md`. Escreve `narracao.txt` e `marcos.txt`. Ferramentas: Read, Write, Edit, Grep, Glob, Bash (`medir.py`); **sem web**: fato novo só entra via pesquisador. Pronto: `medir.py` sem FORA; ≥8 palavras por sinal; todo fato em `fontes.md`; um parágrafo = uma ideia desenhável. Decide estrutura, tom e tags; sempre passa por revisor e aprovação.

**narrador** — Quando: roteiro aprovado. Lê `video-longo` §3, `voz.md` (fim). Roda `narrar.py` (`--enxuto` no longo; `--ok` direto, GPU liberada), `palavras.py`, `medir.py`; 3D: copia o wav para `tres/public/audio/`. Escreve só `audio/`. Ferramentas: Read, Bash, Write. Pronto: `narracao.wav`, `tempos.csv`, `palavras.json`; custo real, ppm e marcos reais no retorno; lista de palavras em que Whisper ≠ texto. Decide `--refazer=N` uma vez por parágrafo divergente; não mexe no texto. Para no primeiro timeout ou "crash-looping" e devolve bloqueado.

**diretor** — Quando: áudio pronto. Lê `narracao.txt`, `audio/tempos.csv` (e `palavras.json` só por busca de palavra), `marcos.txt`, `fontes.md`, `canal.md` (banco de cenas), `formatos.md`, `edicao.md` › Tempos e Motion graphics, `video-3d` §4. Escreve `storyboard.md`. Ferramentas: Read, Write, Edit, Grep, Glob, Bash. Pronto: narração coberta sem buraco; 6–8 mestres voltando 2–4×; ~10 cenas/min (longo); fonte citada = cena de print; colunas Som e Transição cheias; linha de Cor no topo; cena MOTION que usa imagem marcada na coluna Fonte. Decide as cenas; devolve ao roteirista parágrafo que não se desenha.

**cenógrafo** — Quando: storyboard aprovado e há cena IMAGEM. Lê `storyboard.md`, `estilo.txt`, `personagem/`, `formatos.md`. Escreve `prompts_ia.md` e `midia/cenas/`. Roda `modal_img.py` e depois `modal_edit.py` (uma GPU por vez). Ferramentas: Read, Write, Edit, Glob, Bash. Pronto: banco de cenas usado antes de gerar; folha de contato; cada imagem passa a lista de `formatos.md` (luz neutra, sem texto, sem espelhar, mãos). Decide a redação do prompt; até 2 refações por imagem, depois vira pendência; o que a cena mostra é do diretor. Imagem Qwen: pendência "licença, não publicar".

**animador-2d** — Quando: storyboard aprovado e há cena MOTION 2D. Lê `storyboard.md`, `audio/palavras.json`, `motion-design` + `director/personagem.md`, `edicao.md` › Motion graphics, `motion/manual_poses.md`. Escreve `canais/<canal>/motion/effectcraft/mNNN.mjs` e `midia/motion/`; `kit/mg/vetor.mjs` só leitura (mudança = pendência). Ferramentas: Read, Write, Edit, Grep, Glob, Bash. Pronto: 1 quadro por cena em folha de contato conferida, depois render; toda linha MOTION tem arquivo com a duração da cena; elemento entra na palavra. Longo grande: o orquestrador pode abrir 2 instâncias por faixa de cenas, cada uma com seu arquivo (`mNNN_a.mjs`, `mNNN_b.mjs`).

**animador-3d** — Quando: storyboard 3D aprovado. Lê `tres/regras.md`, `video-3d` §5–8, `storyboard.md`. Escreve `tres/src/videos/<canal>/<id>.tsx` (+ `_planos.json`), peças novas em `src/cenarios/`, e copia `out/<id>.mp4` para `midia/`. Componentes compartilhados (Heroi, Remendo, cobaia) só quando chamado como **dono de uma regra**, com a lista de arquivos no brief. Pronto: `tsc` limpo; folha do elenco; teste de 4 s aprovado; render inteiro; folha de contato com as 4 perguntas respondidas. Correção em várias regras: o orquestrador abre uma instância por regra, em paralelo só se os arquivos não coincidem.

**sonoplasta** — Quando: storyboard aprovado (paralelo aos animadores). Lê coluna Som, `audio/palavras.json`, `edicao.md` › Som, `sistema/sons/alias.tsv`, `tema.json`. Escreve `midia/sfx.csv`, `midia/trilha.*` e novos apelidos em `alias.tsv`. Ferramentas: Read, Write, Edit, Grep, Bash (`sons.py`). Pronto: um efeito por acontecimento, ~15/min, whoosh 0,3 s antes do whip; ids novos baixados e com duração conferida. Não ouve: escolhe por nome, categoria e duração.

**montador** — Quando: cenas, motion e som prontos (3D: mp4 do render). Lê `storyboard.md`, `audio/palavras.json`, `edicao.md`. Escreve `midia/edl.csv`, `cor.txt`, `numeros.txt`, `legendas.*`, `final.mp4`. Roda `montar.py --checar`, `legendar.py`, `montar.py`; corte de longo: `corte.py`. Pronto: lista "Conferir o final" de `edicao.md` (duração = narração, `blackdetect`, folha de contato, prévia de legenda). Fonte faltando ou curta: devolve ao dono, não improvisa cena.

**publicador** — Quando: rascunho (palavra-chave, títulos, ideia de thumbnail) depois do roteiro aprovado; thumbnails em paralelo à montagem; fecha com `final.mp4`. Lê `publicacao`, `canal.md`, `narracao.txt`, `audio/tempos.csv`, `fontes.md`, `brief.md` (braço do CTA). Escreve `midia/publicacao.md`, `midia/thumbs/`, `thumbNNN.mjs`. Roda `postar.py --teste`. Pronto: 3 thumbnails + 3 títulos, capítulos, fontes, licenças e créditos, campos do teste de CTA. **Não posta**: postar é do orquestrador depois do ok.

**revisor** — Quando: três passagens. R1 roteiro (antes de mostrar ao usuário), R2 final, R3 publicação. Recebe os artefatos e as regras, não as justificativas de quem fez. Ferramentas: Read, Grep, Glob, Bash (`medir.py`, ffmpeg); sem Write/Edit: devolve o parecer e o orquestrador salva em `passagem/`. Saída: `ok` ou `corrigir: [dono] item, onde, regra`. R1: `medir.py`, fato × `fontes.md`, `voz.md`, formato certo (competição ≠ informativo), promessa cumprida. R2: folha de contato, áreas seguras, legenda e números, cor fria → quente, texto em imagem, espelhamento, sons. R3: título e thumbnail entregam o que o vídeo mostra; licenças (Qwen, Mixkit, CC-BY); "Built with Fish Audio". Nunca corrige.

## Passagem (contrato)
Na pasta do vídeo, além do que já existe:
- `brief.md` (só o orquestrador, ≤15 linhas): canal · formato (longo/vertical/3d) · estrutura (informativo/competição/escala) · ideia · duração e palavras-alvo (ppm do canal) · braço do CTA · decisões do usuário · `aprovado: <portão> <data> <observação>`.
- `marcos.txt` (roteirista): `promessa 3`, `gancho 5`, `revelacao 9`, `virada 31`; competição: `acao 2`, `escada 2` (número do parágrafo).
- `fontes.md` (pesquisador).
- `passagem/<etapa>.md`, um por agente, ≤12 linhas, sempre os mesmos campos:
```
estado: pronto | devolve:<agente> | bloqueado
entregue: arquivos
decisões: o que escolhi e por quê (1 linha cada)
medidas: palavras, ppm, duração, custo de GPU
pendências: [para quem] o quê, onde (parágrafo/cena)
aprendizado: regra reutilizável, se houver
```
O retorno do agente ao orquestrador é esse mesmo texto, ≤8 linhas.
- **Devolver**: ninguém edita arquivo de outro. `estado: devolve:roteirista` + pendência com o lugar e a menor mudança que resolve. O orquestrador reabre o dono (SendMessage na mesma instância se ainda existir; senão nova, com `brief.md` + a passagem). `ep.py` já marca como velho o que depende do arquivo mudado. Máximo 2 devoluções por portão; depois vai ao usuário.
- Correção de até ~10 linhas em um arquivo: o orquestrador faz e anota na passagem daquela etapa.
- `aprendizado` vira regra na skill pelo orquestrador (memória `aprendizados-globais`).

## Posse de arquivos
| Arquivo | Dono |
|---|---|
| `brief.md`, `passagem/revisao-*.md`, arquivos do canal, skills, `postar.py` real | orquestrador |
| `fontes.md`, `midia/fontes/` | pesquisador |
| `narracao.txt`, `marcos.txt` | roteirista |
| `audio/` | narrador |
| `storyboard.md` | diretor |
| `prompts_ia.md`, `midia/cenas/` | cenógrafo |
| `motion/effectcraft/mNNN*.mjs`, `midia/motion/` | animador-2d |
| `tres/src/videos/<canal>/<id>.*`, `midia/<id>.mp4` | animador-3d |
| `midia/sfx.csv`, `midia/trilha.*`, `sistema/sons/alias.tsv` | sonoplasta |
| `midia/edl.csv`, `cor.txt`, `numeros.txt`, `legendas.*`, `final.mp4` | montador |
| `midia/publicacao.md`, `midia/thumbs/`, `thumbNNN.mjs` | publicador |

O frontmatter limita ferramentas, não caminhos: a posse vale por instrução e o orquestrador confere com `git status` depois de cada onda. Reforço opcional depois do piloto: hook PreToolUse que barra Write/Edit fora da lista.

## Cadeias (→ sequencial, ‖ paralelo, [G] aprovação do usuário)
**Longo 2D**
```
pesquisador(ideias) → [G1 ideia] → pesquisador(fatos) → roteirista → revisor R1 → [G2 roteiro]
→ narrador ‖ pesquisador(prints) ‖ publicador(rascunho)
→ diretor → [G3 storyboard]
→ cenógrafo ‖ animador-2d ‖ sonoplasta ‖ publicador(thumbnails)
→ montador → revisor R2 → [G4 final] → publicador(fecha) → revisor R3 → [G5 postar] → orquestrador posta
```
Cena MOTION que usa imagem espera a passagem do cenógrafo; o animador faz essas por último.
**Vertical 2D**: mesma cadeia sem G1 e G3 (ideia vem do `novo-video`; storyboard aparece junto do final). Corte de longo: `montador(corte.py)` → R2 → [G4] → publicador → [G5].
**3D (short ou longo)**
```
roteirista → R1 → [G2] → narrador → diretor → [G3 storyboard + elenco]
→ animador-3d(elenco, teste 4 s) → [G3b teste] → animador-3d(animação, render) ‖ sonoplasta ‖ publicador(rascunho)
→ montador → R2 → [G4] → publicador → R3 → [G5]
```
**GPU**: só narrador e cenógrafo chamam Modal e nunca na mesma fase; com dois vídeos abertos o orquestrador põe em fila. Custo real vai em `medidas` e no relatório do portão.

## Orquestrador (skill nova `producao`)
1. `ep.py` → etapa e dono. 2. Escreve ou atualiza `brief.md`. 3. Aciona o agente pelo nome com brief de 5 linhas: pasta, etapa, o que ler, o que entregar, portão seguinte. 4. Lê só o retorno; confere `git status` (ninguém escreveu fora da sua lista). 5. No portão mostra o arquivo ou a folha de contato, pergunta, grava `aprovado:`. 6. Leva `aprendizado` para a skill e pendências de canal para `canal.md`.
Não abre `palavras.json`, `legendas.ass`, `.mjs` nem `.tsx`. A skill precisa dizer que o usuário pediu produção por subagentes (sem isso o chat não aciona agentes). As skills de etapa continuam valendo para quem quiser fazer um trecho no chat.

## Definições
`.claude/agents/<nome>.md`, ≤25 linhas cada:
```
---
name: roteirista
description: Escreve narracao.txt e marcos.txt de um vídeo. Acionar depois da ideia aprovada.
tools: Read, Write, Edit, Grep, Glob, Bash
model: opus
---
Papel · Lê · Escreve (só isto) · Pronto · Devolve quando · Retorno (campos da passagem)
```
`skills:` (pré-carrega a SKILL.md) e `effort:` no frontmatter: confirmar na documentação antes de criar; se não existirem, a lista de leitura fica no corpo e o esforço vai na chamada.

## `ep.py` (proposta)
Com `brief.md` na pasta: etapas novas `imagens`, `motion`, `som`, `revisão` (parecer mais novo que `final.mp4`), linha `dono:` no próximo passo, pendências abertas (`estado: devolve|bloqueado`) e `medir.py` resumido em uma linha. Sem `brief.md`: saída idêntica à de hoje.

## Hoje × proposto
| | Hoje | Proposto |
|---|---|---|
| Contexto | um chat carrega ~45 KB de skills + `personagem.md` 13 KB + storyboard 16 KB + `palavras.json` 30 KB + código | cada agente lê só a sua parte; o orquestrador lê retornos de 8 linhas |
| Aprovações | toda etapa | 5 portões (longo), 3 (vertical), 5 (3D) |
| Revisão | quem fez revisa | revisor sem Write, outro modelo no roteiro |
| Paralelo | nada | imagens ‖ motion ‖ som ‖ thumbnails |
| Custo | tudo no modelo do chat | com a animação em Opus, cerca de metade do volume continua em Opus; o resto em Sonnet/Haiku; +10–15% de releitura por agente (estimativa). O ganho principal passa a ser contexto, não preço |

## Riscos
- **Contexto perdido**: a intenção do roteiro não chega ao diretor. → `marcos.txt`, `decisões` na passagem, SendMessage na mesma instância para ajustes.
- **Custo de coordenação** em vídeo pequeno. → vertical com cadeia curta; correção pequena no orquestrador.
- **Regressão**: 7 skills e 3 scripts têm mudanças não commitadas. → snapshot antes; vídeo sem `brief.md` segue o fluxo antigo.
- **Dois escritores**: tabela de posse + `git status` por onda; `tres/` não tem git: cópia antes de cada correção.
- **GPU sem supervisão** num agente barato: limites já estão nos scripts; narrador para no primeiro erro.
- **Ninguém ouve nem assiste**: Whisper e folha de contato são substitutos; G4 continua com o usuário vendo o vídeo.
- **Revisor carimbador**: itens mensuráveis (`medir.py`) e parecer obrigatório com lugar e regra.
- **Animação em Opus é a maior fatia do custo**: o piloto mede os tokens dos animadores; esforço médio e prévia de 1 quadro por cena antes do render seguram o volume.
- **OneDrive**: renders paralelos na mesma pasta sincronizada; saídas grandes em pastas separadas por agente.
- **Prints de fonte**: se o subagente não tiver navegador, a captura fica com o orquestrador (verificar no piloto).
