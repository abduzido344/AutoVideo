# Reels de teste — Era só apertar um botão

Duração: 30 segundos. Seis clipes de 5 segundos. Formato vertical 9:16, entrega 1080×1920. Comédia visual sem diálogo; texto e trilha entram na edição. Personagem: o mesmo robô laranja do teste LTX. Referência disponível: `../ltx_modal/referencia_robo.png`.

Premissa: o robô liga um ventilador para se refrescar, acaba com um papel grudado no rosto e quase repete o erro.

## Direção comum

Uma oficina, bancada de madeira, luz diurna neutra. Robô no centro, ventilador pequeno à esquerda, botão vermelho grande à direita e três folhas soltas sobre a bancada. Câmera fixa em plano médio vertical, com rosto, mãos e objetos visíveis. Preservar proporções, materiais, cores e posições dos objetos em todos os quadros. O robô permanece sobre a bancada.

As imagens-guia serão compostas em 9:16; a imagem horizontal existente serve para identidade visual. Não gerar legendas, logotipos ou letras dentro das imagens. Evitar câmera móvel, trocas de cenário e múltiplas ações simultâneas.

## Storyboard

| Tempo | Ação principal | Imagem inicial | Imagem final desejada | Condicionamento sugerido |
|---|---|---|---|---|
| 00–05 s | O robô percebe o botão e inclina a cabeça, curioso. | A: pose neutra, mãos abaixadas, ventilador parado. | B: cabeça inclinada para o botão, mão direita levantada perto dele. | Só início; movimento leve. |
| 05–10 s | Ele abaixa a mão e aperta o botão. | B: mão sobre o botão. | C: dedo pressionando o botão, rosto satisfeito. | Início + fim; teste de contato preciso. |
| 10–15 s | O ventilador liga e levanta as folhas. | C: dedo no botão, folhas na bancada. | D: robô com mãos afastadas do corpo, três folhas no ar. | Só início; testar movimento de objetos. |
| 15–20 s | Uma folha vem até o robô e cobre seu rosto. | D: folhas no ar, rosto visível. | E: uma folha branca grudada no rosto; mãos erguidas. | Início + fim; teste de oclusão. |
| 20–25 s | Ele puxa a folha para baixo, revelando o rosto constrangido. | E: rosto coberto. | F: rosto visível, folha na mão, outra mão encostada no botão para desligar o ventilador. | Início + fim; teste de preservação de identidade. |
| 25–30 s | Com o ventilador parado, ele abaixa a folha, olha para a câmera e volta à pose inicial. | F: folha na mão, ventilador parando. | A: pose e composição da abertura. | Início + fim; fechar o loop. |

Texto opcional na edição: abertura “Era só apertar um botão.”; após a folha cobrir o rosto, “Funcionou.”. SFX: clique, motor do ventilador, papel e uma breve pausa cômica. Sem narração.

## Imagens a preparar

Sete quadros-guia: A, B, C, D, E, F e A reutilizado no fim. São seis imagens únicas. A composição e os objetos devem permanecer iguais, mudando apenas pose, estado do botão/ventilador e posição das folhas. Quando usar início + fim, o quadro final de uma cena pode ser reutilizado como início da próxima.

Os quadros são alvos de condicionamento, não garantia de preservação exata dos pixels ou da física. Nem toda variante/receita do H3 oferece a mesma modalidade: verificar suporte real a primeiro/último quadro antes da execução. Se a versão escolhida aceitar somente início, usar os quadros finais como referência de avaliação e encadear os últimos frames efetivamente gerados, após inspeção.

## Primeiro experimento recomendado

Começar somente pela cena 2, mantendo a mesma imagem inicial B e prompt, seed, resolução e duração. Rodada A: só início. Rodada B: início B + fim C, se suportado pela receita. Comparar identidade, contato dedo–botão, estabilidade do fundo, transição para o quadro final, tempo e custo. Só depois gerar os 30 segundos.

Prompt-base da cena 2:

> A small orange robot stands on a wooden workbench in a bright workshop. In a locked vertical medium shot, the robot slowly lowers its right index finger onto a large red button on the right side of the workbench and presses it once. Its head stays directed toward the button. The robot's feet remain planted on the bench. A small desk fan on the left and three loose white sheets of paper stay in their original positions. Neutral daylight, realistic metal and plastic materials, consistent character proportions. One continuous action, no cuts, no camera movement, no text, no logos. A quiet workshop ambience and one soft mechanical click.

Estado: storyboard textual preparado. Nenhuma imagem nova nem geração MiniMax H3 executada nesta etapa.
