# Pesquisador: papel e redesenho (plano, 2026-11-10)

Implementado em 10/11 (sem commit, sem GPU; estado anterior em `backup-pesquisador/`). Vídeos não foram alterados; o teste no 006 não foi feito.
Mudança de 10/11: padrão zero prints (saem em inglês, vídeo em português); print só a pedido explícito do diretor, com motivo no storyboard e na passagem (≤3 por longo). Pesquisador não captura por conta própria e sugere só tratamentos sem print; cartão de fonte estrangeira com tradução; R2 conta print sem pedido e texto em inglês sem tradução como falha.

## Diagnóstico
- Hoje o agente entrega `fontes.md` (afirmação · fonte · link · conferido) e `midia/fontes/*.png`. É um conferente: entra depois que a ideia existe e não traz matéria-prima para o roteiro.
- A regra que gera o print está em três lugares: `video-longo/SKILL.md` §4 ("cada fonte citada… virar cena MOTION com o print"), `agents/diretor.md` › Pronto ("fonte citada = cena de print") e `edicao.md` › Motion graphics (um único tratamento: fade subindo 40 px, zoom 1→1,04).
- No 006: 13 cenas de print em 134 (11 fontes, F2 e F9 voltam), todas MOTION, todas com som `pop` e transição `corte`, 4–9 s cada. Oito ficam entre 3:47 e 8:53: uma a cada ~40 s na segunda metade. O print F3 (IBGE) está no storyboard e não existe em `midia/fontes/`.
- A monotonia começa no roteiro, não na tela. Sete parágrafos entre o p27 e o p45 seguem o mesmo molde (ano, "o psicólogo X e colegas", o que mediram): p27, 29, 31, 35, 37, 43, 45. O pesquisador entregou uma lista de estudos, o roteiro virou uma lista de estudos, e o diretor só podia mostrar uma lista de páginas.
- Competição (AOA 002): a pesquisa foi só a tabela de fusão (ouro 1.064 °C, cobre 1.085, ferro 1.538, titânio aguenta 1.600). Os números estão certos e a margem de 21 °C entre ouro e cobre virou a melhor rodada ("seis acima do ouro e quinze abaixo do cobre"). Isso foi achado no roteiro por acaso; é exatamente o tipo de coisa que o pesquisador deveria entregar de propósito.

## O que a pesquisa externa mostra
- **Kurzgesagt** (página oficial do processo): pesquisa é a 1ª de cinco etapas, antes do roteiro; leem livros e fontes primárias, consultam especialistas e fecham com um documento de fontes por vídeo. O roteiro passa por cerca de uma dúzia de versões. Em declaração da equipe no Reddit (2023, fonte secundária): roteiros são descartados quando a pesquisa não se sustenta e três checadores revisam cada vídeo.
- **Pesquisador de documentário** (anúncios e perfis de função; prática típica, não norma): acha histórias, dados, pessoas, locações e material de arquivo, e escreve dossiês e notas de briefing para diretor e roteirista. O trabalho muda de fase: descoberta na pré-produção, direitos e licenças na edição.
- **Archive producer** (ScreenSkills, lista de competências): escolhe o material visual que melhor conta a história dentro do orçamento e dos direitos, propõe alternativa quando o material não existe ou não pode ser usado, e entrega créditos e licenças.
- **Checagem** (guia do TEDx): roteiro anotado com link por afirmação; ler o estudo inteiro, não o resumo; olhar amostra, grupo de controle e críticas; trocar "a ciência diz" pelo estudo específico e "sempre/todos" por linguagem medida. IA ajuda a achar o que precisa de fonte, mas a fonte original tem de ser lida.
- **Roteiro anotado público** (National Security Archive, "Torturing Democracy"; guia do The Science Writer): cada frase com citação, e a divergência entre especialistas marcada no texto.
- Johnny Harris cita um documento de pesquisa de 188 páginas e "âncoras visuais" (resumo de podcast, fonte secundária). Não achei descrição pública confiável do processo do Vox nem do Veritasium; não uso como base.

Conclusão: em todos, o pesquisador trabalha **antes** do roteiro e entrega material para contar (tese, histórias, números, o que existe para mostrar), além de garantir que é verdade. Verificar é a segunda metade do trabalho.

## Papel no AutoVideo
O pesquisador é dono da matéria-prima e da verdade do vídeo. O roteirista continua dono da estrutura e do texto; o diretor, das cenas.

