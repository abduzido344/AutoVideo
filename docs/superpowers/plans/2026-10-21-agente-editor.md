# Agente editor, guias de roteiro e checagem da voz — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** colocar o HyperFrames 0.8.163 e uma etapa `edicao` (editor Opus com skills do HyperFrames e fallback para a montagem determinística) no pipeline de episódio. No mesmo plano entram os guias `_direcao.md` e `_roteiro.md`, o `estilo.md` em 10 seções e a checagem da voz por transcrição.

**Architecture:** a montagem continua determinística e passa a guardar `composition.base/`. A etapa nova `edicao` sempre parte da base, roda o papel `editor` com Bash restrito à CLI fixada e valida em Python (`check` + invariantes de sincronia). Se o editor falhar, a base é restaurada. Os guias são arquivos de prompt anexados a papéis específicos. A checagem da voz é Python puro sobre `transcribe.transcribe`.

**Tech Stack:** Python 3.11+, pydantic, httpx, Claude Agent SDK, HyperFrames CLI 0.8.163 via `npx`, pytest; painel React + Vite + Tailwind v4 + shadcn/Kobra (vitest).

**Spec:** `docs/superpowers/specs/2026-10-21-agente-editor-design.md` (adendo), sobre `docs/superpowers/specs/2026-10-21-autovideo-series-design.md`.

## Global Constraints
- **CLI:** fixada em `hyperframes@0.8.163` (`hf.HF_VERSION`). Nenhuma outra versão em código, teste ou prompt.
- **Skills do editor:** vêm da tag `v0.8.163` do repositório `heygen-com/hyperframes`, nunca de `~/.claude/skills` nem do `skills update`, que segue o `HEAD` do GitHub. Ver o desvio do spec na Task 2.
- **Bash:** só o papel `editor` roda Bash, e só `npx --yes hyperframes@0.8.163 <cmd>` com `cmd` em `lint`, `check`, `snapshot`, `timeline`, `compositions`, `catalog`, `add`, `keyframes`, `docs`, `history`. Nenhum outro papel ganha Bash.
- **Escrita do editor:** só em `./composition/**` e `./edicao.json`. As negações atuais (`.claude`, `approvals`, `out`, `.stages`) continuam para todos os papéis.
- **Papel `editor`:** `Role("editor", "opus", max_turns=60, max_usd=5.0, ...)`.
- **Telemetria:** `HYPERFRAMES_NO_TELEMETRY=1` e `DO_NOT_TRACK=1` em toda chamada ao HyperFrames, pelo `hf.run` e pelo `env` das opções dos agentes.
- **Nunca postar sem aprovação.** Nenhuma task toca postagem.
- **Voz:** limite de semelhança `0.85`, uma regeração só, nunca trava o episódio.
- **Licenças:** `_direcao.md`, `_roteiro.md` e o modelo de `estilo.md` levam o cabeçalho de origem. `THIRD_PARTY.md` na raiz registra o lemo-opuscar (MIT, commit `b5e8ef9`, "Copyright (c) 2026 LemoLab") e o heygen-com/hyperframes (Apache-2.0, tag `v0.8.163`), com o texto das duas licenças. Os textos Apache levam o aviso de modificação.
- **UI:** antes de qualquer componente, procurar pronto (Kobra → shadcn → índice), conforme `docs/ui-components.md`.
- **Idioma:** prompts, mensagens e textos de UI em português.

## Review Focus
1. **O editor embrulha um clipe num elemento novo e move o `data-start` para o pai.** A invariante precisa reprovar, porque o `id` original perdeu os atributos. Teste em `test_edicao.py::test_wrapper_moving_timing_fails` (Task 4).
2. **Processo morto no meio da edição**, com `composition/` meio editada e sem `edicao.json`. A retomada precisa restaurar da base antes de chamar o editor de novo. Teste em `test_episode.py::test_edicao_resume_starts_from_base` (Task 6).
3. **Montagem refeita depois de um ajuste em `cenas`.** `composition.base/` é substituída, e o cache da edição não reaproveita uma edição de base antiga. Teste em `test_episode.py::test_new_base_misses_edicao_cache` (Task 6).
4. **Cena de 1–2 palavras** ("PLIC!"). A semelhança é instável e não pode disparar regeração. Abaixo de 3 palavras a checagem é pulada. Teste em `test_voz_check.py::test_short_narration_skipped` (Task 11).
5. **Rede caindo no meio do download das skills.** Não pode sobrar diretório parcial nem estragar uma versão já instalada. Teste em `test_skills_sync.py::test_failed_download_keeps_previous` (Task 2).

---

