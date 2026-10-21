# AutoVideo — Fábrica de séries: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar o fluxo M1 por uma fábrica local de séries narradas 9:16, multi-perfil, com fila de um episódio por vez, revisão humana e Exportar.

**Architecture:** os dados são arquivos JSON/MD em `AUTOVIDEO_HOME`. Cada episódio é um job do `JobStore` existente, que roda etapas retomáveis (`jobs.run_job`). O **Diretor é código Python determinístico** (`episode.py`): ele chama subagentes Claude só onde há criação (roteiro, cenas, revisão, série, estilo, onboarding) e faz o resto por API (ElevenLabs, OpenRouter) e HyperFrames. Um único thread no `autovideo serve` roda o agendador e a fila, então nunca há duas produções ao mesmo tempo.

**Tech Stack:** Python 3.11, FastAPI, claude-agent-sdk, httpx, pydantic 2, HyperFrames 0.8.158, ffmpeg; painel React + Vite + Tailwind v4 + shadcn + Kobra.

**Spec:** `docs/superpowers/specs/2026-10-21-autovideo-series-design.md`

## Global Constraints
- HyperFrames sempre por `autovideo.hf.HF` (`npx --yes hyperframes@0.8.158`); subprocessos sempre por `hf.run` (shim seguro no Windows).
- Auth: Claude Agent SDK herdando o login da máquina ou `ANTHROPIC_API_KEY`. Nada de login claude.ai. Nenhum recurso pode exigir API key do Claude.
- **Nunca postar sem aprovação.** Nenhum código desta versão posta em rede nenhuma.
- O servidor escuta só em `127.0.0.1`, com `TrustedHostMiddleware` e a checagem de Origin que já existem.
- Dados fora do repo: `project.home()`. Nada de dados do usuário dentro do repositório.
- Episódios: 9:16, 1080×1920, 30 fps, loudness −14 LUFS ±1.5.
- Série: padrão 3 episódios, mínimo 1, máximo 10. Fila: 1 episódio por dia por padrão.
- Limite de imagens por episódio: padrão 40.
- A UI não chama nada de "opcional". Textos da UI e mensagens de erro em português.
- Sem dependência Python nova: httpx, pydantic, fastapi e o SDK já cobrem tudo.
- Modelos por função (`agents.ROLES`): `opus` para roteirista, revisor, showrunner e analista; `sonnet` para diretor_arte, onboarding e estilo_chat; `haiku` para triagem.

## Decisões deste plano (do Claude, além das do spec)
- **O Diretor é código, não LLM.** O spec pede que o contexto do Diretor fique pequeno; código tem contexto zero, e a decisão fica testável.
- **Voz, imagens, SFX, telas e montagem são determinísticos** (Python + APIs + templates), e não subagentes. Isso economiza tokens. As funções do spec "Gerador de imagens", "Motion", "Voz e som" e "Montador" viram etapas sem LLM.
- **Telas de celular são templates HTML fixos** (chat, alerta, bateria, bloqueio, notificação). O Diretor de arte só escolhe o tipo e o texto.
- **SFX e ambiente pela API de efeitos da ElevenLabs** (a mesma chave do TTS). O `media-use resolve` exige o CLI da HeyGen.
- **Cache por hash:** voz e imagem guardam o hash do texto/prompt no manifesto e só regeneram o que mudou. Um ajuste numa cena refaz só essa cena.
- **Interrompido volta para a fila sozinho** ao reabrir o `serve`. No M1 virava failed; o spec agora exige retomada autônoma.
- **Pedir ajuste:** um agente `haiku` (triagem) decide se o texto vai para o roteirista ou para o diretor de arte.
- **Chaves de API** (ElevenLabs, OpenRouter, Apify) vêm da variável de ambiente ou de `home()/config.json`, que o painel grava.

## Fora deste plano
- Headroom (spike de economia), postagem automática por rede e o provedor Higgsfield: cada um vira um plano próprio quando houver conta/aprovação ou medição.

## Review Focus
1. **App fechado por dias:** ao reabrir, o agendador cria **um** episódio daquele dia, não um acúmulo de N dias. Teste em `test_fila.py`.
2. **Limite de uso da assinatura no meio de uma etapa:** o job volta para `queued` na mesma etapa, a fila pausa até o horário de liberação e nada é contado como falha nem gera job novo. Testes em `test_agents.py` e `test_fila.py`.
3. **`serve` morto no meio de um episódio:** ao reabrir, o job continua da etapa que não terminou, sem refazer as concluídas. Teste em `test_fila.py`.
4. **Chave ausente (ElevenLabs/OpenRouter):** a etapa falha com uma mensagem em português dizendo qual chave falta, e o agendador não cria outro episódio enquanto houver um com falha no perfil. Testes em `test_eleven.py` e `test_fila.py`.
5. **Nome de perfil com acento/espaço ou repetido:** o slug é ASCII e o repetido ganha `-2`. Cenas acima do limite de imagens falham **antes** de gastar qualquer geração. Testes em `test_data.py` e `test_episode.py`.

## Layout de dados (fixado aqui; todas as tasks usam)
```
home()/
  jobs.db                      # JobStore; coluna recipe = kind: "episodio" | "estilo"
  config.json                  # chaves e provedor (config.py)
  fila.json                    # {"paused": bool, "paused_until": float|null, "reason": str}
  estilos/<slug>/estilo.md, estilo.json        # estilos do usuário (os de fábrica ficam em autovideo/estilos/)
  perfis/<slug>/
    perfil.json, ideias.json
    universo/mundo.md, universo/historico.md
    personagens/<p>/ficha.md, folha.png, aprovada       # "aprovada" = arquivo vazio
    .chat/onboarding.json                               # {"session_id", "mensagens":[{"autor","texto"}]}
    series/<NN>-<slug>/serie.json
    series/<NN>-<slug>/ep<NN>/                          # project_dir do job
      sinopse.md, ajustes.md, decisions.log, .stages/
      roteiro.md, episodio.json, cenas.json, voz.json, voz/sNN.mp3,
      img/manifest.json, img/sNN.png, sfx/manifest.json, sfx/*.mp3,
      composition/ (HyperFrames), out/final.mp4, out/capa.jpg,
      review/*.png, revisao.json, approvals/aprovado.ok
```

---

## Parte A — Motor

### Task 1: Tirar o M1 e generalizar agentes e render
**Implementador: sonnet.**

**Files:**
- Delete: `autovideo/pipeline.py`, `autovideo/timeline.py`, `autovideo/compose.py`, `autovideo/recipes.py`, `recipes/`, `autovideo/prompts/*.md`, `tests/test_pipeline.py`, `tests/test_timeline.py`, `tests/test_compose.py`, `tests/test_recipes.py`
- Modify: `autovideo/agents.py`, `autovideo/render.py`, `autovideo/doctor.py`, `autovideo/cli.py` (só `doctor` e `serve` por enquanto; `serve` sobe `create_app` de um server mínimo), `autovideo/server.py` (tira os endpoints de jobs/receitas; ficam `/api/doctor`, `/api/auth`, `/api/auth/login`, o middleware e o mount do `web/dist`), `tests/test_agents.py`, `tests/test_render.py`, `tests/test_server.py`, `tests/test_doctor.py`
- Create: `autovideo/prompts/teste.md` (uma linha; só para os testes de agents)

