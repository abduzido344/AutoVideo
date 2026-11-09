# 002 — Cinco trajes, dez milhões

Narração ~525 s, 56 parágrafos (39 e 53 = pausa de 2 s), voz hype (canal.md). Formato competição: promessa no 1º plano, placar a cada eliminação, regra secreta que volta duas vezes, fim no auge. Eliminação implícita (traje escorre, alarme, cai desmaiado, capacete rolando, X no placar). Coluna `s` sai de `audio/palavras.json` pelo gatilho dentro do parágrafo (`¶`).

**Elenco:** 5 competidores (`tres/src/gente3d/Competidor.tsx` + `videos/ate-onde-aguenta/elenco002.ts`; `traje` = metal, `quente` 0→1 brilho) · **Remendo** na sala de controle (`remendo/RemendoAnim.tsx`). Animações Quaternius entre parênteses.
**Lugares:** **entrada** (porta da câmara, corredor sci-fi, carro na porta) · **sala dos trajes** (5 trajes pendurados em cabides, luz de vitrine) · **câmara** (`cenarios/fornalha.tsx` + kit sci-fi: 5 marcas no chão, termômetro, placar com 5 rostos, cronômetro, porta) · **controle** (`CASCA_CONTROLE`: painel, botão, roleta no monitor, vidro para a câmara, banco da plateia).
**Cenas-mestre que voltam:** CHEGADA · SALA · GERAL · CLOSE (rosto no capacete) · TERMO · CRONO · PLACAR · REMENDO · ROLETA · PLATEIA. Cortes de ~1–2 s entre ângulos dentro de cada plano.
**Luz:** entrada e sala neutras → câmara fria a 300 → vermelho escuro a 640 → cereja a 1000 → quase branca a 1400 → branca a 1600. Cartão no canto (edição): nome · material · derrete a X °C quando o nome é dito.

**Trilha (Mixkit, `sistema/sons/musica/`, montada em `midia/trilha.wav`):** abertura 0–38 Epical Drums 01 (676) · chegada 38–89 Comical (2) · sala dos trajes 89–143 Welcome to The Games (54) · rodadas 1–2 143–298 Epical Drums 02 (677) · rodadas 3–4 298–366 Epical Drums 05 (680) · silêncio na pausa · quedas 369–397 Echoes (188) · final 397–493 Silent Descent (614) · silêncio · vitória 495–525 Epic Games (76).