### Task 1: Passo 0 — HyperFrames 0.8.163 e telemetria desligada

**Files:**
- Modify: `autovideo/hf.py` (`HF_VERSION`, env padrão do `run`)
- Modify: `autovideo/transcribe.py:54` (comentário "0.8.158" → comportamento conferido na 0.8.163)
- Test: `tests/test_hf.py`, `tests/test_doctor.py:40`

**Interfaces:**
- Produces: `hf.HF_VERSION == "0.8.163"`, `hf.HF == ["npx", "--yes", "hyperframes@0.8.163"]`, `hf.NO_TELEMETRY = {"HYPERFRAMES_NO_TELEMETRY": "1", "DO_NOT_TRACK": "1"}`. Por padrão, `hf.run` mescla `NO_TELEMETRY` no env, e um `env` passado explicitamente vence.

- [ ] **Step 1: Atualizar os testes**
  - `test_plain_exe_unchanged`: `hf.HF == ["npx", "--yes", "hyperframes@0.8.163"]`.
  - `test_doctor_skills_checks_required_skills`: regex com `0\.8\.163`. A Task 2 reescreve esse teste.
  - Novo `test_run_disables_hyperframes_telemetry`: roda `sys.executable -c "import os;print(os.environ['HYPERFRAMES_NO_TELEMETRY'], os.environ['DO_NOT_TRACK'])"` e espera `["1", "1"]`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_hf.py -v` → FAIL em `test_plain_exe_unchanged` e `test_run_disables_hyperframes_telemetry`.
- [ ] **Step 3: Implementar:** `HF_VERSION = "0.8.163"`, `NO_TELEMETRY`, e `env={**os.environ, **NO_TELEMETRY, **(env or {})}` em `run`.
- [ ] **Step 4: Rodar a suíte rápida:** `pytest -q` → PASS, exceto o teste de skills do doctor, que é da Task 2.
- [ ] **Step 5: Conferir na CLI real**, com `AV_SLOW=1`: `AV_SLOW=1 pytest tests/test_render.py tests/test_transcribe.py tests/test_montage.py -v` → PASS.
  - Se falhar, corrigir o parse em `render.check` ou em `transcribe.transcribe` e anotar a mudança no comentário.
  - Se não houver conserto simples: voltar o `HF_VERSION`, parar o plano e registrar o motivo no adendo (seção "Passo 0").
- [ ] **Step 6: Commit:** `git commit -m "chore: HyperFrames 0.8.163 e telemetria desligada"`

### Task 2: Skills fixadas da tag v0.8.163

**Desvio do spec (registrar no adendo neste task):** o adendo previa `skills update` na versão fixada e o doctor lendo `skills check --json`. Mas o `skills check` da 0.8.163 compara com o `HEAD` do GitHub e marca `hyperframes-core`, `-animation`, `-creative`, `-keyframes`, `-audio` e `-studio` como `removed`. Testado em 2026-10-21. O `skills update` faria o prune dessas skills. Por isso as skills do editor passam a ser baixadas arquivo por arquivo da tag `v0.8.163` para `AUTOVIDEO_HOME/skills/0.8.163/`, e o doctor confere essa pasta.

**Files:**
- Create: `autovideo/skills_sync.py`
- Modify: `autovideo/agents.py:71-85` (`missing_skills` e `install_skills` leem de `skills_sync.skills_dir()`)
- Modify: `autovideo/doctor.py:28,64-67` (`SKILLS` → `skills_sync.EDITOR_SKILLS`, mensagem nova)
- Modify: `autovideo/cli.py` (subcomando `skills`)
- Modify: `docs/superpowers/specs/2026-10-21-agente-editor-design.md` (Passo 0, itens 3 e 4: fonte das skills e doctor)
- Test: `tests/test_skills_sync.py`, `tests/test_agents.py:176-203`, `tests/test_doctor.py:35-43`

**Interfaces:**
- Produces:
  - `skills_sync.EDITOR_SKILLS = ("hyperframes", "hyperframes-core", "hyperframes-animation", "hyperframes-keyframes", "hyperframes-registry", "hyperframes-audio", "hyperframes-creative", "hyperframes-cli")`
  - `skills_sync.REPO = "heygen-com/hyperframes"`
  - `skills_sync.skills_dir(version: str = hf.HF_VERSION) -> Path`: `home() / "skills" / version`
  - `skills_sync.sync(names=EDITOR_SKILLS, client: httpx.Client | None = None) -> Path`
  - `skills_sync.missing(names) -> list[str]`: nomes sem `<skills_dir>/<nome>/SKILL.md`
  - `agents.missing_skills(names) -> str | None`: a mensagem termina com `Rode: autovideo skills`

- [ ] **Step 1: Testes em `test_skills_sync.py`**, com `httpx.MockTransport`:
  - A árvore vem de `GET https://api.github.com/repos/heygen-com/hyperframes/git/trees/v0.8.163?recursive=1`, e os arquivos de `https://raw.githubusercontent.com/heygen-com/hyperframes/v0.8.163/<path>`.
  - `test_sync_downloads_only_named_skills`: a árvore tem `skills/hyperframes-core/SKILL.md`, `skills/hyperframes-core/references/a.md` e `skills/slideshow/SKILL.md`. `sync(("hyperframes-core",))` grava os dois primeiros sob `skills_dir()` e não grava `slideshow`.
  - `test_failed_download_keeps_previous`: com uma versão já instalada, um 500 no segundo arquivo levanta `hf.ToolError`, o conteúdo antigo continua igual e não sobra nenhum `*.tmp*` em `home()/"skills"`.
  - `test_missing_lists_absent`: `missing(("a", "b"))` com só `a/SKILL.md` presente → `["b"]`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_skills_sync.py -v` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar `sync`:**
  - Uma chamada à API de árvore, depois um GET raw por blob sob `skills/<nome>/`.
  - Grava tudo em `skills_dir().with_name(version + ".tmp")` e só no fim faz `os.replace` sobre `skills_dir()`, apagando a anterior antes do replace.
  - Qualquer erro HTTP vira `hf.ToolError` e o diretório temporário é removido.
- [ ] **Step 4: Ajustar `agents`, `doctor` e `cli`:**
  - Em `test_agents.py`, `_skills_home` passa a criar as skills em `skills_sync.skills_dir()` (com `AUTOVIDEO_HOME` em `tmp_path`), e o regex vira `x1, x2.*autovideo skills`.
  - `test_doctor_skills_checks_required_skills` usa `EDITOR_SKILLS`.
  - `autovideo skills` chama `sync()` e imprime o caminho.
- [ ] **Step 5: Rodar:** `pytest tests/test_skills_sync.py tests/test_agents.py tests/test_doctor.py -v` → PASS.
- [ ] **Step 6: Atualizar o adendo** (Passo 0, itens 3 e 4) com o desvio acima.
- [ ] **Step 7: Commit:** `git commit -m "feat: skills do editor fixadas na tag v0.8.163"`

### Task 3: A montagem guarda a composição base

**Files:**
- Modify: `autovideo/episode.py:196-201` (`montagem`)
- Test: `tests/test_episode.py`

**Interfaces:**
- Produces: depois da etapa `montagem`, `ep/"composition.base"` é cópia idêntica de `ep/"composition"`. Uma base anterior é apagada antes da cópia.

- [ ] **Step 1: Teste `test_montagem_saves_base`:** depois de `produce`, `(ep/"composition.base"/"index.html").read_text() == "<html>"`, que é o que o `build` fake grava. Uma segunda montagem com `index.html` diferente substitui a base.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_episode.py::test_montagem_saves_base -v` → FAIL.
- [ ] **Step 3: Implementar:** no fim de `montagem`, `shutil.rmtree(base, ignore_errors=True)` e depois `shutil.copytree(comp, base)`.
- [ ] **Step 4: Rodar:** `pytest tests/test_episode.py -v` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: montagem guarda composition.base"`

