# Manual de poses — rig do kit.mjs
Regras gerais e 12 princípios: `.claude/skills/motion-design/director/personagem.md`. Aqui, só os números deste rig.

Convenções do rig (lidas do código):
- **E = lado esquerdo da TELA** (x menor; ombro [564,668], quadril [622,1132]), que é o braço direito anatômico do personagem. D = lado direito da tela.
- `punhoL` = alvo do punho em coordenada do corpo (antes de pos/rot/s; segue o corpo e a câmera). `punho` = coordenada do mundo (fica parado quando o corpo se mexe). Contato com o corpo → `punhoL`. Contato com o cenário (colchão, sofá) → `punho`.
- Tudo abaixo está em unidades do corpo (multiplique por `s` para pixels). Braço: úmero 238, antebraço 218 (alcance 456). Perna: coxa 160, canela 236. Tronco x 531–853. Cabeça x 426–950, y 46–535 (cabeça maior que os ombros: o cotovelo nunca passa da coroa).
- Pernas são FK puro (`perna:[coxa°, canela°]`, positivo = gira para a esquerda da tela). Pé não tem IK: só fica plantado se você compensar (ver 2.6).

## 1. Erros vistos nos clipes atuais

| # | Clipe/tempo | Erro | Correção |
|---|---|---|---|
| 1 | C4 6,6–6,9 s (P3, baixar celular) | O cotovelo D troca de lado em ~3 quadros e termina no ombro de baixo (local ≈[584,642]): o braço de cima atravessa o peito inteiro. Causa: `dobra.D=1` fixo enquanto o punho passa de fora para dentro do ombro. | Usar `dobra.D=-1` e manter o punho por dentro do ombro durante todo o movimento (receita 3.1). Cotovelo final ≈[916,886], apoiado no flanco. |
| 2 | C4 0–3,5 e 5,5–6,6 s | Celular segurado pela ponta curta, saindo do punho como um cabo. Fica ao lado do ombro, longe do rosto. | Mão no terço inferior da lateral longa; celular diante do queixo (receita 3.1, 3.7). |
| 3 | C4 todo P1/P3 | Braço de baixo (E, "sob a cabeça"): só aparece uma mão solta sob o queixo; o cotovelo some atrás do pescoço do lado D (local ≈[745,515]). | `punhoL.E [470,330]`, `dobra.E -1` → cotovelo ≈[373,525], visível ao lado da cabeça, sobre a almofada. |
| 4 | C4 3,5–5,5 s (close) | Três dedos iguais, paralelos, no meio da borda direita; a palma é uma bolha fora do celular embaixo à esquerda. A mão parece cruzar o celular na diagonal. Nenhum dedo apoia a base. | Dedos na metade inferior, comprimentos diferentes, mindinho sob a borda de baixo; palma (base do polegar) na borda esquerda, terço inferior (3.7). |
| 5 | C2 0–4 s (de cima) | Cotovelos na altura dos ombros, abertos em "asa de galinha"; mãos abaixo do caderno com os dedos para fora (`giroMao` E +8 / D −8 abre para fora), sem tocar as bordas. | Caderno mais baixo, sobre a barriga; punhos nos cantos de baixo, dedos para dentro (3.2). |
| 6 | C2 6,0–6,3 s (sentar) | Corpo gira 90° rígido em ~6 quadros com `back` (passa ~9° da vertical), pernas varrem o colchão, pés raspam, cabeça não lidera. Também é um giro em profundidade (deitado ao longo da cama → sentado de frente) feito no plano. | Não dá para fazer esse giro com arte só frontal. Apoiar no cotovelo (até ~30°) e cortar na ação (3.4). |
| 7 | C2 6,3–7,0 s (sentado) | Caderno na altura do peito, cotovelos abertos para os lados. | Caderno no colo: braços quase estendidos, cotovelo só 54 para fora (3.3). |
| 8 | C2 7,0–7,45 s (fechar) | A mão E não acompanha a borda da capa: termina ~200 unidades antes dela. A capa pula de aberta para fechada em ~2 quadros. | O punho segue a borda: `x = cx − 167·cos(π·f)`, com um arco para cima (3.8). |
| 9 | C2 7,45–9 s (em pé com caderno) | Os antebraços, em comprimento total, cruzam o tronco inteiro; as mãos se sobrepõem e o antebraço D passa por cima da mão E. | Sem encurtamento: carregar o caderno pendurado ao lado da coxa. Com encurtamento: antebraço ×0,45 (2.4, 3.8). |
| 10 | C2 7,85–8,35 s (levantar) | Só translação vertical. A antecipação é um mergulho para baixo, sem inclinar o tronco, sem empurrar com as mãos, sem transferir o peso; cabeça e braços sobem colados ao tronco. Os pés ficam plantados (isso está certo). | Receita 3.5. |
| 11 | C4 P1/P3 | "Deitado de lado", mas é o boneco de costas girado: pernas retas, paralelas, sem peso. | Perna de cima com `coxa` 0,75 e cruzando levemente sobre a de baixo (3.1). |

