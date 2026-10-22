# AutoVideo — Agente editor (adendo ao design)

**Status:** rascunho para o José aprovar. Complementa `2026-10-21-autovideo-series-design.md` e não substitui nada nele.
**Base:** estudo de 2026-10-21 das skills do HyperFrames, da CLI fixada no projeto, do catálogo do registry, do app desktop do HyperFrames para Windows (`hf-win-poc/app/resources/app`), do repositório lemo-opuscar (guias de direção e de estilo, MIT) e do repositório público heygen-com/hyperframes (Apache-2.0).

Neste documento, **(decisão do Claude)** marca o que o José não decidiu explicitamente. O resto saiu da conversa.

## Intenção
Usar o HyperFrames de verdade na edição: transições, câmera, efeitos do catálogo e mixagem, com o Opus 5.5 e as skills do HyperFrames. **O episódio não pode depender do editor:** se ele falhar, o vídeo sai pela montagem determinística de hoje.

**Por quê:** o estudo mostrou que a montagem atual (`montage.py`) usa pouco do que o HyperFrames oferece:

| Hoje | O que existe |
|---|---|
| Corte seco entre cenas | 52 itens de transição no registry (whip-pan, match-cut, light-leak, dissolve, blur, push…) |
| 4 movimentos de câmera fixos (`CAMERA`) | `hyperframes-keyframes`: punch-in, reframe, câmera 3D |
| Legenda parada com a narração inteira da cena | 16 estilos de legenda por palavra (`caption-pill-karaoke`, `caption-kinetic-slam`, `caption-highlight`…) |
| Volumes fixos (voz 1, sfx 0.6, ambiente 0.15) | `hyperframes-audio`: ducking, fades, EQ, compressor |
| 5 telas de celular feitas à mão | `chat-thread`, `message-thread-reveal`, `notification-cascade`, `typing-indicator`, `vfx-iphone-device`… |
| Nenhum overlay | 43 overlays (grain, vignette, light leak) |

O catálogo tem 448 itens: 210 blocks e 238 components. Só 12 blocks já vêm em 1080×1920, e uns 40 são WebGPU/shader, que pesam no render.

## Passo 0 — alinhar a versão (antes de tudo)
**Problema:** o projeto fixa `hyperframes@0.8.158` (`hf.py`, `HF_VERSION`). O app desktop traz a **0.8.163** e o npm está na 0.8.185. As skills em `~/.claude/skills` são de outra geração: o `skills check --json` da 0.8.158 dá 4 desatualizadas, e `hyperframes-core`, `-animation`, `-audio`, `-keyframes`, `-creative` e `-studio` aparecem como "removed" no índice dela. Um editor seguiria instruções escritas para outra CLI.

**Decisão:** fixar a **mesma versão do app desktop (0.8.163)** **(decisão do Claude)**. Assim um episódio aberto no app não pede upgrade e o comportamento é o mesmo nos dois lados. A versão só sobe junto com o app.

**Passos:**
1. Trocar `HF_VERSION` para `0.8.163`.
2. Rodar a suíte de testes e o `check` numa composição de episódio real já montada. A 0.8.158 tem comportamentos tratados no código (`transcribe.py`: "0.8.158: o stdout é só um resumo"; `render.check`: JSON depois de linhas de log), e cada um precisa ser revisto.
3. `npx --yes hyperframes@0.8.163 skills update` mais as skills do editor (lista abaixo), na versão fixada.
4. O `doctor` deixa de checar só a presença (`SKILLS` em `doctor.py`). Ele passa a ler `skills check --json` da versão fixada e reprova se uma skill do editor estiver `outdated`, `missing` ou `removed`.

A 0.8.163 também é a última tag pública que ainda traz `hyperframes-core`, `-creative` e os workflows dentro de `skills/` (ver "Guia de roteiro" abaixo), o que reforça a escolha.

Se o `check` ou os testes falharem na 0.8.163 e o motivo não tiver conserto simples, o projeto fica na 0.8.158 e o editor espera. O motivo vai para este documento.