**Interfaces:**
- Produces, em `agents.py`:
  ```python
  @dataclass(frozen=True)
  class Role:
      name: str              # prompt em autovideo/prompts/<name>.md
      model: str             # "opus" | "sonnet" | "haiku"
      max_turns: int = 30
      max_usd: float = 2.0
      skills: tuple[str, ...] = ()
      bash: bool = False
  ROLES: dict[str, Role]     # roteirista/revisor/showrunner/analista=opus; diretor_arte/onboarding/estilo_chat=sonnet; triagem=haiku (max_turns=5, max_usd=0.2)
  class UsageLimit(AgentOutputError): retry_at: float | None
  def options_for(role: Role, cwd: Path, context: str = "") -> ClaudeAgentOptions
  def run_role(role: Role, cwd: Path, task: str, output: Path,
               validate: Callable[[Path], None] | None = None, context: str = "") -> None
  def validate_model(model: type[BaseModel]) -> Callable[[Path], None]   # já existe
  def missing_skills(names) -> str | None                                  # já existe
  ```
  `options_for`: o system prompt é `context` primeiro (prefixo estável para o cache), depois o prompt da função. Passa `model=role.model`. Mantém tools, `disallowed_tools` e `setting_sources=["project"]` como hoje. As skills são copiadas para `cwd/.claude/skills`, como hoje.
  `run_role` grava o log em `Project(cwd).log` (o mesmo `decisions.log`, com `model` na entrada) e mantém a retentativa de validação.
- **Detecção de limite:** se o resultado vier com erro e o texto bater em `re.compile(r"usage limit|limit reached|rate.?limit", re.I)`, levante `UsageLimit`. `retry_at` é o epoch de `\|(\d{10})` se houver, senão `None`.
- `render.py`: traga `FORMATS` para cá, só com `{"9:16": (1080, 1920, "portrait")}`. Remova `apply_grading` e `beats`. `check`, `snapshots`, `render_final`, `make_cover` e `init_composition` ficam.
- `doctor.py`: troque a checagem de skills das receitas por `missing_skills(SKILLS)`, com `SKILLS = ("hyperframes", "hyperframes-core", "hyperframes-animation")`. Acrescente `ELEVENLABS_API_KEY` e `OPENROUTER_API_KEY` como itens que passam se `config.get_key` achar a chave. Essa parte entra na Task 2; até lá, deixe um TODO.

- [ ] **Step 1:** apague os arquivos listados e ajuste os imports até `uv run python -c "import autovideo.server, autovideo.cli, autovideo.render, autovideo.agents"` passar.
- [ ] **Step 2: testes que falham** em `tests/test_agents.py` (com `agents._query` substituído por um fake, como os testes atuais já fazem):
  - `test_options_put_context_before_role_prompt`: `opts.system_prompt.startswith("CTX")` e contém o texto de `prompts/teste.md`; `opts.model == "haiku"`.
  - `test_usage_limit_raises_with_retry_at`: o fake devolve um resultado `is_error=True` com `"Claude AI usage limit reached|1760000000"`, então `run_role` levanta `UsageLimit` com `retry_at == 1760000000`.
  - `test_usage_limit_without_epoch`: o texto é `"rate limit"`, então `retry_at is None`.
  - `test_logs_model_and_cost`: depois de um sucesso, a última linha de `decisions.log` tem `role`, `model` e `cost_usd`.
  - Adapte os testes existentes de retentativa de validação para a nova assinatura.
- [ ] **Step 3:** implemente. Rode `uv run pytest -q`. Esperado: tudo verde (os testes do M1 foram apagados; `test_server.py` só cobre doctor, auth e segurança de host/origin).
- [ ] **Step 4: commit** `refactor: remove M1 pipeline, generalize agent roles`

### Task 2: Dados, config e estilo Benji
**Implementador: sonnet.**

**Files:**
- Create: `autovideo/data.py`, `autovideo/config.py`, `autovideo/estilos/benji/estilo.md`, `autovideo/estilos/benji/estilo.json`, `tests/test_data.py`
- Modify: `autovideo/doctor.py` (itens de chave)

**Interfaces (Produces):**
```python
# config.py
def load() -> dict                       # home()/config.json, {} se ausente
def save(patch: dict) -> None            # merge + grava
def get_key(name: str) -> str | None     # env var `name` primeiro; depois config.json[name.lower()]
def setting(name: str, default)          # config.json com default: "image_provider"="openrouter",
                                         # "image_model"="google/gemini-2.5-flash-image", "max_imagens"=40
# data.py
ScreenType = Literal["chat", "alerta", "bateria", "bloqueio", "notificacao"]
class Estilo(BaseModel):                 # estilo.json
    titulo: str
    duracao_alvo_s: tuple[int, int] = (150, 180)
    segundos_por_cena: float = 4.0
    legenda: bool = False
    paleta: list[str]
    telas: list[ScreenType] = []
    imagem_prefixo: str                  # tratamento visual em inglês, prefixa todo prompt de imagem
    gancho: str = "Segue pra ver a Parte {n}"
    voz_padrao: str = ""                 # voice_id ElevenLabs
class Agenda(BaseModel):
    gerar_as: str = "09:00"              # HH:MM, validado
    por_dia: int = Field(1, ge=1, le=5)
    postar_as: list[str] = ["18:00"]
    episodios_por_serie: int = Field(3, ge=1, le=10)
Rede = Literal["youtube", "tiktok", "instagram", "facebook"]
class Conta(BaseModel): conectada: bool = False; usuario: str = ""
class Perfil(BaseModel):
    slug: str; nome: str; assunto: str = ""; publico: str = ""
    estilo: str = "benji"; voz_id: str = ""; ativo: bool = False
    agenda: Agenda = Agenda()
    contas: dict[Rede, Conta] = {r: Conta() for r in ("youtube","tiktok","instagram","facebook")}
    onboarding: int = Field(0, ge=0, le=6)   # última etapa concluída
class Ideia(BaseModel): id: str; texto: str; origem: Literal["usuario","claude"]; usada: bool = False
class EpisodioRef(BaseModel): n: int; titulo: str; sinopse: str; job: int | None = None; postado: list[Rede] = []
class Serie(BaseModel):
    slug: str; titulo: str; logline: str; ideia: str | None = None
    paused: bool = False; episodios: list[EpisodioRef]

def slugify(text: str) -> str                         # ASCII minúsculo, hífens, até 40 chars, "perfil" se vazio
def perfis_dir() -> Path                              # home()/"perfis"
def create_perfil(nome: str) -> Perfil                # mkdir atômico, slug repetido ganha -2, -3...; cria universo/mundo.md e historico.md vazios e ideias.json "[]"
def load_perfil(slug: str) -> Perfil                  # KeyError se não existe
def save_perfil(p: Perfil) -> None
def list_perfis() -> list[Perfil]
def load_ideias(slug) -> list[Ideia]; def save_ideias(slug, ideias) -> None
def add_ideia(slug, texto, origem="usuario") -> Ideia # id = uuid4().hex[:8]
def personagens(slug) -> list[dict]                   # [{"slug","ficha","folha": bool,"aprovada": bool}]
def list_estilos() -> list[dict]                      # fábrica (autovideo/estilos) + home()/estilos; o do usuário vence no mesmo slug: [{"slug","titulo","origem":"fabrica"|"usuario"}]
def estilo_dir(slug) -> Path                          # KeyError se não existe
def load_estilo(slug) -> tuple[str, Estilo]           # (estilo.md, Estilo)
def series(slug) -> list[tuple[Path, Serie]]          # ordenadas por NN
def create_serie(perfil: str, titulo, logline, episodios: list[tuple[str, str]], ideia=None) -> Path  # cria NN-<slug>/serie.json e ep<NN>/sinopse.md para cada episódio
def save_serie(path: Path, s: Serie) -> None
def ep_dir(serie_path: Path, n: int) -> Path          # serie_path / f"ep{n:02d}"
def context_for(perfil: str) -> str                   # prefixo estável dos agentes: estilo.md + estilo.json + universo/mundo.md + fichas dos personagens (ordem alfabética) + historico.md, nesta ordem, com títulos "## ..."
```
Toda escrita JSON usa `ensure_ascii=False, indent=2` e passa por um arquivo `.tmp` + `replace` (atômica).

