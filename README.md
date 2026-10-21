# AutoVideo

Fábrica local de séries narradas em vídeo vertical (Shorts, TikTok, Reels, Facebook), com vários perfis. Cada perfil tem um estilo, um Universo (personagens e mundo) e uma agenda. Todo dia uma equipe de agentes Claude produz o próximo episódio, você revisa, e ele é exportado ou postado.
Render feito com [HyperFrames](https://github.com/heygen-com/hyperframes). Design: [docs/superpowers/specs/2026-10-21-autovideo-series-design.md](docs/superpowers/specs/2026-10-21-autovideo-series-design.md).

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

## Chaves
- `ELEVENLABS_API_KEY`: narração (TTS) dos episódios.
- `OPENROUTER_API_KEY`: imagens dos episódios e das folhas de personagem.
- `APIFY_TOKEN`: só para analisar um perfil do Instagram ao criar um estilo.

Cada chave vem da variável de ambiente ou é salva em **Configurações** no painel (fica em `config.json` na pasta de dados, nunca é servida pelo painel). A autenticação do Claude não muda (login ou `ANTHROPIC_API_KEY`).

## Setup
```bash
uv venv && uv pip install -e ".[dev]"
npx --yes hyperframes@0.8.158 models install parakeet
npx --yes hyperframes@0.8.158 skills update hyperframes hyperframes-core hyperframes-animation
uv run autovideo doctor
```

O `doctor` mostra a pasta dos projetos (`AUTOVIDEO_HOME`) e confere ffmpeg, ffprobe, Node 22+, HyperFrames, o modelo Parakeet,
o Claude CLI, a autenticação do Claude, as skills e as chaves `ELEVENLABS_API_KEY` e `OPENROUTER_API_KEY`. Sai com código 1 se algum item falhar.
- **claude auth:** passa se `claude auth status` disser `loggedIn: true` ou se `ANTHROPIC_API_KEY` estiver definida. Se falhar: rode `claude auth login` (uso pessoal) ou defina `ANTHROPIC_API_KEY`.
- **skills:** confere `hyperframes`, `hyperframes-core` e `hyperframes-animation` em `~/.claude/skills` e, se faltar alguma, mostra o `npx --yes hyperframes@0.8.158 skills update ...` que as instala.

## Painel / UI
O painel precisa de build antes do `serve`, porque o servidor só serve o painel se `web/dist` existir:
```bash
cd web && npm install && npm run build && cd ..
uv run autovideo serve                   # http://127.0.0.1:8765 (outra porta: --port)
```

- O servidor escuta só em `127.0.0.1`, nunca em `0.0.0.0`, e aceita os hosts `127.0.0.1`, `localhost` e `[::1]`.
- O servidor também executa a fila de geração em segundo plano.
- Desenvolvimento: rode `uv run autovideo serve` e, em outro terminal, `cd web && npm run dev`. O Vite (http://localhost:5173) faz proxy de `/api` e `/projects` para `127.0.0.1:8765`.

O painel é React + Vite + Tailwind v4 + shadcn/ui, com componentes do registry Kobra (`@kobra`). Componentes Kobra Pro exigem `KOBRA_TOKEN` na instalação (`npx shadcn add`), enviado pelo `web/components.json`. Sem o token, são usados os fallbacks shadcn base. Antes de criar um componente de UI, veja [docs/ui-components.md](docs/ui-components.md).

## Uso
1. **Configurações:** salve as chaves e confira o status do Claude.
2. **Criar → Novo perfil:** o onboarding é uma conversa em 6 etapas (nome e assunto, estilo, personagens, mundo, ideias de série, agenda). Gere e aprove a folha de cada personagem e clique em **Ativar perfil**.
3. O agendador do `serve` produz um episódio por dia, na hora da agenda do perfil. Para produzir já, use **Gerar próximo episódio** no perfil.
4. **Fila:** acompanha os episódios por status e etapa. **Revisão:** veja o vídeo e escolha **Aprovar**, **Pedir ajuste** (o episódio refaz com o seu texto), **Descartar**, **Exportar** ou **Marcar como postado**.
5. **Estilos:** crie um estilo novo com **Analisar perfil** (Instagram, via Apify) ou **Criar conversando**.

Nada é postado automaticamente: o AutoVideo só produz e exporta; postar é com você.

## CLI
```bash
uv run autovideo doctor                  # confere o ambiente
uv run autovideo serve [--port N]        # painel + agendador
uv run autovideo fila                    # lista a fila e se ela está pausada
uv run autovideo gerar <perfil>          # produz o próximo episódio do perfil agora
uv run autovideo aprovar <id>            # aprova o episódio em revisão
uv run autovideo ajustar <id> "texto"    # pede ajuste e refaz o episódio
uv run autovideo retomar <id>            # retoma um episódio que falhou
```
`gerar` recusa rodar enquanto o `serve` estiver produzindo: use o painel.

## Dados
Perfis, estilos, séries e episódios ficam fora do repositório e do OneDrive, para que o `CLAUDE.md` de desenvolvimento não seja carregado pelos agentes:
- Windows: `%LOCALAPPDATA%\AutoVideo\projects`
- Linux/macOS: `~/.local/share/autovideo/projects` (ou `$XDG_DATA_HOME/autovideo/projects`)

`AUTOVIDEO_HOME` troca essa pasta.

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