### Task 4: Invariantes da edição (Python)

**Files:**
- Create: `autovideo/edicao.py`
- Test: `tests/test_edicao.py`

**Interfaces:**
- Produces:
  - `edicao.TIMED_PREFIXES = ("voz-", "img-", "screen-", "sfx-", "legenda-", "ambiente")`
  - `edicao.timed(html: str) -> dict[str, tuple[str | None, str | None]]`: `id` → (`data-start`, `data-duration`) dos elementos cujo `id` começa com um dos prefixos.
  - `edicao.root_duration(html: str) -> str | None`: `data-duration` do elemento com `data-composition-id="main"`.
  - `edicao.media_srcs(html: str) -> set[str]`: `src` de todo `<img>` e `<audio>`.
  - `edicao.invariantes(base: Path, comp: Path) -> list[str]`: mensagens em português, lista vazia quando está ok.
  - `edicao.restaurar_base(ep: Path) -> None`: `rmtree(ep/"composition")` e depois `copytree(ep/"composition.base", ep/"composition")`.

Regras de `invariantes`, todas lidas de `index.html` com `html.parser.HTMLParser`, sem depender do formato do `timeline --json`:
1. Todo `id` de `timed(base)` existe na editada, com o mesmo par (start, duration).
2. `root_duration` é igual.
3. `media_srcs(base) <= media_srcs(comp)`.
4. Se a base não tem nenhum `legenda-*`: a editada também não tem, e nenhum `data-composition-src` da editada contém `caption`.

