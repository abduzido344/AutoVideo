# A segunda marmita — imagens de referência

Seis quadros finais criados com a ferramenta integrada ImageGen, sem API/CLI e sem execução de vídeo no Modal nesta etapa. Imagens fictícias, estilo fotográfico, composição vertical próxima de 9:16, sem texto incorporado. Dimensão dos finais: 941×1672 pixels; ainda não são masters 1080×1920.

1. `imagens/01_duas_marmitas_vertical.png`: mãe prepara a segunda marmita; filha observa ao fundo.
2. `imagens/02_a_reclamacao.png`: filha questiona a mãe; duas marmitas fechadas na mesa.
3. `imagens/03_o_portao.png`: professor devolve a marmita lavada, embrulhada num pano; filha observa.
4. `imagens/04_o_professor_corrigida.png`: mãe ajeita a gola do professor, segurando a marmita; mão e antebraço de apoio corrigidos.
5. `imagens/05_a_revelacao.png`: mãe conta a história; filha compreende e toca sua mão.
6. `imagens/06_o_gesto_da_filha.png`: filha de avental prepara as duas marmitas; mãe observa da porta.

`imagens/01_duas_marmitas.png` é a composição inicial em 3:4, preservada como referência de identidade; usar a versão `_vertical` na sequência final.

Prévia: `previa.jpg`. Pacote de seis PNGs finais e documentação: `segunda_marmita_imagens.zip`. Prompts/direção: `prompts.md`.

## Narração

Todo dia, minha mãe fazia duas marmitas. Uma era minha. A outra, ela levava até o portão.

Eu reclamava:
— A senhora já trabalha tanto… ainda vai cozinhar pros outros?

Um dia, fui atrás dela.

No portão, um senhor devolveu a vasilha lavada, embrulhada num pano.

Minha mãe ajeitou a gola da camisa dele:
— Comeu tudo, professor?

Esperei ele ir embora e perguntei de onde se conheciam.

— Foi ele que me ensinou a ler. Eu não tinha dinheiro nem pro caderno.

No dia seguinte, acordei mais cedo.

Quando minha mãe entrou na cozinha, as duas marmitas já estavam prontas.

## Uso posterior em vídeo

Começar animando uma imagem por cena (só start), com movimento sutil e câmera estável. Não usar pares de imagens com enquadramentos diferentes como se fossem movimentos contínuos: os seis quadros representam cortes entre planos. Para testar start+end, criar uma variante final da mesma cena, com câmera e objetos preservados.

Há seis cenas; a duração final deve ser definida após gravar a narração. O texto não foi cronometrado em áudio. Não assumir automaticamente 30 ou 35 segundos.

Revisão: a cena 04 original tinha a mão de apoio desconectada do braço. Usar a versão `_corrigida`, editada com ImageGen para conectar mão, punho e antebraço. Original preservado. Pacote revisado: `segunda_marmita_imagens_v2.zip`; prévia revisada: `previa_v2.jpg`. Pequenas variações de proporção, objetos e expressões continuam possíveis em geração de imagem.


Revisão v3: a primeira correção duplicou os braços do mesmo lado. Usar agora `imagens/04_o_professor_v3.png`, com um braço em cada ombro. Manifesto atualizado; pacote atual `segunda_marmita_imagens_v3.zip`.
