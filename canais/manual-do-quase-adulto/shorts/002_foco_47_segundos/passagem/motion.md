estado: pronto
entregue: motion/effectcraft/m002_foco.mjs; midia/motion/M01, M02a, M02b, M03, M04, M05a, M05b, M06–M11 .mp4 (1080×1920, 24 qps); print_topo.png e print_trecho.png (recortes ffmpeg de midia/fontes/); folha_motion.png
decisões: um arquivo por linha MOTION; os nomes seguem a coluna Fonte (M02a = cena 2, M02b = cena 3, M05a = cena 8, M05b = cena 9); quadros = round(fim·24) − round(início·24)
decisões: tempos lidos de palavras.json; o elemento entra na palavra; o grifo da cena 9 entra em "essa média" (18,49 s) e não em "publicou", que só dispara o zoom, para fechar antes de "dois minutos"
decisões: paleta neutra do mg.mjs (o canal não tem tema.json); a cor fica no cor.txt; texto e números ficam acima de y 1300
medidas: 13 arquivos, 31,1 s de motion; render ~25 s; sem GPU
pendências: [montador] edl: motion/<id>.mp4 nos inícios do storyboard (M02a 1,60, M02b 3,60, M05a 14,20, M05b 17,40…); [orquestrador] o canal não tem tema.json
aprendizado: —
