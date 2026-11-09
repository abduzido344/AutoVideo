# Remendo 3D — versão 02

Modelo procedural original em Three.js/React Three Fiber. Geometria independente dos personagens anteriores; não depende de malha Quaternius. Componentes em `src/remendo/` no ambiente local; cópias do código nesta pasta do canal.

## Abrir e renderizar

Na pasta `C:/Users/Abduzido/AutoVideo_local/tres/`:

```powershell
npx remotion studio src/remendo/RemendoPreview.tsx
npx remotion still src/remendo/RemendoPreview.tsx remendo-ficha out/remendo-ficha.png
npx remotion render src/remendo/RemendoPreview.tsx remendo-teste out/remendo-teste.mp4
```

## Usar em cenas

```tsx
import {Remendo} from './remendo/Remendo';
<Remendo tempo={frame / fps} expressao="sera" giro={0.25} acenar />
```

Expressões: `deboa`, `sera`, `deuruim`. `tempo` controla respiração, movimento leve da cabeça, piscada e aceno de forma determinística. O aceno só acontece com `acenar`. Personagem orientado para +Z, pés no chão Y=0, altura aproximada de 2,5 unidades. Grupos articulados em ombros, cotovelos, quadris e joelhos; poses adicionais podem ser parametrizadas no componente.

## Limites da versão

Modelo de produção inicial com roupa, cabelo e cadarços simplificados. Não reproduz as microtexturas e o tecido da imagem gerada. Geometria procedural em componentes, sem arquivo GLB independente, rig humano padronizado, retargeting Quaternius, órgãos ou efeitos de dano. Costura fixada no lado esquerdo do personagem (direita de quem olha de frente).

Validação: compilação TypeScript dos dois componentes e render da ficha. Teste animado de 120 quadros a 30 fps, com folha de contato para inspeção de poses e expressões.

## Refinamento V02

Cabeça com cantos mais amplos, três mechas volumétricas curvas, regata e pernas da bermuda com malhas curvas e dobras, micro-relevo procedural de tecido, quatro dedos curvos além do polegar e tênis com biqueira oval e laço. Postura com base mais aberta. Malha Quaternius não incorporada: geometria original mantém as proporções do conceito.

Prévia: remendo-3d-v02-ficha.png. Movimento: remendo-3d-v02-teste.mp4. Código anterior preservado em Remendo-v01.tsx.


## Movimentos Quaternius (08/11/2026)

`src/remendo/RemendoAnim.tsx` toca no Remendo qualquer animação da Universal Animation Library (as mesmas do `Heroi`): o esqueleto Quaternius roda invisível e cada osso gira o segmento correspondente do Remendo (quadril, peito, cabeça, coxa, canela, pé, braço, antebraço, mão).

```tsx
<RemendoAnim camadas={[{anim: 'Walk_Loop', t: f / 30}]} expressao="sera" tempo={f / 30} giro={0.3} />
```

Teste: `npx remotion still src/remendo/RemendoAnimTeste.tsx remendo-anim out/remendo-anim.png`. Agachado e empurrar descem um pouco demais.
