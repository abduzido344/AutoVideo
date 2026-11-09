# Mudanças nas skills (pesquisa de roteiro e retenção)

Base: `pesquisa-roteiro-retencao.md`. Cada bloco traz o texto-alvo; "troca" indica a linha atual que sai. Medido hoje (palavras do Whisper ÷ duração): MQA 003–005 = 136–140/min, 006 = 151; AOA longo 002 = 160, short 001 = 169 (8,6 frases/min).

## B1 · `video-longo/SKILL.md` §2
Troca `~1100 palavras (≈133 palavras/min → ~8 min).`:
> Palavras = minutos × ppm do canal (`canal.md` › Voz; sem medida, 155): 8 min ≈ 1.250.

Troca o item "Abertura em 3 tempos":
> - Abertura até ~1:00 (≈150 palavras) em 3 tempos: curiosidade de filosofia/história → fato crítico do problema → fato que aponta a solução ("guarda essa ideia", pago depois com "lembra da ideia que eu pedi para você guardar?"). **A promessa do vídeo é dita até 0:30**, em uma frase, logo depois do 1º tempo. Primeira frase em um padrão: contrário, pergunta, número, erro ou história.

Troca o item "Logo depois da abertura, CTA curto":
> - CTA de inscrição (~10 s, `[warm, friendly]`, ligado ao tema) nunca antes da promessa. Em teste (`publicacao` › Teste de CTA): pasta de número ímpar, logo depois da primeira revelação (2–3 min); par, dentro da última cena.

Troca o item "Promessa até ~30 s; re-gancho…":
> - Primeira revelação da promessa (uma resposta, não mais contexto) até 2:30; re-gancho (pergunta) no meio; fecho volta à cena de abertura e ao primeiro tempo.

Acrescenta no fim da lista:
> - Competição ("último que…", "um vs outro") não usa esta estrutura: `competicao.md`.
> - Marcar em `marcos.txt` o parágrafo de cada marco (`promessa 3`, `gancho 5`, `revelacao 9`, `virada 31`) e rodar `python sistema/pipeline/medir.py <pasta>` antes de pedir aprovação.

Parte A, mesma tarefa: no topo, troca "Uma etapa por vez; mostrar o resultado e esperar aprovação." por "Agentes e portões de aprovação: skill `producao`."

## B2 · `video-longo/voz.md`
Seção nova depois de "Pontuação de fala":
> ## Ritmo e silêncio
> - Palavras do roteiro = duração-alvo × ppm medido do canal (`medir.py` no último vídeo com a voz atual; o número fica em `canal.md` › Voz). Sem medida: 155/min.
> - Silêncio depois de uma revelação: parágrafo sozinho `[pausa 1.5]`, em 1 ou 2 revelações por vídeo. Nunca por pontuação.

Não repetir "não acelerar a voz": o último item do arquivo já limita `--ritmo` a 1,05.

## B3 · `video-vertical/SKILL.md`
§2, troca "Palavras ≈ segundos × 2,4 (depois da primeira narração, usar a velocidade real)":
> Palavras = segundos × ppm do canal ÷ 60 (`canal.md` › Voz); sem medida, × 2,4 (60 s ≈ 140–150 palavras).

§3, acrescenta:
> - Competição: `../video-longo/competicao.md` (a 1ª ação é a 1ª frase).
> - Antes de narrar: `python sistema/pipeline/medir.py <pasta>` (duração estimada, palavras por sinal, sem pedido de inscrição).

Topo: mesma troca de "Uma etapa por vez…" por `producao`. Resto já está certo (gancho na 1ª frase, sem saudação, sem inscrição, virada no meio).

## B4 · `video-3d/SKILL.md`
Título do §2, troca `(~19 frases/min)`:
> (palavras = segundos × ppm do canal ÷ 60; com frases de 12–25 palavras dá ~8–9 frases/min)

§2, acrescenta:
> Competição: `../video-longo/competicao.md`; sem gancho de 3 tempos e sem fontes.

Seção "Agentes" (Parte A), troca inteira:
> Correção em várias regras: o orquestrador (skill `producao`) abre uma instância de `animador-3d` por regra; cada uma mexe só nos arquivos da sua regra e renderiza antes de terminar. Correção simples se faz aqui mesmo.

## B5 · `video-longo/competicao.md` (novo, único lugar da regra)
> # Formato competição (longo, short, 3D)
> Entretenimento, não aula: sem fontes, prints, autores nem âncora histórica; número só quando cria tensão, e a física tem de estar certa. Sem gancho de 3 tempos.
> - 1ª frase: promessa + prêmio.
> - Até 0:30: regra, escada anunciada ("são N rodadas, de X até Y") e a 1ª ação (algo acontece com alguém). O elenco se apresenta depois ou dentro dela, nunca em fila antes.
> - Aposta do público logo depois da 1ª ação.
> - Rodada = provocação → contagem → quem cai (às vezes o falso favorito) → placar. "Isso é só o começo" a cada ~1 min.
> - A ordem das quedas não pode ser a óbvia: tempo, quase-queda, decisão do host que dá errado, competidor escondido, queda dupla.
> - Reviravolta de regra no meio; fim no auge, corte seco.
> - CTA: `publicacao` › Teste de CTA (ímpar: depois da 1ª eliminação; par: na última cena).
> - `marcos.txt`: `acao N`, `escada N`.

