# AGU-01 — protótipo 01

Cobaia humanoide amarela do Até Onde Aguenta. Corpo Quaternius articulado, cabeça cartoon sem cabelo, rosto expressivo, mãos e pés escuros e marca de teste no peito. Curioso antes do teste, desconfiado ao perceber o risco e determinado enquanto ainda aguenta.

Estudo visual, ainda não aprovado como identidade definitiva. Preserva a ficha anterior e o personagem existente.

## Fonte e reprodução

Código: C:/Users/Abduzido/AutoVideo_local/tres/src/agu01/Agu01.tsx
Cena: C:/Users/Abduzido/AutoVideo_local/tres/src/agu01/index.tsx
Base existente: public/personagens/heroi_m.glb + anim1.glb + anim2.glb, no ambiente 3D local.
Licença do pacote Universal Base Characters[Standard] baixado: CC0 1.0, conforme License_Standard.txt do ZIP.

Na pasta C:/Users/Abduzido/AutoVideo_local/tres:

```powershell
npx remotion studio src/agu01/index.tsx
npx remotion still src/agu01/index.tsx agu01 out/agu01.png --frame=0
npx remotion render src/agu01/index.tsx agu01 out/agu01.mp4
```

## Escopo desta versão

Três atitudes na mesma folha, corpo com esqueleto de animação e rosto controlado por código. Sem órgãos, janela torácica, dano, simulação química ou exportação GLB autônoma. A cabeça e o material personalizado dependem dos componentes Three.js.

Próxima decisão visual: avaliar proporção da cabeça e acabamento da casca antes de construir mecanismos internos e efeitos dos testes.
