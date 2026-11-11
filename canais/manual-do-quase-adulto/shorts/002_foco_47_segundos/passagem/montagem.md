estado: pronto
entregue: midia/edl.csv, cor.txt (12.59>28.07), numeros.txt, legendas.ass/.srt, sfx.csv (vibra cortada em 9.5 e 29.9), final.mp4, midia/folha.png
medidas: 1080x1920, 38,71 s (narração 38,68), 17 segmentos, blackdetect 0
decisões: tremor do celular (#5, #13) não existe no montar.py: zoom 1.6>1.7 no celular; tradução do trecho em inglês não entra na legenda (a fala já cobre; só o grifo no print)
pendências: nenhuma
devolução R2 (cor): não resolvida na montagem. montar.py: dict COR (linhas 20-24) fixo, fria = colorbalance bs=+.07 e saturação .88, fraco demais sobre I1 (creme) e motion (papel claro); cor.txt só aceita dois cortes, sem intensidade. Os cortes já estão em 12.59>28.07.
legenda: "min." e "mais." sozinhos vêm do limite 4 palavras/20 caracteres do blocos() do legendar.py (vertical); não ajustável pela pasta.
dono: sistema (montar.py/legendar.py) ou diretor (I1/I2 em tom frio de fato)
cor (R2, G4 liberou): montar.py dict COR refeito (só ele): fria rs=-.2 bs=.22 rm=-.15 bm=.18 rh=-.08 bh=.1 sat .85; quente rs=.12 bs=-.14 rm=.1 bm=-.12 rh=.06 bh=-.08 sat 1.1. Cache de segmentos não inclui o filtro COR no hash: apagar %TEMP%/montagem_<pasta>/cache ao mudar COR.
R-B medido (faixa y<1000): 3s -27, 7s -16, 9s -13, 15s -26 (print azul, neutro), 22s -3, 29s +43, 35s +41, 37s +50. folha.png = quadros 3,7,9,15,22,29,35,37 s.
legenda: numeros "quase 30min"; "30min." e "mais." continuam sozinhos (limite do legendar.py, não editável).