### Fase 1 · Dossiê (antes do roteiro) → `dossie.md`, ≤60 linhas
| Bloco | Conteúdo |
|---|---|
| Tese e ângulo | 1 frase que o vídeo defende + 1 ângulo alternativo descartado e por quê |
| Contraintuitivo | 1–3 fatos que contrariam o que o público acha |
| Histórias e pessoas | 3–5 anedotas com nome, lugar, ano e a cena que rendem |
| Números com régua | 5–8 números, cada um com uma comparação do dia a dia |
| Mito × fato | 2–4 pares |
| O que existe para mostrar | figura do artigo, dado para gráfico, foto ou gravura livre, objeto, mapa, data |
| Avisos | o que não se sustenta, onde especialistas discordam, limite de cada estudo |
| Glossário | ≤5 termos |

Cada item: afirmação · link · confiança · visual sugerido. Confiança: **A** fonte primária lida inteira (método e amostra) · **B** secundária confiável ou só o resumo · **C** anedota ("a história conta") · sem fonte = não entra.
Pronto: o roteirista consegue escrever sem abrir a web; no máximo metade dos itens é "estudo de psicólogo"; pelo menos 3 histórias e 3 materiais visuais que não são print.

### Fase 2 · Roteiro anotado (depois do G2) → `fontes.md`
Uma linha por afirmação do roteiro: `p · afirmação como foi dita · fonte · confiança · o que a fonte diz de fato · tratamento 1 / tratamento 2 · material`. Afirmação que exagera a fonte volta ao roteirista com a menor troca de palavra. Material vai para `midia/fontes/`: print só das fontes marcadas como prova central; para as outras, o dado do gráfico (`dados_*.csv`), a figura, a foto livre com licença anotada.

### Fase 3 · Durante a produção (sob demanda)
Responde ao diretor e aos animadores (valores exatos de um gráfico, referência de um objeto de época, como é o aparelho do experimento) e entrega ao publicador a lista de fontes e créditos da descrição.

### Quem consome
Roteirista: `dossie.md` inteiro. Diretor: `fontes.md` (colunas de tratamento e material) e "O que existe para mostrar". Cenógrafo: referências de objeto e época. Animadores: `dados_*.csv` e a descrição do que se vê. Publicador: fontes e licenças. Revisor R1: confiança por afirmação.

## Modos por tipo de vídeo
As três fases acima são o modo `informativo`. O `brief.md` ganha o campo `tipo`, e ele decide o que o pesquisador entrega. A entrega é sempre o mesmo arquivo, `dossie.md`, com tamanho diferente.

| `tipo` | Entrega | Máx. | Modelo · esforço | Pode pular? |
|---|---|---|---|---|
| `informativo` | dossiê completo, depois `fontes.md` e material (fases 1–3) | 60 linhas | Opus · médio no dossiê; Sonnet · médio no resto | não |
| `competicao-fato` (limite físico real) | **ficha de tensão**: limites conferidos em duas fontes; margens apertadas; ordem real das quedas e onde surpreende; mitos do público; o que se vê em cada degrau; o que seria fisicamente errado. Depois do G2 só confere os números ditos | 25 linhas | Sonnet · médio | não (o gelo "derretendo a 0 °C" passou sem ela) |
| `competicao-livre` (gincana, prêmio, aposta) | **nota de formato**: como 2–3 competições parecidas montam rodadas, apostas e virada; se as regras fecham (dá para ganhar, dá para empatar?); números de apoio (custo do prêmio, probabilidades); risco de imitação e de política da plataforma | 15 linhas | Sonnet · baixo | sim, se repete um formato já feito no canal e não tem número novo |
| `historia` (inventada) | **nota de consistência**: mundo, época e lugar; jargão; o que é plausível; clichês a evitar; referências visuais | 10 linhas | Sonnet · baixo | sim, é o padrão; só chama se a história usa época, lugar ou profissão real |

- **Short vertical** é formato, não tipo: corta a entrega do tipo para 10 linhas (1 fato contraintuitivo, 1 número com régua, 1 coisa para mostrar), 0–1 print; short cortado de um longo não chama o pesquisador.
- Só `informativo` tem `fontes.md`, crédito na tela e cardápio. Nos outros três nada de fonte, print, autor ou data aparece no vídeo (memória `formato-competicao`); a nota serve ao roteirista e ao animador. O desenho das rodadas continua do roteirista.
- **Como o orquestrador decide** (sem pergunta nova): `canal.md` ganha uma linha `Tipo padrão:` (MQA `informativo`, AOA `competicao-fato`). O orquestrador copia para o `brief.md`, troca quando a ideia foge do padrão e mostra o tipo junto da ideia no G1, onde o usuário corrige. Na dúvida entre dois tipos, o teste é: "se um número ou fato dito estiver errado, alguém corrige nos comentários?" Sim → `informativo` ou `competicao-fato`; não → os outros dois. Motivo: cada canal faz quase sempre o mesmo tipo, então perguntar em todo vídeo seria um clique a mais para confirmar o óbvio, e o G1 já existe.
- Pulou o pesquisador: o orquestrador anota `pesquisa: pulada (motivo)` no `brief.md`. Se o roteirista precisar de um fato no meio do caminho, pede como na fase 3.