## 2. Regras gerais

### 2.1 Limites articulares (adulto, valores típicos) → no rig
- **Cotovelo** 0–145°, sem hiperextensão. Ângulo interno = `acos((238²+218²−L²)/(2·238·218))`, com L = distância ombro→punho. Use **L entre 140 e 440**: abaixo de 140 o antebraço atravessa o úmero; acima de 440 o braço trava reto (o `ik` corta em 456). Cotovelo a 90° ⇔ L≈323.
- **Ombro**: flexão/abdução até 180°. Na vista frontal, o cotovelo fica do próprio lado da linha média (x=692). Só cruza em braços cruzados de verdade.
- **Punho**: desvio para o lado do polegar ≤20°, para o lado do mindinho ≤30°; flexão/extensão ~60–70°, mas isso acontece em direção à câmera. `giroMao` só cobre o desvio no plano; confira onde está o polegar da forma: em `aberta`/`pega` da mão E o polegar fica para fora (+giro = lado do polegar; contraria 2.1.1, então em terceira pessoa espelhe); em `apoio` fica para dentro (+giro = lado do mindinho). A mão D é o espelho. Flexão em direção à câmera = `maoEsc` 1,1–1,15 ou trocar a forma.
- **Pescoço** (`cab`): inclinação lateral até ~40°; o natural fica em ±25°.
- **Quadril** (`perna[0]`): abdução ≤45° (E +, D −), adução ≤20°. **Joelho** 0–140°, só para a frente: na vista frontal a canela não dobra para o lado. Mantenha `perna[1]` em ±8°; mais que isso vira joelho torto. A flexão vira encurtamento (`coxa`).
- **Tornozelo**: dorsiflexão ~20°, flexão plantar ~45°. Pé no chão: `shoeRot = rot+perna[0]+perna[1]+giroPe = 0` (sola paralela ao chão); abrir a ponta em ±10° com `giroPe`.

### 2.1.1 Lado do polegar (vale acima do que a forma da mão trouxer)
- **Terceira pessoa (câmera vendo o personagem):** o polegar fica sempre para dentro, do lado da cabeça e da linha média. Mão pendurada, acenando, apontando ou segurando: polegar virado para o corpo, nunca para fora. Se a forma deixa o polegar para fora, espelhe a mão.
- **Apontar com o braço na horizontal:** indicador em cima, dedos dobrados embaixo (o indicador fica do lado do polegar, que aponta para a cabeça).
- **Primeira pessoa, palma para baixo:** polegar para dentro, para o centro da tela.
- **Primeira pessoa, palma para cima:** polegar para fora, para a borda da tela.
- Rig vetorial (`vetor.mjs`): `maoE` já tem o polegar à direita e `maoD` à esquerda (os dois para dentro).

### 2.2 Sinal de `dobra` (é relativo à direção ombro→punho, não ao corpo)
`+1` põe o cotovelo 90° no sentido horário (na tela) a partir do vetor ombro→punho; `−1`, no anti-horário.

| ombro→punho aponta | cotovelo com +1 | com −1 |
|---|---|---|
| ↓ baixo | esquerda da tela | direita |
| → direita | baixo | cima |
| ↑ cima | direita | esquerda |
| ← esquerda | cima | baixo |

- Padrão do kit (E +1, D −1) = cotovelos para fora com a mão abaixo do ombro.
- **Para o cotovelo cair (gravidade, cotovelo no flanco):** punho à direita do ombro → +1; à esquerda → −1. Se o punho cruza a vertical do ombro no meio do movimento, o cotovelo dá a volta (erro 1).
- As duas soluções só se encontram com o braço estendido. Trocar `dobra` sem isso é salto (o Spine também não mistura bend direction). Troque só num corte, com o braço reto, ou escondido atrás de outra peça.
- Sem encurtamento, todo punho perto do peito joga o cotovelo para fora (h = 175 com L≈290; 60 com L=440). Ou aceite (de cima, deitado, isso é natural), ou afaste o punho, ou use 2.4.

