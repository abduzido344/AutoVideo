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
- **Uso pessoal:** `claude auth login` com a sua assinatura. Sem login, o painel abre a janela "Conectar o Claude" (também em **Conta Claude**, na barra lateral). O botão dela abre um terminal com esse comando e a janela fecha sozinha quando o login termina. O login é feito pelo Claude Code: o AutoVideo não vê a senha.
- **Qualquer outro uso:** defina `ANTHROPIC_API_KEY`. A Anthropic não permite que produtos de terceiros ofereçam login claude.ai sem aprovação.

Opcional: `ELEVENLABS_API_KEY` ativa o Voice Isolator para limpar a voz nas receitas com `audio.clean: true`. Sem a chave, a limpeza usa a cadeia de filtros do ffmpeg.

## Setup
```bash
uv venv && uv pip install -e ".[dev]"
npx --yes hyperframes@0.8.158 models install parakeet
npx --yes hyperframes@0.8.158 skills update hyperframes hyperframes-core hyperframes-animation hyperframes-creative hyperframes-registry hyperframes-cli hyperframes-audio media-use talking-head-recut embedded-captions music-to-video
uv run autovideo doctor
```

O `doctor` mostra a pasta dos projetos (`AUTOVIDEO_HOME`) e confere ffmpeg, ffprobe, Node 22+, HyperFrames, o modelo Parakeet,
o Claude CLI, a autenticação do Claude e as skills. Sai com código 1 se algum item falhar.
- **claude auth:** passa se `claude auth status` disser `loggedIn: true` ou se `ANTHROPIC_API_KEY` estiver definida. Se falhar: rode `claude auth login` (uso pessoal) ou defina `ANTHROPIC_API_KEY`.
- **skills:** confere todas as skills listadas nas receitas em `~/.claude/skills` e, se faltar alguma, mostra o `npx --yes hyperframes@0.8.158 skills update ...` que as instala (o mesmo aviso aparece no job, no designer ou no editor).

## Uso
```bash
uv run autovideo edit gravacao.mp4 --script roteiro.md --recipe talking-head-punchy
uv run autovideo approve <job>           # libera o gate
uv run autovideo reject <job> "menos zoom, hook mais forte"
uv run autovideo resume <job>            # retoma um job com falha ou interrompido
uv run autovideo jobs                    # lista id, status, etapa e pasta de cada job
uv run autovideo edit tela.mp4 --recipe screen-tutorial --auto
uv run autovideo edit c1.mp4 c2.mp4 c3.mp4 --assets musica.mp3 --recipe montage-beat --auto
uv run autovideo serve                   # painel em http://127.0.0.1:8765
```

- `<job>` é o número do job, impresso pelo `edit` (ex.: `job 3: awaiting_approval (etapa gate1)`).
- `--recipe` padrão: `talking-head-punchy`. `--auto` pula os gates e roda até o fim.
- `edit`, `approve`, `reject` e `resume` rodam o pipeline em primeiro plano até o próximo gate ou o fim.
- Dois gates: `gate1` (depois do brief do diretor) e `gate2` (depois do render). `reject` no gate1 refaz a partir do diretor; no gate2, a partir do copywriter. O feedback é acrescentado a `feedback.md` e vai para os agentes na nova rodada.
- Job interrompido (processo morto, Ctrl+C, reinício do `serve`) vira `failed` com o erro `interrompido` e **não** roda de novo sozinho. Para continuar, use `autovideo resume <job>` ou o botão **Retomar** do painel (`POST /api/jobs/<job>/resume`, que só aceita jobs `failed`). O job recomeça na etapa que falhou; as etapas concluídas não são refeitas.
- `resume` também marca como `interrompido` **todos** os jobs que ainda estão `in_progress`. Use só quando nenhum outro `autovideo` estiver rodando, porque o `serve` faz o mesmo ao iniciar.
- Cada etapa concluída grava `.stages/<etapa>.ok`. Um artefato sem esse marcador (etapa morta no meio) é apagado e refeito. Projetos antigos, sem a pasta `.stages/`, têm os artefatos existentes aceitos como concluídos.
- `--assets` não tem regra por nome ou extensão: todo arquivo vai para `composition/assets/<nome>` (pasta plana). O editor escolhe o uso (SFX, música ou b-roll) e referencia `assets/<nome>` no `timeline.json`. Nomes devem ser únicos (sem diferenciar maiúsculas) e não podem coincidir com um vídeo limpo (`<video>.clean.mp4`).

### Saída
Cada job tem uma pasta `<data-hora>-<slug>/` dentro da pasta de projetos, impressa ao fim do comando (e por `autovideo jobs`). A pasta de projetos fica fora do repositório e do OneDrive, para que o `CLAUDE.md` de desenvolvimento não seja carregado pelos agentes e as gravações não sincronizem:
- Windows: `%LOCALAPPDATA%\AutoVideo\projects`
- Linux/macOS: `~/.local/share/autovideo/projects` (ou `$XDG_DATA_HOME/autovideo/projects`)

`AUTOVIDEO_HOME` troca essa pasta (é onde ficam também o `jobs.db` e os projetos). Projetos criados antes desta versão ficaram em `./projects` no repositório: para continuar usando-os, aponte `AUTOVIDEO_HOME` para lá.
- `out/final.mp4`, `out/cover.jpg` e `out/post.json`.
- `out/review.json` é o artefato da etapa de render: `final.mp4` e `cover.jpg` de um render anterior são apagados no início de cada render. O painel só considera o render pronto quando a etapa está concluída (`review.json` com o marcador `.stages/render.ok`) e `final.mp4` existe. O arquivo traz o `lufs` medido e os `issues_restantes`.
- `decisions.log`: uma linha JSON por chamada de agente, com papel, tentativa, custo (`cost_usd`), turnos e resultado ou erro.

## Receitas
`recipes/*.yaml` define parâmetros travados (formato, ritmo, legenda, LUFS) e um prompt-mestre por papel. Para criar uma nova, copie uma existente.

- `talking-head-punchy`: talking head 9:16 em ritmo de Reels; corta retakes e tiques de fala, usa zoom punch-in, legenda karaokê e hook nos primeiros segundos.
- `screen-tutorial`: gravação de tela 16:9; tutorial em passos, com zoom na região da ação e legenda com destaque.
- `montage-beat`: montagem 9:16 sem fala, cortada no ritmo da música (15–30 s). Se houver um áudio em `--assets`, o pipeline detecta os beats (`hyperframes beats`) e grava `analysis/beats.json` para o editor.

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

O painel tem três telas:
- **Novo vídeo:** anexe as gravações (e roteiro/assets) no compositor, escolha a receita e envie.
- **Workspace do projeto:** etapas, player, transcrição ou timeline (clicável após o render), brief/revisão/post e a caixa para aprovar ou pedir ajustes.
- **Sidebar:** lista os projetos com o estado (aprovar, rodando, pronto, falhou).
`Ctrl K` volta para Novo vídeo.

## Testes
```bash
uv run pytest -q
AV_SLOW=1 uv run pytest -q               # bash: inclui os testes reais de pipeline e render (precisam de rede/modelos)
```
No PowerShell:
```powershell
uv run pytest -q
$env:AV_SLOW=1; uv run pytest -q         # a variável fica definida nesta sessão; Remove-Item Env:AV_SLOW para desligar
```