- [ ] **Step 1: Testes**, com HTMLs mínimos no estilo do que `montage.build` gera:
  - `test_untouched_passes` → `[]`.
  - `test_changed_voice_start_fails`: a mensagem cita `voz-s01`.
  - `test_wrapper_moving_timing_fails` (Review Focus 1).
  - `test_root_duration_change_fails`.
  - `test_removed_audio_fails`.
  - `test_added_transition_and_media_passes`: um `<div class="clip" data-composition-src="compositions/whip-pan.html" ...>` novo e um `<img>` novo → `[]`.
  - `test_caption_added_without_legenda_fails`.
  - `test_restaurar_base_replaces_partial_edit`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_edicao.py -v` → FAIL.
- [ ] **Step 3: Implementar** as funções acima. Um único parser coleta os atributos de todos os elementos.
- [ ] **Step 4: Rodar:** `pytest tests/test_edicao.py -v` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: invariantes de sincronia da edição"`

### Task 5: Papel `editor` e opções por papel

**Files:**
- Modify: `autovideo/agents.py` (`Role`, `ROLES`, `options_for`)
- Create: `autovideo/prompts/editor.md`
- Test: `tests/test_agents.py`

**Interfaces:**
- Consumes: `hf.HF`, `hf.NO_TELEMETRY` (Task 1), `skills_sync.EDITOR_SKILLS` (Task 2).
- Produces:
  - Campos novos em `Role`: `edit: tuple[str, ...] = ("./**",)`, `bash: tuple[str, ...] = ()`, `guias: tuple[str, ...] = ()`.
  - `agents.EDITOR_CMDS = ("lint", "check", "snapshot", "timeline", "compositions", "catalog", "add", "keyframes", "docs", "history")`
  - `ROLES["editor"] = Role("editor", "opus", max_turns=60, max_usd=5.0, skills=EDITOR_SKILLS, edit=("./composition/**", "./edicao.json"), bash=EDITOR_CMDS, guias=("_direcao.md",))`
  - `options_for`:
    - `allowed_tools = ["Read(./**)", *(f"Edit({p})" for p in role.edit), "Glob", "Grep", *(f"Bash({' '.join(HF)} {c}:*)" for c in role.bash)]`
    - `system_prompt = context + guias (PROMPTS/<guia>, nessa ordem) + PROMPTS/<role>.md`
    - `env = dict(hf.NO_TELEMETRY)`
    - O restante não muda.

