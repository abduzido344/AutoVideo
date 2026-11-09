# Pesquisa de roteiro e retenção (2026-11-09)

Base do plano de mudanças. Números do MrBeast já corrigidos pela revisão do Opus.

## Fontes (≥5k estrelas)
- OpenMontage (AGPL: reescrever ideias, nunca copiar texto): `skills/creative/{long-form,short-form,storytelling}.md`, `skills/pipelines/explainer/script-director.md`. Benchmarks sem fonte primária (55% saem em 60 s, média 23,7%, +15–25%): não citar como fato.
- marketingskills (MIT): `marketing-psychology` (Zeigarnik, Peak-End, Goal-Gradient). Nada de roteiro de vídeo além disso.
- last30days-skill, Agent-Reach: só pesquisa/coleta, úteis na etapa de ideia.
- Skills de roteiro de YouTube achadas ficaram abaixo de 5k e foram descartadas.

## MrBeast (11 vídeos de 17–29 min, só legendas)
- Promessa, regra e 1ª ação nos primeiros 30 s em 11/11; menu de escalada ("é só o primeiro de N") em 9/11; zero saudação.
- CTA de inscrição: 0/11 no meio (os "meios" eram patrocínio/QR); 6/11 no fim, dentro da cena, muitas vezes piada. Patrocínio entre 31% e 92%, nunca no começo.
- Fala mediana 172 palavras/min; último décimo mais lento em 10/11 (pode ser só comemoração).
- Limites: 1 canal gigante, 11 vídeos, fala ao vivo (não narração sobre imagem), legenda automática, regex com ruído. Retenção e quebras visuais não medidas.

## Estado real dos nossos vídeos (medido)
- 006: 1.711 palavras em 679 s = 151/min (o "133" da skill é só número de planejamento). Promessa só em 1:44 (CTA ocupa 1:31–1:44; skill pede ~30 s). 1ª revelação ("memória é editora") em 4:15. Viradas em 55% e 62% já existem.
- 002 (3D, formato competição): promessa e regra em 26 s, 1ª ação em 1:25, 1ª rodada em 2:30. Escada de temperaturas nunca anunciada. "~19 frases/min" do `video-3d` não bate com frases de 12–25 palavras.
- Já cobertos: "mas/portanto" (`voz.md`), virada em 55–65%, densidade de conceitos.

## Mudanças recomendadas (ordem)
1. Promessa do vídeo até 0:30; gancho de 3 tempos cabe em ~60 s.
2. Primeira revelação da promessa antes de 2:30.
3. Competição: 1ª ação até 0:30 e escada anunciada no início ("são N rodadas, de X até Y graus").
4. Meta de palavras pela voz medida: ~155/min (8 min ≈ 1.250); short de 60 s ≈ 140–150. Corrigir o "~19 frases/min" do `video-3d`.
5. CTA de inscrição: testar fim-em-cena contra início, um vídeo por vez (ímpar: após o 1º "aha" em 2–3 min; par: na última cena); comparar inscritos por 1.000 views e queda no ponto do CTA; 4–6 vídeos por braço. Registrar em `publicacao`.
- Silêncio após o "aha": só com `[pausa 1.5]` em parágrafo sozinho, em 1–2 revelações por vídeo; nunca por pontuação.
- Opcional/testar: abrir com a crença errada do público (2º tempo do gancho).

## Não fazer
- Acelerar a voz sintética para ~174/min (a tag não muda o ritmo; atempo degrada).
- Copiar texto do OpenMontage.
- Citar números de retenção sem fonte.
- Aplicar a estrutura do MrBeast ao 006, ou o gancho de 3 tempos à competição (memória `formato-competicao`).

## Lacunas da pesquisa
- Curvas de retenção reais do 006 e do 002 no Studio.
- Medir um canal narrado sobre imagens (Kurzgesagt, Vsauce, Nerdologia) com o script corrigido (contar "subscribed", `$` no dinheiro, separar patrocínio de CTA).
