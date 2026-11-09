# Estúdio de canais

Na raiz só `canais/` (conteúdo), `.claude/` e este arquivo. Sistema em `sistema/`; scripts sempre da raiz: `python sistema/pipeline/<script>.py <pasta>`.

**Comece por `python sistema/pipeline/ep.py [canal|pasta]`**: etapa de cada vídeo, o que está desatualizado e o próximo comando. Não abrir pastas para descobrir isso.

```
sistema/pipeline/
  ep.py         estado e próximo passo          narrar.py   voz (Fish/H100) + palavras.json
  palavras.py   Whisper local, tempo por palavra modal_img.py / modal_edit.py   imagens (L4 / L40S)
  legendar.py   legendas.ass + .srt             montar.py   EDL → final.mp4 (--checar valida)
  corte.py      trecho de longo → short         thumb_grade.py, postar.py (--quando agenda)
  sons.py       Mixkit (buscar <termo>)         comum.py    formato, tema, cache
sistema/sons/ (cache Mixkit) · sistema/referencias/ · sistema/arquivo/
```
3D fica **fora do OneDrive**: `C:/Users/Abduzido/AutoVideo_local/tres/` (node_modules pesado; o código não tem backup na nuvem). `npx remotion` dentro dessa pasta.
Scripts de GPU sem `--ok` só mostram o custo. Narração e imagens refazem só o que mudou. Pasta `shorts/` sai 1080×1920 sozinha.

- Canal novo: `novo-canal` (+ `criar-personagem`). Vídeo novo: `novo-video` → `video-longo` · `video-vertical` · `video-3d`. Edição: `video-longo/edicao.md`. Voz (pontuação e direção do Drama 3): `video-longo/voz.md`. Publicar: `publicacao`.
- Motion 2D: `motion-design` (personagem em `director/personagem.md`). 3D: `video-3d` + `tres/regras.md`; um `.tsx` salvo por vídeo; nunca Blender.

## Canal
```
canais/<canal>/
  canal.md   estilo.txt (prompt-base das imagens)   tema.json (fontes, cores, trilha_db)   ideias.md
  personagem/   voz/ (voz.wav + voz.txt, 10–30 s)   motion/ (rig 2D)
  videos/NNN_tema/   shorts/NNN_tema/
```
Pasta do vídeo: `narracao.txt`, `storyboard.md`, `prompts_ia.md`, `audio/`, `midia/`. Em `midia/`: `edl.csv`, `cor.txt`, `sfx.csv`, `numeros.txt`, `trilha.*`, `legendas.*`, `final.mp4`, `publicacao.md` e as subpastas `cenas/` (imagens geradas), `motion/`, `thumbs/`, `fontes/`. Vídeos até 005 ficam como estão (`videos/001_*` é legado).

## Regras
- Só fatos, autores e números reais e verificáveis.
- Texto na tela só na edição (motion e legenda).
- Imagens em luz neutra; cor na edição (fria no problema → neutra → quente na solução). Nunca espelhar.
- Prompt de imagem: anexar o personagem e descrever pose, não o personagem.
- Modal: uma GPU sob demanda; dizer o custo e pedir ok antes de `--ok`.
- Ver imagem/vídeo por folha de contato (uma imagem, escala reduzida), não quadro a quadro.
- Arquivos curtos, sem comentários nem explicações que ninguém vai ler.
