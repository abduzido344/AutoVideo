---
name: criar-personagem
description: Cria o personagem de um canal (protagonista ou secundário) e o transforma em vetor com rig animável — ficha, imagens de referência, folhas para vetor, recorte em peças, rig e teste. Use para criar personagem, novo personagem, figurante, variação de personagem ou vetorizar personagem.
---

# Criar personagem

Interativo como `novo-canal`: AskUserQuestion com opções preenchidas; o usuário gera as imagens e devolve os arquivos. Prompts: `prompts.md`. Poses e animação: `motion-design/director/personagem.md`. Pasta: `canais/<canal>/personagem/`.

## 1. Ficha → `FICHA-DO-PERSONAGEM.md`
Perguntas: tipo (humano jovem · adulto · stickman · mascote) · figurino-assinatura · paleta (3–4 opções em hex coerentes com `estilo.txt`) · detalhe de continuidade (colar, boné, mecha) · proibidos (capuz levantado, boné…). Escrever a descrição em um parágrafo e os blocos `{…}` de `prompts.md`.
Regras de construção (o rig depende delas): arte frontal, cabeça maior que os ombros, mãos-luva de dedos curtos, rosto simples (olhos ovais, sobrancelha, boca; sem nariz), cores chapadas com uma sombra por cor.

## 2. Referências aprovadas → `referencias_aprovadas/`
O usuário gera Conceito e Ficha estendida; Claude confere identidade, mãos e proporções e pede refação do que destoar. Salvar `rosto.jpg`, `corpo.jpg`. A imagem vence o texto.

## 3. Folhas para vetor → `<nome>/`
O usuário gera Turnaround, Peças e Mãos (anexando as referências) e salva os PNG. Claude vetoriza localmente: `py -3.13 motion/effectcraft/vetorizar.py <png> <svg> "<hex da paleta, separados por vírgula>"` (cores do personagem + branco + contorno; cada pixel e cada caminho vão para a cor mais próxima). Peças com `MODO=cutout` (furos de verdade: rosto dentro do cabelo); turnaround no padrão `stacked`. O vtracer quebra no Python 3.14 com qualquer opção: usar 3.13.
Conferir: peças soltas, cores certas (âmbar, dourado, mãos), cabelo com o rosto vazado.

## 4. Recorte e rig (código em `canais/<canal>/motion/`)
- Cada personagem em `personagem/<nome>/` com `pecas.svg`, `maos.svg` e um `pecas.json` inicial copiado de outro personagem (blocos `rig` e `paleta`).
- `node recortar.mjs <nome>/pecas` → `prev_recorte.png` com índices; conferir a ordem e só então `node recortar.mjs <nome>/pecas cabeca cabelo tronco pescoco bracoE bracoD antebracoE antebracoD maoE maoD coxaE coxaD canelaE canelaD tenisE tenisD`. Mãos: `node recortar.mjs <nome>/maos aberta costas punho aponta joinha celular`. E/D = lado da tela.
- Achar os centros das bolinhas de junta pelos caminhos de cor de pele quase redondos; tronco sem bolinha no ombro: marcar ombro, pescoço e quadril num zoom com grade.
- Medir e gravar no `rig`: `osso` (pivôs no centro das juntas e encaixes dos filhos, inclusive cabelo), `mao` (x do punho de cada mão, linha do punho, escala, lado do polegar), `tronco` (recorte acima da virilha), `tubo` (larguras), `rosto` (olhos, sobrancelhas, boca; `cilios`). `recorte`: `troca` (ex. branco do rosto no cabelo → `none`), `corta` (some a bolinha do pescoço na cabeça e no cabelo), `limpa` com cor (`[x0,y0,x1,y1,"#141414"]` tira olhos e boca desenhados). `mao.giro` gira uma forma desenhada de lado. `paleta` com os hex reais da folha; resolver as cores listadas como "sem token" (`zona` isenta áreas, ex. biqueira do tênis com a cor da pele).
- Usar: `prota(pose, { pers: '<nome>', variante })`. Regras em `manual_poses.md` §4.
- Braços: cortar os da vista de frente do turnaround (`rig.braco`: polígonos de braço/antebraço/mão, pivôs no centro da manga, bolinha de junta no cotovelo e ombro). Ficam na proporção do desenho aprovado; braço em tubo vira palito com mão gigante. Pernas são tubos; das peças vêm tronco, cabeça, cabelo, calçados e mãos de gesto (escala igual à mão do turnaround). Rosto é desenhado por código (olhar, piscar, sobrancelhas, boca/fala).

## 5. Teste
Clipe curto como `V1.mjs`: respirar, acenar, apontar, joinha, falar, piscar. Conferir pela lista de `personagem.md` (sem conector à vista, polegar para o lado da cabeça, cabelo no lugar, sombra do tubo). Mostrar ao usuário antes de usar em vídeo.

## Secundários
Todo humano segue o mesmo esqueleto e as mesmas regras do protagonista. Criar uma **base feminina neutra** (e usar o protagonista como base masculina) com a folha de Secundários de `prompts.md`, em `personagem/<base>/`. Variações não pedem arte nova: `variantes.json` (`{"ruiva": {"cabelo": "#B5532E"}}`) troca pele (`pele` e `mao` juntos), cabelo, roupa, calça, calçado e `faixa` por hex — os tons de sombra acompanham — e `pecas` troca a peça de cabelo (curto, longo com `cabeloTras`, coque). Vários personagens no mesmo quadro funcionam. Arte nova só para silhueta de cabelo ou roupa diferente, sempre com o mesmo pivô.

## O que não funciona
Turnaround como rig (cores fundidas, falta arte atrás dos membros) · conectores redondos desenhados (viram buraco: usar tubos) · rosto embutido na cabeça (não anima) · animadores automáticos de desenho (malha rasga de perfil, andar de caranguejo) · vetorizar foto/JPG direto (borda treme; detalhes pequenos redesenhar como vetor) · confiar na ordem do recorte sem a prévia.
