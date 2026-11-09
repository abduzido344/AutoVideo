# Personagem: poses e movimento (rig 2D recortado, 24 qps)

Vale para qualquer canal. Os números de cada rig ficam em `canais/<canal>/motion/` (ex.: `motion/effectcraft/manual_poses.md`).

## 12 princípios aplicados ao personagem
Fonte: Thomas & Johnston, *The Illusion of Life* (1981); resumo em https://www.creativebloq.com/advice/understand-the-12-principles-of-animation

1. **Comprimir e esticar**: dá peso. No rig, só no tronco e na cabeça e com volume constante (largura +x% → altura −x%). Respiração e assentamento: 2–4%. Nunca nos membros.
2. **Antecipação**: antes de levantar, pular, jogar ou sentar, um movimento contrário (descer, inclinar, recuar o braço) de 4–8 q. Para criar tensão (hesitar), estique a antecipação.
3. **Encenação**: uma ação por vez, na silhueta. Enquanto a ação principal acontece, o resto do quadro fica parado; o olhar do personagem aponta para o que importa.
4. **Pose a pose**: primeiro as poses-chave (início, extremo, fim) e só depois os intermediários. Toda pose-chave precisa se ler sozinha, congelada.
5. **Continuidade e sobreposição**: as partes não param juntas. Cabeça, mãos, cabelo, cordões e objetos segurados chegam 1–3 q depois do tronco e assentam com 2–3°. O quanto balança depende do peso e do tamanho da peça.
6. **Aceleração e desaceleração**: corpo sempre com `io`/`out`. Linear só em rotação contínua. Nada de `back` no corpo inteiro; se quiser ultrapassagem, ≤5% ou ≤3° numa chave separada.
7. **Arcos**: punho, cabeça e pé andam em arco em volta da articulação. Uma interpolação em linha reta precisa de uma chave no meio, deslocada 10–15% para fora.
8. **Ação secundária**: expressão, olhar ou mão livre reforçam a ação principal, nunca competem com ela. Entra 2–4 q depois e com amplitude menor.
9. **Tempo**: velocidade = peso e humor. Gesto leve 6–10 q; levantar ou sentar 20–30 q; cansado ou triste, +30–50%. Manter a mesma escala de tempo no vídeo inteiro.
10. **Exagero**: empurre a pose-chave um pouco além do real (inclinação, sobrancelha, ombros caídos) para ler em tela pequena. Exagero no tom do canal: sutil num narrador calmo.
11. **Desenho sólido**: proporções, perspectiva e luz iguais em todos os planos. Peças só de frente não giram em profundidade (ver Limites).
12. **Apelo**: silhueta clara, assimetria (nunca os dois lados em espelho), mãos legíveis. Pose rígida e simétrica mata o apelo.

## Corpo
- **Cotovelo** 0–145°, sem hiperextensão. No IK de dois ossos, mantenha o ombro→punho entre ~30% e ~97% do alcance: abaixo disso o antebraço atravessa o úmero; acima, o braço trava reto.
- **Ombro**: na vista frontal, o cotovelo fica do próprio lado da linha média. Só cruza em braços cruzados de verdade.
- **Punho**: desvio de ≤20° para o lado do polegar e ≤30° para o do mindinho. A flexão vai em direção à câmera: troca de forma ou escala de 1,1 na mão.
- **Pescoço**: inclinação natural ±25°, máximo ~40°.
- **Quadril**: abdução ≤45°, adução ≤20°.
- **Joelho**: só dobra para a frente. Na vista frontal a canela não entorta (±8°); a flexão vira encurtamento da coxa.
- **Pé no chão**: sola paralela ao chão; abrir a ponta ±10°.
- **Peso**: o centro de massa fica sobre o pé de apoio. Em pé, o peso vai numa perna, com quadril e ombros levemente inclinados em sentidos opostos.

## Juntas sem conectores
Nenhuma bolinha, anel ou círculo de articulação aparece no vídeo final, mesmo que a arte de referência ou as peças recortadas os tragam.
- **Braço e perna**: um tubo contínuo (ombro→cotovelo→punho, quadril→joelho→tornozelo) com junção arredondada; contorno desenhado antes do preenchimento. Nunca dois recortes sobrepostos no cotovelo ou no joelho.
- **Bolinhas que vêm nas peças** (ombro, quadril, punho, tornozelo): ficam sempre escondidas sob a manga, a barra ou o tronco. Se a bolinha faz parte do contorno, recorte a peça (clip) em vez de pintar por cima.
- **Encaixe da mão e do pé**: a borda do punho e do tornozelo entra por baixo da manga ou da barra; a manga termina reta, com a linha do punho.
- **Virilha e ombros**: sem mancha, degrau ou linha dupla onde duas peças se encontram. Confira com zoom de 3× antes de renderizar.

