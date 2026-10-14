# AutoVideo

- Spec: `docs/superpowers/specs/2026-10-14-autovideo-design.md`. Plano do M1: `docs/superpowers/plans/2026-10-14-autovideo-m1.md`.
- **UI (painel em `web/`):** React + Vite + Tailwind v4 + shadcn/ui + registry Kobra (`@kobra`), com design minimalista.
  **Regra:** antes de escrever qualquer componente de UI, procure um pronto na ordem Kobra → shadcn base → outros registries do índice shadcn, seguindo `docs/ui-components.md`. Se nada servir e você escrever à mão, registre o componente nesse doc.
- **Vídeo/motion:** HyperFrames (`npx --yes hyperframes@0.8.158`). Antes de criar um efeito, bloco ou legenda à mão, procure no catálogo (`hyperframes catalog`).
- Não implemente login claude.ai. A auth vem do Claude Code local ou de `ANTHROPIC_API_KEY`.
