# AutoVideo — Fábrica de séries (design)

**Status:** aprovado em 2026-10-21 ("Pode desenvolver"). As 3 perguntas finais ficaram sem resposta e foram fechadas com os padrões propostos, marcados como decisão do Claude.
**Substitui:** o design do M1 (`2026-10-14-autovideo-design.md`, edição de vídeo gravado) e o painel v2 (`2026-10-15-painel-v2-design.md`). Os dois saíram do repositório e continuam no histórico do git.

Neste documento, **(decisão do Claude)** marca o que o José não decidiu explicitamente. O resto foi decidido por ele na conversa.

## Intenção
O José quer uma fábrica local de **séries narradas em vídeo vertical** que roda todo dia sozinha e só pede a aprovação dele antes de postar. Cada episódio sai pronto para Shorts, TikTok, Reels e Facebook.

A referência é o perfil @manualdobenji. O episódio 1 passou de 2,6 mi de views em dois dias. O formato é:
- terror de apocalipse zumbi, com narração em 2ª pessoa no presente e frases curtas ("Então você vai até a janela...");
- 2,5–3 min por episódio, em partes e capítulos;
- **um personagem fixo** (gorro, cachecol, jaqueta clara) em ilustrações escuras e chuvosas, com movimento lento de câmera;
- **telas de celular falsas** em motion: grupo do condomínio, alerta da Defesa Civil, bateria;
- onomatopeias desenhadas na imagem ("BIIIP!", "PLIC"), sem legenda queimada;
- cada episódio termina com o gancho "Segue pra ver a Parte N".

**Por quê:** um perfil assim rende muito alcance com pouco trabalho humano, desde que a produção seja automática e consistente. Com vários perfis e assuntos, o mesmo motor serve vários nichos.

## Objetivos
1. **Multi-perfil.** Cada perfil tem assunto, estilo, Universo, banco de ideias, agenda e contas próprios.
2. **Estilos reutilizáveis**, criados de duas formas: analisando um perfil de referência ou conversando com um agente Claude, sem precisar de perfil.
3. **Onboarding** guiado por agente para montar um perfil: assunto, estilo, personagens, mundo, arco e redes.
4. **Produção autônoma de episódios** por uma equipe de subagentes com handoff por arquivo e economia de tokens.
5. **Ciclo diário contínuo:** ideia → série com N episódios → fila → revisão → postagem → próxima série.
6. **Revisão obrigatória** antes de qualquer postagem.
7. **Saída:** Exportar (vídeo + legenda) sempre disponível; postagem automática nas redes que estiverem conectadas.

## Fora do escopo
- Editar vídeo gravado (o fluxo do M1: talking head, tela, montagem). Sai do produto.
- Login claude.ai próprio (ver Auth).
- Hospedagem em nuvem ou multiusuário. É um app local de uma pessoa.
- Vídeo generativo (Seedance, Kling etc.) como fonte das cenas. Fica para depois; as cenas são imagens com movimento de câmera.
- Loop de analytics que realimenta temas e ganchos. Fica para depois.

## Anti-objetivos (falha mesmo que "funcione")
- **Postar sem aprovação.** Nunca, em nenhum modo.
- **Personagem inconsistente** entre cenas ou episódios: rosto, roupa ou proporções mudando.
- **Queimar a assinatura:** gerar episódios em paralelo, ou um agente acumulando o contexto de todo o pipeline.
- **Clonar o Benji.** Do Benji se extrai só o *estilo* (ritmo, narração, tratamento visual, recursos de motion). O personagem, o mundo e as histórias de cada perfil são originais.