**Estilo Benji:** escreva `estilo.md` com as notas do spec (seção "Estilos", lista "O primeiro estilo"): narração, imagem, telas, ritmo e post. Sem copiar personagem nem história. `estilo.json`: `titulo "Benji — terror narrado"`, `duracao_alvo_s [150,180]`, `segundos_por_cena 3.5`, `legenda false`, `paleta ["#0E2A33","#1C4A57","#F2B45A","#D7263D"]`, `telas ["chat","alerta","bateria","bloqueio","notificacao"]`, `imagem_prefixo "2D cartoon illustration, big-headed character with dot eyes, dark teal night palette, warm light only from candles and windows, red only on alerts, rainy atmosphere, vertical 9:16"`, `gancho "Segue pra ver a Parte {n}"`.

- [ ] **Step 1: testes que falham** em `tests/test_data.py` (com `AUTOVIDEO_HOME` em `tmp_path` via `monkeypatch.setenv`):
  - `test_slug_ascii_and_dedupe`: `create_perfil("Terror à Noite").slug == "terror-a-noite"`; o segundo vira `"terror-a-noite-2"`.
  - `test_agenda_limits`: `Agenda(episodios_por_serie=11)` levanta `ValidationError`; `Agenda(gerar_as="25:00")` também.
  - `test_estilos_lists_benji_and_user_overrides`: `benji` aparece com origem `fabrica`; depois de criar `home()/estilos/benji/estilo.json`, a origem vira `usuario`.
  - `test_benji_valid`: `load_estilo("benji")[1].telas` contém `"alerta"`.
  - `test_create_serie_writes_synopses`: com 3 episódios, existem `ep01/sinopse.md` a `ep03/sinopse.md` e `serie.json` tem 3 `EpisodioRef` com `job=None`.
  - `test_context_order`: `context_for` traz o estilo antes do mundo, e o mundo antes do histórico.
  - `test_get_key_env_wins`: com env `OPENROUTER_API_KEY=a` e config `openrouter_api_key=b`, o resultado é `"a"`.
- [ ] **Step 2:** rode `uv run pytest tests/test_data.py -q`. Esperado: FAIL (módulo ausente).
- [ ] **Step 3:** implemente `config.py`, `data.py`, o estilo Benji e os itens de chave no doctor.
- [ ] **Step 4:** `uv run pytest -q` verde.
- [ ] **Step 5: commit** `feat: profile/style/series data model and Benji style`

### Task 3: Cliente ElevenLabs (voz e SFX)
**Implementador: haiku.**

**Files:** Create: `autovideo/eleven.py`, `tests/test_eleven.py`

**Interfaces (Produces):**
```python
class MissingKey(RuntimeError): ...        # mensagem: "falta ELEVENLABS_API_KEY (defina a variável ou salve em Configurações)"
BASE = "https://api.elevenlabs.io/v1"
def tts(text: str, voice_id: str, out: Path, previous_text: str = "", next_text: str = "",
        client: httpx.Client | None = None) -> float     # POST /text-to-speech/{voice_id}?output_format=mp3_44100_128, model_id "eleven_multilingual_v2"; grava out; devolve a duração (media.probe)
def sfx(prompt: str, seconds: float, out: Path, client: httpx.Client | None = None) -> None   # POST /sound-generation {"text", "duration_seconds": min(max(seconds,0.5),22)}
```
A chave vem de `config.get_key("ELEVENLABS_API_KEY")` e vai no header `xi-api-key`. Se o HTTP não for 2xx, levante `RuntimeError` com o status e os 300 primeiros caracteres do corpo. Grava em `.part` e depois faz `replace`.

- [ ] **Step 1: testes que falham** com `httpx.MockTransport`:
  - `test_tts_sends_context_and_key`: a requisição tem `xi-api-key`, e o JSON tem `previous_text` e `next_text`; `out` existe. Use um mp3 real de 1 s gerado por ffmpeg na fixture, servido como corpo, e confira que o retorno fica perto de 1.0.
  - `test_missing_key_message`: sem chave, `MissingKey` com `"ELEVENLABS_API_KEY"` na mensagem.
  - `test_sfx_clamps_duration`: `seconds=40` envia `duration_seconds == 22`.
  - `test_http_error_no_partial`: 500 levanta erro e não deixa `out` nem `.part`.
- [ ] **Step 2:** rode e veja falhar. **Step 3:** implemente. **Step 4:** verde.
- [ ] **Step 5: commit** `feat: ElevenLabs TTS and sound effects client`

### Task 4: Provedor de imagens (OpenRouter)
**Implementador: sonnet.**

**Files:** Create: `autovideo/images.py`, `tests/test_images.py`

**Interfaces (Produces):**
```python
class ImageError(RuntimeError): ...
def generate(prompt: str, refs: list[Path], out: Path, aspect: str = "9:16",
             client: httpx.Client | None = None) -> dict   # devolve {"provider","model","cost_usd": float|None}
```
- `config.setting("image_provider")`: `"openrouter"` é o único implementado. `"higgsfield"` levanta `ImageError("provedor higgsfield ainda não implementado")`.
- OpenRouter: `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer <OPENROUTER_API_KEY>`. O body é `{"model": setting("image_model"), "modalities": ["image","text"], "image_config": {"aspect_ratio": aspect}, "messages":[{"role":"user","content":[{"type":"text","text":prompt}, *({"type":"image_url","image_url":{"url": data_uri(ref)}} for ref in refs)]}]}`.
- A imagem vem em `choices[0].message.images[0].image_url.url` (data URI base64). Grave em `out` (via `.part`). O custo vem de `usage.cost`, se houver.
- Sem chave: levante `eleven.MissingKey` com `"OPENROUTER_API_KEY"` na mensagem.

