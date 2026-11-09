# Cobaia

Boneco-teste (crash-test dummy) cartoon que enfrenta cada degrau da escala. Não fala; reage com o rosto e o corpo (recua, abana o rosto, cambaleia, cai, racha). Volta sempre inteiro no início do vídeo — "a Cobaia de hoje vai até…".

- Cabeça esférica grande (~35% da altura); tronco e pelve em blocos arredondados; braços e pernas em cilindros finos; esferas pretas nas juntas, mãos e pés.
- Casca amarela #F2BE2E com verniz; juntas pretas metálicas #1B1C1F.
- Alvos amarelo/preto (#F2C230/#16171A) nas duas têmporas e no peito, em cima à esquerda da tela; "00" preto no centro do peito.
- Rosto: olhos brancos ovais com pupila e brilho, sobrancelhas em barra, boca desenhada; rubor e gota de suor como extras.
- Proibido: roupa, sangue; "cru" (casca rompida com fibras) só no último degrau, 1–2 s, nunca na thumbnail.

Código: `C:/Users/Abduzido/AutoVideo_local/tres/src/cobaia/` — `Cobaia.tsx` (modelo), `poses.ts` (ossos e poses), `expressoes.ts` (kit de rostos). Ficha visual: `npx remotion still src/index.ts ficha` em `C:/Users/Abduzido/AutoVideo_local/tres/`.

Ossos: pos, raiz, quadril, coluna, pescoco, cabeca, braco/antebraco/mao, coxa/canela/pe (E = esquerda do boneco = direita da tela; D espelhado automaticamente). Graus (x, y, z):
- braço abre: Z positivo (90 = horizontal, 160 = mãos pra cima); para a frente: X negativo; Y negativo gira o braço pra dentro (mão no peito/garganta).
- cotovelo dobra: antebraço X negativo. Coxa para a frente: X negativo; joelho: canela X positivo.
- cabeça para trás: X negativo; vira: Y.