## Conceitos
| Termo | O que é | Onde vive |
|---|---|---|
| **Perfil** | Uma "conta" de conteúdo: nome, assunto, público, estilo, Universo, agenda, contas conectadas | `perfis/<slug>/perfil.json` |
| **Estilo** | Receita reutilizável de formato: narração, ritmo, duração, tratamento visual, recursos de motion, som, legenda sim/não. Um estilo serve vários perfis | `estilos/<slug>/estilo.md` + `estilo.json` |
| **Universo** | Personagens (com folha de referência visual), mundo, regras da história e o registro do que já aconteceu | `perfis/<slug>/universo/` |
| **Série** | Arco fechado de N episódios (padrão 3, máximo 10), planejado ao ser criado | `perfis/<slug>/series/<n>-<slug>/` |
| **Episódio** | Uma unidade produzida, revisada e postada | `.../series/<s>/ep<NN>/` |
| **Banco de ideias** | Ideias de série do perfil, escritas pelo José ou geradas pelo Claude | `perfis/<slug>/ideias.json` |

Todos os caminhos ficam dentro de `AUTOVIDEO_HOME` (fora do repositório, como hoje). O formato exato dos arquivos fica para o plano.

## Auth e economia de tokens
- **Tudo roda no login do Claude da máquina** (`claude auth login`), herdado pelo Claude Agent SDK: agentes, subagentes e HyperFrames. `ANTHROPIC_API_KEY` continua como alternativa. O app **não implementa login claude.ai**; a regra continua no `CLAUDE.md`.
- **Headroom** (headroomlabs-ai/headroom, proxy de compressão de contexto): opcional e **desligado por padrão**.
  - Só entra se repassar o login do Claude sem pedir API key.
  - Liga com `ANTHROPIC_BASE_URL` apontando para o proxy, passado nas opções dos subagentes.
  - Antes de ligar por padrão, um spike mede a economia num episódio real no Windows.
  - Telemetria desligada com `HEADROOM_BEACON=off`.
- A economia principal vem da arquitetura (abaixo), não do Headroom.

## Equipe de agentes (produção de um episódio)
O **Diretor** é o orquestrador. Ele dispara subagentes, cada um com uma função, uma skill e ferramentas restritas.

**Regras de handoff:**
1. **O bastão passa por arquivo, não por contexto.** Cada subagente nasce limpo e recebe só a tarefa, os caminhos dos arquivos de entrada (estilo, Universo, saída do passo anterior) e a sua skill. Ele grava o resultado na pasta do episódio e devolve um **recibo curto**: status, caminhos e no máximo algumas linhas de resumo.
2. **O Diretor nunca lê os artefatos pesados** (roteiro inteiro, imagens, áudio, logs de render). Ele decide só com base nos recibos, e o contexto dele fica pequeno do início ao fim.
3. **O Revisor é um subagente, não o Diretor.** Ele abre só o que precisa conferir e devolve um veredito curto, "ok" ou uma lista de correções com o responsável de cada uma. O Diretor reencaminha a correção ao subagente responsável, com limite de iterações por episódio (sugestão: 2).
4. **Modelo por função** **(decisão do Claude):** o modelo mais forte só no Roteirista, no Revisor e no planejamento da série; modelos mais baratos nas funções mecânicas (prompts de imagem, montagem, legenda do post).
5. **Prefixo estável para o cache:** estilo e Universo entram primeiro e sempre iguais no prompt de cada subagente.
6. **Retomável:** cada etapa grava seu artefato e um marcador de concluída, como os `.stages/*.ok` de hoje. Uma interrupção recomeça na etapa que falhou.

**Funções:**
| Subagente | Entrada | Saída |
|---|---|---|
| Roteirista | estilo, Universo, sinopse do episódio, o que já foi ao ar | roteiro narrado do episódio + legenda/hashtags do post |
| Diretor de arte | roteiro, estilo, folhas de personagem | lista de cenas: tipo (imagem ou tela em motion), prompt, trecho da narração, movimento de câmera, onomatopeia |
| Gerador de imagens | lista de cenas + referências do personagem | uma imagem por cena de imagem |
| Motion | cenas do tipo tela (chat, alerta, bateria etc.) | blocos HyperFrames dessas telas |
| Voz e som | roteiro, estilo | narração (TTS) com tempos por palavra + efeitos sonoros e trilha |
| Montador | tudo acima | composição HyperFrames 9:16 renderizada (`final.mp4`, capa) |
| Revisor | roteiro, cenas, frames do render | veredito + correções endereçadas |

