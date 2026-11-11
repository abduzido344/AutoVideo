estado: pronto (fases 1 e 2); cenas 4 e 92 com retrato provisório até o Pasteur chegar em midia/fontes/
entregue: m007.mjs (fase 1, mais 91 que faltava; 6, 10 e 18 corrigidas), m007_b.mjs (fase 2); midia/motion/M*.mp4 = 93 cenas (todas menos a 38, que vai direto do banco); contato_fase1.png, contato_fase2.png
decisões: as cenas IMAGEM com motion saem inteiras em Mnnn.mp4 (imagem ou clipe do banco + camadas) e o montador usa o mp4 no lugar da fonte: 4, 12, 19, 34–36, 40, 42–44, 48, 58, 72, 81, 84, 92, 93
decisões: jornal em SVG nas cenas 12, 19–23, 25, 26, 30 e 90; I1 sempre com zoom ≥1,5; personagem na escala do mapa, com sombra e camada da frente por cima; pernas tapadas por cobertor ou manta onde a arte frontal não senta
decisões: adaptações: 44 virou C2 olhando o teto (o banco 002·Q3 não existe); 39 o giro troca frente e costas com achatamento; 21/26/90 sobre o ombro com nuca desenhada; 40 sem girar as pás (arcos de giro por cima)
medidas: 93/93 com a duração da cena (ffprobe); render em CPU, sem GPU
pendências: [pesquisador] retrato do Pasteur em midia/fontes/ (nome com "pasteur"), depois rodar node m007_b.mjs M004,M092; [montador] trocar as fontes IMAGEM acima pelos mp4 de motion
aprendizado: o resvg trava (panic) com um retângulo de 9000 px dentro de clip + câmera e com filtro de região enorme; manter tinta e filtros do tamanho da tela
revisão 2026-11-11: 4 figurantes de verdade em motion/effectcraft/m007_fig.mjs (jorge: barba, óculos, paletó; leo: boné, sardas, mais baixo; dani: coque, argolas; bia: black power, óculos, cachecol), com pele, altura e roupa próprias; trocados nas cenas 2, 16, 53, 68–72 e 86. Cena 1 (e as outras da cama) sem pé solto; nas cenas da C3 o personagem passa à frente do cavalete e do vaso. Os mp4 não foram re-renderizados.
entregue: midia/motion/ltx_quadros/Mnnn.png (27 primeiros quadros limpos, 1920×1080, gerados com LIMPO=1) + contato.png
pendências: [orquestrador] mover m007_fig.mjs para o kit (kit.mjs/vetor.mjs são só leitura para mim); pôr em motion-design/director/personagem.md a regra "figurante nunca é o protagonista recolorido; usar os figurantes do kit"; mover ltx_quadros para midia/ltx/quadros se for o caminho oficial
