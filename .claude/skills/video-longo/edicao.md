# Edição: tempos, motion, legenda, som, conferência

Vale para longo e vertical. Tudo em código (SVG → resvg → ffmpeg, Python); o usuário não edita em GUI.

## Tempos
- `palavras.py` (Whisper small local, roda sozinho no fim do `narrar.py`) → `audio/palavras.json`. Todo corte e todo elemento de motion entra na palavra falada; proporção de caracteres só serve de rascunho.
- Ritmo que funcionou no longo: ~10 cenas/min (~5,6 s cada); 6–8 clipes-mestre (~70 s de IA) voltando 2–7×; o resto é MOTION.
- Trecho de clipe menor que a fala: congelar o último quadro (com zoom lento).
- Imagem .png, .jpg ou .webp: o `montar.py` cobre o quadro sem distorcer (corta o excesso).

## edl.csv
`inicio,fim,fonte,de,ate,zoom,trans` · fim = `inicio` da linha seguinte · zoom `1>1.08@0.5;0.3` (`;`, nunca vírgula) · trans `corte|whip|flash|fim`. Whip nas trocas de assunto (whoosh 0,3 s antes); flash branco uma vez, na virada problema → solução.
`python sistema/pipeline/montar.py <pasta> --checar` valida a EDL em 1 s (fonte, tempos, zoom, trans) · `[ini-fim]` trecho de teste · `--acabamento` refaz só legenda e som. Segmentos ficam em cache: mudar uma linha refaz só ela. Fontes em `midia/cenas/`, `midia/motion/` etc.

## Motion graphics
- Funcionam: card de ícone por item falado · palavra riscada quando dita · botões Gostei/Inscrever clicados no CTA · comparação de slots/barras · abas abertas · cards de método · "quando X → faço Y" · antes/depois de escala com número grande · print da fonte no momento da citação.
- Print de fonte: ~1240 px, fade 0,7 s subindo 40 px, zoom 1→1,04. Recortar só cabeçalho + trecho-chave, sem player, menu ou anúncio. Sem print: card com autores, ano, título, revista. Sites que bloqueiam headless (PubMed, Springer, ScienceDirect): pedir o print ao usuário; nunca contornar bot-check.
- 16:9: nada importante abaixo de y≈900 (legenda em 950–1020). 9:16: legenda em ~1400–1500; livre de texto a faixa 1350–1550, os 300 px de baixo e os 120 px da direita (botões do Shorts).
- Objeto segurado vai no punho do personagem, não solto. Seta entre cards começa fora da borda, ~230 px, invisível até animar. Número de resultado ≥150 px, centralizado. Personagem baixo o bastante para folga sobre a cabeça. Encolher até no mínimo 0,3.
- Prévia antes de render: 1 quadro por cena (`node mNNN.mjs M04,M08 "6"`), folha de contato, revisar, só então renderizar.
- resvg: fontes explícitas (`fontFiles`, `loadSystemFonts:false`); atributo repetido (ex. `opacity`) derruba o parse → envolver em `<g>`. Desfoque com `filterUnits="userSpaceOnUse"` na área da tela + 200 px (padrão custa 5 s/quadro; exato escurece bordas). Pool de workers (`cpus−2`) corta o render ~5×. Cenário grande recortado à área da câmera.

## Legenda (`legendar.py`)
- Texto do roteiro alinhado aos tempos do Whisper (nomes saem certos). Karaokê: palavra falada em amarelo, branco com borda escura, negrito. Normal 62 px; gancho 96 px com pop até o fim do parágrafo 2.
- Bloco ≤5 palavras/30 caracteres; quebra em `.?!:` e vírgula com ≥3 palavras; parágrafo novo = bloco novo; nunca terminar linha em palavra fraca; some em min(próximo bloco, última palavra + 1,2 s).
- Números por extenso na narração viram dígitos na legenda: `midia/numeros.txt` do vídeo (`texto falado>texto na tela` por linha).
- Gera também `.srt` para o YouTube.

## Som (`midia/sfx.csv`: tempo,som,vol)
Um efeito por acontecimento da coluna Som do storyboard. Trilha opcional: `midia/trilha.mp3` fica sob a voz com ducking (volume em `tema.json` › `trilha_db`, padrão −22). Saída normalizada a −14 LUFS.
Base −14 dB, sempre abaixo da voz; ~15 sons/min. Whoosh 0,3 s antes do whip · pop quando algo aparece · clique em botão/aba · ding em check (−8 a −10) · baque em peso · tique em tempo passando · sobe antes do flash · blip em sequência.
Biblioteca Mixkit (licença Mixkit: uso comercial, conferir termos em mixkit.co/license), baixada só quando usada: `python sistema/pipeline/sons.py buscar <termo em inglês>` (nome e categoria em `sistema/sons/indice.tsv`) → id; no `sfx.csv`, coluna `som` = id numérico ou apelido de `sistema/sons/alias.tsv` (whoosh, baque, pop…). `montar.py` baixa e converte sozinho (mono 48 kHz, pico 0,9) na primeira vez; `python sistema/pipeline/sons.py pegar <id>` antecipa. Prévias são MP3 com cauda longa: conferir duração e o lead do pico. Ao escolher, buscar 2–3 candidatos por função e registrar no `sfx.csv` só o id; sons novos úteis vão para `alias.tsv`.

## Conferir o final
Duração = narração · quadros por segmento = `round(b*24)−round(a*24)` · `blackdetect` · folha de contato (`fps=1/21,tile=6x4`) · prévias de legenda e flash.

## Erros que se repetem
- ffmpeg recusa `.2`: escrever `0.2`. `tpad` clone não completa quadros: usar `loop`.
- Caminho relativo quebra com `cwd` temporário: `abspath` no início.
- Windows: `PYTHONIOENCODING=utf8`; glob com espaço fora das aspas; `curl -g` para URL com `[ ]`; scripts próprios sem `python -I` (numpy no site do usuário).
- Código com f-string/aspas: Write/Edit, nunca heredoc.