## IK e camadas
- **Direção do cotovelo** (`bend`): é relativa ao vetor ombro→punho, não ao corpo. Se o punho cruza a vertical do ombro com o `bend` fixo, o cotovelo dá a volta pelo peito. Escolha o `bend` que deixa o cotovelo cair (gravidade) e mantenha o punho do mesmo lado. Prefira um polo (alvo do cotovelo) a um sinal fixo.
- **Trocar o `bend`** só num corte, com o braço reto, ou com o braço escondido.
- **Ordem de camadas**: membro de trás/de baixo → tronco → cabeça → rosto → membro da frente. A mão vem antes da manga, para o punho cobrir a junção. Mão que toca o rosto fica depois do rosto. Objeto segurado fica entre a palma e os dedos.
- **Mudar a ordem no meio do plano**: duplique a peça e alterne a opacidade num quadro sem sobreposição.
- **Encurtamento falso**: coxa vindo para a câmera (sentado) 0,2–0,35; antebraço apontando para a câmera 0,4–0,55; úmero indo para trás 0,6–0,75, atrás do tronco. Inclinar para a câmera: escala da cabeça +3–6%, olhar para baixo e corpo 15–25 px abaixo.
- **Pé plantado sem IK**: ao subir ou descer o quadril pela coxa, compense a posição; ao deslocar ou girar o corpo, contra-gire a perna pelo mesmo ângulo.

## Limites da arte só frontal
- Nada de giro em profundidade (deitado ao comprido → sentado de frente, virar de costas): faça a parte que acontece no plano e **corte na ação**, com a cabeça no mesmo ponto da tela.
- **Andar de lado** com o corpo de frente vira "caranguejo". Esconda as pernas atrás de um móvel, corte antes do passo, ou entre e saia pela profundidade (escala).
- **De costas ou de lado**: só com peças desenhadas para isso.
- **Braço e mão saem do desenho aprovado**: recortar o braço da vista de frente em braço/antebraço/mão e girar no ombro e no cotovelo (pivô no centro da manga) com bolinha de junta à vista. Parado, fica idêntico à referência; mexendo, mantém a proporção. Braço em tubo genérico vira palito com mão gigante. Mãos de gesto na mesma escala da mão do desenho.

## Receitas
- **Deitado de lado, de frente**: cabeça na almofada inclinada 22–28°. O braço de baixo vai sob a cabeça, com o cotovelo visível fora da silhueta da cabeça e a camada antes do tronco. A perna de cima fica um pouco dobrada (coxa 0,75) e cruzando sobre a de baixo; pés sobrepostos. Respiração no tronco.
- **Deitado de costas, visto de cima**: objeto na barriga, não no peito. Mãos nas bordas de baixo, dedos para dentro e cotovelos no colchão, na altura da cintura. Pés caem para fora.
- **Sentado de frente**: coxa encurtada, canela vertical e sola no chão. Objeto no colo, com braços quase estendidos e cotovelos junto ao corpo.
- **Levantar** (~28 q): mãos no apoio (0–6) → inclina para a câmera, com a cabeça liderando (4–12) → o peso sai do assento (10) → estende as pernas com `out`, os braços atrasam 3 q (10–22) → assenta e passa o peso para uma perna (22–28).
- **Sentar**: o inverso. Inclina, desce com `in-out` e assenta 4 q (o assento "recebe" o peso).
- **Celular, uma mão, vista frontal**: o aparelho fica abaixo do queixo e aparece de costas para a câmera. Mão no terço inferior da lateral longa, cotovelo nas costelas e olhar apontado para o aparelho. Duas mãos de frente só com o antebraço encurtado; sem isso, os cotovelos abrem em asa.
- **Celular, close sobre o ombro**: a base do polegar fica na borda esquerda, no terço inferior. O polegar cobre 0,6–0,8 da largura e o swipe é um arco. Os outros dedos ficam na borda oposta, na metade inferior, com comprimentos diferentes e o mindinho sob a base.
- **Fechar caderno ou livro** (8–11 q, `io`): a mão segue a borda da capa em arco e a capa atrasa 1 q. A outra mão segura a lombada, parada.
- **Carregar objeto em pé**: braço pendurado, quase reto, e o objeto ao lado da coxa. Contra o peito só com o antebraço encurtado.

- **Andar (deslocando x)**: fase `x/90`, balanço vertical `−6·|cos fase|` só enquanto x muda; pernas ±8°, braços em contrafase ±8°, cabeça −3°. Chegada com `out`, ajuste final `io`.
- **Sentar no sofá**: antes de descer, inclina e achata (escala y 1,04, +14 px, 0,35 s); desce com `out` em 0,8 s; suspiro (pico de respiração em ~0,35 s); mãos no assento ±150 px do centro. Personagem em escala de móvel (com escala grande, sentado parece em pé).
- **Sentado de frente** só lê com três coisas juntas: joelhos em camada própria acima do tronco, pés e chão no quadro, e o movimento de descer. Fechado na cintura, sentado = em pé.
- **Escrever**: a ponta da caneta faz um laço por linha (~0,55 s), pulso preso à ponta, cotovelo puxado para o quadril, olhar seguindo a caneta, tremor de cabeça ±2° a 9 Hz.
- **Acessório na cabeça** (fone, boné): entra de cima, nunca atravessando o rosto; camada depois do rosto.
- **Postura cansada**: baixar o ponto do pescoço alguns px, não só inclinar a cabeça.