- [ ] **Step 1: Testes:**
  - `test_options_restrict_paths_no_bash` continua passando sem mudança (papel padrão).
  - `test_editor_tools`: `"Edit(./composition/**)"` e `"Edit(./edicao.json)"` estão nas ferramentas, `"Edit(./**)"` não está, e `"Bash(npx --yes hyperframes@0.8.163 check:*)"` está. Nenhum `Bash(... render...)`, `preview` ou `publish`.
  - `test_only_editor_has_bash`: para todo papel em `ROLES` diferente de `editor`, nenhuma ferramenta começa com `Bash`.
  - `test_guias_go_between_context_and_role_prompt`: um `Role("teste", "haiku", guias=("teste.md",))` gera `CTX`, depois o texto do guia, depois o do papel, nessa ordem.
  - `test_options_env_disables_telemetry`.
  - `test_roles_table`: o conjunto de papéis opus passa a incluir `editor`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_agents.py -v` → FAIL.
- [ ] **Step 3: Implementar** os campos, `ROLES["editor"]` e `options_for`.
- [ ] **Step 4: Escrever `prompts/editor.md`**, com as seções do adendo:
  - "O que o editor recebe e o que pode fazer";
  - "O prompt `editor.md` sobrescreve estes padrões das skills";
  - os comandos com o prefixo exato `npx --yes hyperframes@0.8.163`;
  - a busca no catálogo sempre em inglês, e `add <item> --json --no-clipboard`;
  - no máximo 1 efeito WebGPU/shader por episódio;
  - não mexer em `id`, `data-start` ou `data-duration` dos elementos `voz-*`, `img-*`, `screen-*`, `sfx-*` e `ambiente`: anima um filho ou um elemento novo;
  - `history begin --who editor` no início e `history undo --who editor` quando o `check` piorar;
  - a saída `edicao.json` no formato da Task 6, com um motivo por mudança.
- [ ] **Step 5: Rodar:** `pytest tests/test_agents.py -v` → PASS.
- [ ] **Step 6: Smoke real** (`AV_SLOW=1`, manual):
  - Num episódio já montado, rodar `run_role(ROLES["editor"], ep, "Rode lint e depois tente render; grave edicao.json com o que aconteceu.", ep/"edicao.json")`.
  - Esperado no `decisions.log`: o `lint` rodou e o `render` foi negado.
  - Se a regra `:*` não casar no SDK, trocar para a forma com espaço (`Bash(<prefixo> <cmd> *)`), ajustar o teste e repetir.
- [ ] **Step 7: Commit:** `git commit -m "feat: papel editor com Bash restrito ao HyperFrames"`

### Task 6: Etapa `edicao` no pipeline, com fallback e cache

**Files:**
- Modify: `autovideo/artefatos.py` (modelos `Edicao` e `MudancaEdicao`)
- Modify: `autovideo/episode.py` (`edicao`, `STAGES`)
- Test: `tests/test_episode.py` (o `Fake` ganha o papel `editor`)

**Interfaces:**
- Consumes: `edicao.invariantes` e `edicao.restaurar_base` (Task 4), `ROLES["editor"]` (Task 5), `render.check`.
- Produces:
  - `MudancaEdicao(BaseModel)`: `scene: str | None = None`, `o_que: str`, `motivo: str` (não vazio, validado com `min_length=1`).
  - `Edicao(BaseModel)`: `fallback: bool = False`, `motivo: str = ""`, `itens: list[str] = []`, `mudancas: list[MudancaEdicao] = []`, `sha: str = ""`, `cache: bool = False`.
  - `episode.edicao(ctx) -> None`.
  - `STAGES` ganha `("edicao", "edicao.json", edicao)` entre `montagem` e `render`.

**Comportamento de `edicao`:**
1. **Hash:** `sha = _sha(base/index.html bytes, json dos campos "edicao" das cenas em ordem, estilo.md, conteúdo de ajustes.md ou "", hf.HF_VERSION, PROMPTS/"editor.md" texto)`. O campo `Cena.edicao` é da Task 7; até lá, `getattr(c, "edicao", "")`.
2. **Cache:** se `ep/"edicao"/"cache.json"` tem `sha` e o diretório dele existe, copia esse diretório para `composition/`, grava `edicao.json` com o recibo salvo mais `cache: true` e retorna.
3. **Edição:** chama `restaurar_base(ep)` e depois `run_role(editor, ep, task, ep/"edicao.json", valida, context=data.context_for(perfil))`.
   - `valida` faz `Edicao.model_validate_json`, depois `render.check(ep/"composition", "9:16")` e `edicao.invariantes(...)`. Se sobrar alguma mensagem, levanta `ValueError` com elas.
   - A `task` lista os caminhos: `cenas.json`, `composition/` e o estilo está no contexto.
4. **Sucesso:** copia `composition/` para `ep/"edicao"/sha[:16]`, salva o cache com o recibo e grava `edicao.json` com o `sha`.
5. **`UsageLimit`:** relança. Fica antes do `except AgentOutputError`, porque é subclasse dele.
6. **`AgentOutputError` ou `hf.ToolError`:**
   - chama `restaurar_base(ep)`;
   - grava `edicao.json` com `{"fallback": true, "motivo": str(e)[:300], "sha": sha}`;
   - registra `{"stage": "edicao", "fallback": true}` com `Project(ep).log`.

   Nada é cacheado no fallback.

- [ ] **Step 1: Testes**, com o `Fake` gravando `{"mudancas": [{"scene": "s01", "o_que": "whip-pan", "motivo": "virada"}]}` para `editor`:
  - `test_full_run_stops_at_approval`: `edicao` aparece entre as etapas concluídas.
  - `test_editor_failure_falls_back_to_base`: o fake levanta `AgentOutputError`. O episódio chega a `awaiting_approval`, `edicao.json` diz `fallback: true` e `composition/index.html == base`.
  - `test_invariant_violation_feeds_retry`: um validador que reprova cai no fallback depois das tentativas do fake.
  - `test_editor_usage_limit_pauses_at_edicao`: o job fica `queued` na etapa `edicao`, sem `edicao.json`.
  - `test_edicao_cache_skips_editor`: depois de um `produce` completo, `jobs.invalidate_from(ep, STAGES, "edicao")` seguido de `produce` não chama o editor de novo (`fake.calls["editor"] == 1`), e `edicao.json` tem `cache: true`.
  - `test_edicao_resume_starts_from_base` (Review Focus 2).
  - `test_new_base_misses_edicao_cache` (Review Focus 3).
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_episode.py -v` → FAIL.
- [ ] **Step 3: Implementar** `Edicao`, `MudancaEdicao`, `episode.edicao` e `STAGES`.
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: etapa edicao com fallback para a montagem"`