## Cardápio visual para uma fonte
| # | Tratamento | Quando |
|---|---|---|
| 1 | Print recortado | a fonte é a prova central, ou a própria página surpreende (manchete, data, tese de 1688) |
| 2 | Reencenação com o personagem | o estudo tem um procedimento que se mostra (a viagem de bicicleta) |
| 3 | Gráfico redesenhado com os dados | o achado é uma curva ou comparação |
| 4 | Objeto ou ilustração do estudo | existe um objeto-símbolo |
| 5 | Cartão de citação | a frase do autor é melhor que a paráfrase |
| 6 | Linha do tempo ou mapa | a força está em quando ou onde |
| 7 | Arquivo (clipe, foto, gravura) | existe material de época livre ou com crédito |
| 8 | Selo discreto (autor · ano no canto, sobre outra cena) | todas as outras; e toda fonte que volta |

Regras:
- Toda fonte tem crédito na tela (no mínimo o selo) e na descrição. Isso mantém a regra "só fatos verificáveis" sem exigir print.
- Print: no máximo 1 a cada 3 min e 3 por longo; 0–1 em short; 0 em competição e em história.
- Nunca o mesmo tratamento em duas fontes seguidas; nenhum tratamento em mais de um terço das fontes (o selo não entra nessa conta, ajuste de 10/11 depois do teste no 006); variar também som e transição.
- Fonte que volta usa o selo, não repete o print.
- O pesquisador sugere dois tratamentos por afirmação, com o material que existe; o diretor escolhe e aplica o rodízio; o revisor R2 conta.

## Aplicado ao 006
Além dos prints, um pesquisador teria entregue, por exemplo (exemplos de tipo de entrega, **a conferir** antes de usar):
- Tese em uma frase e o aviso de que seis estudos em fila viram aula: escolher dois centrais (Mitchell 1997 e Zhou 2008) e rebaixar os outros a selo.
- Histórias: quem eram os pacientes de Hofer e como se "tratava" a doença na época; o que aconteceu de fato nas três viagens de Mitchell (chuva, cansaço) contra o que as pessoas lembraram.
- Números com régua: quantos anos o público do canal tinha em 2016, cruzado com a faixa de 10 a 30 anos do pico de reminiscência. É a ligação direta entre o estudo e o título.
- Material: a curva de Rubin como gráfico, os dados de antes/durante/depois de Mitchell como três barras, uma gravura livre de Basileia do século XVII, o gráfico do desemprego do IBGE.
- Avisos: o que o estudo de 2008 mediu de fato e em quem; o que é correlação.
Com o cardápio, as 13 cenas viram: 2 prints (tese de 1688, Fortune), 2 reencenações, 2 gráficos, 1 cartão, 1 linha do tempo e selos no resto.

## Mudanças propostas (texto-alvo; implementar só depois da aprovação)
- **`.claude/agents/pesquisador.md`**: description → "Monta o dossiê ou a nota do tipo do vídeo antes do roteiro, anota o roteiro aprovado e reúne o material das fontes." Primeira instrução: ler `tipo` no `brief.md` e entregar só o que o modo pede, no tamanho máximo. Papel → "dono da matéria-prima e da verdade do vídeo: tese, histórias, números, o que existe para mostrar, e a conferência de cada afirmação". Escreve → `dossie.md`, `fontes.md`, `midia/fontes/` (prints, `dados_*.csv`, figuras com licença). Pronto → os critérios das fases 1 e 2. Lê → + `.claude/skills/producao/pesquisa.md`.
- **`.claude/skills/producao/pesquisa.md`** (novo, ≤50 linhas): tabela de modos, formato do `dossie.md` e do `fontes.md`, escala de confiança, ficha de tensão, nota de formato, nota de consistência, cardápio e regras de rodízio.
- **`video-longo/SKILL.md`** §2: troca "conferir os estudos centrais online antes de narrar" por "escrever a partir do `dossie.md`; fato novo volta ao pesquisador". §4: troca a frase do print por "Cada fonte citada ganha crédito na tela; o tratamento sai do cardápio de `producao/pesquisa.md` (print só para prova central, no máximo 3 por vídeo, nunca dois tratamentos iguais em sequência)."
- **`video-longo/edicao.md`** › Motion graphics: a linha "Print de fonte" passa a ser um dos tratamentos; acrescenta o selo (autor · ano, canto, 2–3 s).
- **`agents/diretor.md`**: Lê + `producao/pesquisa.md`; em Pronto, troca "fonte citada = cena de print" por "toda fonte com crédito na tela; tratamentos em rodízio; ≤3 prints".
- **`agents/roteirista.md`**: Lê `dossie.md` no lugar de `fontes.md`; Pronto: "todo fato vem do dossiê; no máximo dois parágrafos seguidos abrindo com autor e ano".
- **`producao/SKILL.md`**: passo novo antes das cadeias, "definir `tipo` (padrão do canal) e mostrar no G1". Cadeias por tipo: `informativo` → `pesquisador(dossiê) → roteirista → R1 → [G2] → narrador ‖ pesquisador(roteiro anotado + material)`; `competicao-fato` → `pesquisador(ficha) → roteirista → R1 → [G2] → narrador ‖ pesquisador(confere números)`; `competicao-livre` e `historia` → `[pesquisador(nota), se não pular] → roteirista`, sem volta depois do G2. O dossiê é mostrado junto do roteiro no G2 (sem portão novo). Modelo e esforço do modo vão na chamada.
- **`producao/passagem.md`**: `brief.md` ganha `tipo` e `pesquisa: pulada (motivo)`; posse do pesquisador ganha `dossie.md`; etapa `pesquisa` vira `dossie` e `fontes`.
- **`canais/*/canal.md`**: linha `Tipo padrão:`. **`novo-video`**: sem mudança.
- **`agents/revisor.md`**: R1 confere confiança C dita como fato e, com a pesquisa pulada, marca qualquer fato real que apareceu no roteiro; R2 conta prints e tratamentos repetidos (só `informativo`).
- **`ep.py`** (opcional): com `brief.md`, etapa `dossiê` antes do roteiro só se o `tipo` é `informativo` ou `competicao-fato`; `fontes` só em `informativo`; nos outros tipos a etapa não aparece.

