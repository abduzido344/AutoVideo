# AutoVideo — Design (spec) + roadmap

## Context
O José quer uma ferramenta local e open source que faça vídeo de ponta a ponta, da ideia à postagem, com uma "equipe" de agentes Claude: descoberta diária, diretor, storyteller/copywriter, designer disruptivo e editor/motion. A inspiração é a mecânica do Higgsfield: receitas/presets executados por um agente sobre uma API única de jobs.
O diretório `AutoVideo/` está vazio, então o projeto começa do zero.
Decisões já tomadas:
- Ferramenta local open source.
- Interface: painel web local + CLI.
- Núcleo em Python; Node só para renderizar.
- Render com HyperFrames + FFmpeg.
- **MVP = roteiro + vídeo gravado → vídeo editado.** Tipos de gravação: talking head, gravação de tela e clipes soltos/montagem.

**Auth:** o AutoVideo não implementa login. Ele usa o Claude Agent SDK (Python), que roda o binário do Claude Code e herda a autenticação local: o `claude login` do usuário, para uso próprio, ou `ANTHROPIC_API_KEY`. Pela doc do SDK, produto de terceiros não pode *oferecer* login claude.ai sem aprovação, então o README orienta usar API key quando o uso não for pessoal.

**Pesquisa:**
- REA: não rodou, porque não havia Chrome com `--remote-debugging-port`. Dá para refazer depois; não bloqueia nada.
- Higgsfield: estudado via MCP deles e via `higgsfield-ai/skills` e `cli`.
- Repos >5k usados como referência:
  - HyperFrames
  - video-use
  - WhisperX/faster-whisper
  - auto-editor
  - PySceneDetect
  - MediaPipe
  - librosa
  - Editly (schema JSON)
  - OpenMontage (AGPL: só ideias)
  - Postiz (AGPL: só como serviço separado)
  - MoneyPrinterTurbo

## Padrões copiados do Higgsfield
1. **Receita = YAML com parâmetros travados + prompts-mestre por papel.** Campos: `id`, `format`, `preserve[]`, `pacing`, `captions`, `motion`, `prompts.{director,copywriter,designer,editor}`. Os agentes preenchem os slots e nunca reescrevem os prompts-mestre.
2. **API única de jobs.** Estados: `queued → in_progress → awaiting_approval → completed | failed | canceled`. Cada etapa grava um artefato, e o job é retomável (etapa com artefato existente é pulada).
3. **Agente nunca encerra com job rodando, para em falha de dependência e só pergunta nos gates explícitos.** O `auto: true` pula os gates.
4. **Self-review pós-render.** É o padrão do Katana/video-use: extrair frames nos cortes e nas legendas, checar overflow e safe zone, e corrigir (no máximo 2 iterações).

## Referência: Editor Premium (diorgysantos.com/novo)
É um plugin pago para Premiere Pro: R$ 297/ano, licença por ativação.
O que ele faz:
- "Editar sozinho em 1 clique": corta silêncios e repetições, nivela e trata a voz, corrige a cor com visão (Lumetri), põe legenda e zoom nos momentos certos, e adiciona SFX e b-roll opcionais.
- Comando de voz, mais de 100 textos animados, transcrição ou importação de SRT, J-cut.
- Safe zone e tela dividida.

**Equivalente gratuito no GitHub:**
- `browser-use/video-use` (29k★, MIT) cobre quase tudo: corta fillers e silêncios, faz color grade por segmento, legenda, overlays animados e se auto-revisa. Já está instalado aqui como skill.
- `auto-editor` (5.5k★) corta silêncios com margem e exporta XML para Premiere/Resolve/FCP.
- `faster-whisper`/`WhisperX` fazem a legenda com timing por palavra.

Nenhum desses é plugin do Premiere. O AutoVideo M1 cobre o mesmo escopo e vai além: entende o roteiro, tem o diretor e o copy, e roda sem humano. O comando de voz não entra, porque o feedback em texto no painel já cumpre esse papel.

