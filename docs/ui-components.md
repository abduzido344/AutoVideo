# UI — Componentes do painel AutoVideo

**Stack:** React + Vite + Tailwind v4 + shadcn/ui + registry Kobra (`@kobra`).
**Design alvo:** visual do Lum Studio (claro, sidebar `#F3F4F6`, painel branco inset, ação preta, acento magenta `#FF4081`, Cormorant só no display). Os tokens e as telas estão em docs/superpowers/specs/2026-10-21-autovideo-series-design.md. Os tokens já estão em `web/src/index.css`, mapeados para as variáveis do shadcn.

## Regra: procure componente pronto antes de escrever
Antes de criar qualquer elemento de UI, procure nesta ordem e use o primeiro que servir:
1. **Kobra:** `npx shadcn@latest add @kobra/<nome>`. Catálogo em https://kobra.systems/components/ e lista em `https://kobra.systems/r/registry.json`.
2. **shadcn/ui base:** `npx shadcn@latest add <nome>` (https://ui.shadcn.com/docs/components).
3. **Outros registries do índice shadcn:** `npx shadcn@latest search <termo>` ou `https://ui.shadcn.com/r/registries.json`.
4. Só depois disso, escreva à mão. Ao fazer isso, registre na tabela abaixo o que foi criado e por quê.

Ao usar um componente Kobra:
- leia o `docs` do item (vem no JSON do registry);
- o painel não tem sons de interface: o `@kobra/sound` foi removido a pedido do usuário; não reinstale;
- envolva o app uma vez em `<SoundEffects>`.

## Acesso à Kobra (verificado em 2026-10-14)
O registry tem 87 itens. Sem token, só estes baixam: `video`, `sound`, `conversation`, `carousel`, `navigation-menu`, `command-menu`, `input-otp`, `halftone-dots`, `toast`* e `ai-editor`*.
\* Funcionam só com Pro, porque dependem de `alert`/`button`/`spinner` e de `streaming-text`/`orb`/`text-shimmer`, que são Pro.
Os demais 77 respondem 401 e exigem **Kobra Pro**. O token vai em `KOBRA_TOKEN`, que o `components.json` passa como header. Sem o token, use o equivalente shadcn base da coluna "Fallback".

**Instalar item free sem token:** com `@kobra` no `components.json` o shadcn exige `KOBRA_TOKEN` até para itens free (erro "requires the following environment variables"). Instale pela URL: `npx shadcn@latest add https://kobra.systems/r/<nome>.json`.

## beui (registry gratuito)
`https://beui.dev/r/<nome>.json` (catálogo: https://beui.dev/components/agents). Instale pela URL. O CLI do shadcn para no aviso "utils.ts já existe" e pode deixar de gravar os arquivos que vêm depois; confira e grave à mão os que faltarem (hooks, `lib/touch.ts`, `lib/favicon.ts`), sem sobrescrever o `lib/utils.ts` do projeto. Em uso: `prompt-input` (composer do Chat), `message` (+ `message-bubble`, `message-scroller`), `reasoning-text` (espera do Chat), `streaming-response` (invólucro da resposta do Claude, sem as ações) e `todo-list` (etapas do Onboarding). Ficam em `components/agents` e `components/motion`, ignorados pelo oxlint (código vendorizado; veja `.oxlintrc.json`). Dependência nova: `motion`. Ajustes feitos nos arquivos instalados: textos em português (`prompt-input`: "Enviar"/"Parar"; `todo-list`: rótulos).

## Estado atual do painel (`web/`)
Sem KOBRA_TOKEN na instalação. Kobra: video (player) e toast (`<Toasts />` no App; padrão de notificação do painel: `toast({ message, description?, state })`). O toast depende de `@kobra/alert`, `@kobra/spinner` e `@kobra/button`, que são Pro: `components/toast-marks.tsx` substitui os dois primeiros com ícones do lucide, o `button` é o do shadcn, e `useDirection` (base-ui) virou `document.dir`. shadcn base: sidebar (variant inset), switch, dropdown-menu, tabs, button, dialog, card, input, label, select, sheet, table, textarea, toggle-group, tooltip, progress, badge, scroll-area, separator, skeleton. Telas de série e peça: beui `message` (conversa dos agentes), `todo-list` (etapas) e `prompt-input` (pedir ajuste); Kobra `video` (player). Markdown do brief e das respostas do Chat com react-markdown. O `sidebar.tsx` exporta também o `SidebarContext`, para o cabeçalho de página saber se a sidebar está fechada sem quebrar fora do provider.

### Mapa de telas
O app tem sempre a altura da tela (`h-svh overflow-hidden` no wrapper): só a sidebar (`SidebarContent`) e o corpo de cada página rolam. Toda página usa o cabeçalho de `pages/Pagina.tsx`: ícone colorido da seção (tokens `--sec-*` no `index.css`), título, ações globais; abas; subtítulo.

| Rota | Tela | Cor |
|---|---|---|
| `#/perfis` (home) | Perfis: cards + Novo perfil | perfil (azul) |
| `#/perfil/<slug>/<aba>` | Perfil: abas Séries, Ideias, Universo, Agenda e voz (as mesmas da sidebar); ações Ativo e Gerar próximo episódio | perfil (azul) |
| `#/onboarding/<slug>` | Onboarding: chat + etapas | perfil (azul) |
| `#/producao[/<jid>]` | Produção: esteira kanban (Na fila, Produzindo, Para revisar, Prontos), filtro por perfil, Pausar/Retomar fila; `jid` abre a revisão num `sheet` à direita. `#/fila` e `#/revisao[/jid]` redirecionam para cá | produção (magenta) |
| `#/serie/<path_rel>` (urlencoded) | Série: progresso (`progress`) e custo total; cartões (`card`) por episódio com capa, status (`badge`) e custo; abre a peça | produção (magenta) |
| `#/episodio/<jid>` | Peça: coluna esquerda com etapas (`todo-list`), conversa dos agentes e Pedir ajuste; à direita abas Storyboard, Roteiro e Vídeo (Kobra `video`) | produção (magenta) |
| `#/estilos`, `#/estilo/<slug>` | Estilos: lista + análise de @; conversa do estilo | estilos (violeta) |
| `#/config/<aba>` | Configurações: Chaves API, Conexões (Claude, Codex, redes de cada perfil), Imagens | config (grafite) |

Nota: o `liquidglass` vai duas vezes no bundle: a lib vendorizada em `src/lib/liquidglass` (importada por `src/lib/glass-controls.ts`, vinda do item `video`) e a cópia interna do `loomix` (chunks `liquidglass-*.js` no build, ~51 kB cada). A deduplicação não é uma troca trivial de import (o `loomix` não exporta a lib), então ficou como está.

## Mapa: necessidade → componente
| Necessidade no painel | Kobra | Fallback (shadcn base) |
|---|---|---|
| Player do vídeo final | `video` (free) | `<video controls>` |
| Feedback ao agente / histórico de iterações | `conversation` (free), `message`, `chat-input` | `textarea` + `card` |
| Ações rápidas (novo job, aprovar, ir para job) | `command-menu` (free) | `command` |
| Fundo/estado vazio com textura | `halftone-dots` (free), `empty` | `card` |
| Conversa de onboarding / criar estilo | `conversation`, `message`, `chat-input` | `textarea` + `card` |
| Seletor de perfil, estilo e provedor | `select`, `toggle-group`, `filter-chips` | `select`, `toggle-group` |
| Fila de geração / séries / banco de ideias | `grouped-table` (por status), `table`, `item` | `table` |
| Status do episódio | `badge`, `spinner`, `progress` | `badge`, `progress` |
| Etapas do episódio (roteiro → render) | `task-list` | `progress` + lista |
| Log das chamadas de agentes (custo/tokens) | `reasoning-steps` | `scroll-area` + lista |
| Roteiro / sinopse / legenda do post | `plan-card`, `streaming-text` | `card` |
| Revisão (aprovar/ajustar/descartar) | `question-card` | `card` + `button` |
| Editar roteiro, Universo, estilo | `ai-editor` | `textarea` |
| Folha de personagem / cenas do episódio | `carousel`, `lightbox` | `dialog` + `img` |
| Notificações (job concluído/falhou) | `toast` (em uso) | — |
| Navegação / layout | `sidebar`, `tabs`, `resizable`, `scroll-area` | iguais no shadcn |
| Modais / painéis | `dialog`, `sheet`, `drawer`, `tooltip`, `kbd` | iguais no shadcn |
| Capas e frames de revisão | `lightbox`, `carousel` (free) | `dialog` + `img` |

## Componentes escritos à mão
| Componente | Motivo |
|---|---|
| `components/AppSidebar.tsx` | Composição da `sidebar` do shadcn (variant inset, 252px): wordmark + `SidebarTrigger`, `select` de perfil, `dropdown-menu` do botão Criar, grupo do perfil (Séries, Ideias, Universo, Agenda e voz, ou Continuar onboarding) e grupo geral (Produção com contagem, Estilos, Configurações) |
| `components/secoes.ts` | Cores, ícones lucide e abas do perfil compartilhados entre a sidebar e os cabeçalhos; não é componente |
| `pages/Pagina.tsx` | Casca de página do Lum: cabeçalho fixo (ícone colorido 28px, título 22px, ações; abas `tabs` ligadas à rota; subtítulo), corpo que rola sozinho, `SidebarTrigger` para reabrir quando a sidebar está fechada ou no mobile; label de seção 11px |
| `components/ConnectClaude.tsx` | Composição do `dialog` do shadcn: janela "Conectar o Claude" (status da conta, botão que abre o terminal com `claude auth login`, comando para copiar); Kobra não tem modal grátis |
| `components/Chat.tsx` | Conversa com o agente, montada com o beui (`message`, `prompt-input`, `reasoning-text`, `streaming-response`; Kobra `conversation`/`chat-input` exigem Pro). Escrito à mão: o hook `useRevelar`, que só anima a revelação palavra a palavra da resposta que acabou de chegar (a API não faz streaming; o `streaming-response` do beui não traz efeito de texto), e a lista de frases de espera por tipo de chat |
| `components/SeletorVoz.tsx` | Seletor de voz do perfil (Agenda e voz e Onboarding): `select` do shadcn com as vozes de `/api/vozes`, botão ▶ com `<audio>` para a prévia, aviso com link quando falta a chave da ElevenLabs |
| `components/FolhaPersonagem.tsx` | Card do personagem (ficha, imagem da folha, gerar/aprovar); composição de `card` + `button`, sem equivalente pronto |
| `pages/Perfis.tsx`, `pages/Onboarding.tsx` | Telas: cards de perfil + `dialog` de Novo perfil; chat + painel de etapas |
| `pages/Perfil.tsx`, `pages/Estilos.tsx` | Telas: `tabs` + `card` + `input`/`textarea`; `<select>` nativo na Agenda (estilo); dialog "Novo estilo" abre a conversa (`Chat` kind estilo) |
| `pages/Producao.tsx` | Tela: esteira kanban à mão (colunas = `section` com rolagem própria, cartões `card`, barra curta de etapas; Kobra `task-list`/`grouped-table` exigem Pro); erro truncado em 2 linhas + `dialog` "ver detalhes"; revisão (Kobra `video` + `card` + `textarea`) num `dialog` do shadcn |
| `pages/Configuracoes.tsx` | Tela com `tabs` (Chaves API, Conexões, Imagens): `input` para as chaves, `card` de Claude/Codex e de contas de cada perfil, `select` de provedor; Salvar por aba |
| `components/Storyboard.tsx` | Cenas do episódio com status de geração (imagem, celular, narração); nenhum registry tem storyboard de cenas com status de geração |
| `components/ConversaAgentes.tsx` | Decisões e custo de cada chamada de agente; composição do beui `message` (+ bubble), sem equivalente pronto para log de agentes |
| `pages/Serie.tsx`, `pages/Peca.tsx`, `lib/etapas.ts` | Telas de série e peça (`card`, `badge`, `progress`, `tabs`); `etapas.ts` guarda ETAPAS, STATUS e `usd` compartilhados; não é componente |
| `components/toast-marks.tsx` | Substitui `@kobra/alert` e `@kobra/spinner` (Pro) no toast, com ícones do lucide |
