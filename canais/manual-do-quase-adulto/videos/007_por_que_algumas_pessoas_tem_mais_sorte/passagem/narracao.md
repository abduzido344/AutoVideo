estado: devolve:roteirista
entregue: audio/narracao.wav, audio/tempos.csv, audio/palavras.json (44 parágrafos, 1.239 palavras, 7:50)
decisões: narrar.py --enxuto --ok; §42 reescrito pelo orquestrador e refeito (refazer=42), Whisper bate agora; §31 "Ela topou" some no áudio (a fala começa em "e depois da conversa")
medidas: 159 ppm · 470 s (alvo 151 ±10%) · custo real não impresso pelo script; estimativa ~US$ 0,8 (run) + ~US$ 0,16 (refazer 42 1ª) + ~US$ 0,17 (refazer 42 2ª)
marcos reais: promessa §3 em 0:23 · gancho §6 em 0:51 · revelação §10 em 1:30 · CTA §14 em 2:11 (ímpar, ok)
pendências: [narrador] §31 sem "Ela topou"; refazer=31 (não rodado: fora da ordem recebida). [roteirista] confirmar se "Ela topou," é essencial; se sim, ajustar a frase para não depender dela.
Whisper ≠ texto: §31 "Ela topou," sumiu; §42 "lembra disso" vem como "lembra o que é isso" (1 palavra a mais, aceitável); "içar" sai "eçar" em um uso; "catavento" sai "cata vento"; "aparentemente" com ênfase ok. Nomes (Seelig, Wiseman, Hertfordshire, The Luck Factor, What I Wish I Knew, The Last Mile, San Quentin, Mel Robbins, Pasteur): batem.
aprendizado: TTS pode engolir sílabas iniciais de frase curta logo depois de um parágrafo com ênfase; checar o Whisper de cada parágrafo com menos de 15 palavras.