| # | ¶ | s | gatilho | cena | onde | faz o quê | câmera | objeto-informação | som |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 0.0 | Dez | GERAL | câmara | 5 de traje de costas, porta enorme abre com vapor | geral baixa, push-in | maleta de dinheiro brilha no centro | porta pesada + whoosh |
| 2 | 1 | 4.4 | seiscentos | TERMO | câmara | — | close termômetro | ponteiro dispara até 1600 e volta | sobe tom |
| 3 | 1 | 6.1 | cinco | GERAL | câmara | os 5 viram para a câmera, metais refletindo | travelling lateral | 5 cores de metal | impacto |
| 4 | 2 | 11.2 | primeiro | CLOSE | câmara | rostos alternando, ninguém sabe | cortes rápidos | — | tique-tique |
| 5 | 2 | 15.7 | secreta | REMENDO | controle | Remendo esconde um envelope atrás das costas (Idle_Talking_Loop) | médio | envelope com X | sting misterioso |
| 6 | 3 | 20.8 | like | GERAL | câmara | porta fechando devagar | geral | — | clique + porta |
| 7 | 4 | 26.1 | rodada | CRONO | câmara | — | close cronômetro | 1:00 aparece | bip |
| 8 | 4 | 32.1 | milhões | GERAL | câmara | maleta sobe num pedestal no fundo | contra-plongée | maleta | ka-ching |
| 9 | 5 | 38.1 | Zé | CHEGADA | entrada | Zé chega de chinelo e boné, tropeça na placa (Walk_Loop, Jump_Start) | médio, segue | chinelo | pop |
| 10 | 5 | 44.8 | moto | CHEGADA | entrada | Zé faz gesto de acelerar moto (Idle_Talking_Loop) | close | — | ronco de moto |
| 11 | 6 | 49.0 | patricinha | CHEGADA | entrada | desce do carro filmando com o celular (Walk_Loop) | baixo, carro na frente | celular | porta de carro + flash |
| 12 | 6 | 55.4 | bolsas | CHEGADA | entrada | pose para o celular (Idle_FoldArms_Loop) | close | — | flash |
| 13 | 7 | 56.7 | nerd | CHEGADA | entrada | chega de mochila, aponta a placa (Interact) | médio | calculadora | teclinhas |
| 14 | 7 | 64.2 | laboratório | CHEGADA | entrada | ajeita os óculos (Idle_Loop) | close | — | pop |
| 15 | 8 | 65.7 | tiozão | CHEGADA | entrada | chega de avental e pegador, cumprimenta todo mundo (Yes) | médio | pegador | risada + tapinha |
| 16 | 8 | 73.7 | churrascaria | CHEGADA | entrada | bate no peito orgulhoso | close | — | chiado de grelha |
| 17 | 9 | 76.6 | tia | CHEGADA | entrada | grava áudio no celular, mancando leve (Walk_Loop lento) | médio | celular | bip de áudio do zap |
| 18 | 9 | 84.5 | netos | CHEGADA | entrada | sorri para a câmera (Idle_Talking_Loop) | close | — | pop |
| 19 | 10 | 89.0 | sala | SALA | sala dos trajes | porta abre, luz de vitrine acende nos 5 trajes | push-in pelo corredor | 5 trajes pendurados | porta + acorde |
| 20 | 10 | 93.0 | alumínio | SALA | sala dos trajes | — | corte a cada metal dito | cada traje acende | pop por nome |
| 21 | 11 | 101.9 | agarra | SALA | sala dos trajes | Zé corre e abraça o alumínio (Sprint_Loop, PickUp_Table) | médio | traje prata | whoosh |
| 22 | 11 | 103.6 | panela | SALA | sala dos trajes | Zé bate no traje como em panela | close | — | "tim" de panela |
| 23 | 12 | 113.7 | ouro | SALA | sala dos trajes | patricinha pega o ouro sem olhar ninguém | médio | traje dourado | brilho |
| 24 | 12 | 117.4 | foto | SALA | sala dos trajes | selfie com o traje | close | celular | flash |
| 25 | 13 | 119.4 | cobre | SALA | sala dos trajes | nerd pega o cobre e explica com a mão no ar (Idle_Talking_Loop) | médio | traje cobre | teclinhas |
| 26 | 13 | 127.5 | problema | SALA | sala dos trajes | os outros olham para ele sem entender | geral | — | grilo |
| 27 | 14 | 130.4 | ferro | SALA | sala dos trajes | tiozão bate no traje de ferro (Interact) | médio | — | batida metálica |
| 28 | 14 | 137.0 | titânio | SALA | sala dos trajes | tia pega o último, mostra o joelho | close joelho → rosto | traje titânio | pop |
| 29 | 15 | 142.8 | comentários | GERAL | câmara | os 5 já de traje em fila, olhando a câmera | travelling | — | batida |
| 30 | 16 | 150.2 | Porta | GERAL | câmara | porta fecha | geral | — | porta pesada |
| 31 | 16 | 154.8 | botão | REMENDO | controle | Remendo aperta o botão vermelho (Interact) | close botão | — | clique grande |
| 32 | 16 | 155.7 | cronômetro | CRONO | câmara | — | close | 1:00 começa a descer, 300 no termômetro | tique-taque |
| 33 | 16 | 158.6 | rindo | GERAL | câmara | todos rindo (Idle_Talking_Loop) | médio | — | risadas |
| 34 | 17 | 161.0 | Zé | CLOSE | câmara | Zé relaxado, braços cruzados | close | traje prata reflete o vermelho das paredes | — |
| 35 | 17 | 169.2 | bombeiros | CLOSE | câmara | reflexo forte no traje | detalhe | — | brilho |
| 36 | 18 | 171.4 | nerd | CLOSE | câmara | visor do nerd embaça, ele abana | close | vapor dentro do capacete | chiado |
| 37 | 19 | 181.4 | zera | CRONO | câmara | — | close | 0:00 | buzina curta |
| 38 | 19 | 184.8 | proposta | REMENDO | controle | Remendo abre a maleta com 1 milhão (Interact) | médio | maleta "1 milhão" | ka-ching |
| 39 | 20 | 191.7 | ri | GERAL | câmara | tiozão, patricinha, Zé rindo em sequência | cortes rápidos | — | 3 risadas |
| 40 | 20 | 198.3 | mão | CLOSE | câmara | nerd levanta a mão devagar | close | — | silêncio + "plim" |
| 41 | 21 | 199.8 | conta | CLOSE | câmara | nerd faz conta na calculadora dentro do capacete | close | dígitos ×18 | teclinhas |
| 42 | 22 | 210.4 | sai | GERAL | câmara | nerd sai andando com a maleta, traje intacto (Walk_Loop) | geral, porta | maleta | porta |
| 43 | 22 | 214.8 | X | PLACAR | câmara | — | close placar | X no rosto do nerd | buzina de erro |
| 44 | 23 | 219.0 | começo | GERAL | câmara | traje de cobre pendurado na parede, câmera para nele | push-in lento | traje cobre | sting |
| 45 | 24 | 228.4 | seiscentos | TERMO | câmara | — | close | 640, linha vermelha do alumínio em 660 | sobe tom |
| 46 | 25 | 238.2 | capacete | CLOSE | câmara | capacete do Zé entorta, ombros cedem | close | metal ondulando | rangido metálico |
| 47 | 26 | 244.0 | ferro | CLOSE | câmara | ferro do tiozão vermelho escuro, ele faz joia (Yes) | médio | brilho vermelho escuro | brasa |
| 48 | 27 | 254.4 | vinte | CRONO | câmara | — | close | 0:20 | tique-taque acelerando |
| 49 | 27 | 256.4 | ajoelha | CLOSE | câmara | Zé ajoelha (Crouch_Idle_Loop) | baixo | — | tum |
| 50 | 27 | 260.7 | três | CRONO | câmara | intercalado com Zé torto | cortes 0,5 s | 3, 2, 1 | bips |
| 51 | 28 | 263.4 | Zerou | GERAL | câmara | Zé de pé, todo torto | geral | 0:00 | buzina + respirada |
| 52 | 28 | 268.2 | soco | REMENDO | controle | Remendo soca a mesa (Hit_Chest invertido / Push) | close mão | — | soco na mesa |
| 53 | 29 | 272.0 | regra | REMENDO | controle | Remendo abre o envelope secreto | close | envelope | sting |
| 54 | 30 | 284.7 | roleta | ROLETA | controle | monitor com roleta de 4 rostos girando | close monitor | ponteiro | roleta girando |
| 55 | 30 | 287.7 | Zé | ROLETA | controle | para no Zé, Remendo de boca aberta | close | — | ding |
| 56 | 31 | 291.6 | ganha | GERAL | câmara | Zé troca o alumínio torto pelo cobre da parede | médio | alumínio caído no chão | whoosh + trombeta |
| 57 | 31 | 297.6 | salvar | REMENDO | controle | Remendo põe a mão no rosto | close | — | "ué" |
| 58 | 32 | 299.6 | agora | GERAL | câmara | os 4 em fila, câmera passa por cada um | travelling | — | batida |
| 59 | 33 | 309.1 | mil | TERMO | câmara | câmara inteira em vermelho cereja | geral | 1000 | sobe tom |
| 60 | 33 | 316.6 | brilham | GERAL | câmara | ouro, ferro e paredes brilham | geral lenta | — | zumbido |
| 61 | 34 | 323.5 | abana | CLOSE | câmara | Zé abana o capacete com a mão | close | — | chiado |
| 62 | 35 | 329.0 | pose | CLOSE | câmara | patricinha manda beijo (Idle_FoldArms_Loop) | close | — | beijo + flash |
| 63 | 36 | 336.8 | blefe | CLOSE | câmara | gota de suor dentro do capacete dela | detalhe | — | gota |
| 64 | 36 | 344.4 | dois | REMENDO | controle | Remendo oferece 2 milhões no microfone | médio | maleta 2 milhões | ka-ching |
| 65 | 36 | 347.4 | recusa | CLOSE | câmara | tia balança o dedo (Idle_No_Loop) | close | — | "nã-nã" |
| 66 | 37 | 350.1 | setenta | TERMO | câmara | — | close | 1070, entre a linha do ouro (1064) e do cobre (1085) | sobe tom |
| 67 | 38 | 359.7 | escorre | CLOSE | câmara | ouro escorre pelos braços dela | médio | gotas douradas | borbulha |
| 68 | 38 | 365.1 | selfie | CLOSE | câmara | ela tenta tirar selfie no canto | close | celular | flash |
| 69 | 39 | 366.2 | (pausa) | GERAL | câmara | silêncio, só o brilho | geral parada | — | silêncio |
| 70 | 40 | 369.4 | desaba | GERAL | câmara | traje de ouro desaba, ela cai (Death01) | médio | poça dourada | alarme + desabar |
| 71 | 40 | 372.4 | capacete | CLOSE | câmara | capacete rolando pelo chão | baixo, segue | — | rolar metálico |
| 72 | 41 | 379.1 | Zé | GERAL | câmara | Zé cai duro para trás (Hit_Knockback) | médio | traje de cobre inteiro | tum |
| 73 | 42 | 388.4 | dupla | PLACAR | câmara | — | close | dois X ao mesmo tempo | 2 buzinas |
| 74 | 42 | 393.1 | plateia | PLATEIA | controle | nerd no banco com a maleta no colo, comendo pipoca | médio | maleta | crunch |
| 75 | 43 | 397.3 | Final | GERAL | câmara | tiozão e tia frente a frente, quase brancos de brilho | geral simétrica | 1400 | batida grave |
| 76 | 44 | 410.0 | cinco | REMENDO | controle | Remendo oferece 5 milhões | médio | maleta 5 milhões | ka-ching |
| 77 | 44 | 414.1 | peito | CLOSE | câmara | tiozão bate no peito e grita | close | — | grito + batida |
| 78 | 45 | 419.8 | celular | CLOSE | câmara | celular apita dentro do capacete da tia | close | tela do celular | notificação |
| 79 | 46 | 427.5 | zap | CLOSE | câmara | tia arregala os olhos | close | — | sting |
| 80 | 47 | 436.3 | aceita | GERAL | câmara | tia sai correndo com a maleta (Sprint_Loop) | geral, porta | maleta | corrida + porta |
| 81 | 47 | 443.1 | sessenta | TERMO | câmara | — | close | linha do titânio 1668 bem acima | "buh-buh-buuu" |
| 82 | 48 | 446.3 | sozinho | CLOSE | câmara | tiozão sozinho olha o termômetro | médio | 1538 marcado | silêncio |
| 83 | 49 | 462.3 | roleta | ROLETA | controle | roleta só com o rosto do tiozão | close monitor | — | roleta + ding |
| 84 | 50 | 465.4 | veste | GERAL | câmara | tiozão veste o titânio (PickUp_Table) | médio | traje de ferro pendurado na parede | whoosh |
| 85 | 50 | 469.8 | cabeça | REMENDO | controle | Remendo com as duas mãos na cabeça | close | — | "ah não" |
| 86 | 51 | 479.4 | escorre | GERAL | câmara | traje de ferro vazio escorre na parede | médio | poça de ferro | borbulha grave |
| 87 | 52 | 482.9 | seiscentos | TERMO | câmara | — | close | 1600 | sobe tom máximo |
| 88 | 52 | 486.7 | ajoelha | CLOSE | câmara | tiozão ajoelha, titânio branco (Crouch_Idle_Loop) | baixo | — | rangido |
| 89 | 52 | 490.9 | dez | CRONO | câmara | — | cortes 0,5 s | 10, 5, 3 | bips |
| 90 | 53 | 493.2 | (pausa) | GERAL | câmara | tudo branco, silêncio | geral | — | silêncio |
| 91 | 54 | 495.4 | Zerou | GERAL | câmara | tiozão levanta e comemora (Dance_Loop) | contra-plongée | maleta 10 milhões cai do teto | explosão de confete + trombeta |
| 92 | 55 | 505.7 | nerd | PLATEIA | controle | nerd e tia na plateia, tia de cara feia | médio | duas maletas | risada |
| 93 | 56 | 517.6 | áudio | CLOSE | controle | tia gravando áudio irritada, Remendo olha para a câmera | close | celular | bip de áudio |
| 94 | 56 | 520.9 | dois | TERMO | câmara | termômetro novo marcando 2000 | close | 2000 | corte seco |
