# AutoVideo

- **Rumo atual:** fábrica local de séries narradas em vídeo vertical, multi-perfil, com revisão antes de postar. Spec: `docs/superpowers/specs/2026-10-21-autovideo-series-design.md`. O fluxo antigo de edição de gravação (M1) saiu do escopo; o código dele só é removido ou reaproveitado conforme o plano do novo rumo.
- **Agentes:** um Diretor orquestra subagentes de função única. O bastão passa por arquivo, nunca por contexto: cada subagente nasce limpo, grava o artefato e devolve um recibo curto. O Diretor não lê artefatos pesados, e o Revisor é um subagente separado.
- **UI (painel em `web/`):** React + Vite + Tailwind v4 + shadcn/ui + registry Kobra (`@kobra`). O visual alvo é o do Lum Studio (claro, ação preta, acento magenta `#FF4081`); os tokens estão no spec.
  **Regra:** antes de escrever qualquer componente de UI, procure um pronto na ordem Kobra → shadcn base → outros registries do índice shadcn, seguindo `docs/ui-components.md`. Se nada servir e você escrever à mão, registre o componente nesse doc.
- **Vídeo/motion:** HyperFrames (`npx --yes hyperframes@0.8.158`). Antes de criar um efeito, bloco, tela de celular ou legenda à mão, procure no catálogo (`hyperframes catalog`).
- **Auth:** tudo roda no login do Claude da máquina (Claude Code local) ou em `ANTHROPIC_API_KEY`. Não implemente login claude.ai. Nenhuma integração (ex.: Headroom) pode exigir API key no lugar do login.
- **Nunca postar sem aprovação** do usuário, em nenhum modo.
