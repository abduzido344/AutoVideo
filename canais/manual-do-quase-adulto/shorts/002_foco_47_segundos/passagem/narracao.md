estado: pronto
entregue: audio/narracao.wav, audio/tempos.csv, audio/palavras.json
decisões: narrar.py --ok (modo curto, pausas ≤0,2 s); 7 parágrafos, 6 gerados (p004 é [pausa 1.5] sem GPU); roteiro sem alteração
medidas: 101 palavras, 157 ppm (meta 151), duração 38,7 s; marcos gancho 1 (0,0 s), revelação 3 (12,6 s), virada 6 (28,1 s)
custo GPU: não impresso pelo narrar.py; conferir painel Modal (run ap-Q8u2WrKeUALDPfyirOKWda). Inferência Fish ~5,8 s (154+78 frames) em H100
pendências: nenhuma; Whisper bateu com o texto nas 101 palavras na conferência visual (sem diferença notada)
aprendizado: narrar.py não imprime o custo de GPU; registrar o valor do painel Modal na passagem