- [ ] **Step 1: testes que falham** (MockTransport):
  - `test_sends_refs_as_data_uri`: com 2 refs PNG, o conteúdo da mensagem tem 3 partes e as 2 últimas começam com `data:image/png;base64,`.
  - `test_writes_png_and_cost`: a resposta com uma imagem base64 grava `out`, e `cost_usd` vem de `usage.cost`.
  - `test_no_image_in_response`: a resposta sem `images` levanta `ImageError` com o texto da resposta.
  - `test_higgsfield_not_implemented`.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: pluggable image provider with OpenRouter`

### Task 5: Telas de celular (blocos HyperFrames)
**Implementador: sonnet.**

**Files:** Create: `autovideo/blocks/__init__.py`, `autovideo/blocks/{chat,alerta,bateria,bloqueio,notificacao}.html`, `tests/test_blocks.py`

**Antes de escrever:** rode `npx --yes hyperframes@0.8.158 catalog` e procure blocos de chat, notificação, celular e alerta. Se algum servir, adapte o HTML dele (cite a origem num comentário). Leia a skill `hyperframes-core` para o contrato de sub-composição.

**Interfaces (Produces):**
```python
SCHEMAS: dict[str, type[BaseModel]]   # dados aceitos por tipo:
#  chat:        {"grupo": str, "mensagens": [{"autor": str, "texto": str}]}  (1–8 mensagens, entram uma a uma)
#  alerta:      {"titulo": str, "orgao": str, "texto": str, "hora": str}      (card vermelho "ALERTA EXTREMO" sobre tela de bloqueio)
#  bateria:     {"nivel": int 0–100, "modo_aviao": bool, "hora": str}
#  bloqueio:    {"hora": str, "data": str}
#  notificacao: {"app": str, "titulo": str, "texto": str, "hora": str}
def render_block(kind: str, data: dict, dur: float, comp_id: str) -> str
    # valida data com SCHEMAS[kind] (ValidationError sobe); devolve o HTML de uma sub-composição HyperFrames
    # 1080×1920 com data-composition-id=comp_id e duração dur; todo texto passa por html.escape
```
Visual: um celular centralizado sobre fundo escuro, com a fonte do sistema. As animações vão num único timeline GSAP pausado: entrada das mensagens/card em 0,3–0,6 s cada e um leve zoom contínuo.

- [ ] **Step 1: testes que falham:**
  - `test_escapes_text`: `chat` com o texto `"<script>x</script>"` não contém `<script>x`.
  - `test_every_kind_renders`: um exemplo válido por tipo devolve uma string com `data-composition-id="t"`.
  - `test_rejects_bad_data`: `bateria` com `nivel=150` levanta `ValidationError`.
  - `test_blocks_pass_hyperframes_check` (fixture `slow`): monte uma composição mínima com os 5 blocos em sequência (`render.init_composition` num `tmp_path`), rode `render.check(comp, "9:16")` e espere `[]`.
- [ ] **Step 2–4:** falhar, implementar, verde (o slow com `AV_SLOW=1`).
- [ ] **Step 5: commit** `feat: phone screen blocks for HyperFrames`

### Task 6: Montagem da composição
**Implementador: opus** (contrato HyperFrames + tempos).

**Files:** Create: `autovideo/montage.py`, `tests/test_montage.py`

**Leia antes:** a skill `hyperframes-core` e as convenções do compositor antigo, em `git show f6b7d09:autovideo/compose.py` (`_n`, `_attr`, `_js`, `class="clip"`, `data-start`/`data-duration`, GSAP de `cdn.jsdelivr.net/npm/gsap@3.14.2`).

**Interfaces:**
- Consumes: `data.Estilo`, `blocks.render_block`, `render.init_composition`, e os arquivos `cenas.json`, `voz.json`, `img/manifest.json` e `sfx/manifest.json` (formatos na Task 7).
- Produces:
  ```python
  def build(ep: Path, cenas: Cenas, voz: Voz, imgs: dict[str, str], sfx: dict[str, str], ambiente: str | None) -> None
      # copia mídia para composition/assets, escreve composition/index.html e composition/compositions/screen-<id>.html
  ```
- **Linha do tempo:** cada cena começa onde a anterior termina, com `dur = voz.cenas[i].dur + 0.25` (respiro). A cena 1 começa em 0.
- **Cena de imagem:** `<img class="clip">` em tela cheia, com movimento GSAP pela `camera`: `zoom-in` 1.0→1.12, `zoom-out` 1.12→1.0, `pan-left`/`pan-right` deslocando 6% com escala 1.12, `static` sem movimento. Ease `none`. Corte seco entre cenas.
- **Cena de tela:** sub-composição `screen-<id>` vinda de `render_block`.
- **Áudio:** narração `voz/sNN.mp3` em cada cena (volume 1). SFX no início da cena (volume 0.6). Ambiente em loop por toda a duração (volume 0.15), se existir.
- **Sem legenda queimada**, salvo `estilo.legenda=True`. Nesse caso, legenda simples por cena com o texto da narração, na zona `render.caption_zone("9:16")`.

- [ ] **Step 1: testes que falham:**
  - `test_scene_starts_are_cumulative`: com durações de voz [2.0, 3.0], os `data-start` são `0` e `2.25`, e o `data-duration` total do root é `5.5`.
  - `test_screen_scene_uses_subcomposition`: uma cena `screen` gera `compositions/screen-s02.html`, referenciado no `index.html`.
  - `test_no_captions_when_style_says_no`: `legenda=False` não gera elemento de legenda.
  - `test_assets_copied_with_safe_names`: uma imagem com espaço no nome é copiada e referenciada com URL escapada.
  - `test_montage_renders` (slow): 3 cenas (2 imagens PNG geradas por ffmpeg + 1 `alerta`), voz de tom de 1 s; `render.check` devolve `[]` e `render.render_final` gera um mp4 de 1080×1920 com duração ≈ soma (±0.2 s).
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: episode composition builder`

### Task 7: Episódio (Diretor, etapas, revisão, ajuste)
**Implementador: opus** (orquestração e invalidação).

**Files:**
- Create: `autovideo/episode.py`, `autovideo/prompts/{roteirista,diretor_arte,revisor,triagem}.md`, `tests/test_episode.py`
- Modify: `autovideo/jobs.py` (extrair `invalidate_from`)

