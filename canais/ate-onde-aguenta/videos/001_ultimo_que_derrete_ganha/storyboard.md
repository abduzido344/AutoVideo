# 001 — Último que derrete ganha

Narração 260,2 s, 23 parágrafos (18 = pausa de 2 s), voz sempre energética. Formato competição (canal.md): promessa no 1º plano, placar a cada eliminação, reviravolta da lava, fim no auge. Sem prints nem fontes.

**Elenco:** **9 cobaias de material** (`tres/src/cobaia/Bichos.tsx`, `derrete` 0→1) · **Remendo** no painel fora do vidro (`tres/src/remendo/RemendoAnim.tsx`, animações Quaternius entre parênteses, expressões de boa / será? / deu ruim).
**Lugares:** **fornalha** (`cenarios/fornalha.tsx`: 9 pedestais, porta, termômetro, placar) · **painel** (botão vermelho, alavanca) · inserts de 2 s: **cozinha** (forno), **estúdio** (jantar), **sol** (`cenarios/lugares002.tsx`).
**Cenas-mestre que voltam:** FILA · TERMO · CAI · PLACAR · BOTÃO · REMENDO · DIA · LAVA · HERÓI. Dentro de cada plano, cortes de ~1–2 s entre ângulos.
**Luz:** fornalha fria (azul) em –20 → neutra → laranja a cada degrau → branco-amarela no final; inserts neutros.

