# UI — Componentes do painel AutoVideo

**Stack:** React + Vite + Tailwind v4 + shadcn/ui + registry Kobra (`@kobra`).
**Design:** claro e limpo no estilo Kimi (shell #F7F7F7, cartão branco, Inter, preto para ação, azul #2F6BFF só para estado); tokens em web/src/index.css. Spec: docs/superpowers/specs/2026-10-15-painel-v2-design.md.

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
Sem KOBRA_TOKEN na instalação. Kobra: video (player) e sound (<SoundEffects>). shadcn base: sidebar (variant inset), switch, dropdown-menu, tabs, button, sonner. Markdown do brief com react-markdown.

Nota: o `liquidglass` vai duas vezes no bundle: a lib vendorizada em `src/lib/liquidglass` (importada por `src/lib/glass-controls.ts`, vinda do item `video`) e a cópia interna do `loomix` (chunks `liquidglass-*.js` no build, ~51 kB cada). A deduplicação não é uma troca trivial de import (o `loomix` não exporta a lib), então ficou como está.

## Mapa: necessidade → componente
| Necessidade no painel | Kobra | Fallback (shadcn base) |
|---|---|---|
| Player do vídeo final | `video` (free) | `<video controls>` |
| Sons de interação | `sound` (free) | — |
| Feedback ao agente / histórico de iterações | `conversation` (free), `message`, `chat-input` | `textarea` + `card` |
| Ações rápidas (novo job, aprovar, ir para job) | `command-menu` (free) | `command` |
| Fundo/estado vazio com textura | `halftone-dots` (free), `empty` | `card` |
| Upload de gravações, roteiro e assets | `magnetic-dropzone`, `attachment` | `input type=file` |
| Escolha de receita e formato | `select`, `toggle-group`, `filter-chips` | `select`, `toggle-group` |
| Lista de jobs | `grouped-table` (por status), `table`, `item` | `table` |
| Status do job | `badge`, `spinner`, `progress` | `badge`, `progress` |
| Etapas do pipeline (ingest → post) | `task-list` | `progress` + lista |
| Log de decisões dos agentes (`decisions.log`) | `reasoning-steps` | `scroll-area` + lista |
| Brief do diretor / post | `plan-card`, `streaming-text` | `card` |
| Gate de aprovação (aprovar/rejeitar) | `question-card` | `card` + `button` |
| Editar roteiro/brief no painel | `ai-editor` | `textarea` |
| timeline.json / edit.json | `code-block`, `file-diff` (diff entre versões) | `pre` |
| Notificações (job concluído/falhou) | `toast` | `sonner` |
| Navegação / layout | `sidebar`, `tabs`, `resizable`, `scroll-area` | iguais no shadcn |
| Modais / painéis | `dialog`, `sheet`, `drawer`, `tooltip`, `kbd` | iguais no shadcn |
| Capas e frames de revisão | `lightbox`, `carousel` (free) | `dialog` + `img` |

## Componentes escritos à mão
| Componente | Motivo |
|---|---|
| `components/workspace/Timeline.tsx` | Faixas do timeline.json (vídeo/zoom/overlays/legendas/música/sfx); clicáveis só depois do render final (antes é só leitura, com dica); não há timeline de vídeo em Kobra, shadcn nem nos registries do índice |
| `components/workspace/StageBar.tsx` | Barra segmentada das 13 etapas do pipeline; Kobra `task-list` é Pro e o `progress` do shadcn é uma barra contínua só |
| `components/workspace/Transcript.tsx` | Transcrição com fillers/pausas riscados; texto corrido, sem componente equivalente |
| `components/workspace/ActionBox.tsx` | Caixa de aprovar/pedir ajustes com chips de feedback; Kobra `question-card` é Pro |
| `components/workspace/DetailTabs.tsx` | Composição (não é primitivo novo): `tabs` do shadcn + `react-markdown` para brief, revisão e post |
| `components/AppSidebar.tsx` | Composição da `sidebar` do shadcn (variant inset) com a lista de projetos e estado; inclui o `TopBar` (`SidebarTrigger`) |
| `components/StatusPill.tsx` | Pílula de status do doctor; `badge` do shadcn não tem o estado "verificando" com ponto |