**Interfaces:**
- Consumes: `agents.run_role/ROLES/validate_model/UsageLimit`, `data.*`, `eleven.tts/sfx`, `images.generate`, `montage.build`, `render.*`, `jobs.*`.
- Produces:
  ```python
  # jobs.py
  def invalidate_from(root: Path, stages: list[Stage], start: str) -> None   # apaga marcador e depois artefato de `start` até o fim; reject() passa a usar
  # episode.py — modelos dos artefatos
  class Post(BaseModel): caption: str; hashtags: list[str]
  class EpisodioOut(BaseModel): titulo: str; resumo: str; post: Post          # episodio.json (roteirista)
  class Screen(BaseModel): type: ScreenType; data: dict
  class Cena(BaseModel):
      id: str                      # "s01", "s02"... sequencial
      kind: Literal["image", "screen"]
      narration: str               # trecho do roteiro lido nesta cena
      prompt: str = ""             # obrigatório se kind=image (em inglês, sem o prefixo do estilo)
      camera: Literal["zoom-in","zoom-out","pan-left","pan-right","static"] = "zoom-in"
      screen: Screen | None = None # obrigatório se kind=screen; data validado por blocks.SCHEMAS
      sfx: str = ""                # descrição em inglês do efeito; "" = sem efeito
      characters: list[str] = []   # slugs de personagens do perfil presentes na imagem
  class Cenas(BaseModel): cenas: list[Cena]; ambiente: str = ""   # ambiente = prompt de som de fundo
  class VozCena(BaseModel): id: str; file: str; dur: float; sha: str
  class Voz(BaseModel): cenas: list[VozCena]
  class Fix(BaseModel): role: Literal["roteirista", "diretor_arte"]; scene: str | None = None; note: str
  class Revisao(BaseModel): ok: bool; fixes: list[Fix] = []
  STAGES: list[Stage]   # na ordem:
  #  ("roteiro","episodio.json",roteiro) ("cenas","cenas.json",cenas) ("voz","voz.json",voz)
  #  ("imagens","img/manifest.json",imagens) ("sfx","sfx/manifest.json",sons) ("montagem","composition/index.html",montagem)
  #  ("render","out/final.mp4",render_ep) ("revisao","revisao.json",revisar) ("aprovacao","approvals/aprovado.ok",None)
  REDO = {"roteirista": "roteiro", "diretor_arte": "cenas"}
  REVIEW_ROUNDS = 2
  def make_ctx(job: dict) -> jobs.Ctx                  # ctx.recipe = {"perfil": slug, "serie": Path, "n": int} (derivado do project_dir)
  def produce(store: JobStore, jid: int) -> str        # run_job + laço de revisão; devolve o status final
  def approve(store, jid) -> None                      # jobs.approve + acrescenta "## Parte N — <titulo>\n<resumo>" em universo/historico.md
  def adjust(store, jid, texto: str) -> None           # triagem → Fix; grava em ajustes.md; invalidate_from(REDO[role]); status queued
  def discard(store, jid) -> None                      # showrunner.rewrite_synopsis (Task 8); apaga tudo do ep menos sinopse.md; status queued, stage ""
  def new_episode_job(store, serie_path: Path, n: int) -> int   # cria o job (kind "episodio", auto=False), grava job em serie.json
  ```
- **O que cada etapa faz:**
  - `roteiro`: `run_role(ROLES["roteirista"], ep, task, ep/"episodio.json", validate_model(EpisodioOut), context=context_for(perfil))`. A task cita `sinopse.md`, o número da parte, se é a última da série (sem gancho) e `ajustes.md`, se existir. O agente grava `roteiro.md` e `episodio.json`.
  - `cenas`: o diretor_arte lê `roteiro.md` e grava `cenas.json`. A validação extra checa: a narração concatenada (espaços normalizados) é igual ao `roteiro.md` sem títulos; `kind=image` com `prompt`; `screen.type` está em `estilo.telas`; `characters` existem no perfil; e o número de cenas de imagem é `<= setting("max_imagens")`. Esta última é a Review Focus 5: falha antes de gerar qualquer imagem.
  - `voz`: para cada cena, `sha = sha256(narration + voz_id)`. Reaproveite o arquivo se o `sha` estiver em `voz/cache.json` (`{sha: {file, dur}}`), que fica fora do artefato da etapa e sobrevive ao `invalidate_from`. Chame `eleven.tts` com `previous_text`/`next_text` das cenas vizinhas. `voz_id`: o do perfil, senão `estilo.voz_padrao`; se os dois estiverem vazios, levante um erro "defina a voz do perfil".
  - `imagens`: o mesmo cache por `sha256(prefixo + prompt + refs)` em `img/cache.json`. Os refs são as `folha.png` dos `characters`, e todas precisam ter `aprovada`; se não, erro "folha de <p> não aprovada". Grava o custo de cada imagem no `decisions.log` (`{"stage":"imagens","scene","cost_usd"}`).
  - `sons`: SFX por cena com `sfx` não vazio, mais o ambiente (22 s em loop), com cache por hash igual ao das imagens.
  - `montagem`: `render.init_composition` + `montage.build`.
  - `render_ep`: `render.render_final(comp, ep/"out/final.mp4", -14)`, e `make_cover` em 1/3 da primeira cena de imagem para `out/capa.jpg`.
  - `revisar`: `render.snapshots` no meio de cada cena para `review/`, depois `run_role(ROLES["revisor"], ...)` gravando `revisao.json` (validate `Revisao`). O revisor recebe roteiro, cenas, fichas e frames.
- **Laço de revisão em `produce`:** depois de `run_job` parar no gate `aprovacao`, se `revisao.ok` for falso e as rodadas de `ajustes.md` com origem "revisor" forem menos que `REVIEW_ROUNDS`: grave os fixes em `ajustes.md`, chame `invalidate_from` na etapa mais cedo entre os `REDO[f.role]`, faça `store.set(status="queued")`, logue `{"review_round": k}` e rode de novo. Com as rodadas esgotadas, o episódio vai para a revisão humana assim mesmo, com os fixes visíveis.
- **`UsageLimit` em qualquer etapa:** `produce` não deixa virar failed. Coloque o job em `queued` com o mesmo `stage` e relance o `UsageLimit` para a fila (Task 9) pausar.

- [ ] **Step 1: testes que falham** em `tests/test_episode.py`. O agente fake escreve arquivos fixos por função; `eleven`, `images` e `render` vêm por monkeypatch e gravam arquivos pequenos:
  - `test_full_run_stops_at_approval`: um job novo termina `awaiting_approval` com todos os artefatos e os marcadores das 8 etapas.
  - `test_reviewer_fix_redoes_from_cenas_only`: o revisor fake devolve `fixes=[{"role":"diretor_arte","scene":"s02"}]` na 1ª vez e `ok` na 2ª. O roteirista roda 1 vez, o diretor_arte 2 vezes e `images.generate` só regenera a cena cujo prompt mudou.
  - `test_review_rounds_capped`: o revisor sempre reprova, então o diretor_arte roda 3 vezes (1 + 2 rodadas) e o job termina `awaiting_approval`.
  - `test_too_many_images_fails_before_generating`: com `max_imagens=2` e 3 cenas de imagem, o job fica `failed` na etapa `cenas`, e `images.generate` é chamado 0 vezes.
  - `test_unapproved_sheet_blocks_images`: um personagem sem `aprovada` deixa o job `failed` em `imagens`, com o nome do personagem no erro.
  - `test_usage_limit_requeues_same_stage`: a voz fake levanta `UsageLimit` e `produce` relança; o job fica `queued` com `stage == "voz"`. Rodando de novo, `roteiro` não roda outra vez.
  - `test_approve_appends_history`: depois de `approve`, `historico.md` contém o `resumo` com "Parte 1".
  - `test_adjust_routes_by_triage`: a triagem fake devolve `roteirista`, então `episodio.json` e todas as etapas seguintes perdem o marcador e `ajustes.md` contém o texto.
  - `test_last_episode_has_no_hook_instruction`: a task do roteirista para o último episódio diz "sem gancho"; para os outros, cita `gancho` com `{n}` = próximo.
- [ ] **Step 2:** escreva os prompts. Cada um diz a função, as entradas (caminhos), o formato exato do arquivo de saída (o schema acima) e a regra "grave o arquivo e responda só com um recibo de até 3 linhas". O roteirista recebe as regras de narração do estilo; o revisor recebe o checklist do spec (personagem consistente, telas legíveis, ritmo, gancho, duração 2–3 min).
- [ ] **Step 3–4:** implemente; `uv run pytest -q` verde.
- [ ] **Step 5: commit** `feat: episode director with file handoff and review loop`

### Task 8: Showrunner (ideias, série, descarte)
**Implementador: sonnet.**