Origem: `canal.md` do AOA + memória `formato-competicao` + mudança 3. "Elenco depois da 1ª ação" é dedução minha: no 002 as cinco apresentações levaram a 1ª ação de 0:26 para 1:25. Alternativa sem arquivo novo: o mesmo bloco dentro de `video-3d`, mas aí o longo de competição fica sem regra.

## B6 · `publicacao/SKILL.md`
Seção nova antes de "Short":
> ## Teste de CTA (longos)
> Um vídeo por vez, pela paridade do número da pasta: **ímpar** = CTA logo depois da primeira revelação (2–3 min); **par** = CTA dentro da última cena. Em `publicacao.md`: `CTA: braço · m:ss`. Com 7 e 28 dias, do Studio: views, inscritos ganhos no vídeo, inscritos por 1.000 views, retenção 15 s antes e 15 s depois do CTA. Uma linha por vídeo em `canais/<canal>/testes.md`. Decidir com 4–6 vídeos por braço, por mediana, dentro do mesmo canal e formato; empate fica com o fim. Shorts fora do teste.

§5, troca "campos Data/URL/resultado do A/B": acrescenta "e do teste de CTA".

Limites do teste (ficam aqui, não na skill): tema e views variam entre vídeos, então o resultado é direção, não prova; a 1 longo por semana são 8–12 semanas por canal; 003–006 (CTA na abertura, 1:31 no 006) servem só de referência histórica; "empate fica com o fim" é escolha minha (não interrompe a primeira metade).

## Coerência com a memória
- **Gancho em 3 tempos**: mantido com os retornos no meio e no fim. Muda só o tamanho (fecha em ~1:00; no 006 só o 1º tempo levou 41 s) e a promessa passa para depois do 1º tempo. Precisa do ok do usuário, porque o formato foi pedido por ele.
- **Voz fluida**: nada muda na pontuação. O `[pausa 1.5]` é silêncio de edição, explícito e raro (≤2), não pausa dramática por sinal. O AOA já pede 1–2 s de silêncio antes da ruptura.
- **Formato competição**: fica fora das regras de promessa/revelação do informativo e ganha as suas (B5). A estrutura do MrBeast não entra no informativo.
- **GPU liberada**: `video-longo` §3 e `CLAUDE.md` ainda dizem "pedir ok"; ajuste opcional do orquestrador ("rodar com `--ok` e informar o custo depois").

## Já coberto: não duplicar
- Conectores "mas/então/porque": `voz.md` › Pontuação.
- Re-gancho no meio e flash na virada problema → solução: `video-longo` §2, `formatos.md`, `edicao.md` (a pesquisa mediu viradas em 55% e 62% no 006; não escrever percentual).
- Densidade: "um parágrafo = uma ideia que vira cena".
- Short: gancho na 1ª frase, sem saudação, sem pedir inscrição.
- Limite de aceleração da voz: fim de `voz.md`.
- Mecânica do `[pausa N]`: `voz.md` › Direção.
- Promessa e primeiro pagamento por canal: `novo-canal` etapa 3 grava em `canal.md`; número do canal mais apertado vence o geral (AOA: promessa e topo da escala em 10 s).

## Não entra
Acelerar a voz para ~174/min · benchmarks do OpenMontage (55% em 60 s, 23,7%, +15–25%) ou qualquer trecho copiado · número de retenção sem fonte · "abrir com a crença errada" como regra (só hipótese em `testes.md`).

## Checagem automática (proposta)
`python sistema/pipeline/medir.py <pasta> [--marcos=promessa:7,revelacao:26] [--ppm=155]`. Lê `narracao.txt`, `marcos.txt` e, se existirem, `audio/tempos.csv` e `palavras.json`. Sem áudio estima o tempo por palavras acumuladas ÷ ppm (marca `~`). Sai com erro se houver FORA.

| Checa | Limite | Onde vale |
|---|---|---|
| palavras e ppm | alvo ±10% | todos |
| palavras por sinal | ≥8 | todos |
| `promessa` | ≤0:30 | informativo |
| `gancho` (fim do 3º tempo) | ≤1:00 | informativo |
| `revelacao` | ≤2:30 | informativo |
| `acao`, `escada` | ≤0:30 | competição |
| CTA (parágrafo com "inscrev") | depois da promessa; ímpar 2:00–3:00; par no último parágrafo falado | longo |
| "inscrev" | ausente | pasta `shorts/` |
| parágrafos `[pausa N]` | relatar quantos | todos |
| duração | 30–90 s | pasta `shorts/` |

Só checa os marcos que existem no `marcos.txt`, então não precisa saber o formato. `ep.py` mostra uma linha com o resultado (tarefa E2 do `03`). Teste do script: no 006 com `--marcos=promessa:7,revelacao:26` deve dar 151 ppm, promessa em 1:44 FORA e revelação em 4:15 FORA.

## Pendências de canal (orquestrador, depois das skills)
- `canais/ate-onde-aguenta/canal.md`: ritmo "~2,1 / ~2,3 p/s" está abaixo do medido com a voz atual (160 e 169 ppm); o parágrafo "Formato competição" vira ponteiro para `competicao.md`, ficando só o que é do canal (narrador sem filtro, eliminação implícita).
- `canais/manual-do-quase-adulto/canal.md` › Voz: 151 ppm (006, `--enxuto`).
- Lacunas que continuam: curvas de retenção do 006 e do 002 no Studio; medir um canal narrado sobre imagens.