## Cena
- **Pose = função pura** `pose(t)`; o mesmo script gera prévia (PNG em tempos escolhidos) e vídeo. Pose-chave pelo manual (polo, encurta, contato) **antes** de animar; folha de contato antes do render final.
- **Câmera por plano** (âncora, posição, escala, rotação, podendo variar com t) **compõe** com o transform da camada, nunca substitui; transforma também os alvos de mão no mundo.
- **Objeto preso**: ao corpo = ponto local do tronco + rotação do corpo; na mão = pulso + offset girado pela mão; celular em pé = offset fixo do pulso, rotação constante.
- **Ângulo que a arte não tem**: lateral → frontal ou de costas; close lateral → vista de cima (cama na diagonal ~−28°). Avisar o usuário do que foi adaptado.
- **Insertos** (close do celular com feed em máscara, página se enchendo, mãos de cima) são os planos mais fortes: desenhar peças extras para eles (mãos vistas de cima, busto de costas).
- **Sombra de contato**: elipse preta, opacidade 25–30%, desfoque 10–16, sob personagem, móveis e objetos.
- **Traço que se desenha**: `trim(progresso)` com opacidade 0 enquanto progresso < 0,002 (senão a ponta redonda deixa pontos).
- **Flash de foto**: `1−|t−f|/0,08` + tremor de mão 3–6 px.

## Mão-luva
- **Lado do polegar**: em terceira pessoa, o polegar fica sempre para dentro, do lado da cabeça. Em primeira pessoa: palma para baixo, polegar para dentro; palma para cima, polegar para fora.
- **Apontar**: o indicador fica em cima e os dedos dobrados embaixo; o indicador é vizinho do polegar, então segue o mesmo lado dele. Vale para qualquer gesto: o lado do polegar decide o espelho da mão.
- O polegar sempre destacado, com espaço negativo entre ele e os dedos.
- Dedos com comprimentos e ângulos diferentes.
- O contato fica visível: os dedos sobrepõem a borda do objeto.
- A mão continua a linha do antebraço só até ±20–30°.

## Imagens geradas (Modal)
Para cenário, fundo, objeto, inserto ou pose que o rig não tem. Lista `nome: prompt` (uma por linha) → PNG na pasta; pula os que já existem. Dizer o custo e pedir ok antes de rodar.
- **Sem personagem** (cenário, fundo de cena, objeto): `python sistema/pipeline/modal_img.py prompts.txt <video>/midia/img [--vertical]` — Z-Image-Turbo, L4, 1280×720, ~US$ 0,002/imagem + 1–2 min para subir. Segue o prompt só em parte: detalhe importante em destaque.
- **Com personagem**: `python sistema/pipeline/modal_edit.py prompts.txt <video>/midia/img [--vertical] <canal>/personagem/referencias_aprovadas/rosto.jpg corpo.jpg` — Qwen-Image-2.1-Turbo, L40S, 1376×768, ~US$ 0,01/imagem. Prompt: abrir com "A full illustrated scene, not a white background", listar o cenário, "Keep his identity, outfit and proportions exactly as in the references", dizer a cor das mãos e a boca/expressão por extenso. Licença só de avaliação: não publicar até sair a licença comercial.
- Sempre: estilo do `estilo.txt`, luz neutra (cor na edição), sem texto, não espelhar. Conferir identidade, mãos e objetos como em qualquer plano.

## Conferir cada plano
Quadro a quadro nos movimentos rápidos:
- nenhum conector de junta à vista;
- polegar do lado certo (indicador em cima ao apontar);
- cotovelo não vira nem atravessa;
- mão encosta no que segura;
- pé não desliza;
- cabeça lidera e assenta;
- nada para junto;
- nenhuma pose simétrica;
- silhueta lê congelada.

## Fontes
- Amplitudes articulares: https://www.physio-pedia.com/Range_of_Motion_Normative_Values
- Sentar e levantar: https://www.frontiersin.org/articles/10.3389/fnhum.2021.678302/full
- IK de dois ossos: https://en.esotericsoftware.com/spine-ik-constraints
- Recorte e troca de desenhos: https://docs.toonboom.com/help/harmony-22/advanced/getting-started/character-building.html
- Pegada de celular: https://alistapart.com/article/how-we-hold-our-gadgets/
- Livros: R. Williams, *The Animator's Survival Kit* (2001); P. Blair, *Cartoon Animation* (1994).