## Fluxo com o editor
```
roteiro → cenas → voz → imagens → sfx → montagem → edicao (nova) → render → revisao → aprovacao
```

- **montagem:** igual a hoje. No fim, copia `composition/` para `composition.base/`. Essa cópia é o piso garantido.
- **edicao:** antes de cada tentativa, recria `composition/` a partir de `composition.base/`. O editor parte sempre da base, nunca de uma edição anterior, então retentativas e rodadas de revisão não acumulam lixo. Em seguida o editor melhora a composição e grava o recibo `edicao.json`.
- **render, revisao, aprovacao:** iguais a hoje. O `render_ep` já roda `render.check` antes do render caro.

Em `STAGES`, a etapa nova é `("edicao", "edicao.json", edicao)`, entre `montagem` e `render`. Ela é retomável como as outras.

### Fallback (o episódio nunca depende do editor)
| O que acontece | Resultado |
|---|---|
| Editor termina, `check` limpo e invariantes ok | Usa a composição editada. `edicao.json` com `fallback: false` |
| Falha de validação | Uma nova tentativa na mesma sessão, pelo laço que o `run_role` já tem |
| Falha de novo, `AgentOutputError`, estouro de turnos ou de orçamento | Restaura `composition.base/` e grava `edicao.json` com `fallback: true` e o motivo. O episódio segue e o `decisions.log` registra o fallback |
| `UsageLimit` | **Não** é fallback: propaga como hoje, a fila pausa e retoma na etapa `edicao` |

O painel mostra no episódio quando a edição caiu no fallback, para o José saber que o vídeo saiu na versão simples.

### Invariantes conferidas em Python (não pelo agente)
Depois do editor, o `validate` do `run_role` roda:
1. `render.check` sem erros.
2. **Sincronia intacta:** compara `timeline --json` da base com o da editada. Os clipes de voz (`voz-*`) e de cena (`img-*`, `screen-*`) mantêm `start` e `duration`, e o `data-duration` do root não muda. Ainda não verifiquei se o `timeline --json` traz os ids dos clipes. Se não trouxer, o plano compara lendo os atributos do `index.html`.
3. **Mídia intacta:** nenhum `<audio>`/`<img>` da base some. Arquivos novos só entram em `composition/` (itens do registry).
4. **Legenda conforme o estilo:** sem legenda na base (o estilo Benji não tem), sem legenda na editada.

Quebrou uma invariante: a mensagem de erro volta para o editor na nova tentativa, como já acontece com a validação de JSON.

## O papel `editor`
```python
Role("editor", "opus", max_turns=60, max_usd=5.0, skills=(
    "hyperframes", "hyperframes-core", "hyperframes-animation", "hyperframes-keyframes",
    "hyperframes-registry", "hyperframes-audio", "hyperframes-creative", "hyperframes-cli"))
```
- **Modelo:** Opus, como pediu o José.
- **Orçamento:** 5 dólares e 60 turnos **(decisão do Claude)**. Os 2 dólares padrão são apertados com as skills carregadas e o laço de `catalog`, `add` e `lint`. O custo real vai para o log, e o teto é ajustado depois de medir 3 episódios.
- **Skills fora da v1:**
  - `media-use`: som e mídia já vêm do ElevenLabs e do provedor de imagem, e o `resolve` dela depende da CLI do HeyGen.
  - Workflows completos (`faceless-explainer`, `general-video`): eles conduzem entrevista e `BRIEF.md`, que não cabem aqui.

  **(decisão do Claude)**