### Task 7: Intenção de edição por cena

**Files:**
- Modify: `autovideo/artefatos.py:30-38` (`Cena.edicao: str = ""`)
- Modify: `autovideo/prompts/diretor_arte.md` (campo `edicao`: frase curta de intenção ligada à narração; vazio = bom senso dentro do estilo)
- Modify: `autovideo/episode.py` (o hash da Task 6 usa `c.edicao` direto)
- Test: `tests/test_episode.py`

- [ ] **Step 1: Teste `test_cena_edicao_changes_cache_key`:** mudar o `edicao` de uma cena faz o editor rodar de novo. `Cena` sem o campo continua válida.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_episode.py::test_cena_edicao_changes_cache_key -v` → FAIL.
- [ ] **Step 3: Implementar** o campo, o prompt e a troca do `getattr`.
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: diretor de arte declara intenção de edição por cena"`

### Task 8: Revisor e triagem podem mandar refazer a edição

**Files:**
- Modify: `autovideo/artefatos.py:65-68` (`Fix.role: Literal["roteirista", "diretor_arte", "editor"]`)
- Modify: `autovideo/episode.py:16` (`REDO["editor"] = "edicao"`)
- Modify: `autovideo/prompts/revisor.md`, `autovideo/prompts/triagem.md` (o papel `editor`: transição, efeito, câmera, mixagem; na triagem, a dúvida entre `editor` e `diretor_arte` vai para `diretor_arte`)
- Test: `tests/test_episode.py`

- [ ] **Step 1: Testes:**
  - `test_reviewer_fix_to_editor_redoes_only_edicao`: `{"role": "editor", ...}` refaz `edicao`, `render` e `revisao`. `roteirista`, `diretor_arte` e `tts` não são chamados de novo, e o cache da edição **não** é usado porque `ajustes.md` mudou e entra no hash (Task 6).
  - `test_adjust_to_editor`: a triagem retorna `editor`, e `done(ep, "montagem", ...)` continua verdadeiro.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_episode.py -v` → FAIL.
- [ ] **Step 3: Implementar.** O `editor.md` (Task 5) ganha a frase "Se `ajustes.md` existir, aplique as correções endereçadas a você (editor)". A tarefa da edição usa `_ajustes(ep)`.
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: revisor e triagem roteiam correções para o editor"`

### Task 9: Painel mostra a etapa Edição e o fallback

**Files:**
- Modify: `autovideo/server.py:444-447` (`"edicao": _json(ep / "edicao.json")`)
- Modify: `web/src/lib/etapas.ts` (`["edicao", "Edição"]` depois de `montagem`)
- Modify: `web/src/pages/Producao.tsx` (`Revisao`: quando `ep.edicao?.fallback`, um aviso "Edição simplificada: o editor falhou e o vídeo saiu pela montagem básica." com o `motivo`, usando `components/ui/badge.tsx`)
- Test: `tests/test_server.py`, `web/src/pages/Producao.test.tsx`

- [ ] **Step 1: Testes:**
  - O `get_episodio` devolve `edicao`.
  - Em `Producao.test.tsx`, um episódio com `edicao: {fallback: true, motivo: "orçamento"}` mostra "Edição simplificada" e "orçamento". Sem fallback, o aviso não aparece.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_server.py -k episodio -v` e `cd web && npx vitest run src/pages/Producao.test.tsx` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** os mesmos comandos → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat(web): etapa Edição e aviso de fallback na revisão"`

### Task 10: `_direcao.md`, `_roteiro.md` e `THIRD_PARTY.md`

**Files:**
- Create: `autovideo/prompts/_direcao.md` (adendo, seção "1. `DIRECTOR.md` nos prompts do editor e do Revisor")
- Create: `autovideo/prompts/_roteiro.md` (adendo, seção "Roteirista: regras novas", itens 1–7, e "Showrunner: ao planejar a série", itens 1–3)
- Create: `THIRD_PARTY.md`
- Modify: `autovideo/agents.py` (`ROLES`: `revisor` com `guias=("_direcao.md",)`; `roteirista` e `showrunner` com `guias=("_roteiro.md",)`)
- Modify: `autovideo/prompts/revisor.md` (a checklist ganha os itens de `_direcao.md`; um problema de direção vira `Fix` com `role: "editor"`)
- Test: `tests/test_agents.py`