**Itens incorporados ao M1 a partir dessa comparação:**
- Margem nos cortes, para não comer início nem fim de palavra (padding de ~80 ms + fade de 30 ms).
- Cadeia de áudio em ffmpeg: highpass, `afftdn`, compressor e `loudnorm`.
- Correção de cor: o designer/editor escolhe `eq`/`colorbalance`/LUT a partir de frames analisados por visão.
- SFX automáticos em zooms e transições, com um pack livre em `assets/sfx/`.
- Blocos de tela dividida e guia de safe zone.
- J-cut/L-cut como opção do timeline.

## Arquitetura (M1)
```
AutoVideo/
  pyproject.toml            # claude-agent-sdk, fastapi, uvicorn, pydantic, pyyaml,
                            # faster-whisper, scenedetect, mediapipe, librosa
  autovideo/
    cli.py                  # argparse: edit | serve | doctor | jobs
    server.py               # FastAPI: upload, jobs, aprovar/rejeitar, serve web/ e projects/
    jobs.py                 # SQLite (stdlib) + 1 worker thread; etapas retomáveis
    recipes.py              # carrega/valida recipes/*.yaml
    timeline.py             # schema pydantic do timeline.json + remap de tempos pós-corte
    analyze/
      transcribe.py         # faster-whisper, word timestamps + VAD; hotwords/glossário
      edits.py              # silêncios, fillers ("é", "tipo", "né"), retakes (vs roteiro)
      scenes.py             # PySceneDetect (montagem/clipes)
      faces.py              # MediaPipe: caixa do rosto → punch-in e reframe 16:9→9:16
      screen.py             # diff de frames/cursor → zoom em regiões ativas (tela)
      beats.py              # librosa: BPM/onsets p/ cortes no beat (montagem)
    agents/
      crew.py               # 4 chamadas query() sequenciais, 1 por papel, saída validada
      prompts/{director,copywriter,designer,editor}.md
    render/
      cut.py                # ffmpeg: aplica cortes c/ fade de 30ms, loudnorm -14 LUFS → base.mp4
      compose.py            # timeline.json → projeto HyperFrames (HTML+GSAP)
      hyperframes.py        # subprocess: npx hyperframes lint/render
      review.py             # frames nos cortes/legendas → editor agent revisa
  recipes/                  # talking-head-punchy.yaml, screen-tutorial.yaml, montage-beat.yaml
  blocks/                   # blocos HyperFrames reutilizáveis: hook-title, lower-third,
                            # callout, kinetic-text, karaoke-captions, progress-bar
  web/index.html            # painel vanilla (fetch): upload, jobs, brief, player, aprovar
  projects/<id>/            # input/ analysis/ brief.md timeline.json composition/ out/
                            # project.md (memória) decisions.log
```

### Fluxo de um job (`autovideo edit grav.mp4 --script roteiro.md --recipe talking-head-punchy --format 9:16`)
1. **Ingest:** copia os arquivos para `input/` e roda `ffprobe`.
2. **Analyze (determinístico, sem LLM):** gera `analysis/*.json` com palavras, silêncios, fillers, cenas, rostos, beats e atividade de tela, conforme a receita.
3. **Diretor:** lê roteiro, transcrição resumida, receita e análise. Escreve `brief.md` com intenção, estrutura, hook dos 3 primeiros segundos, ritmo e onde entra motion/b-roll. → *gate 1* (se `auto=false`).
4. **Copywriter:** alinha roteiro × fala, escolhe os melhores takes (descarta retakes e erros), define palavras de ênfase nas legendas, textos na tela e o `post.json` (legenda, hashtags, título).
5. **Designer:** gera `style.json` (paleta, fontes, estilo de legenda, vocabulário de motion) e customiza/cria blocos HTML+GSAP para os overlays.
6. **Editor:** monta `timeline.json`, que é validado por pydantic. Depois roda `cut.py` → `compose.py` → `hyperframes render` → `review.py` (até 2 correções). → *gate 2*: aprovar ou rejeitar com feedback, e o feedback volta para o editor.
7. **Saída:** `out/final.mp4`, `out/cover.jpg` (frame + título) e `out/post.json`.

