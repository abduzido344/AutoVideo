---
name: publicacao
description: Pacote de postagem e SEO de um vídeo pronto — 3 thumbnails e 3 títulos para teste A/B, descrição com capítulos e fontes, tags, hashtags, comentário fixado e configuração do Studio. Use para publicar, SEO, título, thumbnail, descrição ou teste A/B.
---

# Publicação e SEO

Entrada: pasta do vídeo com `narracao.txt`, `audio/tempos.csv`, `storyboard.md` e `midia/final.mp4`. Saída: `midia/publicacao.md` + `midia/thumbs/`. Ler `canais/<canal>/canal.md` antes.

## 1. Palavra-chave
Uma principal (o que o público digita: "tipos de descanso", "morar sozinho") e 4–5 secundárias. Ela abre o título A, a primeira frase da descrição, a primeira tag e uma hashtag.

## 2. Thumbnails A/B (3, até 3 no Testar e comparar do YouTube)
Em código, `motion/effectcraft/thumbNNN.mjs` (rig `prota` + `mg.mjs`), 1920×1080, saída `midia/thumbs/A_*.png`, `B_*.png`, `C_*.png`. Três ideias diferentes, não três cores:
- **A grade**: título no alto com uma palavra colorida e traços `> <`, 4+3 ou 4+4 painéis coloridos com o personagem numa expressão por item e rótulo, faixa do meio com pergunta ("QUAL TE FALTA?"). Padrão para vídeos de lista/tipos.
- **B círculos**: mesma lista em círculos, título com número em vermelho ("O SONO É SÓ 1 DE 7"), um item marcado.
- **C contraste**: fundo escuro, rosto grande do personagem com emoção forte, 3 linhas de texto (≤5 palavras) e um objeto-símbolo.
Texto ≤6 palavras, Segoe UI 900 com contorno preto 20–34 px, rostos grandes o bastante para ler em 160 px, nada importante no canto inferior direito (duração). Folha de contato das três antes de entregar. Painéis com o personagem: `modal_edit.py --tam=1024x768` + `thumb_grade.py` (cores e fontes do `tema.json` do canal).

## 3. Títulos A/B (3)
≤60 caracteres, palavra-chave no começo do A. Um por gatilho: lista ("Os 7 Tipos de…"), dor/pergunta ("Você Dorme e Continua Cansado?"), contrário ("…Mesmo Sem Fazer Nada"). Complementam a thumbnail, não repetem o texto dela. Mais 3 de reserva. Testar thumbnails primeiro com o título A; títulos na rodada seguinte.

## 4. Descrição
1–2 primeiras linhas = gancho com a palavra-chave (aparecem na busca). Depois: o que o vídeo entrega, a pergunta do fecho, linha de saúde se o tema pedir, chamada para comentar. Capítulos a partir de `audio/tempos.csv` (0:00 primeiro, ≥3, ≥10 s cada, nomes com palavras de busca). Fontes com link (as do storyboard). "Narração: Built with Fish Audio." Inscrição. 3 hashtags no fim.

## 5. Resto
Tags ≤500 caracteres (principal, variações, autores citados, canal). Comentário fixado com pergunta. Studio: categoria Educação, legendas `legendas.srt`, tela final e card para o vídeo anterior do canal mais ligado ao tema, não é para crianças, voz sintética declarada na descrição. Pendências e campos Data/URL/resultado do A/B e do teste de CTA no fim.

## 6. Postar
`python sistema/pipeline/postar.py <pasta> --teste` confere. Agendar: `--quando=2026-11-12T18:00` (Brasília; sobe privado e publica sozinho). Sem `--quando` sobe privado; `--publico` publica na hora. `--thumb=thumbs/x.png` escolhe a thumbnail. Recusa se já houver `Postado:` no md. Sobe título A, descrição, tags, thumbnail e `legendas.srt` (credenciais em `~/.auto_video/`). Se o agendado voltar `private` sem data, o projeto da API perdeu a liberação: o usuário agenda no Studio. Conferir depois com `videos.list` o `channelTitle` (o login pode oferecer outra conta). Testar e comparar, fixar comentário e tela final só no Studio. Pedir ok antes de postar.

## Teste de CTA (longos)
Um vídeo por vez, pela paridade do número da pasta: **ímpar** = CTA logo depois da primeira revelação (2–3 min); **par** = CTA dentro da última cena. Em `publicacao.md`: `CTA: braço · m:ss`. Com 7 e 28 dias, do Studio: views, inscritos ganhos no vídeo, inscritos por 1.000 views, retenção 15 s antes e 15 s depois do CTA. Uma linha por vídeo em `canais/<canal>/testes.md`. Decidir com 4–6 vídeos por braço, por mediana, dentro do mesmo canal e formato; empate fica com o fim. Shorts fora do teste.

## Short
Sem A/B de thumbnail (o YouTube usa um quadro). Título ≤40 caracteres com a palavra-chave; descrição de 2–3 linhas + link do longo de origem + 3 hashtags; sem capítulos. Mesmo `postar.py`.

Nunca inventar número, estudo ou promessa que o vídeo não cumpre.