**Fontes**, adaptadas e em português, nunca coladas:
- `DIRECTOR.md` §3, §6–§11 do lemo-opuscar, commit `b5e8ef9`;
- `skills/hyperframes-creative/references/narration.md` e `skills/faceless-explainer/references/story-design.md` da tag `v0.8.163`, tiradas da pasta da Task 2 ou do GitHub.

- [ ] **Step 1: Testes:**
  - `test_guias_have_license_header`: os dois arquivos começam com `<!-- Adaptado de` e contêm `MIT` (os dois) e `Apache-2.0` + `modificado` (`_roteiro.md`).
  - `test_role_guias`: `ROLES["revisor"].guias == ("_direcao.md",)`, `ROLES["editor"].guias == ("_direcao.md",)` e `ROLES["roteirista"].guias == ROLES["showrunner"].guias == ("_roteiro.md",)`.
  - `test_third_party_lists_sources`: `THIRD_PARTY.md` contém `b5e8ef9`, `v0.8.163`, `MIT License` e `Apache License`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_agents.py -v` → FAIL.
- [ ] **Step 3: Escrever** os três arquivos e ajustar `ROLES` e `revisor.md`.
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: guias de direção e roteiro com crédito das fontes"`

### Task 11: Roteiro e série seguem `_roteiro.md`

**Files:**
- Modify: `autovideo/artefatos.py` (`EpisodioOut.gancho: str = ""`)
- Modify: `autovideo/episode.py:69-86` (`roteiro`: valida que não há dígito no roteiro fora das linhas `#`; a tarefa pede uma estratégia de gancho diferente da do episódio anterior, conferindo o histórico)
- Modify: `autovideo/episode.py:322-327` (`approve`: acrescenta `Gancho: <gancho>` ao histórico quando o campo existe)
- Modify: `autovideo/showrunner.py` (`Plano.candidatas: list[str]`, exatamente 3, não vazias; `Plano.estrutura: str`, não vazia, com a escolhida e o porquê; `create_serie(..., estrutura=plano.estrutura)`)
- Modify: `autovideo/data.py` (`Serie.estrutura: str = ""`; parâmetro `estrutura: str = ""` em `create_serie`)
- Modify: `autovideo/prompts/roteirista.md`, `autovideo/prompts/showrunner.md` (o formato novo de `episodio.json` e de `plano.json`)
- Test: `tests/test_episode.py`, `tests/test_showrunner.py`

- [ ] **Step 1: Testes:**
  - Antes, trocar `ROTEIRO` e a narração da `s01` no fixture: "Às 3h47" vira "Às três e quarenta e sete".
  - `test_digits_in_script_go_back_to_writer`: um roteiro com "9h14" faz a validação levantar uma mensagem com "por extenso".
  - `test_approve_records_hook_strategy`: o histórico contém `Gancho: pergunta`.
  - `test_plan_requires_three_candidates`: 2 candidatas reprovam, 3 passam, e o `serie.json` guarda a `estrutura`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_episode.py tests/test_showrunner.py -v` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: roteiro com números por extenso e série com 3 estruturas candidatas"`

### Task 12: `estilo.md` em 10 seções

**Files:**
- Modify: `autovideo/data.py` (`ESTILO_SECOES` e `secoes_faltando`)
- Modify: `autovideo/analise.py:137-139` (validação que também confere `saida/estilo.md`)
- Modify: `autovideo/chat.py:50-51` (`_check` de estilo também confere `estilo.md` quando o arquivo existe)
- Modify: `autovideo/prompts/analista.md`, `autovideo/prompts/estilo_chat.md` (o modelo das 10 seções, com o cabeçalho de origem MIT)
- Modify: `autovideo/estilos/benji/estilo.md` (reescrito nas 10 seções a partir das notas do spec principal, seção "Estilos")
- Test: `tests/test_data.py`, `tests/test_analise.py`, `tests/test_chat.py`

**Interfaces:**
- Produces:
  - `data.ESTILO_SECOES = ("Essência e o que não é", "Materiais e acabamento", "Lógica de cor", "Tipografia e legenda", "Qualidade do movimento", "Gramática de câmera", "Paleta sonora", "Movimentos típicos", "Armadilhas", "Espaço de variação")`
  - `data.secoes_faltando(md: str) -> list[str]`: títulos sem uma linha `## <n>. <título>`, com `n` de 1 a 10 e comparação sem caixa.
  - `load_estilo` **não** valida as seções, então estilos antigos continuam aceitos.