**Ferramentas e permissões:**
- **Leitura:** `Read`, `Glob` e `Grep` no episódio inteiro.
- **Escrita:** `Edit` **só** em `./composition/**` e no recibo `./edicao.json`. As negações de hoje (`approvals`, `out`, `.stages`, `.claude`) continuam.
- **Bash:** é a única exceção à regra "nenhum agente roda Bash", e é liberado só para estes subcomandos da CLI fixada: `lint`, `check`, `snapshot`, `timeline`, `compositions`, `catalog`, `add`, `keyframes`, `docs`, `history`.
- **Bloqueados:** `render`, `preview`, `publish`, `cloud`, `lambda`, `cloudrun`, `open`, `auth`, `upgrade`, `skills`, `telemetry` e `feedback`. A sintaxe exata da regra de permissão do Agent SDK fica para o plano.
- **Hooks:** o `setting_sources=["project"]` continua, para o hook do rtk não reescrever os comandos e quebrar as regras de permissão.
- **Telemetria:** a do HyperFrames fica desligada no ambiente do editor. Como desligar fica para o plano.

## O que o editor recebe e o que pode fazer
**Entradas** (caminhos, nunca conteúdo colado no prompt, pela regra de handoff por arquivo):
- `estilo.md` do perfil, no prefixo estável, como nos outros papéis;
- `cenas.json`, com um campo novo opcional por cena, `edicao` (texto curto de intenção, por exemplo "glitch na virada para o alerta", "punch-in no rosto ao ouvir o grito"). Quem escreve é o diretor de arte. Vazio quer dizer "use o bom senso dentro do estilo";
- a composição em `composition/`, que ele lê com `timeline --json` em vez de abrir todo o HTML, como a skill manda.

**Pode:**
- transições entre cenas, a partir do registry;
- câmera mais rica que os 4 movimentos fixos;
- overlays (grain, vignette, light leak) se o estilo pedir;
- trocar uma tela feita à mão por um item do catálogo, desde que mostre o mesmo texto e dure o mesmo tempo;
- mixagem: ducking do ambiente sob a voz e fades nas bordas.

**Não pode:**
- mexer em tempos de voz ou de cena, nem na duração total;
- adicionar legenda quando o estilo não tem;
- escrever texto novo na tela, porque o texto vem do roteiro e das cenas;
- usar mais de **um efeito WebGPU/shader por episódio** **(decisão do Claude)**, pelo custo de render no Windows;
- renderizar, abrir preview, publicar ou mandar feedback.

**Regras de uso do catálogo** (as skills já ensinam; o prompt reforça):
- busca com `catalog --query` **sempre em inglês**;
- instala com `add <item> --json --no-clipboard`;
- o `add` precisa de rede. Se falhar, segue sem o item.

### O prompt `editor.md` sobrescreve estes padrões das skills
As skills foram escritas para um agente conversando com uma pessoa. No pipeline:
- **Não há entrevista nem `BRIEF.md`.** O editor entra pela linha "edição específica em projeto existente" da skill `hyperframes`.
- **Não há preview nem pedido de aprovação.** A aprovação é a do José no painel, depois do render.
- **Não há `render` nem `feedback`.** Quem renderiza é o pipeline.
- **Usa o `history`:** abre o turno com `history begin --who editor` e desfaz com `history undo --who editor` quando o `check` piora. O fallback em Python continua sendo a garantia final.

## Revisão e ajustes
- **`Fix.role`** ganha `"editor"` e **`REDO["editor"] = "edicao"`**. O Revisor atribui ao editor problemas de transição, efeito, câmera ou mixagem. A triagem faz o mesmo com pedidos do José ("transição feia na cena 3"). O episódio então refaz só da edição em diante, sem refazer roteiro, voz e imagens.
- **Cache** **(decisão do Claude)**: `edicao.json` guarda um hash de `composition.base/index.html`, dos campos `edicao` das cenas, do `estilo.md` e da versão do HyperFrames. Se o hash não mudou e a edição anterior passou, a composição editada é reaproveitada sem chamar o Opus. Mesmo padrão do cache de imagens em `episode.py`.

## Skills do app desktop
O app (`hf-win-poc/app/resources/app`) traz:
- **`vendor/`:** as skills públicas do repositório `heygen-com/hyperframes` (core, animation, keyframes, registry, audio, creative, cli, studio, media-use e os workflows `faceless-explainer`, `general-video`, `motion-graphics`…).
- **`skills/`:** skills próprias do app: `viral-clone`, `moments/*` e `talking-head/*`.

