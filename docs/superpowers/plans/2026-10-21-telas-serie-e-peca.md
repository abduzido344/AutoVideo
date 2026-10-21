# Telas de Série e Peça Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acompanhar uma série (visão geral dos episódios) e uma peça (conversa dos agentes + storyboard de cenas ao vivo) em páginas próprias do painel.

**Architecture:** Dois endpoints novos de leitura em `autovideo/server.py` expõem o que o pipeline já grava (`cenas.json`, `img/manifest.json`, `voz.json`, `decisions.log`, `serie.json`). Duas páginas React novas (`Serie`, `Peca`) usam `usePoll` (3 s) e os componentes vendorizados de agente em `web/src/components/agents`. O sheet de revisão em `#/producao/<jid>` não muda; ele só ganha um link para a página nova.

**Tech Stack:** FastAPI + pytest; React + Vite + Tailwind v4 + shadcn + componentes beui (`message`, `todo-list`) + Kobra `video`; vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-autovideo-series-design.md` (seções "Equipe de agentes", "Ciclo diário", "Revisão e saída", "Interface"). UI segue `docs/ui-components.md`.

## Global Constraints

- Rodar a UI só no login do Claude da máquina; nada novo de auth.
- Nunca postar sem aprovação; as páginas novas não ganham botão de postar (só leitura + o "Pedir ajuste" que já existe via `api.ajustar`).
- Textos da interface em português; seções com `Pagina`/`Secao` de `web/src/pages/Pagina.tsx`.
- Antes de escrever componente de UI à mão: Kobra → shadcn → outros registries (`docs/ui-components.md`). Se escrever à mão, registrar na tabela desse doc.
- Etapas de um episódio, em ordem: `roteiro, cenas, voz, imagens, sfx, montagem, render, revisao, aprovacao` (`autovideo/episode.py` fim do arquivo).
- `usePoll` já existe (`web/src/lib/usePoll.ts`); não criar SSE.
- Testes do front: vitest com `vi.mock("@/api")` como em `web/src/pages/Producao.test.tsx`. Testes do back: `tests/test_server.py` (`_client()`).
- Commits em português no estilo `feat(web): ...`, terminando com a linha Co-Authored-By dada pelo ambiente.

## Review Focus

- Episódio recém-criado, sem `cenas.json`: o endpoint devolve listas vazias, não 500.
- `cenas.json` ou `voz.json` corrompido: lista vazia (usar o `_json` existente).
- Cena `kind=screen` não tem imagem: `imagem` é `null` e o front mostra "tela de celular".
- Imagem ainda não gerada (cena sem entrada no manifest): quadro com texto e sem foto, sem erro.
- Série cujo job foi apagado do `jobs.db`: episódio aparece "Planejado", como já faz `GET /api/perfis/{slug}`.
- `path_rel` com `..` ou fora de `perfis_dir`: 404 (reuso de `_serie_path`).

---

### Task 1: Endpoint de artefatos do episódio

**Files:**
- Modify: `autovideo/server.py` (junto de `get_episodio`)
- Test: `tests/test_server.py`

**Interfaces:**
- Produces: `GET /api/episodios/{jid}/artefatos` → `{"cenas": [{"id": str, "kind": "image"|"screen", "narration": str, "prompt": str, "camera": str, "sfx": str, "imagem": str|None, "audio": str|None, "dur": float|None}]}`. `imagem`/`audio` são URLs `/projects/...` (helper `_url`).

- [ ] **Step 1: Write failing tests** em `tests/test_server.py`: `test_artefatos_junta_cena_imagem_e_voz` (cria job de episódio como os testes de `get_episodio` ao redor; grava `cenas.json` com 2 cenas — `s01` image e `s02` screen —, `img/manifest.json` `{"s01": "img/a.png"}` + o arquivo, `voz.json` `{"cenas":[{"id":"s01","file":"voz/a.mp3","dur":3.5,"sha":"x"}]}` + o arquivo; asserta `s01.imagem` e `s01.audio` terminam com os caminhos e `s01.dur == 3.5`, `s02.imagem is None`, `s02.audio is None`) e `test_artefatos_episodio_vazio` (sem arquivos: `{"cenas": []}`, status 200); `test_artefatos_job_inexistente` (404).
- [ ] **Step 2: Run** `pytest tests/test_server.py -k artefatos -v` → FAIL (404 na rota).
- [ ] **Step 3: Implement** `artefatos(jid: int)` em `create_app`: `_job`, `ep = Path(job["project_dir"])`, ler `cenas.json` (`_json`, lista em `["cenas"]`), `img/manifest.json` (dict id→rel), `voz.json` (`["cenas"]` → dict id). Montar a lista; só devolver URL se `_url` achar o arquivo.
- [ ] **Step 4: Run** os mesmos testes → PASS; depois `pytest tests/test_server.py -q` inteiro.
- [ ] **Step 5: Commit** `feat(api): endpoint de artefatos do episódio (storyboard)`.

### Task 2: Endpoint de detalhe da série

**Files:**
- Modify: `autovideo/server.py`
- Test: `tests/test_server.py`

**Interfaces:**
- Consumes: `_serie_path`, `data.Serie`, `fila._approved(ep.parent, n)`, `decisions.log` (linhas JSON com `cost_usd`).
- Produces: `GET /api/series/detalhe?path_rel=<perfil/series/NN-slug>` → `{"serie": Serie, "perfil": str, "custo_usd": float, "episodios": [{"n": int, "titulo": str, "sinopse": str, "job": int|None, "status": str|None, "stage": str|None, "aprovado": bool, "custo_usd": float, "capa": str|None}]}`. Usar query param (path_rel tem barras).

- [ ] **Step 1: Write failing tests**: `test_serie_detalhe_soma_custo_e_status` (série de 2 episódios, o 1º com job `awaiting_approval`, `decisions.log` com duas linhas `cost_usd` 0.3 e 0.1 e uma linha sem custo; asserta `episodios[0].custo_usd == 0.4`, `custo_usd` da série idem, `episodios[1].status is None`), `test_serie_detalhe_path_invalido` (`path_rel=../x` → 404), `test_serie_detalhe_job_apagado` (job id inexistente no db → `status None`, 200).
- [ ] **Step 2: Run** `pytest tests/test_server.py -k serie_detalhe -v` → FAIL.
- [ ] **Step 3: Implement** `serie_detalhe(path_rel: str)`; custo = soma dos `cost_usd` numéricos de `<ep_dir>/decisions.log` (ignorar linhas inválidas como `get_episodio`); `capa` por `_url(ep_dir/"out"/"capa.jpg")`. A pasta do episódio é `path/ep<NN>` (2 dígitos), conforme `_where`; job vem de `store.get(e.job)` com `KeyError` → `None`.
- [ ] **Step 4: Run** testes → PASS; `pytest -q` inteiro.
- [ ] **Step 5: Commit** `feat(api): detalhe da série com status, custo e capa por episódio`.

### Task 3: API client, rotas e navegação (front)

**Files:**
- Modify: `web/src/api.ts`, `web/src/lib/route.ts`, `web/src/App.tsx`
- Test: `web/src/lib/route.test.ts` (criar se não existir; senão acrescentar)

**Interfaces:**
- Produces em `api.ts`: tipos `Cena` (`id, kind, narration, prompt, camera, sfx, imagem: string|null, audio: string|null, dur: number|null`), `SerieDetalhe` (formato da Task 2), e `api.artefatos(jid): Promise<{cenas: Cena[]}>`, `api.serieDetalhe(path_rel): Promise<SerieDetalhe>`.
- Produces em `route.ts`: `Route` ganha `{name:"serie"; path_rel:string}` (hash `#/serie/<encodeURIComponent(path_rel)>`) e `{name:"episodio"; jid:number}` (hash `#/episodio/<jid>`); `parseHash`/`formatHash` os cobrem.
- Produces em `App.tsx`: renderiza `<Serie path_rel=.../>` e `<Peca jid=.../>` (componentes das Tasks 4 e 5). Esta task cria `web/src/pages/Peca.tsx` e `web/src/pages/Serie.tsx` como stubs `export function X(_: Props) { return null }` com as props acima; as Tasks 4 e 5 os substituem. Ordem de execução: 1, 2, 3, 4, 5, 6.