**Editor (adendo):** uma etapa `edicao` entre a montagem e o render, com fallback para a montagem determinística. Ver `2026-10-21-agente-editor-design.md`.

**Fora do episódio** existem mais dois agentes:
- **Showrunner:** cria ideias para o banco e planeja a série (arco com N sinopses).
- **Analista de estilo:** extrai um estilo de um perfil ou conduz a conversa de criação de estilo.

## Imagens e personagem
- **Provedor plugável**, escolhido nas configurações: **Higgsfield** ou **OpenRouter** (modelos de imagem). **O primeiro implementado é o OpenRouter** (`OPENROUTER_API_KEY`, HTTP direto do backend); o Higgsfield entra como segundo provedor **(decisão do Claude)**.
- **Teto por episódio:** limite de imagens por episódio nas configurações (padrão 40); o custo de cada geração vai para o log **(decisão do Claude)**.
- **Consistência:** no onboarding gera-se uma **folha de personagem** (vários ângulos e expressões, fundo neutro), na técnica que o Higgsfield ensina. O José aprova a folha. Depois, toda geração de cena usa a folha como imagem de referência.
- Formato 9:16. O movimento de câmera (zoom, pan) é feito no HyperFrames sobre a imagem estática.

## Voz, som e motion
- **TTS:** ElevenLabs, com voz escolhida por perfil **(decisão do Claude)**. Os tempos por palavra para sincronizar os cortes vêm da API de TTS ou de `hyperframes transcribe` sobre o áudio gerado.
- **SFX e trilha:** pela skill `media-use` / catálogo HyperFrames antes de qualquer coisa feita à mão.
- **Telas de celular:** blocos HyperFrames reutilizáveis (chat de grupo, alerta de emergência, bateria/relógio, notificação), parametrizados por texto. Antes de criar um bloco, procurar no catálogo (`hyperframes catalog`).
- **Legenda queimada:** definida pelo estilo. O estilo Benji não tem.

## Estilos
**A) Analisar perfil:**
1. Baixa os vídeos recentes do perfil (Apify Instagram scraper, com token do usuário nas configurações) **(decisão do Claude)**.
2. Extrai frames e transcreve com `hyperframes transcribe`.
3. O Analista lê tudo com visão e escreve `estilo.md` (descrição para os agentes) e `estilo.json` (parâmetros travados: duração alvo, ritmo de corte, formato, legenda sim/não, paleta, tipos de tela em motion, padrão de gancho).

**B) Conversar:** o Analista entrevista o José (tom, ritmo, visual, duração, recursos) e produz os mesmos dois arquivos.

Na primeira versão, a análise de perfil cobre **só Instagram**; TikTok e YouTube ficam para depois **(decisão do Claude)**.

O primeiro estilo, **"Benji"**, nasce destas notas, tiradas em 2026-10-21 dos 2 Reels do perfil (ep. 1 e ep. 3, 720×1280, 30 fps, 153 s e 179 s). Os arquivos baixados ficaram num scratchpad temporário; se a implementação precisar deles, baixa de novo pelo fluxo A.
- **Narração:** voz masculina grave, 2ª pessoa, presente, frases de 2–8 palavras. Abre com hora e lugar ("À 9h14 da noite, o temporal derruba a luz do bairro inteiro"). Alterna fato seco e virada ("Mas às 3h47, todos os celulares do prédio gritam ao mesmo tempo"). Tem falas de terceiros entre aspas ("Socorro! Alguém abre esse portão!").
- **Imagem:** ilustração 2D estilo cartoon, personagem de cabeça grande e olhos-ponto. Paleta azul-petróleo escura, com luz quente só em velas e janelas e vermelho só no alerta. Planos: geral do apartamento, close no personagem, plongée da rua 9 andares abaixo, detalhe (torneira pingando).
- **Telas em motion:** chat do grupo "Condomínio · Moradores" (nome + número do apto, áudio, vídeo), tela de bloqueio com relógio grande e card vermelho "ALERTA EXTREMO / Defesa Civil", tela de bateria (38%, modo avião). Ficam vários segundos na tela enquanto a narração lê.
- **Ritmo:** uma imagem por frase ou duas, com zoom/pan lento; cortes secos; sem legenda queimada; onomatopeias desenhadas na arte.
- **Post:** legenda começa com a pergunta do gancho ("Se a cidade apagasse hoje… você ficaria no apartamento?"), resume a tensão em linhas curtas, traz "PARTE N — TÍTULO" e "Segue pra ver a Parte N+1", e termina com hashtags do perfil e do gênero.

