---
name: novo-canal
description: Cria um canal novo em canais/<canal>/ de forma interativa — nicho, público, referências, tom e voz, nome, estilo, personagem, objetos, cenas, thumbnail e primeiras ideias. Use quando o usuário quiser criar, abrir ou estruturar um canal novo.
---

# Novo canal

Interativo: cada etapa é uma chamada de AskUserQuestion (até 4 perguntas, 2–4 opções já preenchidas, a recomendada primeiro com "(Recomendado)"). O usuário só digita quando escolhe "Other". Gerar as opções a partir do que já foi decidido; nunca perguntar o que dá para deduzir. Ao fim de cada etapa, gravar no arquivo e mostrar em 2–3 linhas.

Começar: `cp -r canais/_modelo canais/<slug>` assim que houver nome provisório (renomear depois). Formato (longo/short) não se decide aqui: é por vídeo, na skill `novo-video`.

## Etapas
1. **Nicho e subterritórios** → `canal.md`. Opções de tema amplo; depois multiSelect com 6–10 subtemas. Critério: 10 ideias se espalham pelos subtemas e cada uma se mostra com personagem + um objeto.
2. **Público e promessa** → `canal.md`. Faixa/situação de vida + promessa em uma frase. Segunda pessoa, situações concretas do dia a dia dele.
3. **Canais de referência** → `canal.md` (DNAs). Pesquisar canais gringos do nicho com vídeos ≥500 mil views no último ano; oferecer 3–4 para escolher (multiSelect). De ≥2 transcrições tirar:
   - Escrita: abertura, frases de virada, palavras/segundo reais.
   - Retenção: quando vem a promessa, primeiro pagamento, re-gancho, fecho.
   - Padrões de título.
4. **Tom e voz** → `canal.md`, `voz/`. Energia (calmo-autoritário · conversacional · intenso), cadência e trilha. Voz: o usuário grava 10–30 s limpos, frases completas, cortados numa pausa → `voz/voz.wav` + `voz/voz.txt` exato (números como falados). Testar 3 parágrafos (Modal: dizer custo e pedir ok).
5. **Nome** → renomear a pasta. 4 opções no padrão escolhido (palavra-força + sufixo fixo · nome do personagem · frase-promessa · bordão). Conferir se o nome está livre no YouTube.
6. **Estilo visual** → `estilo.txt` (ESTILO, PERSONAGEM, CONTINUIDADE, RESTRIÇÕES). Opções: stickman minimalista · stickman premium · flat 2D · papel recortado · giz. Fixar traço, cores chapadas, paleta em hex, fundo (nunca branco puro) e luz neutra.
7. **Personagem** → skill `criar-personagem` (protagonista + base para secundários).
8. **Objetos recorrentes** → `canal.md`. multiSelect de 6–10 objetos-símbolo do nicho e como são desenhados (cor, traço, tamanho em relação à mão).
9. **Banco de cenas** → tabela de `canal.md`. 6–10 cenas-arquétipo do arco problema → solução (cor fria → quente), cada uma reaproveitável.
10. **Thumbnail** → `canal.md`. Modos (herói · objeto · antes/depois · número · erro · lacuna); texto de 2–5 palavras em caixa alta, uma palavra em cor de destaque; legível em 200×112. Fontes e cores (legenda e thumbnail) → `tema.json`.
11. **Motion** → `canal.md`, `motion/`. Personalidade de movimento (skill `motion-design`) e cópia do código do rig de um canal existente (kit, raster, mg, vetor, recortar, package.json; `npm i`).
12. **Identidade** (opcional) → `identidade/`: perfil e capa com o personagem.
13. **Primeiras ideias** → `ideias.md`. 10 ideias espalhadas pelos subtemas, cada uma com prova (link, views), gancho (contrário · pergunta · número · erro · história) e ação visual.
14. **Publicação** → `canal.md`. Cadência (ex.: 1 longo/semana + 3 shorts) e patrocínio, se houver.

Fim: mostrar a árvore de `canais/<slug>/` e perguntar se começa o primeiro vídeo (`novo-video`).