### 2.3 Ordem de camadas
Padrão (de trás para a frente): pernas → tênis → tronco → cabeça → rosto → mãoE, braçoE → mãoD, braçoD. A mão vem antes do braço para o punho da manga cobrir a junção.
- Membro do lado de baixo/de trás (braço sob a cabeça, perna de baixo): antes de `tronco` e `cabeça`.
- Mão tocando o rosto (bochecha, queixo): depois de `rosto`.
- Objeto segurado: objeto antes da mão quando os dedos ficam na frente; com polegar na tela, o polegar fica na frente do objeto e a palma atrás.
- Joelhos (`joelhoE/D`) logo depois de `tronco`, como no C2.
- A ordem é fixa por comp. Para trocar no meio do plano, duplique o membro nas duas posições e alterne `op` num quadro sem sobreposição (técnica do fórum do Moho).

### 2.4 Encurtamento (foreshortening) falso
- Coxa vindo para a câmera (sentado): `coxa` 0,2–0,35 liga as camadas de joelho (aparecem abaixo de 0,8).
- Braço: **não há campo hoje.** Sugestão de 1 linha em `solve()`: `const [ku,kf] = q.encurta?.[side] ?? [1,1]; const a = BR.a*s*ku, b = BR.b*s*kf;`. Valores: antebraço apontando para a câmera `kf` 0,4–0,55; cotovelo indo para trás do corpo `ku` 0,6–0,75 (e braço atrás de `tronco`).
- Sugestão de polo, para acabar com as viradas: `bend = Math.sign((S[1]-T[1])*(Pl[0]-S[0]) + (T[0]-S[0])*(Pl[1]-S[1])) || 1`, com `Pl = B(q.polo[side])` (ex.: polo no quadril do mesmo lado). O cotovelo escolhe sempre o lado do polo.
- Inclinar para a câmera: `hs` 1,03–1,06, `rosto.gy` +8…+15, `pos.y` desce 15–25·s. Inclinar para trás: o inverso.

### 2.5 Arcos, overlap, timing (24 qps)
- `tr()` interpola o punho em linha reta. Punho de verdade anda em arco em volta do ombro/cotovelo: ponha uma chave intermediária deslocada 10–15% da distância para o lado de fora do arco, ou interpole ângulo e raio.
- Liderar e atrasar: a cabeça lidera as subidas (2–4 q antes) e atrasa nas paradas (+1 assentamento de 2–3°). A mão (`giroMao`) atrasa 1–3 q em relação ao antebraço.
- Evite `back` em movimentos de corpo inteiro: ele começa a ~4,7× a velocidade média, sem slow-in. Use `io`/`out`, mais uma ultrapassagem pequena (≤5% ou ≤3°) em chave separada.
- Peso: antes de subir, desce ou inclina (antecipação); depois de parar, assenta.

### 2.6 Pés plantados (sem IK de pé)
- Subir/descer o quadril mexendo `coxa`: `Δpos.y = −Δcoxa·160·s` (o C2 acerta: 0,75·160·0,56 = 67).
- Deslocar `pos.x` com o pé parado: `Δperna[0] ≈ asin(Δx / ((coxa·160+236)·s))` em graus, com sinal oposto ao deslocamento.
- Girar `rot` com o pé parado: compense `perna[0] −= Δrot` nos dois lados.

## 3. Receitas

### 3.1 Deitado de lado, frente para a câmera (C4: `rot −90`, `s .6`)
- Cabeça na almofada: `cab` 22–28. Respiração `resp` 1.
- Braço de baixo, sob a cabeça: `punhoL.E [470,330]`, `dobra.E −1`, `mao.E 'apoio'`, braçoE antes de `tronco`/`cabeça`. O cotovelo (≈[373,525]) aparece ao lado da cabeça.
- Braço de cima, celular diante do queixo: `punhoL.D [680,650]`, `dobra.D −1` → cotovelo ≈[691,868], apoiado na barriga (L=141, perto do limite; com o úmero longo do rig, o cotovelo não chega mais para fora sem `encurta`).
- Baixar o celular até o peito: mesma `dobra −1`. 0 q `[680,650]` → 7 q `[690,755]` (cotovelo [849,905]) → 14 q `[700,860]` (cotovelo [916,886]), `io`. O cotovelo desliza em arco da barriga para o flanco, sem virar. `giroMao.D` 0→−20 atrasado 2 q. O olhar acompanha: `gy` −6, 3 q depois.
- Pernas: de baixo reta; de cima `coxa .75`, `perna.D [−6,4]` (cruza levemente), pés sobrepostos com `giroPe` ±8.

