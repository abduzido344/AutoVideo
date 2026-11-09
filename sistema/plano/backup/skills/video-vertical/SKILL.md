---
name: video-vertical
description: Produz um vídeo vertical 9:16 curto (30–90 s; Shorts, Reels, TikTok) de um canal em canais/<canal>/ — ideia, roteiro, narração, storyboard, montagem e publicação, ou corte de um vídeo longo. Use para short, vertical ou corte. Canal 3D usa video-3d.
---

# Vídeo vertical (9:16, 30–90 s)

Ler `canais/<canal>/canal.md`. Pasta `canais/<canal>/shorts/NNN_tema/`. Cenas: `../video-longo/formatos.md`; edição: `../video-longo/edicao.md` (os scripts detectam `shorts/` e saem 1080×1920). Uma etapa por vez, esperar aprovação. Estado: `python sistema/pipeline/ep.py <pasta>`.

## Atalho: corte de um longo
`python sistema/pipeline/corte.py <pasta do longo> <p_ini>-<p_fim> <nome>` (parágrafos de `audio/tempos.csv`, ≤90 s) cria o short com áudio, palavras, EDL e sons do trecho; pular para a etapa 6. Escolher um trecho que se entende sozinho e começa com gancho.

## 1. Ideia → `ideias.md` [vertical]
Uma ideia, entendida sem contexto. Fontes: o trecho mais forte de um longo do canal, ou Shorts muito acima da média do próprio canal.

## 2. Conta
Duração 30, 60 ou 90 s. Palavras ≈ segundos × 2,4 (depois da primeira narração, usar a velocidade real).

## 3. Roteiro → `narracao.txt`
- 1ª frase já é o gancho: contrário, pergunta, número, erro ou história no meio. Sem saudação, sem "neste vídeo".
- Segunda pessoa ("imagina que você…"). Cada frase vira uma imagem; se não dá para desenhar, sai.
- Um parágrafo por plano. Virada no meio; fim curto com a ideia-chave, de preferência emendando no começo (loop).
- Fluido, sem pausa dramática: frases corridas de 12 a 25 palavras, poucos sinais, sem `:` `;` `—` `…`. Direção de voz em cada plano com intenção própria (gancho com energia, virada com surpresa, ironia, tom baixo). Regras e tags: `../video-longo/voz.md`.
- Sem pedir inscrição. Nunca inventar estudo, número ou autor.

## 4. Narração
`PYTHONIOENCODING=utf8 python sistema/pipeline/narrar.py <pasta>` mostra o custo; com `--ok` gera. Shorts saem sem pausas longas; `palavras.json` sai junto.

## 5. Storyboard e prompts
Um plano por frase; nova composição a cada ~1–2 s. Predominam CLOSE e HERÓI; personagem centralizado, livre a faixa da legenda (ver `edicao.md`). Máx. 2 tipos de transição em 60 s.

## 6. Montagem
`midia/edl.csv` (+ `sfx.csv`, `trilha.*`) → `montar.py <pasta> --checar` → `legendar.py <pasta>` → `montar.py <pasta>`. Folha de contato do final: texto cortado nas bordas (motion 16:9 vindo de corte) vira plano novo.

## 7. Publicação
Skill `publicacao` (modo short: sem A/B de thumbnail; título ≤40 caracteres; 3 hashtags; descrição curta com link do longo de origem).