- [ ] **Step 1: Write failing tests** de `parseHash`/`formatHash`: `#/serie/benji%2Fseries%2F01-x` → `{name:"serie", path_rel:"benji/series/01-x"}`, ida e volta; `#/episodio/7` → `{name:"episodio", jid:7}`; `#/episodio/abc` → cai em `perfis`.
- [ ] **Step 2: Run** `cd web && npx vitest run src/lib` → FAIL.
- [ ] **Step 3: Implement** os tipos, as duas funções de `api` (padrão `j<T>` do arquivo; `serieDetalhe` usa `encodeURIComponent`), as rotas e o ramo no `App.tsx`.
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc -b`, `npx oxlint` → verdes.
- [ ] **Step 5: Commit** `feat(web): rotas e cliente da API para série e peça`.

### Task 4: Página da Peça (conversa dos agentes + storyboard)

**Files:**
- Create: `web/src/pages/Peca.tsx`, `web/src/components/Storyboard.tsx`, `web/src/components/ConversaAgentes.tsx`
- Test: `web/src/pages/Peca.test.tsx`

**Interfaces:**
- Consumes: `api.episodio(jid)` (já traz `job.stage`, `decisions`, `roteiro`, `final`), `api.artefatos(jid)`, `api.ajustar(jid, texto)`, `Pagina`/`Secao`, `TodoList` (`components/agents/todo-list`), `Message` (`components/agents/message`), `PromptInput` (`components/agents/prompt-input`), `Video` (`components/ui/video`), `Tabs`.
- Produces: `export function Peca({ jid }: { jid: number })`; `Storyboard({ cenas }: { cenas: Cena[] })`; `ConversaAgentes({ decisions, etapa }: { decisions: Decision[]; etapa: string })`.

Layout (duas colunas, uma só em tela estreita): esquerda = `TodoList` das 9 etapas (a atual `in-progress`, anteriores `completed`, demais `pending`, pelo `job.stage`) + `ConversaAgentes` (um `Message` por `decision`: papel, modelo, custo `US$ x,xx`, turnos, `result` resumido; `is_error` em destaque) + `PromptInput` "Pedir ajuste ao Diretor" que chama `api.ajustar`. Direita = `Tabs`: **Storyboard** (grade de quadros 9:16; cada quadro: foto `imagem` se houver, senão placeholder "tela de celular" para `kind=screen` ou "gerando…"; legenda com `id`, trecho da narração e câmera; `audio` vira `<audio controls>` pequeno), **Roteiro** (texto do `roteiro`, `whitespace-pre-wrap`), **Vídeo** (`Video` com `final` quando existir, senão "Ainda renderizando").

- [ ] **Step 1: Write failing tests** em `Peca.test.tsx` (mocks no estilo `Producao.test.tsx`): (a) com `job.stage="imagens"` a etapa "imagens" está em andamento e "roteiro" concluída (checar `aria`/texto conforme o `TodoList`); (b) um `Message` por decision mostra o papel e `US$ 0,31`; (c) storyboard mostra 3 quadros: um com `<img>`, um com "tela de celular", um com "gerando"; (d) enviar texto no campo "Pedir ajuste" chama `api.ajustar(5, "refaz a cena 4")`; (e) aba Vídeo sem `final` mostra "Ainda renderizando".
- [ ] **Step 2: Run** `npx vitest run src/pages/Peca.test.tsx` → FAIL.
- [ ] **Step 3: Implement** os três componentes e a página; `usePoll(() => api.episodio(jid))` e `usePoll(() => api.artefatos(jid))`; erro de carga → texto "Não consegui carregar o episódio" como o sheet atual. Reusar `erro`/`toast` do projeto para falha do ajuste.
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc -b`, `npx oxlint` → verdes. Subir o dev server (`preview_start`) e conferir a página `#/episodio/<jid>` de um episódio real (o servidor do usuário está em :8765; ver memória "Sandbox sees virtual LOCALAPPDATA").
- [ ] **Step 5: Commit** `feat(web): página da peça com conversa dos agentes e storyboard`.