| # | s | gatilho | cena | onde | faz o quê | câmera | objeto-informação | som |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.0 | Nove | FILA | fornalha | 9 bichos nos pedestais olham para a câmera | geral frontal, push-in rápido | placar de 9 rostos acende | porta pesada fecha |
| 2 | 5.4 | temperatura | TERMO | fornalha | — | close do termômetro gigante | –20 dispara até o topo e volta | whoosh subindo |
| 3 | 7.8 | último | HERÓI | fornalha | silhueta de pé no meio de poças, sem revelar qual | contra-plongée, zoom | troféu brilha | impacto |
| 4 | 13.2 | pinguim | FILA | fornalha | pinguim, coelho, ursinho, soldadinho, robô: gesto de cada um ao ser dito | corte a cada nome, close | nome do material brilha | pop por nome |
| 5 | 22.8 | porco | FILA | fornalha | porco, pato, touro, coruja: mesmo ritmo | corte a cada nome, close | — | pop por nome |
| 6 | 30.1 | escolhe | REMENDO | painel | Remendo aponta para a câmera (Interact) e sorri de lado | médio frontal | — | whoosh |
| 7 | 37.9 | porta | LAVA | fornalha | porta abre um palmo, brilho laranja (teaser) | close da porta | — | rumble grave |
| 8 | 43.9 | aposta | FILA | fornalha | os 9 se olham desconfiados | dois-planos rápidos | — | — |
| 9 | 46.3 | Remendo | BOTÃO | painel | Remendo entra andando (Walk_Loop) e para com a mão sobre o botão, de boa | médio, vidro em primeiro plano | — | passos + clique |
| 10 | 50.6 | vinte | FILA | fornalha | geada nas paredes, bichos tremendo e sorrindo | geral, dolly | termômetro em –20 | vento gelado |
| 11 | 56.5 | Primeira | BOTÃO | painel | Remendo aperta o botão com força | close da mão | — | clique + motor |
| 12 | 58.1 | zero | TERMO | fornalha | — | close | sobe até 0 | tique |
| 13 | 61.8 | pinguim | CAI | fornalha | pinguim sua, bico pinga, asas escorrem | close | — | gotejar |
| 14 | 65.2 | poça | CAI | fornalha | vira poça | plongée sobre a poça | — | splash |
| 15 | 66.7 | oito | PLACAR | fornalha | — | close do placar | rosto do pinguim apaga: 8 | buzzer |
| 16 | 67.9 | Ninguém | REMENDO | painel | Remendo ri da poça (Dance_Loop curto), de boa | médio | — | risadinha |
| 17 | 70.7 | próximo | FILA | fornalha | coelho de chocolate engole seco | push-in no coelho | — | gulp |
| 18 | 75.7 | Duvida | DIA | painel | Remendo segura uma barra de chocolate (Idle_Talking_Loop) | médio | barra de chocolate | embalagem |
| 19 | 81.1 | entortar | DIA | painel | barra entorta na mão dele, cara de será? | close da mão | — | squish |
| 20 | 83.6 | trinta | TERMO | fornalha | — | close | sobe até 34 | tique |
| 21 | 86.9 | orelhas | CAI | fornalha | coelho perde as orelhas | close | — | plop |
| 22 | 88.4 | cara | CAI | fornalha | cai de cara no chão e espalha | plongée | — | splat |
| 23 | 90.3 | sete | PLACAR | fornalha | — | close do placar | coelho apaga: 7 | buzzer |
| 24 | 91.8 | ursinho | FILA | fornalha | ursinho de vela faz pose de durão | push-in | — | — |
| 25 | 95.1 | sessenta | TERMO | fornalha | — | close | sobe até 60 | tique |
| 26 | 98.3 | murchando | CAI | fornalha | ursinho murcha devagar, pavio pendendo | close lento | — | chiado de cera |
| 27 | 101.4 | jantar | DIA | estúdio | vela de jantar romântico escorrendo na mesa (insert 2 s) | close | — | violino curto |
| 28 | 103.7 | seis | PLACAR | fornalha | — | close do placar | ursinho apaga: 6 | buzzer |
| 29 | 106.3 | aquecimento | REMENDO | painel | Remendo estala os dedos e se debruça no botão (PickUp_Table) | médio baixo | — | whoosh |
| 30 | 110.8 | solta | BOTÃO | painel | mão afunda o botão e segura | close da mão | — | motor sobe |
| 31 | 112.2 | cem | TERMO | fornalha | — | close, shake a cada número | 100 → 200 → 300 | tique forte por número |
| 32 | 117.0 | aposta | FILA | fornalha | todos olham para o robô | geral | — | — |
| 33 | 122.6 | soldadinho | CAI | fornalha | soldadinho começa a brilhar em posição de sentido | close | brasa sobe | zumbido |
| 34 | 127.2 | escorrer | CAI | fornalha | escorre inteiro sem sair da pose | plongée | — | chiado |
| 35 | 129.4 | cinco | PLACAR | fornalha | — | close do placar | soldadinho apaga: 5 | buzzer |
| 36 | 131.3 | robô | FILA | fornalha | robô estufa o peito, visor sorrindo | contra-plongée | — | bip-bip |
| 37 | 133.4 | panela | DIA | cozinha | panela de alumínio sai inteira do forno (insert) | médio | forno da cozinha | porta do forno |
| 38 | 139.1 | isso | REMENDO | painel | Remendo nega com a cabeça (Idle_No_Loop), será? | close | — | — |
| 39 | 142.1 | Seiscentos | TERMO | fornalha | — | close | sobe até 660 | tique forte |
| 40 | 146.6 | joelhos | CAI | fornalha | robô afunda até os joelhos | close | — | chiado metálico |
| 41 | 149.5 | água | CAI | fornalha | espalha pelo chão feito água | plongée | — | splash metálico |
| 42 | 151.1 | quatro | PLACAR | fornalha | — | close do placar | robô apaga: 4 | buzzer |
| 43 | 155.1 | porco | CAI | fornalha | porco sua, focinho brilha | close | brasa | chiado |
| 44 | 159.3 | novecentos | TERMO | fornalha | — | close | sobe até 950 | tique forte |
| 45 | 162.2 | escorre | CAI | fornalha | escorre de focinho primeiro | close lateral | — | splat |
| 46 | 165.1 | três | PLACAR | fornalha | — | close do placar | porco apaga: 3 | buzzer |
| 47 | 166.5 | Pato | FILA | fornalha | pato, touro e coruja em brasa, se encarando | corte a cada nome | — | pop por nome |
| 48 | 172.5 | mil | TERMO | fornalha | — | close | passa de 1000 | tique forte |
| 49 | 177.7 | reviravolta | REMENDO | painel | Remendo olha para a alavanca e esfrega as mãos, de boa | push-in rápido | — | tambor |
| 50 | 181.0 | alavanca | BOTÃO | painel | Remendo puxa a alavanca com o corpo todo (Push_Loop) | médio | — | alavanca + sirene |
| 51 | 182.1 | porta | LAVA | fornalha | porta abre, lava entra correndo pelo chão | geral baixo | — | rumble + borbulha |
| 52 | 187.8 | pés | LAVA | fornalha | lava chega nos pés dos três | close no chão | — | chiado alto |
| 53 | 192.3 | mais | CAI | fornalha | pato de ouro amolece | close | — | — |
| 54 | 195.9 | boiando | CAI | fornalha | sai boiando na lava | plongée lenta | — | borbulha |
| 55 | 198.2 | dois | PLACAR | fornalha | — | close do placar | pato apaga: 2 | buzzer |
| 56 | 199.6 | Final | FILA | fornalha | touro x coruja se encarando dentro da lava | dois-planos alternados | — | tambor |
| 57 | 205.4 | firme | REMENDO | painel | Remendo cruza os braços (Idle_FoldArms_Loop), será? | médio | — | — |
| 58 | 208.7 | porta | BOTÃO | painel | Remendo fecha a porta e afunda o botão | close da mão | — | porta + motor no máximo |
| 59 | 211.5 | quinhentos | TERMO | fornalha | — | close, shake | 1500, branco-amarelo | tique + impacto |
| 60 | 213.6 | [pausa] | FILA | fornalha | silêncio, os dois imóveis em brasa | push-in lento | — | silêncio 2 s |
| 61 | 216.0 | touro | CAI | fornalha | touro treme e abaixa os chifres devagar | close lento | — | rangido |
| 62 | 220.3 | escorre | CAI | fornalha | escorre inteiro | plongée | — | splash pesado |
| 63 | 221.4 | acabou | REMENDO | painel | Remendo pula de alegria (Jump_Loop), deu ruim de espanto | médio | — | impacto + sino |
| 64 | 223.0 | coruja | HERÓI | fornalha | coruja de pé no meio de oito poças | contra-plongée, zoom | troféu desce | fanfarra curta |
| 65 | 231.5 | três | HERÓI | fornalha | — | close da coruja | termômetro mostra 3422 bem acima | — |
| 66 | 235.9 | Só | REMENDO | painel | Remendo levanta o dedo, sorriso torto | close | — | whoosh |
| 67 | 241.3 | carboneto | HERÓI | fornalha | bloco escuro misterioso surge ao lado da coruja | médio | termômetro marca quase 4000 | rumble |
| 68 | 248.1 | like | REMENDO | painel | Remendo acena para a câmera (Yes) | médio frontal | — | pop |
| 69 | 253.1 | coruja | FILA | fornalha | coruja x bloco escuro frente a frente | dois-planos | — | tambor |
| 70 | 256.9 | Remendo | DIA | sol | Remendo aponta; corte para a superfície do Sol, fim seco | geral | — | whoosh + corte |