## Onboarding de um perfil
Conduzido por agente, em etapas. Cada etapa grava seu resultado e pode ser retomada:
1. Nome, assunto e público.
2. Estilo: escolher um existente, analisar um perfil ou criar conversando.
3. Personagens: descrição → folha de personagem gerada → aprovar ou pedir ajuste.
4. Mundo e regras da história (o Universo).
5. Primeiras ideias de série (opcional; se vazio, o Claude cria).
6. Agenda e contas (as duas podem ficar para depois).

## Ciclo diário, fila e agendador
- **Configurações por perfil:** episódios por dia (padrão 1), horário de gerar, horários de postar e N episódios por série (padrão 3, máximo 10).
- **Ciclo:**
  1. Sem série ativa → o Showrunner pega a próxima ideia do banco, ou cria uma.
  2. O Showrunner planeja o arco com N sinopses.
  3. Os episódios entram na fila.
  4. Quando a série termina, o ciclo volta ao passo 1. O Universo continua entre as séries.
- **Roteiro just-in-time:** o arco é planejado de uma vez, mas o roteiro completo de cada episódio só é escrito quando ele vai ser produzido, a partir da sinopse e do que realmente foi ao ar antes. Ajustes num episódio repercutem nos seguintes.
- **Ordem:** o episódio N+1 só é produzido depois que o N é **aprovado**. Aprovado conta como "foi ao ar" para a continuidade, e uma revisão parada para a fila daquela série **(decisão do Claude)**.
- **Descartar:** o Showrunner reescreve a sinopse daquele mesmo episódio com outra abordagem, mantendo a numeração e o arco, e ele volta para a fila **(decisão do Claude)**.
- **Gancho:** todo episódio termina chamando o próximo, menos o último da série.
- **Fila de geração:**
  - **um episódio por vez**, nunca em paralelo, em todo o app;
  - **Pausar/Continuar** a fila inteira ou uma série;
  - se a assinatura bater no limite de uso, a geração **pausa sozinha** e retoma da etapa onde parou quando o limite liberar;
  - o painel mostra a etapa atual de cada episódio.
- **O app precisa estar aberto** para gerar e postar: é o processo `autovideo serve`, onde vivem a fila e o agendador. Não há bandeja, autostart nem app empacotado nesta versão. Um horário perdido com o app fechado é executado na próxima vez que ele abrir, e um post perdido vai para o próximo horário livre **(decisão do Claude)**. Com o computador desligado, nada acontece; isso é aceito no escopo.

## Revisão e saída
- Todo episódio pronto entra na **fila de revisão** com vídeo, capa, legenda e hashtags.
- **Ações:**
  - **Aprovar**;
  - **Pedir ajuste** (texto livre; o Diretor encaminha ao responsável e reproduz só dali em diante);
  - **Descartar**.
- **Não aprovado a tempo:** não posta. O episódio espera e o horário seguinte é usado depois da aprovação **(decisão do Claude)**.
- **Exportar:** sempre disponível. Baixa o vídeo e copia legenda + hashtags. O José pode marcar o episódio como postado.
- **Postagem automática:** cada perfil conecta YouTube, TikTok, Instagram e Facebook, uma rede por vez. Episódio aprovado sai no horário só nas redes conectadas, e dá para misturar automático e manual.
  - A interface não chama nada de "opcional".
  - O caminho técnico (APIs oficiais diretas ou Postiz self-hosted) fica para o plano.
  - Restrições conhecidas:
    - TikTok exige app auditado para post público.
    - Instagram e Facebook exigem conta profissional ligada a uma Página.
    - YouTube tem cota diária de upload.
  - Primeiro sai o Exportar e a estrutura de contas; cada rede liga quando passar na aprovação da plataforma.