### Task 5: Página da Série + links de entrada

**Files:**
- Create: `web/src/pages/Serie.tsx`
- Modify: `web/src/pages/Perfil.tsx` (card de série vira link), `web/src/pages/Producao.tsx` (link "Abrir página completa" no cabeçalho do sheet)
- Test: `web/src/pages/Serie.test.tsx`; ajustar `Perfil.test.tsx`/`Producao.test.tsx` só se quebrarem

**Interfaces:**
- Consumes: `api.serieDetalhe(path_rel)`, `api.pausarSerie`, `go`, `Pagina`, `Card`, `Badge`, `Progress`, `STATUS` (hoje em `Perfil.tsx`; exportar de lá ou mover para `components/secoes.ts`).
- Produces: `export function Serie({ path_rel }: { path_rel: string })`.

Conteúdo: cabeçalho com título, logline, custo total e "N de M no ar" (aprovados); botão Pausar/Continuar série (`api.pausarSerie`); uma faixa de cartões, um por episódio (n, título, `Badge` de status, etapa atual, custo, capa quando existir, sinopse). Clicar num episódio com `job` vai para `go({name:"episodio", jid})`; episódio sem `job` mostra só a sinopse ("Planejado").

- [ ] **Step 1: Write failing tests**: (a) renderiza 3 episódios com status e a contagem "1 de 3 no ar"; (b) clique no episódio com job chama `go({name:"episodio", jid: 7})`; (c) episódio sem job não é clicável e diz "Planejado"; (d) Pausar chama `api.pausarSerie(path_rel, true)`.
- [ ] **Step 2: Run** `npx vitest run src/pages/Serie.test.tsx` → FAIL.
- [ ] **Step 3: Implement** a página e os dois links (no `Perfil`, o título da série em `Series` passa a `go({name:"serie", path_rel})`).
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc -b`, `npx oxlint`, `npm run build` → verdes; conferir no navegador `#/serie/...` e a navegação ida e volta.
- [ ] **Step 5: Commit** `feat(web): página da série e links de entrada`.