**Decisões:**
1. **As skills de `vendor/` não são copiadas do app.** O pipeline instala as mesmas skills pela fonte pública, com `skills update` na versão fixada (Passo 0). Assim não depende do app instalado e não redistribui arquivos do app. O conteúdo é o mesmo porque a versão é a mesma **(decisão do Claude)**.
2. **`viral-clone` é a peça mais promissora para o Analista de estilo**, numa fase 2. Ele aprende a fala, o corte, o vocabulário de motion e a linguagem visual de um vídeo de referência e salva isso como **template HyperFrames reutilizável**. Hoje o Analista só gera `estilo.md` e `estilo.json`, então isso daria ao editor um repertório concreto do estilo, em código. Mas a skill **não tem arquivo de licença** (as de `talking-head/*` têm `NOTICE.md`), então só entra depois que o José confirmar que pode ser usada fora do app. Até lá não vai para o repositório nem para o `AUTOVIDEO_HOME`. Enquanto isso, o formato `STYLE.md` (seção do lemo-opuscar abaixo) cobre parte desse papel em texto: dá ao editor o vocabulário de movimento, câmera e som do estilo.
3. **`moments/*` e `talking-head/*` ficam fora.** São para vídeo de produto e para gravação de pessoa falando, que já saíram do escopo.

### "Ajustar no HyperFrames" (fase 2)
Um botão na tela de Revisão que roda `hyperframes open` na composição do episódio. Isso abre o episódio no app desktop, onde o José edita conversando com o Framey ou direto na timeline. Ao voltar, o pipeline roda `catch-up`, refaz `check` e render, e o episódio volta para a revisão. A aprovação continua só no painel. O botão só aparece com o app instalado.

## Referência de direção e de estilo: lemo-opuscar
O repositório [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) tem 51 estilos de filme feitos em código pelo Opus 5.5. A licença é MIT, "Copyright (c) 2026 LemoLab". O motor de render dele (canvas/WebGL quadro a quadro) **não** entra: competiria com o HyperFrames e quebraria a consistência do personagem, que vem do modelo de imagem. Entram dois textos dele, adaptados, fixados no commit `b5e8ef9` **(decisão do Claude)**.

### 1. `DIRECTOR.md` nos prompts do editor e do Revisor
- **O que entra:** um arquivo novo, `autovideo/prompts/_direcao.md`, com as partes do `DIRECTOR.md` que valem para episódio narrado vertical, adaptadas e em português:
  - som como metade do filme;
  - ritmo;
  - câmera ("todo plano precisa de um motivo");
  - atuação;
  - as falhas mais comuns;
  - a checagem antes de entregar.
- **O que fica de fora:** briefing, storyboard e "encontre uma referência primeiro". No pipeline, o roteiro e as cenas já vêm prontos.
- **Editor:** o prompt carrega `_direcao.md` como critério de decisão. Cada transição, movimento de câmera ou efeito precisa de um motivo na narração ou no `edicao` da cena, e não entra só "porque o catálogo tem".
- **Revisor:** o prompt usa a checagem de `_direcao.md` como lista do que conferir nos frames, por exemplo "plano sem motivo" e "ritmo que não segue a narração". Um problema dessa lista vira `Fix` com `role: "editor"`.
- **Cache de prompt:** `_direcao.md` entra logo depois do contexto do perfil e é igual em todas as chamadas, então não quebra o prefixo estável.
- **Como carregar:** o `options_for` hoje lê só `prompts/<role>.md`. O plano decide entre um `include` simples e a concatenação de `_direcao.md` para o editor e o Revisor.

### 2. Formato `STYLE.md` como modelo do `estilo.md` do Analista
O `estilo.md` deixa de ser texto livre e passa a seguir as seções do `STYLE.md`, adaptadas para série narrada vertical:

