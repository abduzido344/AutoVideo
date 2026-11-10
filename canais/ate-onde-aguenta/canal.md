# Até Onde Aguenta

Handle: @AteOndeAguenta (livre em 2026-11-01).

**Nicho e subtemas:** limites das coisas em escala, do leve ao extremo absoluto, e como cada coisa reage em cada degrau. Subtemas: corpo humano · materiais e objetos · natureza e planeta · espaço e física extrema.
**Produção:** 100% 3D por código em `C:/Users/Abduzido/AutoVideo_local/tres/` (Three.js + Remotion, sem Blender), seguindo as 6 regras de `C:/Users/Abduzido/AutoVideo_local/tres/regras.md`; sem Flow.
**Tipo padrão:** competicao-fato
**Público e promessa:** curiosos de 16–35 que rolam o feed à noite, adoram "e se…?" e discutem números nos comentários. "Do normal ao impossível, degrau por degrau: até onde seu corpo, as coisas e o planeta aguentam — e o que acontece quando passa do limite." Variações para alternar: "Até onde aguenta?" · "A escala do absurdo".
**Intensidade:** dano implícito (racha, derrete, congela, desmonta; sem sangue). "Cru" (casca rompida com fibras) só no último degrau, 1–2 s, nunca na thumbnail.
**Tom:** sempre energético, nunca tom baixo, lento ou calmo (vale para toda direção de voz: surpresa, ironia e tensão também em energia alta) · longo conversacional ("imagina que você…") · short intenso (ênfase em cada degrau) · trilha: drone grave que sobe a cada degrau, corte seco antes da ruptura + impacto.
**Personagem:** Remendo, stickman 3D despojado que comanda os testes (aprovado em 08/11/2026; código em `C:/Users/Abduzido/AutoVideo_local/tres/src/remendo/`) — `personagem/FICHA-DO-PERSONAGEM.md`. **Cobaias** são os bichos e objetos testados (`src/cobaia/`), nunca o Remendo. Estilo: `estilo.txt`.
**Voz:** feminina sintética (Fish Drama 3, sem clonar ninguém), referência em estilo youtuber hype: `voz/voz.wav` + `voz/voz.txt` (bootstrap acelerado 1,2×, aprovado em 08/11/2026; a anterior está em `voz/candidatas/v02.*`). Ritmo e energia vêm da referência, não da tag; `--ritmo` até 1,05. Medido: 160 ppm (longo 002), 167 ppm (short 001).
**Motion:** `C:/Users/Abduzido/AutoVideo_local/tres/src/remendo/` (Remendo) · `C:/Users/Abduzido/AutoVideo_local/tres/src/cobaia/` (cobaias: bichos, derretimento) · `C:/Users/Abduzido/AutoVideo_local/tres/src/cenarios/` (câmara, medidores, luz) · `C:/Users/Abduzido/AutoVideo_local/tres/src/videos/ate-onde-aguenta/sNNN.tsx` (um por vídeo) · ficha `npx remotion still src/index.ts ficha`; personalidade: longo pesado e físico (câmera lenta e firme, easing suave, pausa antes da ruptura, impacto seco com shake curto); short snappy (cortes de 1–2 s, push-ins bruscos, impacto no beat).

