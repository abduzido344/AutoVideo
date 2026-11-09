# Short 002 — Remendo na fornalha

Versão derivada do vídeo 001_ultimo_que_derrete_ganha. Vertical 1080×1920 a 30 fps; 1.255 quadros, cerca de 41,83 segundos. Novo Remendo procedural V02 no controle da fornalha, com pinguim de gelo e coelho de chocolate.

Narração reaproveitada do áudio existente entre 44,10 e 84,92 s. Esse áudio pertence a uma versão anterior do roteiro do longo, preservada. O short usa a transcrição do áudio correspondente; não foi gerada voz nova nem usado serviço pago. Trilha ambiente e efeitos sintetizados localmente em preparar.py.

Fonte da cena no ambiente local: C:/Users/Abduzido/AutoVideo_local/tres/src/videos/ate-onde-aguenta/s002.tsx. Código de referência, JSON de tempos, storyboard e áudio preservados nesta pasta. Componentes reaproveitados: Camara, Console e Bicho. Remendo ganhou pose de pressão do botão.

## Reprodução

Na pasta C:/Users/Abduzido/AutoVideo_local/tres:

```powershell
npx remotion studio src/videos/ate-onde-aguenta/s002.tsx
npx remotion render src/videos/ate-onde-aguenta/s002.tsx remendo-fornalha out/remendo-fornalha.mp4 --concurrency=2
```

## Entrega

midia/final.mp4 contém narração, ambiente, efeitos, títulos, termômetro e legendas incorporadas. midia/legendas.srt permite reaproveitar a transcrição em editores. Cartão final sem voz dura um segundo e deixa o próximo teste em aberto.

A competição completa tem nove participantes; o short mostra só um recorte e o placar passa de nove para oito. Derretimento é representação visual acelerada, não simulação térmica quantitativa. Nenhuma alteração no vídeo longo nem publicação.

## Revisão

TypeScript da cena e dependências passou. Teste inicial de quatro segundos conferido por folha de contato. Revisão do primeiro render completo levou a ajuste do enquadramento e sincronização: botão em 14,36 s, zero grau em 17,69 s, placar oito em 29,52 s. Saída final recebe normalização de áudio para alvo de -16 LUFS e pico verdadeiro de -1,5 dBTP por FFmpeg.

