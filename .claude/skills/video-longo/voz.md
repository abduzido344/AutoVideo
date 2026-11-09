# Voz do narrador (Drama 3): pontuação e direção

Vale para longo, short e 3D. Quem escreve o `narracao.txt` também dirige a voz.

## Pontuação de fala
Cada sinal vira pausa. Escrever como se fala, não como se lê.
- Frases de 12 a 25 palavras, emendadas com "e", "que", "aí", "então", "porque", "mas". Ponto só quando a ideia fecha.
- Vírgula só onde a pessoa respiraria: lista, troca de assunto, oração longa. Não entre sujeito e verbo, nem antes de "e" simples.
- Frase de até 4 palavras: no máximo uma por parágrafo, só para a ideia-chave, nunca duas seguidas.
- Fora: dois-pontos, ponto e vírgula, travessão, reticências, parênteses. `!` só com direção de entusiasmo; `?` só em pergunta de verdade.
- Teste: ler em voz alta de uma vez. Parou onde não respiraria? Juntar.
- `narrar.py` mostra antes do custo quantas palavras há por sinal (meta ≥ 8). Abaixo disso, reescrever antes do `--ok`.

Antes: `Você não fez nada. E está exausto. Como pode?`
Depois: `Você não fez nada e mesmo assim está exausto, como pode?`

## Ritmo e silêncio
- Palavras do roteiro = duração-alvo × ppm medido do canal (`medir.py` no último vídeo com a voz atual; o número fica em `canal.md` › Voz). Sem medida: 155/min.
- Silêncio depois de uma revelação: parágrafo sozinho `[pausa 1.5]`, em 1 ou 2 revelações por vídeo. Nunca por pontuação.

## Direção
O Drama 3 segue direção em linguagem natural entre colchetes. A referência `voz.wav` é calma, e sem direção a voz tende a ficar nela: o tom que importa tem de estar escrito.
- Para cada parágrafo, decidir a intenção (ironia, entusiasmo, intimidade, tensão, alívio…) e escrever a tag que a pede. Só a explicação neutra fica sem tag.
- `[direção]` no começo vale para o parágrafo todo (`narrar.py` a repete em cada pedaço que o Fish gera). Mudou o tom: novo parágrafo.
- A direção enfraquece com o tempo: medido, o tom baixo voltou ao normal depois de ~4 s num parágrafo de 60 palavras. Parágrafo com tom marcado: até ~25 palavras (≈ 8 s). Mais longo: repetir a `[direção]` no começo das frases seguintes.
- Em inglês, concreta: tom + ritmo + jeito, até três qualificadores. Uma emoção principal; não misturar opostas.
- Sons no ponto exato: `[sighs]`, `[laughs]`, `[chuckles]`, `[breath]`. Nada de tag de pausa dentro da fala; para um clipe tocar com o som original, um parágrafo sozinho `[pausa N]` (N s de silêncio, sem GPU).
- Em palavras soltas: `<emphasis>`, `<slow>`, `<fast>`, `<soft>`, `<stress>`, `<forceful>`, `<whisper>`.
- Parênteses e asteriscos não funcionam.
- Gancho com energia, dor mais baixa e lenta, virada com surpresa, solução calorosa, fecho calmo: acompanha a cor da edição (fria → neutra → quente).

| Intenção | Direção |
|---|---|
| Base do narrador | `[calm, measured storyteller voice]` |
| Ironia | `[dry, sarcastic, deadpan]` · `[amused, mock-serious]` |
| Entusiasmo | `[excited, energetic, fast]` · `[enthusiastic, bright]` |
| Mais baixo, íntimo | `[low, almost confiding]` · `[soft, close, intimate]` |
| Tensão, dor | `[serious, measured]` · `[slow, dangerously quiet]` · `[tense, urgent]` |
| Surpresa | `[surprised, incredulous]` |
| Acolhimento | `[warm, friendly]` · `[soft, caring]` |
| Cansaço, peso | `[tired, resigned]` · `[heavy, slow]` |
| Alívio, virada | `[relieved, lighter]` · `[hopeful, brightening]` |

A direção não saiu na prova? Mais qualificadores concretos (`[very low, almost a whisper, slow]`), parágrafo mais curto, `--refazer=N` só nele.

- **Ritmo e energia vêm da referência, não da tag** (medido 08/11/2026): `[very fast…]` não muda palavras/s e `<emphasis>` alonga. Para energia alta, gerar 4 takes com a voz atual e direção forte, escolher o melhor (Whisper ok, pitch ±3 st) e acelerar 1,15–1,2× com atempo como nova referência; `--ritmo` no máximo 1,05 depois disso.