## Modelo e custo
- Dossiê (fase 1): **Opus · médio**, passado na chamada. É a escolha de tese e de material que decide o roteiro, como o próprio roteirista; o texto de saída é curto. Volume estimado 60–100 mil tokens por longo, quase tudo leitura de páginas.
- Roteiro anotado e material (fases 2 e 3): **Sonnet · médio**, como hoje. É conferência por lista.
- Outros modos (estimativa, o piloto mede): ficha de tensão 20–30 mil tokens em Sonnet; nota de formato 10–15 mil; nota de consistência 5–10 mil ou zero. Um vídeo de gincana ou de história gasta em pesquisa menos de um quinto de um informativo, e não tem a fase 2.
- Efeito: o dossiê em Opus custa cerca de 1,7× o mesmo trabalho em Sonnet (proporção de preço a confirmar) e continua pequeno perto da animação. Alternativa barata: tudo em Sonnet · alto e o piloto compara.
- Pendência técnica: print exige navegador, que o subagente talvez não tenha. Com no máximo 3 prints por vídeo, a captura pode ficar com o orquestrador.

## Como medir
| Medida | 006 | Meta |
|---|---|---|
| Cenas de print | 13 | 0 sem pedido do diretor (≤3 com pedido) |
| Tratamentos distintos de fonte | 1 | ≥4 |
| Maior sequência com o mesmo tratamento | 13 | 1 |
| Parágrafos no molde "ano, autor e colegas" | 7 | ≤3 |
| Histórias do dossiê usadas no roteiro | — | ≥3 |
| Afirmações A / B / C | não medido | registrar |
| Tokens de pesquisa por tipo | não medido | registrar no piloto |
| Pesquisa pulada e R1 achou fato errado | — | 0 |
| Retenção na segunda metade (Studio) | pedir ao usuário | comparar com o 006 |

## Fontes
kurzgesagt.org/youtube · ted.com (TEDx fact-checking FAQs) · screenskills.com (archive producer, skills checklist) · thesciencewriter.org/annotation-and-factchecking · nsarchive2.gwu.edu/torturingdemocracy (roteiro anotado) · anúncios de vaga de pesquisador de documentário (prática típica).

## Decisões do usuário
Já decidido (10/11): modos por tipo de vídeo.
1. Dossiê só nos modos que pedem: completo em `informativo`, ficha em `competicao-fato`, nota curta ou nada nos outros dois. Confirma os tamanhos da tabela?
2. Teto de 3 prints por longo e crédito mínimo por selo: aceita, ou quer outro número?
3. Dossiê do `informativo` em Opus médio, ou tudo em Sonnet?
4. Em `competicao-fato`, o pesquisador entrega a ficha de tensão ou isso continua com o roteirista?
5. Testar primeiro refazendo só o dossiê e o storyboard do 006 (sem narrar nem renderizar), ou direto no longo 007?
6. `tipo` pelo padrão do canal, confirmado no G1 (recomendo), ou uma pergunta a mais no `novo-video`?
7. `historia` pula o pesquisador por padrão: aceita?