**Files:** Create: `autovideo/showrunner.py`, `autovideo/prompts/showrunner.md`, `tests/test_showrunner.py`

**Interfaces (Produces):**
```python
class PlanoEp(BaseModel): titulo: str; sinopse: str
class Plano(BaseModel): titulo: str; logline: str; episodios: list[PlanoEp]
def ensure_ideia(perfil: str) -> Ideia            # 1ª ideia não usada do banco; se não houver, o showrunner grava 3 ideias (origem "claude") e devolve a 1ª
def plan_series(perfil: str) -> Path              # ensure_ideia → showrunner grava plano.json (num dir temporário dentro do perfil) com exatamente agenda.episodios_por_serie episódios → data.create_serie; marca a ideia usada
def rewrite_synopsis(serie_path: Path, n: int) -> None   # showrunner reescreve só o episódio n com outra abordagem, mantendo título-número e coerência com os vizinhos; atualiza sinopse.md e serie.json
```
A validação do plano checa `len(episodios) == N`. Na falha, a retentativa vem do `run_role`.

- [ ] **Step 1: testes que falham** (agente fake):
  - `test_uses_bank_before_creating`: com uma ideia do usuário no banco, `plan_series` não pede ideias ao agente e marca essa ideia `usada`.
  - `test_creates_ideas_when_bank_empty`: com o banco vazio, o banco fica com 3 ideias `claude` e a 1ª é usada.
  - `test_plan_size_matches_agenda`: com `episodios_por_serie=5`, um plano de 4 falha na validação (o fake corrige na retentativa) e o resultado tem 5.
  - `test_rewrite_keeps_numbering`: só `ep02/sinopse.md` muda, e `serie.json` mantém 3 episódios.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: showrunner for idea bank and series planning`

### Task 9: Fila e agendador
**Implementador: opus** (concorrência, relógio, retomada).

**Files:**
- Create: `autovideo/fila.py`, `tests/test_fila.py`
- Modify: `autovideo/jobs.py` (`JobStore.queued() -> list[dict]`; `requeue_stale() -> int`, que faz in_progress → queued mantendo o stage)

**Interfaces (Produces):**
```python
def state() -> dict                         # fila.json: {"paused","paused_until","reason"}
def pause(reason: str = "pausado", until: float | None = None) -> None
def resume() -> None
def is_paused(now: float) -> bool            # paused e (until is None ou now < until); passado o until, despausa sozinho
def set_series_paused(serie_path: Path, paused: bool) -> None
def next_episode(perfil: str) -> tuple[Path, int] | None
    # série ativa = a última com episódio sem job ou com job não completed. Se não há → showrunner.plan_series.
    # Se o episódio anterior não está completed (aprovado) → None (espera revisão). Série pausada → None.
def tick(store: JobStore, now: datetime, force: str | None = None) -> int | None
    # para cada perfil ativo (ou só `force`, ignorando horário e cota): se hora >= agenda.gerar_as,
    # jobs do perfil criados hoje < por_dia e nenhum job do perfil em queued/in_progress/awaiting_approval/failed
    # → next_episode → episode.new_episode_job. Devolve o id criado (o último) ou None.
def run_next(store: JobStore, now: float) -> bool
    # se não pausado: 1º job queued cuja série não está pausada → claim → episode.produce (kind "episodio")
    # ou analise.run_job (kind "estilo", Task 12). UsageLimit → pause("limite de uso", retry_at or now+3600).
def loop(store: JobStore) -> None            # requeue_stale uma vez; depois para sempre: tick + run_next, sleep 30 s quando ocioso; nunca morre
```
"Hoje" usa a hora local (`datetime.now()`). O perfil de um job sai do `project_dir`, que fica sob `perfis/<slug>/`.

- [ ] **Step 1: testes que falham** (`episode.produce` e `showrunner` por monkeypatch):
  - `test_one_job_per_day_after_days_closed`: o perfil está ativo, `gerar_as=09:00`, e o último job foi há 3 dias. `tick` às 10:00 cria 1 job, e um segundo `tick` às 10:05 cria 0.
  - `test_before_hour_does_nothing`: às 08:59, 0 jobs.
  - `test_waits_for_approval`: com o ep01 `awaiting_approval`, o `tick` do dia seguinte não cria o ep02. Depois de aprovado, cria.
  - `test_failed_job_blocks_new_ones` (Review Focus 4).
  - `test_series_end_plans_next`: com os 3 episódios completed, o `tick` chama `plan_series` e cria o ep01 da série 2.
  - `test_usage_limit_pauses_queue`: `produce` levanta `UsageLimit(retry_at=T)`, então `is_paused` é verdadeiro até T e falso depois. O job fica `queued` (Review Focus 2).
  - `test_requeue_stale_keeps_stage`: um job `in_progress` em `imagens` vira `queued` com `stage == "imagens"` (Review Focus 3).
  - `test_paused_series_skipped`: com 2 jobs queued, e o da série pausada sendo o primeiro, `run_next` roda o outro.
  - `test_force_ignores_hour_and_quota`.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: generation queue and daily scheduler`

### Task 10: API e CLI do motor
**Implementador: sonnet.**

**Files:** Modify: `autovideo/server.py`, `autovideo/cli.py`, `tests/test_server.py`

**Interfaces (Produces) — endpoints JSON:**
| Método e rota | Faz |
|---|---|
| `GET /api/config` | `{"keys": {"ELEVENLABS_API_KEY": bool, "OPENROUTER_API_KEY": bool, "APIFY_TOKEN": bool}, "image_provider", "image_model", "max_imagens"}`. Nunca devolve o valor de uma chave. |
| `PUT /api/config` | grava chaves e settings (`config.save`) |
| `GET /api/estilos`, `GET /api/estilos/{slug}` | lista; `{md, json}` |
| `GET /api/perfis`, `POST /api/perfis {nome}` | lista; cria → `Perfil` |
| `GET /api/perfis/{slug}` | `{perfil, ideias, series:[{path_rel, serie, episodios:[{n, titulo, job, status, stage}]}], personagens, universo:{mundo, historico}}` |
| `PUT /api/perfis/{slug}` | merge parcial validado por `Perfil` (o slug não muda) |
| `PUT /api/perfis/{slug}/universo/mundo` `{texto}` | grava `mundo.md` |
| `POST /api/perfis/{slug}/ideias {texto}`, `DELETE .../ideias/{id}` | banco de ideias |
| `POST /api/perfis/{slug}/gerar` | `fila.tick(force=slug)` em thread, para não bloquear a requisição → `{"ok": true}` |
| `GET /api/fila` | `{**fila.state(), "jobs": [... com perfil, série, n, título]}` |
| `POST /api/fila/pausar`, `POST /api/fila/continuar` | |
| `POST /api/series/pausar {path_rel, paused}` | |
| `GET /api/episodios/{jid}` | `{job, perfil, n, titulo, roteiro, episodio, cenas, revisao, ajustes, decisions, final: url\|null, capa: url\|null}`; as URLs saem de `/projects/...` |
| `POST /api/episodios/{jid}/aprovar` · `/ajustar {texto}` · `/descartar` · `/retomar` | `episode.*` / `store.resume`; os erros de gate viram 409, como hoje (`_gate`) |
| `POST /api/episodios/{jid}/postado {rede}` | acrescenta a rede em `EpisodioRef.postado` |

