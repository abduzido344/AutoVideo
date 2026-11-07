# Prompts do personagem

`{…}` vem da ficha. O usuário gera uma imagem por vez num gerador de imagem (ex.: ChatGPT), sempre anexando as referências aprovadas.

## Conceito (ficha principal)
Ficha de personagem 16:9: {DESCRICAO}. Estilo {ESTILO}: contorno preto firme, cores chapadas, sombra em um bloco por cor, sem 3D. Vistas: frente de corpo inteiro, close do rosto e 6 expressões rotuladas (neutro, feliz, preocupado, surpreso, irritado, pensativo). Mãos-luva de dedos curtos, polegar destacado. Cabeça maior que os ombros. Fundo {FUNDO}. Sem texto além dos rótulos, logotipo ou marca-d'água.

## Ficha estendida
Mesmo personagem da ficha anexada, mesma escala: à esquerda de costas, em pé relaxado; à direita três quartos frente andando para a direita, braços em contrafase, mãos vazias. Corpo inteiro com margem. Sem objetos, cenário, rótulos ou mudança de roupa.

## Cena (modal_edit com as referências)
Use a ficha anexada como referência obrigatória de identidade. {DESCRICAO}. Recriar no ângulo e na pose pedidos: [ÂNGULO, POSE, EXPRESSÃO, ENQUADRAMENTO]. Fundo simples sem texto, a menos que haja cenário. Não reproduzir a ficha na cena. Sem personagens extras, membros extras, roupa diferente, {PROIBIDOS} ou aparência 3D.

## Folhas para vetor
Colar REGRAS no fim de cada uma. Obrigatórias: Turnaround (dele saem os braços), Peças e Mãos.

**REGRAS** — Mesmo personagem das imagens anexadas, mesmas proporções, rosto, cabelo e roupa. Estilo vetorial flat para recorte em peças: contorno preto uniforme e fechado, preenchimentos chapados, no máximo um tom de sombra em bloco por cor, sem gradiente, textura, brilho, desfoque ou sombra no chão. Fundo branco liso, sem texto, grade ou rótulos. Mesma escala, separadas por espaço branco, sem se tocar. Paleta fixa: {PALETA_HEX}. Sem personagens extras, membros extras, {PROIBIDOS}, acessórios novos ou aparência 3D.

**Peças** — Folha de recorte do personagem de frente, cada peça solta e completa, espalhada sem sobreposição: cabeça sem cabelo e sem olhos, sobrancelhas ou boca; cabelo{; cabelo de trás}; pescoço; tronco com {ROUPA}; braço superior E e D; antebraço E e D; mão E e D; coxa E e D; canela E e D; {CALÇADO} E e D. Pontas das juntas arredondadas e completas para girar por baixo da vizinha, sem círculos desenhados nas articulações.

**Mãos** — Folha com as mãos isoladas, seis poses lado a lado no mesmo tamanho e na mesma altura de punho: aberta de palma, aberta de costas, punho fechado, apontando com o indicador, polegar para cima, segurando um celular de lado. Polegar à esquerda em todas, dedos curtos, punho com corte reto onde encaixa na manga.

**Turnaround** — Cinco vistas lado a lado: frente, três quartos frente, perfil, três quartos costas, costas. Pose em A, braços 20° afastados, mãos abertas, nenhum membro cruzando o tronco, mesma linha de chão.

**Extras** (quando a cena pedir) — mãos vistas de cima; busto de costas; objeto-símbolo de frente e de cima.

## Secundários (base neutra)
Anexar a folha de peças do protagonista e: "Mesma disposição, escala e posição de cada peça que a folha anexada; mesmo esqueleto e tamanho de cabeça. {BASE}: {SILHUETA}. Cores neutras para trocar depois: pele #C8C8C8, cabelo #3C3C3C, roupa #8C8C8C, calça #2D2D2D, calçado #F0F0F0." Fazer o mesmo com a folha de mãos.
