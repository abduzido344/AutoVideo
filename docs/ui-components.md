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
- mantenha os atributos `data-slot`/`data-sound`, que alimentam a camada de som;
- envolva o app uma vez em `<SoundEffects>`.

## Acesso à Kobra (verificado em 2026-10-14)
O registry tem 87 itens. Sem token, só estes baixam: `video`, `sound`, `conversation`, `carousel`, `navigation-menu`, `command-menu`, `input-otp`, `halftone-dots`, `toast`* e `ai-editor`*.
\* Funcionam só com Pro, porque dependem de `alert`/`button`/`spinner` e de `streaming-text`/`orb`/`text-shimmer`, que são Pro.
Os demais 77 respondem 401 e exigem **Kobra Pro**. O token vai em `KOBRA_TOKEN`, que o `components.json` passa como header. Sem o token, use o equivalente shadcn base da coluna "Fallback".

**Instalar item free sem token:** com `@kobra` no `components.json` o shadcn exige `KOBRA_TOKEN` até para itens free (erro "requires the following environment variables"). Instale pela URL: `npx shadcn@latest add https://kobra.systems/r/<nome>.json`.

## Estado atual do painel (`web/`)
Sem KOBRA_TOKEN na instalação. Kobra: video (player), sound (<SoundEffects>) e toast (`<Toasts />` no App; padrão de notificação do painel: `toast({ message, description?, state })`). O toast depende de `@kobra/alert`, `@kobra/spinner` e `@kobra/button`, que são Pro: `components/toast-marks.tsx` substitui os dois primeiros com ícones do lucide, o `button` é o do shadcn, e `useDirection` (base-ui) virou `document.dir`. shadcn base: sidebar (variant inset), switch, dropdown-menu, tabs, button, dialog. Markdown do brief com react-markdown.

Nota: o `liquidglass` vai duas vezes no bundle: a lib vendorizada em `src/lib/liquidglass` (importada por `src/lib/glass-controls.ts`, vinda do item `video`) e a cópia interna do `loomix` (chunks `liquidglass-*.js` no build, ~51 kB cada). A deduplicação não é uma troca trivial de import (o `loomix` não exporta a lib), então ficou como está.

## Mapa: necessidade → componente
| Necessidade no painel | Kobra | Fallback (shadcn base) |
|---|---|---|
| Player do vídeo final | `video` (free) | `<video controls>` |
| Sons de interação | `sound` (free) | — |
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
| `components/AppSidebar.tsx` | Composição da `sidebar` do shadcn (variant inset, 252px) com wordmark, `select` de perfil, `dropdown-menu` do botão Criar, links Fila/Revisão (contagem)/Estilos/Configurações; inclui o `TopBar` (`SidebarTrigger`) |
| `pages/Pagina.tsx` | Casca de página do Lum (header sticky, título 22px, label de seção 11px); layout puro, sem componente equivalente |
| `components/ConnectClaude.tsx` | Composição do `dialog` do shadcn: janela "Conectar o Claude" (status da conta, botão que abre o terminal com `claude auth login`, comando para copiar); Kobra não tem modal grátis |
| `components/Chat.tsx` | Conversa com o agente: `conversation`/`chat-input` da Kobra dependem de Pro (sem token); fallback do mapa: `card` + `textarea` com bolhas simples |
| `components/FolhaPersonagem.tsx` | Card do personagem (ficha, imagem da folha, gerar/aprovar); composição de `card` + `button`, sem equivalente pronto |
| `pages/Perfis.tsx`, `pages/Onboarding.tsx` | Telas: cards de perfil + `dialog` de Novo perfil; chat + painel de etapas |
| `components/StatusPill.tsx` | Pílula de status do doctor; `badge` do shadcn não tem o estado "verificando" com ponto |
