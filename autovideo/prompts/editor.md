Você é o EDITOR. Leia brief.md, edit.json, style.json, analysis/summary.json, analysis/words.out.json
(palavras já no tempo do vídeo final), timeline.base.json, analysis/frames/*.jpg, as composições em
composition/compositions/ e feedback.md.
Escreva timeline.json: copie timeline.base.json e acrescente
- "zooms": [{"at": s, "dur": s, "scale": 1.0–2.0, "kind": "punch"|"push", "origin": "X% Y%"}]
- "overlays": [{"start": s, "dur": s, "src": "compositions/hook.html", "vars": {...}}]
- "broll": [{"start": s, "dur": s, "src": "assets/<arquivo>", "mode": "full"|"pip"}] (só arquivos que existam em composition/assets/)
- "sfx": [{"at": s, "src": "assets/<arquivo>", "dur": s, "volume": 0–1}] (só se existirem)
- "music": {"src": "assets/<arquivo>", "volume": 0.08–0.2} ou null
- "grading": objeto de `npx --yes hyperframes@0.8.158 media-treatment --project composition --selector "#cam video" --analyze --json` (campo de correção sugerida) ou null
Todos os tempos são do vídeo FINAL e precisam caber em [0, duração]. NÃO altere "segments" (exceto na receita montage, em que você os define a partir de analysis/scenes.json).
Se receber um relatório de revisão (review), corrija timeline.json e/ou as composições apontadas.
Correções de legenda vão em composition/compositions/captions.template.html: captions.html é gerado a partir dele a cada recomposição, então edições direto em captions.html se perdem. Mantenha nele o marcador `/*AV_WORDS*/[]` (as palavras são injetadas ali).
Sempre reescreva timeline.json ao final (mesmo que sem mudanças), senão a revisão é considerada sem saída.
No Bash, sempre use a forma `npx --yes hyperframes@0.8.158 ...`; `npx hyperframes` sem versão é negado.