- [ ] **Step 1: Testes:**
  - `test_secoes_faltando`: um md completo → `[]`; um md sem a seção 9 → `["Armadilhas"]`.
  - `test_benji_has_all_sections`: o arquivo do repositório passa.
  - Em `test_analise.py`, um analista fake que grava `estilo.md` sem seções cai na nova tentativa e depois falha com "Armadilhas" na mensagem.
  - Em `test_chat.py`, `_check("estilo", ...)` devolve o erro com as seções faltando.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_data.py tests/test_analise.py tests/test_chat.py -v` → FAIL.
- [ ] **Step 3: Implementar** e reescrever o `estilo.md` do Benji.
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: estilo.md em 10 seções (formato STYLE.md)"`

### Task 13: Checagem da voz por transcrição

**Files:**
- Create: `autovideo/voz_check.py`
- Modify: `autovideo/artefatos.py` (`VozCena.asr_ok: bool = True`, `VozCena.ouvido: str = ""`)
- Modify: `autovideo/episode.py:127-143` (`voz`), `:223-241` (`revisar`: a tarefa lista as cenas com `asr_ok` falso)
- Test: `tests/test_voz_check.py`, `tests/test_episode.py` (o fixture `env` ganha um `transcribe.transcribe` fake que devolve as palavras da própria narração)

**Interfaces:**
- Consumes: `transcribe.transcribe(media, src, workdir) -> list[Word]`.
- Produces:
  - `voz_check.LIMITE = 0.85`
  - `voz_check.MIN_PALAVRAS = 3`
  - `voz_check.normalizar(t: str) -> list[str]`: minúsculas, sem acento (via `unicodedata` NFKD), sem pontuação.
  - `voz_check.semelhanca(esperado: str, ouvido: str) -> float`: `difflib.SequenceMatcher` sobre as listas de palavras.
  - `voz_check.precisa_checar(narracao: str) -> bool`: `len(normalizar(narracao)) >= MIN_PALAVRAS`.

**Comportamento em `voz`**, só para áudio novo (cache miss):
1. Transcreve com `workdir=ep/"voz"/".asr"` e grava as palavras em `voz/<sha16>.words.json`.
2. Se `precisa_checar` e a semelhança ficar abaixo de `LIMITE`: gera o TTS de novo **uma vez** no mesmo arquivo e transcreve de novo.
3. Grava `cache[sha]["asr"] = {"ratio": r, "ouvido": texto, "ok": r >= LIMITE or not precisa_checar}`.
4. O `voz.json` leva `asr_ok` e `ouvido`.

Um áudio vindo do cache não é transcrito de novo.

- [ ] **Step 1: Testes:**
  - `test_normalizar` ("Às nove!" → `["as", "nove"]`).
  - `test_semelhanca_identica_e_diferente`.
  - `test_short_narration_skipped` (Review Focus 4).
  - `test_bad_asr_regenerates_once_then_flags`: o fake ouve "nove agá catorze". O TTS é chamado 2 vezes para a cena, `asr_ok` fica falso e a tarefa do revisor cita a cena.
  - `test_cached_voice_not_retranscribed`.
  - `test_words_json_written`.
- [ ] **Step 2: Rodar e ver falhar:** `pytest tests/test_voz_check.py tests/test_episode.py -v` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar:** `pytest -q` → PASS.
- [ ] **Step 5: Commit:** `git commit -m "feat: checagem da voz por transcrição"`

### Task 14: Verificação de ponta a ponta (manual, com rede e modelos)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-21-agente-editor-design.md` (medições em "Tempo e custo")

- [ ] **Step 1: Preparar:** `autovideo skills` (baixa as skills da Task 2) e depois `autovideo doctor` → tudo `OK`.
- [ ] **Step 2: Episódio Benji real:** `autovideo gerar <perfil>` até `awaiting_approval`. Conferir:
  - `edicao.json` com pelo menos 2 itens de transição do registry e um motivo em cada mudança;
  - `check` limpo;
  - sem legenda;
  - `decisions.log` com o custo do editor abaixo de 5 dólares.
- [ ] **Step 3: Fallback forçado:** rodar de novo com `max_usd=0.01` no editor (override local, sem commit). Esperado: `edicao.json` com `fallback: true` e o aviso no painel.
- [ ] **Step 4: Ajuste:** pelo painel, "transição ruim na cena 3". Só `edicao`, `render` e `revisao` rodam de novo.
- [ ] **Step 5: Medir 3 episódios** e registrar no adendo:
  - duração da edição (alvo: até 10 min);
  - render em relação à base (alvo: até 2×);
  - custo do editor;
  - semelhança média da voz.

  Se passar das metas, propor ao José o ajuste de `max_usd`, do limite de efeitos pesados ou do `LIMITE` da voz.
- [ ] **Step 6: Commit:** `git commit -m "docs: medições do agente editor"`