## Interface
- **Stack igual:** React + Vite + Tailwind v4 + shadcn/ui + Kobra, com a regra de `docs/ui-components.md` (procurar pronto antes de escrever).
- **Visual do Lum Studio** (`../Claude/Projects/fluwe/clientes/renatha/lum-ai`, `.superdesign/design-system.md` e `frontend/src/style.css`). Só o visual: o código de lá é Vue.
  - **Tokens:** canvas/surface `#FFFFFF`, surface-muted `#F3F4F6`, ink `#0A0A0A`, ink-muted `#716C63`, hairline `#E5E7EB`, ação preta (`#0A0A0A`, hover `#2A2927`), acento magenta `#FF4081`.
  - **Tipos:** sans do sistema na interface, Cormorant Garamond só para display/wordmark, Geist Mono para números.
  - **Raios:** control 10, panel 12.
  - **Layout:** sidebar clara `#F3F4F6` (~252px) com seletor de perfil e botão **Criar** preto; conteúdo num painel branco *inset* com borda hairline; header de página sticky; label de seção em 11px uppercase com tracking.
- **Telas** (detalhes e mockups ficam para o plano):
  1. Perfis: lista e seletor na sidebar;
  2. Onboarding;
  3. Perfil, com Séries, Banco de ideias, Universo, Agenda e Contas;
  4. Estilos: lista, analisar perfil, criar conversando;
  5. Fila: o que está gerando, pausar/continuar;
  6. Revisão: player, legenda, aprovar/ajustar/descartar, Exportar.
- **"Conectar o Claude"** (dialog + toast, já existente) continua.

## O que acontece com o código do M1 (decisão do Claude)
Nada é apagado antes do plano. O plano decide o que sai e o que fica. Ponto de partida:
- **Reaproveitar:**
  - `jobs.py`: etapas retomáveis, marcadores, gates;
  - `hf.py`: chamadas ao HyperFrames;
  - `render.py`: check, snapshots, render, capa;
  - `media.py`: probe, loudness, frames;
  - `transcribe.py`: tempos por palavra;
  - `agents.py`: `run_role`, opções do SDK e skills;
  - `doctor.py`, `project.py`, `server.py` (base FastAPI, segurança de host);
  - `web/`: shell, ConnectClaude, toasts.
- **Sai:**
  - fluxo de edição de gravação (`pipeline.py` atual, `autovideo edit`);
  - `timeline.py` (cortes, remap);
  - `recipes/*.yaml` e `autovideo/prompts/*` do M1;
  - `NewVideo`, `Transcript`, `Timeline` do painel.

## Verificação
- Um perfil criado pelo onboarding com o estilo Benji, um personagem original com folha aprovada e um Universo.
- Uma série de 3 episódios produzida de ponta a ponta pela fila, um por vez:
  - personagem reconhecível em todas as cenas;
  - telas de celular em motion;
  - narração sincronizada;
  - 9:16, 2–3 min, ganchos corretos.
- O contexto do Diretor fica pequeno durante um episódio inteiro, medido pelo log de custo/tokens por chamada (o `decisions.log` de hoje).
- Pausar/continuar e a retomada após interrupção funcionam.
- Revisão: pedir ajuste numa cena refaz só dali em diante; aprovar sem conta conectada deixa o Exportar disponível.
- A postagem automática **não** é critério de aceite desta versão: o José ainda não tem as contas criadas e as plataformas exigem aprovação. O aceite é o Exportar e a estrutura de contas. Cada rede entra como fase seguinte, quando houver conta e aprovação.