- O `create_app(store, start_worker=True)` sobe `fila.loop` numa thread daemon (no lugar do `_worker` antigo). O mount `/projects` passa a servir `home()`.
- Todo `{slug}` e todo `path_rel` são validados: o slug precisa existir em `list_perfis`, e o `path_rel` resolvido precisa ficar dentro de `perfis_dir()`. Fora disso, 404.
- **CLI:** `autovideo doctor | serve [--port] | fila | gerar <perfil> | aprovar <jid> | ajustar <jid> <texto> | retomar <jid>`. O `gerar` roda `tick(force)` e depois `run_next` no próprio processo.

- [ ] **Step 1: testes que falham** (`TestClient`, `start_worker=False`, `AUTOVIDEO_HOME` em `tmp_path`):
  - `test_config_never_returns_secret`: depois de `PUT` com a chave `"sk-x"`, o `GET` não contém `"sk-x"` no corpo.
  - `test_profile_crud_and_bad_slug`: `GET /api/perfis/../x` e `GET /api/perfis/nao-existe` dão 404.
  - `test_path_rel_traversal_rejected`: `POST /api/series/pausar` com `path_rel="../../x"` dá 404.
  - `test_episode_actions_conflict`: aprovar um job que não está no gate dá 409.
  - `test_episode_detail_urls`: com `out/final.mp4` presente, `final` começa com `/projects/perfis/`.
  - Mantenha os testes de host/origin.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: series factory API and CLI`

## Parte B — Onboarding, personagens e estilos

### Task 11: Conversas com agente (onboarding e criar estilo)
**Implementador: sonnet.**

**Files:** Create: `autovideo/chat.py`, `autovideo/prompts/{onboarding,estilo_chat}.md`, `tests/test_chat.py`. Modify: `autovideo/server.py`.

**Interfaces (Produces):**
```python
def history(kind: Literal["onboarding","estilo"], slug: str) -> list[dict]      # [{"autor":"voce"|"claude","texto"}]
def send(kind, slug: str, mensagem: str) -> dict   # {"resposta": str, "historico": [...], "etapa": int}
```
- `onboarding`: `cwd = perfis/<slug>`, `ROLES["onboarding"]`, resume pelo `session_id` salvo em `.chat/onboarding.json`. O prompt conduz as 6 etapas do spec (seção "Onboarding de um perfil"), uma por vez, e grava `perfil.json` (sem mudar `slug`), `universo/mundo.md`, `personagens/<p>/ficha.md` (nome + descrição visual em inglês) e `ideias.json`. A etapa 3 manda o usuário gerar e aprovar a folha no painel. Depois de cada turno, `perfil.json` é validado por `Perfil`; se for inválido, o servidor manda o erro ao agente, no mesmo esquema de retentativa do `run_role`.
- `estilo`: `cwd = home()/estilos/<slug>` (criado com `slugify` no 1º envio), `ROLES["estilo_chat"]`. Entrevista e grava `estilo.md` + `estilo.json` (validado por `Estilo`).
- `send` usa o `_query` do SDK com `options_for(...)` e devolve o texto da última mensagem de assistente. `UsageLimit` vira HTTP 429 com a mensagem "Limite de uso do Claude atingido".
- Endpoints: `GET /api/chat/{kind}/{slug}` (histórico) e `POST /api/chat/{kind}/{slug} {mensagem}`.

- [ ] **Step 1: testes que falham** (`_query` fake):
  - `test_resumes_session`: a 2ª chamada passa `resume == session_id` da 1ª.
  - `test_history_persisted`: depois de 2 envios, o histórico tem 4 itens alternados.
  - `test_invalid_profile_triggers_fix_turn`: o fake grava um `perfil.json` com `agenda.episodios_por_serie=20` e o servidor faz um turno extra com a mensagem de validação.
  - `test_slug_preserved`: o agente tenta trocar o `slug` e o servidor restaura o original.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: agent conversations for onboarding and style creation`

### Task 12: Folha de personagem e análise de perfil
**Implementador: sonnet.**

**Files:** Create: `autovideo/personagem.py`, `autovideo/analise.py`, `autovideo/prompts/analista.md`, `tests/test_personagem.py`, `tests/test_analise.py`. Modify: `autovideo/server.py`, `autovideo/fila.py` (despacho do kind "estilo").

**Interfaces (Produces):**
```python
# personagem.py
SHEET_PROMPT = "character reference sheet, same character in front, 3/4, side and back views, plus 3 facial expressions, neutral light grey background, full body, consistent outfit and proportions"
def gerar_folha(perfil: str, p: str) -> None      # images.generate(estilo.imagem_prefixo + ", " + SHEET_PROMPT + ", " + ficha.md, [], folha.png, aspect="16:9"); remove "aprovada"
def aprovar_folha(perfil: str, p: str) -> None    # cria "aprovada"; erro se folha.png não existe
# analise.py
def criar_job(store, handle: str) -> int          # slug = slugify(handle); dir home()/estilos/<slug>/.analise; job kind "estilo"
def run_job(store, jid) -> str                    # 1) Apify: POST https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items
                                                  #    (Authorization: Bearer APIFY_TOKEN, {"username":[handle],"resultsLimit":3}); baixa os videoUrl
                                                  # 2) por vídeo: transcribe → texto; folha de frames (1 por 3 s, grade 4×N, ffmpeg tile) em .analise/
                                                  # 3) run_role(ROLES["analista"], estilo_dir, ...) grava estilo.md + estilo.json (validate Estilo)
```
- Instagram é o único na v1. Um handle com `@` ou URL `instagram.com/<handle>` é normalizado. O token vem de `config.get_key("APIFY_TOKEN")`.
- Endpoints: `POST /api/perfis/{slug}/personagens/{p}/folha` (síncrono), `POST .../aprovar`, `POST /api/estilos/analisar {handle}` → `{job}`.
- O prompt do analista proíbe copiar personagem, mundo ou história: só o estilo (anti-objetivo do spec).

