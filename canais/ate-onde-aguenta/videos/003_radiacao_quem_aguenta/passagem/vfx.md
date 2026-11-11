estado: pronto
entregue: tres/src/cenarios/vfx/ (base, Halo, RaioX, Orgaos, Feixe, DNA, Celulas, PlacaPetri, Cracha, Pos, VfxTeste), composição vfx003 em Root.tsx, tres/vfx.md, midia/vfx_contato.png (3×3)
decisões: raio-X por gêmeo fresnel + plano de corte (anel desce), funciona em qualquer corpo sem editar Heroi/Remendo/cobaia; pós por EffectComposer do próprio three (sem lib nova); tudo por hash(i) e frame
medidas: vfx003 540 quadros 960×540 em 61 s; tsc limpo; GPU 0
pendências: [diretor] escolher efeitos por cena no storyboard; [animador-3d] Orgaos só para humano em pé, criar versão barata/mosca/tardígrado se o diretor pedir raio-X neles; crachá desbota sob luz forte
aprendizado: bloom com limiar ≥0,85 e emissivos toneMapped:false, senão superfícies brancas estouram