### 3.2 Deitado de costas, câmera de cima (C2 P1: `rot 0`)
- Mãos sobre o caderno na barriga: centro do caderno [692,980]; `punhoL.E [600,1060]`, `D [784,1060]`, dobra padrão → cotovelos ≈[468,886] / [916,886], na cintura e apoiados no colchão. `mao 'apoio'`; `giroMao E −15, D +15` (dedos para dentro, sobre a capa).
- Pés caem para fora: `giroPe E +10, D −10`; `perna E [3,0] D [−3,0]`. `cab` ±2 (apoiada).

### 3.3 Sentado de frente (beira da cama)
- `coxa .25–.3`; `perna E [5,−5] D [−5,5]` (canela vertical); `giroPe 0` (sola paralela). Chão: y = 1132 + coxa·160 + 236 (local).
- Caderno no colo: centro [692,1120]; `punhoL.E [600,1110]`, `D [784,1110]` → cotovelo só ~54 para fora.
- Mãos de apoio no colchão (antes de levantar): `punho` (mundo) na altura do quadril, ±150 do centro, braço quase reto (L≈440), `mao 'apoio'`.

### 3.4 Sentar (de deitado de lado)
Arte frontal não gira em profundidade. Faça só a parte que acontece no plano e corte:
- 0–6 q: antecipação. A cabeça lidera (`cab` +8); mão de baixo plantada no colchão (`punho` mundo).
- 6–18 q: apoio no cotovelo: `rot −90 → −62` (`out`), `perna[0] −= Δrot` para as pernas ficarem no colchão.
- Corte na ação para 3.3, com a cabeça na mesma posição de tela. Assentamento de 4 q: `pos.y` +6·s e volta.

### 3.5 Levantar (de sentado, de frente) — 28 q
- 0–6 q: mãos vão para o colchão (3.3), `mao 'apoio'`.
- 4–12 q: inclinação para a câmera (2.4): `hs 1→1.05`, `gy +12`, `pos.y +20·s`; cabeça 2 q à frente.
- 10 q: o peso sai do assento. 10–22 q: `coxa .25→1` (`out`) com `Δpos.y = −Δcoxa·160·s`; `hs → 1`. As mãos saem do colchão em 12 q e os braços atrasam 3 q (balanço).
- 22–28 q: assentamento: `pos.y` −4·s e volta. O peso passa para uma perna: `pos.x` ±20·s, `rot` ±2, `cab` ∓2, compensando os pés (2.6).

### 3.6 Em pé, repouso
`perna E [3,−3] D [−3,3]`; braços com `braco` padrão ±8. O peso fica numa perna (como no final de 3.5). Nunca os dois lados perfeitamente simétricos.

### 3.7 Segurar celular
- **Uma mão, vista frontal:** o celular fica entre o rosto e a câmera, abaixo do queixo, então vê-se o verso (correto). Mão `pega` no terço inferior da lateral longa; o celular fica atrás dos dedos. Olhos `gy` +10…+18 apontando para ele. Cotovelo junto às costelas (com encurtamento: `encurta.D [1,.5]`, `punhoL.D [740,860]`).
- **Close (sobre o ombro):** a palma (base do polegar) fica na borda esquerda, no terço inferior. Polegar com 0,6–0,8 da largura da tela, dobrando na direção da palma. Dedos na borda oposta, na metade inferior, comprimentos 100/92/84%; mindinho sob a borda de baixo. O swipe é um arco a partir da base do polegar (o IK já faz).
- **Duas mãos:** punhos abaixo do queixo, `punhoL E [640,900]`, `D [744,900]` só com `encurta [1,.45]`. Sem isso, os cotovelos saem ~190 para fora: evite essa pose.

### 3.8 Segurar e fechar caderno
- Fechar (8–11 q, `io`): a mão que fecha segue a borda da capa: `punhoL.x = cx − 167·cos(π·f) + 20`; `y` sobe 30 no meio (`sin(π·f)`); `maoEsc` 1→1,12→1 (a capa vem para a câmera); a capa atrasa a mão em 1 q. A outra mão fica parada, segurando a lombada.
- Carregar fechado em pé: braço pendurado, `punhoL.D [842,1110]` (L≈442, cotovelo levemente dobrado), `mao 'pega'`, caderno pendurado no punho, vertical, ao lado da coxa. Contra o peito só com `encurta`.

