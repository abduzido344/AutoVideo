# Cenas: storyboard.md e prompts_ia.md

Dois tipos de cena. Personagem, objeto em movimento e efeito são sempre código; IA só gera imagem parada.
- **MOTION** — código (rig 2D do canal, SVG → resvg → ffmpeg; ou 3D em `C:/Users/Abduzido/AutoVideo_local/tres/`). Números, comparações, citações, ações do personagem.
- **IMAGEM** — imagem gerada com zoom/pan lento ou motion por cima. Sem personagem: `modal_img.py` (Z-Image, L4). Com personagem: `modal_edit.py` + imagens de `personagem/` (Qwen, L40S; licença só pesquisa).

## Planos
- Âncora 3–4 s; corte 1,5–2,5 s. Dois planos seguidos nunca com o mesmo enquadramento.
- Enquadramentos: GERAL · HERÓI · AÇÃO · CLOSE (rosto, mão, objeto) · INSERT (objeto sozinho) · DIVIDIDO · REAÇÃO.
- Objetos nomeados. Luz neutra (cor só na edição).
- **Cenário construído**: cena com personagem não fica em fundo chapado. O diretor escolhe os cenários (lugares que voltam 2–4×, ex.: rua, quarto, escritório) e marca na Fonte `cenário C1`. O cenógrafo gera o cenário vazio (`modal_img.py`) e grava `midia/cenas/C1.mapa.json` (linha do chão/horizonte em px, área onde o personagem pisa, objetos com caixa e camada frente/trás, recortes PNG da camada da frente). O animador põe o rig animado dentro: escala pela profundidade, pés na linha do chão, sombra de contato, objeto da frente por cima, câmera com paralaxe leve. Fundo chapado só em gráfico, número e citação.

## Reaproveitar
Poucas cenas-mestre que voltam 2–4×: outro enquadramento, congelado + zoom, outra cor, motion por cima, rima visual (a abertura volta no fim, quente). Banco de cenas em `canal.md`.

## storyboard.md
```markdown
# Storyboard — NNN Título (m:ss)
Cor: fria até m:ss → neutra até m:ss → quente.

| # | Tempo | p | Tipo | Fonte | O que se vê | Som | Transição |
|---|---|---|---|---|---|---|---|
| 1 | 0:00–0:06 | 1 | MOTION | M01 | ... | pop | corte |
| 2 | 0:06–0:13 | 2 | IMAGEM | I1, zoom lento | ... | — | whip |
```
Transições: corte (padrão) · whip (troca de assunto) · jump cut (mesma cena) · flash branco (uma vez, na virada problema → solução). A coluna Som vira `midia/sfx.csv`.

## prompts_ia.md
Só as cenas IMAGEM, em dois blocos que os scripts leem direto (`nome: prompt`, uma por linha). Descrever cenário, pose e enquadramento; o personagem vem das referências. `estilo.txt` é o começo de todo prompt.
````markdown
```img
I1: quarto à noite, cama, mesa de cabeceira com celular, nada mais no quadro, luz neutra, plano geral
```

```edit
P1: o personagem sentado na cama rolando o celular, rosto iluminado pela tela, plano médio frontal
```
````
`python sistema/pipeline/modal_img.py <v>/prompts_ia.md <v>/midia/cenas` · `python sistema/pipeline/modal_edit.py <v>/prompts_ia.md <v>/midia/cenas canais/<canal>/personagem/<ref>.png`. Sem `--ok` mostram o custo; refazem só prompt novo ou mudado.

## Conferir cada imagem
Personagem igual à referência (sem espelhar) · mãos certas · nada de texto · lê sem narração. Folha de contato de todas numa imagem só antes de aprovar.