| Seção | O que o Analista escreve | Quem usa |
|---|---|---|
| 1. Essência e o que **não** é | o estilo numa frase e os erros que o descaracterizam | todos |
| 2. Materiais e acabamento | tipo de ilustração, textura, traço | diretor de arte (prompt de imagem) |
| 3. Lógica de cor | paleta e onde cada cor pode aparecer (no Benji, "vermelho só no alerta") | diretor de arte, editor |
| 4. Tipografia e legenda | se tem legenda e como; tipografia das telas | montagem, editor |
| 5. Qualidade do movimento | velocidade, easing, quanto se move | editor |
| 6. Gramática de câmera | planos, movimentos e quando usar cada um | diretor de arte, editor |
| 7. Paleta sonora | voz, ambiente, sfx, mixagem | voz e som, editor |
| 8. Movimentos típicos | recursos que identificam o estilo (no Benji, telas de celular longas, cortes secos, onomatopeias na arte) | diretor de arte, editor |
| 9. Armadilhas | o que costuma dar errado nesse estilo | editor, Revisor |
| 10. Espaço de variação | o que pode mudar entre episódios e perfis sem virar outro estilo | Analista (criar conversando), showrunner |

- **Seção cortada:** "Engine" (seção 10 do original), porque a engine aqui é sempre o HyperFrames.
- **Seções dos dois fluxos:** as seções 1–10 valem tanto para "analisar perfil" quanto para "criar conversando".
- **Origem da seção 10:** vem do `MY-STYLES.md`, que separa o que pode mudar sem problema, o que muda o caráter e o que transforma em outro estilo.
- **`estilo.json` não muda nesta versão:** continua com os parâmetros travados.
- **Validação:** o Analista grava as seções com os títulos fixos, e a validação do `run_role` confere se todas estão presentes.
- **Estilos existentes:** o Benji é reescrito no formato novo a partir das notas do spec principal. Um estilo antigo sem as seções continua aceito, e o editor trata como "sem orientação de motion".

### Crédito e licença
- `_direcao.md` e o modelo do `estilo.md` (no prompt do Analista) começam com um cabeçalho: "Adaptado de lemo-opuscar (github.com/lemomo-ai/lemo-opuscar, commit b5e8ef9), MIT, Copyright (c) 2026 LemoLab", seguido do texto da licença MIT.
- Um `THIRD_PARTY.md` na raiz do repositório registra a origem, o commit e a licença.
- **Só texto adaptado.** Nenhum filme, still ou asset dos demos (CC BY 4.0 e licenças de terceiros) entra no projeto.

## Guia de roteiro: `_roteiro.md` para o Roteirista e o Showrunner
Nenhuma das fontes tem uma skill de roteirista pronta. Três textos servem e viram um arquivo novo, `autovideo/prompts/_roteiro.md`, adaptado para série narrada em português e vertical. Ele entra no prompt do Roteirista e do Showrunner do mesmo jeito que o `_direcao.md` entra no editor e no Revisor: depois do contexto do perfil, sempre igual.

| Fonte | Licença | O que entra |
|---|---|---|
| `skills/hyperframes-creative/references/narration.md` (heygen-com/hyperframes, tag `v0.8.163`) | Apache-2.0 | números, horas e siglas escritos como devem ser falados; padrões da frase de abertura; ritmo de ~2,5 palavras/s (o Roteirista já usa) |
| `skills/faceless-explainer/references/story-design.md` (mesma tag) | Apache-2.0 | estratégias de gancho; técnicas retóricas nomeadas; arco emocional; estrutura `story-explainer` (preparação → tensão → virada → resolução); falas escritas em deixas curtas, uma por elemento de tela |
| lemo-opuscar `DIRECTOR.md` §3–4 (commit `b5e8ef9`) | MIT | "um assunto, um objetivo, uma virada"; gancho nos 3 primeiros segundos; final que ecoa a abertura; um momento-chave no pico emocional; cortar o que precisa de explicação; 3 estruturas candidatas antes de escolher |

**O que fica de fora:** `BRIEF.md`, storyboard para aprovação, a tabela de tipos de frame de produto e as regras de "valor antes da evidência" da `story-spine.md`, que é voltada a vídeo de produto.