### 3.9 Mão sob a cabeça
Ver 3.1. Regras: o rosto (bochecha) fica por cima da mão; a mão fica entre a cabeça e a almofada, com o dorso para a câmera; o cotovelo sempre visível fora da silhueta da cabeça. A cabeça (528 de largura) é grande demais para o cotovelo passar da coroa: não tente.

## 4. Rig vetorial (`vetor.mjs`)
Peças em `personagem/vetor/` (`node recortar.mjs pecas ...` / `maos ...`; outro personagem: `recortar.mjs <pasta>/pecas ...`, pasta relativa a `personagem/`). Camada: `prota(t => pose, { nome, pers: '<pasta>', variante })`.
- Tudo que é do personagem está no `pecas.json` dele: `rig` (`osso` = pivôs das peças na folha, `mao` = escala/punho/linha do pulso/lado do polegar, `tronco` = retângulo de corte, `tubo` = [cor, sombra, larguras…, faixa], `virilha`, `rosto` = olhos/olho/sobrancelhas/boca e `cilios` padrão, `recorte` = regras do `recortar`) e `paleta` (tokens → cor). O `recortar` preserva `rig`/`paleta` e grava as cores como `{token}` (ou `{token#hex}` se só parecida, dentro de `recorte.tol`); `escopo` limita um token a peças (`arquivo:peça`), `zona` força/isenta caminhos dentro de uma caixa. Cor que fica sem token é listada no fim.
- Variante: `variantes.json` ao lado do `pecas.json`, ex. `{"ruiva": {"cabelo": "#B5532E"}}`; `prota(pose, { variante: 'ruiva' })` ou objeto inline. Mudar `cabelo` arrasta `cabelo_s` e tons parecidos. `"pecas": {"cabelo": "coque", "cabeloTras": "longo"}` troca peças (também por quadro em `q.pecas`; `null` esconde); `cabeloTras` é desenhado atrás de tudo e gira com a cabeça. Peça trocada usa o pivô `rig.osso[nome]`. `rosto.cilios: true` liga cílios.
- Base feminina: `prota(pose, { pers: 'feminina', variante: 'ruiva' | 'loira' | 'azul' })` (variantes em `personagem/feminina/variantes.json`; cabelo longo atrás é `cabeloTras`). A mão `aponta` dela é desenhada de lado: apontar com o antebraço para cima, D `[-45, -125, 0]`.
- `pos`, `s`, `tronco`, `cab` (graus). `br.E/D = [ombro, cotovelo, mão]`, `pe.E/D = [coxa, joelho, pé]`: 0 = pendurado; + gira no sentido horário da tela (E + abre, D − abre). Ângulo do filho é relativo ao pai.
- Aceno D: `[-105, -58, 0]`. Apontar D: `[-88, -4, 0]`. Joinha E: `[22, 140, 0]`.
- `mao.E/D`: `aberta` (palma), `costas`, `punho`, `aponta`, `joinha`, `celular`. O espelho é automático para o polegar apontar para a cabeça (2.1.1); `polegar.D = 'fora'` inverte (primeira pessoa, palma para cima).
  - Cada forma declara de que lado o polegar está desenhado (`rig.mao.polegar`; padrão −1 = esquerda, `aponta` = +1). Forma nova: conferir o lado antes de usar, senão a mão sai de cabeça para baixo (erro do apontar com o indicador embaixo).
- Braços: com `rig.braco`, vêm do turnaround (vista de frente) cortados em braço, antebraço e mão por polígonos (`braco/ante/mao`, coords do turnaround), girando no ombro e no cotovelo (centro da manga) com bolinha de junta; `remendo` cobre a bolinha original e contorna o lado de dentro; escala = largura dos ombros do rig ÷ a do turnaround. Repouso = ângulos do desenho (E `[19, -7]`, D `[-18, 9]`); a mão `costas` é a do turnaround e as outras formas usam `rig.mao.esc` 0,34. Sem `rig.braco`, braço vira tubo (`tubo()`), que fica com cara de palito.
- Pernas: tubos contínuos; as peças `coxa/canela` do SVG só dão os comprimentos. O tronco é cortado em y 382 (`rig.tronco`) para sumir a bolinha do quadril, e a `virilha` cobre o encontro das pernas.
- `rosto`: `gx gy` (olhar), `pisca` 0–1, `sobr` (sobe, px), `sobrIn` (+ preocupado, − bravo), `sorriso` −1…1, `abre` 0–1, `larg`. Helpers: `fala(t, [[t0,t1],...])` e `piscar(t, [ts])`.