Cada papel é uma chamada `query()` com prompt próprio e ferramentas restritas: Read/Write só dentro do projeto, e o Editor também tem Bash limitado a `autovideo render`. Não há multiagente livre, porque o pipeline sequencial é mais debugável. Toda chamada é registrada em `decisions.log`.

### Contrato central: `timeline.json` (tempos no eixo de saída)
```json
{ "format": {"w":1080,"h":1920,"fps":30},
  "segments": [{"src":"input/grav.mp4","in":1.20,"out":5.84}],
  "zooms":    [{"at":3.1,"dur":0.4,"scale":1.15,"focus":"face"}],
  "captions": {"style":"karaoke-2word","emphasis":["dinheiro"]},
  "overlays": [{"start":0,"dur":2.5,"block":"hook-title","props":{"text":"..."}}],
  "broll":    [{"start":12,"dur":3,"src":"assets/x.mp4"}],
  "audio":    {"music":null,"duck_db":-14} }
```
As palavras da transcrição são remapeadas para o eixo de saída a partir dos `segments`; isso fica em `timeline.py`. O B-roll vem de uma pasta do usuário. Pexels entra como opcional, via API key.

### Painel + CLI
- `autovideo serve`: abre localhost com upload (vídeos + roteiro), escolha de receita e formato, lista de jobs com status, visualização de brief/timeline, player do resultado e botões aprovar/rejeitar com campo de feedback.
- `autovideo doctor`: checa ffmpeg, Node 22+, `npx hyperframes`, auth do Claude (faz uma `query()` mínima) e modelos do whisper.

## Roadmap (cada marco tem seu próprio ciclo spec → plano)
- **M1** (este plano): roteiro + gravação → vídeo editado (talking head, tela, montagem).
- **M2:** vídeo de referência → `style.json`, usando yt-dlp, ritmo de cortes do PySceneDetect, BPM do librosa e frames analisados por visão (paleta, fontes, legenda, zooms). Diretor e editor passam a seguir esse estilo.
- **M3:** ideia → vídeo sem gravação. Agente de descoberta diária (Google Trends, YouTube, RSS, filtro por interesses em linguagem natural), TTS pt-BR (Kokoro/edge-tts), motion-only + b-roll no padrão de blocos do explainer do Higgsfield. Agendado via cron.
- **M4:** postagem automática via Postiz self-hosted (API/MCP) com agenda multi-plataforma. TikTok fica em rascunho por padrão (exigência da API não auditada). Inclui loop de analytics que realimenta a escolha de temas e hooks.
- **M5:** provedores de vídeo generativo (Seedance/Higgsfield) como mais um tipo de job, e um registro de elementos de referência (`<<<uuid>>>`) para mascote, apresentador e logo.
- **Depois:** export XML Premiere/Resolve (padrão auto-editor) para retoque humano, A/B de hooks, multi-idioma (VideoLingo-style), score de viralidade antes de postar.

## Próximos passos após aprovar este design
1. `git init` em `AutoVideo/`, salvar este design em `docs/superpowers/specs/2026-10-14-autovideo-design.md` e commitar.
2. Invocar `superpowers:writing-plans` para gerar o plano de implementação detalhado do M1, com tarefas e TDD. O José revisa e escolhe o modo de execução.
3. Salvar uma memória de projeto: decisões, policy de auth e roadmap.

## Verificação (M1)
- `autovideo doctor` passa em tudo.
- `tests/test_timeline.py` cobre remap de palavras após cortes, validação de sobreposição e limites. É o único teste de lógica não trivial.
- Ponta a ponta: um vídeo de celular de ~60 s com roteiro rodando `autovideo edit ... --auto`, mais uma gravação de tela com `screen-tutorial` e 4 clipes com `montage-beat`.
- Inspecionar `final.mp4`: sem silêncios longos, legendas sincronizadas e dentro da safe zone, sem estalos nos cortes, loudness em -14 LUFS (ffmpeg `ebur128`).
- Painel: upload → gate 1 → aprovar → gate 2 → rejeitar com feedback → nova versão.