### Roteirista: regras novas em `_roteiro.md`
1. **Números como se falam.** "À 9h14 da noite" vira "Às nove e catorze da noite"; "38%" vira "trinta e oito por cento"; uma sigla vira o jeito como é lida. O TTS lê ao pé da letra. A tela pode mostrar o número exato; quem escreve a tela é o diretor de arte, a partir de `cenas.json`.
2. **Gancho com estratégia nomeada nos 3 primeiros segundos.** Hora e lugar (padrão do Benji), pergunta, afirmação contraintuitiva, cenário ("imagine…"), o que está em jogo ou falar direto com o espectador. O episódio varia a estratégia em relação ao anterior, conferindo o histórico.
3. **Uma virada por episódio.** Preparação → tensão → virada → resolução parcial → gancho da próxima parte. Se tirar a virada e o episódio ainda funcionar, ele não tem história.
4. **Final que ecoa a abertura**, antes do gancho "Segue pra ver a Parte N".
5. **Falas em deixas.** Cada frase curta é uma deixa visual que o diretor de arte e o editor usam para sincronizar a tela. Combina com as frases de 2–8 palavras do Benji.
6. **Não parafrasear a sinopse em ordem.** A sinopse é a fonte do que acontece, não a ordem da narração.
7. **Cortar** qualquer trecho que precise de explicação para funcionar.

O Roteirista grava, além do roteiro, uma linha em `episodio.json`: `"gancho": "<estratégia usada>"`. O próximo episódio lê esse campo pelo histórico para variar a estratégia. É um campo opcional, então os episódios antigos continuam válidos.

### Showrunner: ao planejar a série
1. **3 estruturas candidatas para o arco**, em poucas linhas cada (por exemplo: uma noite em tempo real, uma contagem regressiva, um mistério que se resolve na última parte). Ele escolhe uma e registra o porquê no plano da série. A primeira ideia costuma ser o clichê do gênero.
2. **Logline e arco:** uma frase, depois a virada da série.
3. **Uma virada por sinopse**, e o último episódio responde ao gancho do primeiro.

O custo extra é pequeno: é texto, uma vez por série.

### Crédito e licença
- `_roteiro.md` começa com um cabeçalho de origem com as três fontes, a tag ou commit e a licença de cada uma, além do aviso de que o texto foi **modificado** (tradução e adaptação), como a Apache-2.0 pede.
- O `THIRD_PARTY.md` ganha a entrada do heygen-com/hyperframes (Apache-2.0, tag `v0.8.163`) junto com a cópia do texto da licença. O repositório não tem `NOTICE` na raiz para repassar.
- **Achado importante para o Passo 0:** no `HEAD` atual do repositório público, `skills/` não tem mais `hyperframes-creative`, `hyperframes-core` nem `faceless-explainer`, que existem na tag `v0.8.163`. Isso confirma os "removed" do `skills check`. **Subir a versão além da 0.8.163 pode tirar skills de que o editor depende.** Antes de qualquer upgrade, conferir onde elas foram parar.

## Checagem da voz por transcrição
**Problema:** o TTS erra pronúncia (números, siglas, nomes próprios) e hoje só o Revisor, olhando frames, poderia notar. Ele não ouve o áudio, então não nota.

**Como funciona** (Python, sem agente):
1. Na etapa `voz`, depois de cada áudio **novo** do ElevenLabs (os do cache já foram checados), o pipeline roda `transcribe.transcribe` no arquivo. O `doctor` já exige o modelo Parakeet no Windows.
2. Compara o texto ouvido com a `narration` da cena. Os dois são normalizados (minúsculas, sem acento, sem pontuação), e a semelhança é calculada por `difflib.SequenceMatcher` sobre as palavras (stdlib).
3. O resultado vai para a entrada da cena no `voz/cache.json`: `asr: {ratio, ouvido}`.

