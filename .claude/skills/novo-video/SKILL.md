---
name: novo-video
description: Começa um vídeo novo de um canal perguntando o formato (longo 16:9 ou short 9:16) e seguindo a skill certa. Use para "novo vídeo", "próximo episódio", "fazer um short".
---

# Novo vídeo

Uma chamada de AskUserQuestion com:
- **Canal**: as pastas de `canais/` (menos `_modelo`).
- **Formato**: Longo 16:9 (~8 min) · Short 9:16 (30–90 s) · Short 3D.
- **Ideia**: próxima de `ideias.md` · pesquisar novas · trecho forte de um longo (só short) · outra.

Antes, `python sistema/pipeline/ep.py canais/<canal>` mostra o que está parado (terminar antes de abrir outro). Depois seguir `video-longo`, `video-vertical` ou `video-3d` (canal 3D) a partir da etapa certa; trecho de um longo = `corte.py` (em `video-vertical`). Número da pasta: próximo `NNN` livre em `videos/` ou `shorts/`. Com a ideia escolhida, a produção segue a skill `producao`.