- [ ] **Step 1: testes que falham:**
  - `test_sheet_regeneration_clears_approval`.
  - `test_approve_requires_sheet`.
  - `test_handle_normalization`: `"@manualdobenji"` e `"https://www.instagram.com/manualdobenji/"` viram `"manualdobenji"`.
  - `test_analise_pipeline_with_fakes`: Apify fake (MockTransport) devolve 1 vídeo (fixture ffmpeg), `transcribe` fake e analista fake; o estilo aparece em `list_estilos` com origem `usuario`.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat: character sheets and Instagram style analysis`

## Parte C — Painel (visual Lum Studio)

Regras para as tasks 13–16:
- Antes de cada componente, a busca Kobra → shadcn → índice, de `docs/ui-components.md`. Todo componente escrito à mão entra na tabela desse doc.
- Os testes usam vitest + Testing Library, no padrão de `web/src/**/*.test.tsx`.
- Verificação: `cd web && npm run lint && npm test && npm run build`.

### Task 13: Tokens Lum, shell e limpeza do M1 no web
**Implementador: sonnet.**

**Files:**
- Delete: `web/src/pages/NewVideo*`, `web/src/pages/Workspace.tsx`, `web/src/components/workspace/`, `web/src/lib/{compose-form,tracks,transcript,joined-script}*`
- Modify: `web/src/index.css`, `web/src/App.tsx`, `web/src/api.ts`, `web/src/lib/route.ts`, `web/src/components/AppSidebar.tsx`
- Create: `web/src/pages/Configuracoes.tsx` (ou dialog)

**Leia antes:** `../Claude/Projects/fluwe/clientes/renatha/lum-ai/.superdesign/design-system.md` e `frontend/src/style.css` (só o visual).

- Tokens em `index.css`, mapeados para as variáveis do shadcn: surface `#FFFFFF`, surface-muted `#F3F4F6`, ink `#0A0A0A`, ink-muted `#716C63`, hairline `#E5E7EB`, primary `#0A0A0A` (hover `#2A2927`), accent `#FF4081`, radius control 10px / panel 12px. Cormorant Garamond (Google Fonts) só no wordmark e nos títulos display; Geist Mono para números; a sans do sistema no resto.
- Rotas (`route.ts`, hash): `perfis`, `perfil/<slug>[/<aba>]`, `onboarding/<slug>`, `estilos`, `estilo/<slug>`, `fila`, `revisao[/<jid>]`, `config`.
- Sidebar `#F3F4F6`, ~252px, variant inset: wordmark; seletor de perfil (select); botão preto **Criar** (menu: Novo perfil, Novo estilo); links Fila e Revisão (com contagem de aguardando), Estilos, Configurações; "Conta Claude" no rodapé, como hoje.
- `api.ts`: tipos e funções para todos os endpoints da Task 10–12.
- Configurações: as chaves aparecem como campo de senha com o estado "salva"/"não salva", nunca o valor. Também ficam ali o provedor de imagem (só OpenRouter habilitado; Higgsfield desabilitado com "em breve"), o modelo e o limite de imagens.

- [ ] **Step 1: testes que falham:** `route.test.ts` cobre o parse/format de todas as rotas; `AppSidebar.test.tsx` cobre o seletor de perfil e a contagem de revisão; `Configuracoes.test.tsx` checa que nenhum input mostra o valor da chave e que salvar chama `PUT /api/config`.
- [ ] **Step 2–4:** falhar, implementar, verde (lint + test + build).
- [ ] **Step 5: commit** `feat(web): Lum visual shell, remove M1 screens`

### Task 14: Perfis, onboarding e personagens
**Implementador: sonnet.**

**Files:** Create: `web/src/pages/Perfis.tsx`, `web/src/pages/Onboarding.tsx`, `web/src/components/Chat.tsx`, `web/src/components/FolhaPersonagem.tsx`, com os testes ao lado.

- **Perfis:** cards com nome, assunto, estilo, ativo/pausado e o próximo horário. "Novo perfil" pede o nome, faz `POST` e vai para o onboarding.
- **Onboarding:** à esquerda, o chat (`Chat`, que procura antes `conversation`/`message`/`chat-input` da Kobra, com fallback textarea + card). À direita, um painel das 6 etapas com o estado vindo de `perfil.onboarding`, e os personagens com `FolhaPersonagem`: Gerar folha, imagem, Aprovar, Gerar de novo. "Ativar perfil" fica habilitado só com ≥1 folha aprovada e estilo definido.
- O erro 429 do chat vira um toast: "Limite de uso do Claude atingido".

- [ ] **Step 1: testes que falham:** `Chat` envia, mostra a resposta e trava o input durante o envio; `FolhaPersonagem` mostra Aprovar só com a folha existente; `Onboarding` deixa "Ativar" desabilitado sem folha aprovada.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat(web): profiles, onboarding chat and character sheets`

### Task 15: Página do perfil e estilos
**Implementador: sonnet.**

**Files:** Create: `web/src/pages/Perfil.tsx`, `web/src/pages/Estilos.tsx`, com os testes.

- **Perfil**, em abas:
  - **Séries:** cada série com os episódios, o status/etapa de cada um, e os botões Pausar/Continuar série e "Gerar próximo episódio" (`POST /gerar`).
  - **Banco de ideias:** adicionar, remover, com origem e usada.
  - **Universo:** editar `mundo.md`, ver `historico.md` e as fichas.
  - **Agenda:** horário de gerar, por dia, horários de postar, episódios por série (1–10), voz (voice_id) e estilo (select).
  - **Contas:** as 4 redes com o estado "Não conectada" e o botão "Conectar" desabilitado, com dica "chega numa próxima versão". Nunca a palavra "opcional".
- **Estilos:** lista (fábrica/usuário); ver `estilo.md`; "Analisar perfil" (handle → job, que aparece na Fila); "Criar conversando" (`Chat` com kind `estilo`).

- [ ] **Step 1: testes que falham:** a Agenda rejeita 11 episódios no cliente e envia o `PUT` certo; Contas não contém o texto "opcional"; Ideias adiciona e remove.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat(web): profile tabs and styles`

### Task 16: Fila e revisão
**Implementador: sonnet.**

**Files:** Create: `web/src/pages/Fila.tsx`, `web/src/pages/Revisao.tsx`, com os testes.

- **Fila:**
  - um banner de estado (rodando / pausada / "pausada até HH:MM — limite de uso") e Pausar/Continuar;
  - o job atual com a barra de etapas (`STAGES` do episódio, nome legível: Roteiro, Cenas, Voz, Imagens, Sons, Montagem, Render, Revisão, Aprovação);
  - a lista por status;
  - em job failed: o erro e "Retomar".
- **Revisão:**
  - a lista dos que aguardam aprovação;
  - o detalhe com o player (`video` da Kobra), a capa, a legenda + hashtags (botão "Copiar legenda"), o roteiro e os fixes do revisor;
  - os botões Aprovar, Pedir ajuste (textarea), Descartar (com confirmação) e **Exportar** (baixa `final.mp4` e copia a legenda);
  - "Marcar como postado" por rede.
- Poll de 3 s (`usePoll`).

- [ ] **Step 1: testes que falham:** Exportar copia legenda + hashtags para o clipboard e aponta para `final`; Descartar pede confirmação; Pedir ajuste exige texto; o banner mostra "limite de uso" quando `reason` contém isso.
- [ ] **Step 2–4:** falhar, implementar, verde.
- [ ] **Step 5: commit** `feat(web): queue and review screens`

## Parte D — Fechamento

### Task 17: Docs e ponta a ponta
**Implementador: sonnet.**

**Files:** Modify: `README.md` (tirar a nota "Em transição"; uso novo: Configurações, onboarding, fila, revisão, CLI; chaves), `docs/ui-components.md` (estado atual + componentes à mão), `CLAUDE.md` (tirar a frase sobre o código do M1). Create: `tests/test_e2e.py`.

- [ ] **Step 1:** `test_e2e_one_episode` (fixture `slow` + chaves reais presentes, senão skip): cria um perfil com estilo Benji, um personagem com folha gerada e aprovada, e `force` tick + `run_next`. O job termina `awaiting_approval`; `final.mp4` tem 1080×1920 e 30 fps; `decisions.log` tem as entradas de roteirista, diretor_arte e revisor com `model`.
- [ ] **Step 2:** `uv run pytest -q` verde; `cd web && npm run lint && npm test && npm run build` verde.
- [ ] **Step 3: commit** `docs: series factory usage; e2e test`