## Referências e DNAs
Canais: Zack D. Films (29M; longo "Ohio's 1986 Balloon Disaster" 20M) · Big Data Factor ("True Scale of Data Storage" 4,3M) · MetaBallStudios ("ASTEROIDS Size Comparison" 31M, "Biggest TSUNAMIS 3D Comparison" 28M) · Hydraulic Press Channel ("How Strong Are Metals?" 12M).
Escrita (abertura, viradas, palavras/s):
- Abertura: a menor unidade ("Tudo começa com isto.") ou um fato com número que vira desastre ("…mas, em vez de X, virou Y") nos primeiros 10 s.
- Escada: um refrão fixo a cada degrau ("Mais um degrau."); cada degrau = número + comparação do dia a dia + âncora histórica + o que se vê.
- Viradas: "E aqui vem a parte absurda", "mas não foi isso que aconteceu", palpite antes do teste ("não sei se aguenta").
- Ritmo: o ppm medido em Voz (≈2,7 palavras/s); o longo respira nas pausas para o visual, não na fala.
**Narrador sem filtro (formato competição):** zoeira debochada com apelidos de comportamento e escolha ("zé roela", "a patricinha que nunca viu um forno", "esse aí escolheu ouro porque acha que é rico"); nada sobre corpo, sexo, raça ou religião; tags `[sarcastic, mocking]`, `[teasing, smug]`. Eliminação de pessoa é implícita: traje derrete, alarme, cai desmaiado, corta para o capacete rolando e o X no placar.
**Formato competição** ("um vs outro", "último que…"): regras em `.claude/skills/video-longo/competicao.md`. A escada fixa e as âncoras acima valem só para os vídeos de escala.
Retenção (promessa, re-gancho, fecho): a promessa e o topo da escala anunciados em 10 s; primeiro "pagamento" visual até 20 s; re-gancho a cada ~60 s com um fato que vira a escala; o momento da ruptura com 1–2 s de silêncio antes; fecho que volta ao primeiro degrau ("e tudo começou com…"). MetaBall prova que a escala segura até sem narração: música + rótulo de número.
Títulos: "A escala real de X" · "X: do normal ao extremo" · "Até onde aguenta X?" · "O que acontece com X a Y graus" · palavra-chave em CAIXA ALTA + "comparação 3D".
Objetos: escolhidos pelo tema e roteiro de cada vídeo; modelar em `C:/Users/Abduzido/AutoVideo_local/tres/src/cenarios/` só quando um vídeo pedir e reaproveitar depois. Cardápio — medidores: termômetro 3D (coluna de vidro, líquido emissivo), manômetro de agulha (pressão, força G, velocidade, dB), régua de degraus ao lado da cobaia (o degrau atual acende), cronômetro. Cena: chapa/plataforma de teste (brasa, gelo, vibração), prensa hidráulica, bloco de amostra do material, câmara de vidro em volta da cobaia (vácuo, pressão, gás). Escala sempre comparada com a altura do Remendo (1,8 m).
Thumbnail (modos, texto, cor de destaque): cobaia no limite (rachando, derretendo, congelando — nunca cru) com o Remendo reagindo + número extremo gigante ("1.000 °C"); 2–4 palavras em caixa alta, o número em laranja #FF5A14 (calor/força) ou azul #7FD3FF (frio/vácuo), resto branco; fundo escuro; legível em 200×112. Alternativas: antes/depois · lacuna.

## Publicação
Cadência: 1 longo/semana (YouTube) + 5 shorts (seg–sex) postados em YouTube Shorts, Instagram Reels e TikTok.
Funil: cada short é um degrau do longo da semana e para antes do degrau final. YouTube Shorts → "vídeo relacionado" apontando para o longo; Reels e TikTok → CTA falado e escrito "o último degrau está no YouTube: Até Onde Aguenta" + link na bio. Longo: fixar comentário com a playlist de escalas.
Por vídeo: título · alternativas · thumbnail · descrição · fontes e créditos · arquivo final · legendas · data · URL.

## Banco de cenas
| Clipe | Mostra | Serve para |
|---|---|---|
| Apresentação | Remendo inteiro no estúdio, luz neutra, câmera frontal lenta | abertura; "hoje o Remendo testa…"; volta no fecho |
| Degrau | cobaia + medidor no valor do degrau, reação leve (recua, treme) | cada degrau da escala; reaproveita só trocando o parâmetro |
| Raio-X | modo diagrama: casca de vidro, núcleo emissivo, grade | explicar o que acontece por dentro |
| Comparação | cobaia ao lado do objeto/fenômeno em escala real | número grande demais para imaginar |
| Limite | push-in lento, 1–2 s de silêncio, medidor no vermelho | antes da ruptura; re-gancho |
| Ruptura | racha, derrete, congela ou desmonta (cru só aqui, 1–2 s) | o pagamento do degrau final |
| Recorde | cobaia de pé de novo + marca do recorde humano/real | fato surpreendente; virada |
| Volta | câmera recua até o primeiro degrau | fecho e CTA para o canal |