| Semelhança | O que acontece |
|---|---|
| ≥ 0,85 **(decisão do Claude, calibrar nos 3 primeiros episódios)** | ok |
| abaixo | gera o áudio de novo **uma vez** (o ElevenLabs não é determinístico) e checa de novo |
| abaixo de novo | **não trava o episódio.** A cena vai para `voz.json` com `asr_ok: false` e o texto ouvido, e a tarefa do Revisor passa a listar essas cenas. Se o problema for de escrita (número em algarismo, sigla), ele manda um `Fix` para o roteirista; se não, o José decide na revisão |

**Efeito colateral útil:** a transcrição já traz os tempos por palavra. Eles são gravados em `voz/<sha>.words.json`, ficam prontos para a legenda por palavra (fora do escopo hoje) e o editor pode usá-los para sincronizar efeitos com a fala.

**Tempo:** uma transcrição por cena nova, de poucos segundos cada. Algo como 1–3 min por episódio de ~40 cenas, a medir. Com cache, o reprocessamento não repete.

## Tempo e custo (estimativa, a medir)
| Etapa | Hoje | Com editor |
|---|---|---|
| montagem | segundos | igual, mais a cópia da base |
| edicao | não existe | ~3–10 min de Opus. Zero com cache válido |
| check | igual | um pouco mais lento com mais animação |
| render | X | 1,2–3× X com shader, 3D ou blur pesado |

O `decisions.log` passa a registrar a duração de cada etapa. O critério de aceite abaixo usa essas medições.

## Fora do escopo desta versão
- **Legenda por palavra (karaoke):** precisa de tempos por palavra na `Voz`, que hoje só tem `dur` por cena. O `transcribe.py` sabe gerar esses tempos. Entra quando um estilo com legenda for usado.
- `viral-clone` e o botão "Ajustar no HyperFrames": fase 2.
- Busca semântica do catálogo (`--on-device`, download de ~33 MB): só com o OK do José.
- Subir a versão além da do app.

## Verificação
- **Passo 0:** testes e `check` passam na 0.8.163, e o `doctor` mostra as skills do editor `current`.
- **Um episódio do estilo Benji com edição:**
  - pelo menos 2 transições do registry;
  - sincronia de voz idêntica à da base, conferida pelas invariantes;
  - sem legenda queimada;
  - `check` limpo.
- **Fallback forçado** (editor com orçamento quase zero): o episódio sai com a composição base, `edicao.json` diz `fallback: true` e o painel mostra isso.
- **`UsageLimit` durante a edição:** a fila pausa e retoma na etapa `edicao`, sem fallback.
- **Direção:** o `edicao.json` lista, para cada efeito ou transição aplicada, o motivo ligado à narração ou ao `edicao` da cena.
- **Estilo:** o `estilo.md` do Benji, reescrito no formato novo, passa na validação de seções. Um estilo analisado de um perfil sai com as 10 seções.
- **Licença:** `_direcao.md`, `_roteiro.md`, o prompt do Analista e o `THIRD_PARTY.md` trazem o crédito e as licenças (MIT do lemo-opuscar, Apache-2.0 do HyperFrames, com o aviso de modificação).
- **Roteiro:**
  - um episódio novo não tem números nem siglas em algarismo no `roteiro.md`;
  - o `episodio.json` traz o campo `gancho`;
  - o plano da série registra as 3 estruturas candidatas e a escolhida.
- **Voz:**
  - uma cena com "9h14" em algarismo cai abaixo do limite de semelhança;
  - ela aparece com `asr_ok: false` e entra na tarefa do Revisor;
  - um áudio já checado não é transcrito de novo;
  - os `*.words.json` são gravados.
- **Ajuste:** um pedido "transição ruim na cena N" refaz só da edição em diante. Roteiro, voz e imagens não mudam.
- **Medição em 3 episódios:**
  - tempo da edição até 10 min;
  - render até 2× o render da base;
  - custo do editor abaixo do teto.

  Se passar disso, o teto ou o limite de efeitos pesados é revisto.

## Perguntas para o José
1. A `viral-clone` (sem licença no app) pode ser usada fora do app desktop?
2. Teto de 5 dólares por edição e um efeito pesado por episódio estão bons para começar?
3. O botão "Ajustar no HyperFrames" na Revisão vale para a fase 2?