### Task 6: Registro dos componentes

**Files:**
- Modify: `docs/ui-components.md`

- [ ] **Step 1:** Na seção "Estado atual do painel" e no "Mapa de telas", acrescentar as rotas `#/serie/<path_rel>` e `#/episodio/<jid>`; na tabela de componentes escritos à mão (se houver), registrar `Storyboard` e `ConversaAgentes` com o motivo (nenhum registry tem storyboard de cenas com status de geração).
- [ ] **Step 2: Commit** `docs: telas de série e peça no mapa de UI`.

## Auto-revisão

- Spec: "O painel mostra a etapa atual de cada episódio" (Tasks 2, 4, 5); "Pedir ajuste" (Task 4, reuso de `api.ajustar`); custo/tokens por chamada (decisions em Task 4). Headroom, SSE e chat livre com agentes ficam fora (YAGNI).
- Tipos: `Cena`, `SerieDetalhe`, `api.artefatos`, `api.serieDetalhe`, `Route.serie|episodio` definidos na Task 3 e usados nas Tasks 4 e 5. A ordem de execução é 1, 2, 4/5 (com os arquivos mínimos de rota), 3, 6; na prática, executar 1 → 2 → 3 (com `Peca`/`Serie` como componentes que a Task 3 cria vazios, `export function X(){return null}`, e as Tasks 4/5 preenchem) → 4 → 5 → 6.
