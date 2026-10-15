# AutoVideo

Roteiro + gravação → vídeo editado, com uma equipe de agentes Claude: diretor, copywriter, designer e editor.
Render feito com [HyperFrames](https://github.com/heygen-com/hyperframes).

## Requisitos
- Python 3.11+ e [uv](https://docs.astral.sh/uv/)
- Node 22+
- FFmpeg 7 (`ffmpeg` e `ffprobe` no PATH)
- Claude Code instalado (`claude --version`)

No Windows não há whisper-cpp: a transcrição usa o modelo Parakeet (ver Setup).

## Autenticação
O AutoVideo não tem login próprio. Ele usa o Claude Agent SDK, que herda a autenticação do Claude Code da sua máquina:
- **Uso pessoal:** `claude login` com a sua assinatura.
- **Qualquer outro uso:** defina `ANTHROPIC_API_KEY`. A Anthropic não permite que produtos de terceiros ofereçam login claude.ai sem aprovação.

Opcional: `ELEVENLABS_API_KEY` ativa o Voice Isolator para limpar a voz nas receitas com `audio.clean: true`. Sem a chave, a limpeza usa a cadeia de filtros do ffmpeg.

## Setup
```bash
uv venv && uv pip install -e ".[dev]"
npx --yes hyperframes@0.8.158 models install parakeet
npx --yes hyperframes@0.8.158 skills update hyperframes hyperframes-core hyperframes-animation hyperframes-creative hyperframes-registry hyperframes-cli hyperframes-audio media-use talking-head-recut embedded-captions music-to-video
uv run autovideo doctor
```

O `doctor` confere ffmpeg, ffprobe, Node 22+, HyperFrames, o modelo Parakeet, o Claude CLI e as skills. Sai com código 1 se algum item falhar.
As skills usadas pelas receitas precisam estar em `~/.claude/skills`; se faltar alguma, o job falha no designer ou no editor com o comando de instalação na mensagem.

## Uso
```bash
uv run autovideo edit gravacao.mp4 --script roteiro.md --recipe talking-head-punchy
uv run autovideo approve <job>           # libera o gate
uv run autovideo reject <job> "menos zoom, hook mais forte"
uv run autovideo resume <job>            # retoma job com falha ou travado
uv run autovideo edit tela.mp4 --recipe screen-tutorial --auto
uv run autovideo edit c1.mp4 c2.mp4 c3.mp4 --assets musica.mp3 --recipe montage-beat --auto
uv run autovideo serve                   # painel em http://127.0.0.1:8765
```

- `<job>` é o número do job, impresso pelo `edit` (ex.: `job 3: awaiting_approval (etapa gate1)`).
- `--recipe` padrão: `talking-head-punchy`. `--auto` pula os gates e roda até o fim.
- `edit`, `approve`, `reject` e `resume` rodam o pipeline em primeiro plano até o próximo gate ou o fim.
- Dois gates: `gate1` (depois do brief do diretor) e `gate2` (depois do render). `reject` no gate1 refaz a partir do diretor; no gate2, a partir do copywriter. O feedback é acrescentado a `feedback.md` e vai para os agentes na nova rodada.
- `resume` re-enfileira **todos** os jobs `in_progress` (processo morto no meio) e roda o job informado a partir de onde parou. Use só quando nenhum outro `autovideo` estiver rodando, porque `serve` faz o mesmo ao iniciar.
- `--assets` não tem regra por nome ou extensão: todo arquivo vai para `composition/assets/<nome>` (pasta plana). O editor escolhe o uso (SFX, música ou b-roll) e referencia `assets/<nome>` no `timeline.json`. Nomes devem ser únicos (sem diferenciar maiúsculas) e não podem coincidir com um vídeo limpo (`<video>.clean.mp4`).

### Saída
Cada job tem uma pasta `projects/<data-hora>-<slug>/`, impressa ao fim do comando. `AUTOVIDEO_HOME` troca a pasta base `projects/`.
- `out/final.mp4`, `out/cover.jpg` e `out/post.json`.
- `out/review.json` é o marcador de "render pronto": `final.mp4` e `cover.jpg` de um render anterior são apagados no início de cada render. O painel só considera o render pronto quando `review.json` e `final.mp4` existem. O arquivo traz o `lufs` medido e os `issues_restantes`.
- `decisions.log`: uma linha JSON por chamada de agente, com papel, tentativa, custo (`cost_usd`), turnos e resultado ou erro.

## Receitas
`recipes/*.yaml` define parâmetros travados (formato, ritmo, legenda, LUFS) e um prompt-mestre por papel. Para criar uma nova, copie uma existente.

- `talking-head-punchy`: talking head 9:16 em ritmo de Reels; corta retakes e tiques de fala, usa zoom punch-in, legenda karaokê e hook nos primeiros segundos.
- `screen-tutorial`: gravação de tela 16:9; tutorial em passos, com zoom na região da ação e legenda com destaque.
- `montage-beat`: montagem 9:16 sem fala, cortada no ritmo da música (15–30 s).

## Painel / UI
O painel precisa de build antes do `serve`, porque o servidor só serve o painel se `web/dist` existir:
```bash
cd web && npm install && npm run build && cd ..
uv run autovideo serve                   # http://127.0.0.1:8765 (outra porta: --port)
```

- O servidor escuta só em `127.0.0.1`, nunca em `0.0.0.0`, e aceita os hosts `127.0.0.1`, `localhost` e `[::1]`.
- O servidor também executa os jobs da fila em segundo plano. Fluxo: upload → gate1 → aprovar → gate2 → rejeitar com feedback → nova versão no player.
- Desenvolvimento: rode `uv run autovideo serve` e, em outro terminal, `cd web && npm run dev`. O Vite (http://localhost:5173) faz proxy de `/api` e `/projects` para `127.0.0.1:8765`.

O painel é React + Vite + Tailwind v4 + shadcn/ui, com componentes do registry Kobra (`@kobra`). Componentes Kobra Pro exigem `KOBRA_TOKEN` na instalação (`npx shadcn add`), enviado pelo `web/components.json`. Sem o token, são usados os fallbacks shadcn base. Antes de criar um componente de UI, veja [docs/ui-components.md](docs/ui-components.md).

## Testes
```bash
uv run pytest -q
AV_SLOW=1 uv run pytest -q               # inclui os testes reais de pipeline e render (precisam de rede/modelos)
```
