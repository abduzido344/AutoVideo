# Painel v2: design

**Status:** aprovado em 2026-10-15. O visual vem do canvas https://claude.ai/artifact/FkqJjVrskAZoL15JgLWxnu, que tem as telas 1 (Novo vídeo), 2 (aprovar o brief) e 3 (corte final + timeline).
**Substitui** o painel do M1 (`web/`), que hoje é um formulário, uma lista e um `<pre>` escuro.

## Objetivo
O painel deve parecer um produto de verdade, limpo e moderno, no estilo da interface do Kimi:
- fundo claro;
- sidebar cinza-clara;
- área principal num cartão branco com cantos arredondados;
- tipografia Inter;
- preto como cor de ação e azul `#2F6BFF` só para estado/seleção.

A arquitetura de layout segue o Higgsfield Supercomputer: uma sidebar com projetos, um compositor central e um workspace por projeto.

## Tokens visuais
| Token | Valor |
|---|---|
| Fundo da shell | `#F7F7F7` |
| Cartão principal | `#FFFFFF`, borda `#EDEDED`, raio 14px, margem 8px |
| Texto | `#1F1F1F`; secundário `#6B6B6B`; terciário `#8A8A8A` |
| Bordas | `#E6E6E6` e `#EDEDED` |
| Superfícies suaves | `#F5F5F5` (palco do player, bandeja), `#F3F3F3` (segmented), `#ECECEC` (item ativo) |
| Ação primária | botão preto `#111111` com texto branco; secundário branco com borda `#E6E6E6` |
| Estado | azul `#2F6BFF` (aguardando você / etapa atual), verde `#22A06B` (ok/pronto), vermelho `#C9372C` (falhou/interrompido) |
| Fonte | Inter (já instalada via `@fontsource-variable/inter`); números/tempos em `ui-monospace` |
| Faixas da timeline | Vídeo `#EDEDED`; Zoom `#E8F0FF`; Overlays `#F1EBFF`; Legendas `#FFF6D6`; Música `#E5F6EE`; SFX `#FFEDE5`. Cada uma com borda e texto um tom mais escuro |

Tema único claro: o `.dark` forçado do M1 sai.

## Telas
### Shell (todas as telas)
- **Sidebar** (232–248px, fundo da shell):
  - logo (quadrado preto com ▶);
  - botão "Novo vídeo" (cartão branco, atalho `Ctrl K`);
  - seção "Projetos" listando os jobs (links "Projetos"/"Receitas" do mockup ficam de fora: não há página para eles no v2), cada um com nome e estado colorido (`aprovar` azul, `rodando` cinza, `pronto` verde, `falhou`/`interrompido` vermelho). O item atual fica destacado;
  - rodapé com o status do sistema ("Claude conectado", ou o que o doctor falhar).
- **Main**: cartão branco ocupando o resto.
- **Navegação**: `#/` é Novo vídeo; `#/p/<id>` é o workspace do job `<id>`.

### 1. Novo vídeo (`#/`)
- **Topo:** uma pílula azul-clara de status. Mostra "Tudo pronto…" quando o doctor passa, ou "Falta: <checagem>" quando algo falha.
- **Centro:** o título `AUTOVIDEO` em Inter 800, com tracking negativo.
- **Compositor:** cartão com sombra suave, raio 22px. Contém:
  - os anexos como cards: vídeo com duração, roteiro, assets;
  - um textarea para colar o roteiro ou descrever o pedido;
  - uma barra com: `+` (escolher arquivos), dropdown de receita, chip do formato da receita (só exibição), "Aprovar etapas" (switch ligado = `auto=false`) e o botão redondo preto de enviar.
- **Bandeja sob o compositor:** legenda, ritmo e áudio (LUFS) da receita escolhida.
- **Chips de receita** (um por receita, pelo título), que selecionam a receita.
- **Regras de envio:**
  - O enviar só habilita com pelo menos um vídeo.
  - Texto no textarea sem arquivo de roteiro vira o roteiro (`roteiro.md`).
  - Arquivo `.md`/`.txt` é o roteiro; `video/*` é gravação; o resto é asset.
  - Depois de criar, o painel navega para `#/p/<id>`.

### 2 e 3. Workspace (`#/p/<id>`)
- **Header:** título (nome do projeto) e a linha "receita · formato · custo"; a duração do corte aparece na timeline. Quando o vídeo final existe, aparece também o botão "Baixar".
- **Barra de etapas:** um segmento por etapa de `/api/stages`. As concluídas ficam pretas, a atual azul e as futuras `#E6E6E6`. Abaixo vem a frase "Etapa N de 13 · <rótulo>".
- **Esquerda:**
  - o palco `#F5F5F5` com o player (Kobra `video`). No gate 1 ele toca o bruto limpo; quando há final, toca o final.
  - **Abaixo, no gate 1 e antes:** a transcrição, com as `filler_candidates` riscadas em vermelho-claro.
  - **Abaixo, com `timeline.json`:** a timeline, com 6 faixas, régua e playhead. Clicar num clipe leva o player até o tempo do clipe.
- **Direita** (320–360px): abas sublinhadas.
  - **Gate 1:** "Brief" (markdown renderizado), "Roteiro × fala" (o roteiro e a transcrição em texto) e "Agentes" (decisões e custo).
  - **Com final:** "Revisão" (cards de Loudness, Cortes e Avisos, mais a lista de avisos restantes), "Post" (título, legenda, hashtags) e "Agentes".
- **Caixa de ação**, embaixo à direita:
  - **Aguardando aprovação:** textarea "Algo para mudar?", chips de ajuste rápido que acrescentam o texto, "Pedir ajustes" (reject, exige texto) e "Aprovar" (preto).
  - **Falhou:** a mensagem do erro e o botão "Retomar".
  - **Rodando:** "Trabalhando em <etapa>…".
  - **Concluído:** "Pronto", com um link para baixar.

## Dados novos da API
- `GET /api/recipe-info` → `[{id, title, mode, aspect, captions: {enabled, component}, pacing: {max_gap}, audio: {lufs}}]`.
- `GET /api/doctor` → `{"ok": bool, "checks": [{"name", "ok", "detail"}]}`. O resultado fica em cache por processo, porque a checagem chama `npx` e o `claude`.
- `GET /api/jobs/{id}` → em `files`, entram:
  - `preview`: caminho relativo do primeiro vídeo limpo que existir, ou `null`;
  - `transcript`: `{words: [{text, start, end}], fillers: [int]}`, ou `null`;
  - `timeline`: o `timeline.json` cru, ou `null`;
  - `review`: o `out/review.json`, ou `null`;
  - `script`: o texto de `script.md`, ou `null`;
  - `aspect`: o formato do `input/manifest.json` (`"9:16"`, `"16:9"`, `"1:1"`), ou `null`, para o player usar a proporção certa.

## Fora do escopo do v2
- Edição manual da timeline.
- Versões v1/v2 lado a lado (o reject sobrescreve).
- SSE: o polling de 3s continua.
- Estimativa de custo antes de criar.
- Destaque do hook na transcrição, porque o brief não traz índices de palavra.
- "O editor corrigiu sozinho" (o review loop não registra isso).
- Tema escuro.

## Regras herdadas
- **UI:** componente pronto primeiro, na ordem Kobra → shadcn → outros registries (`docs/ui-components.md`). O que for escrito à mão vai registrado nesse doc.
- **Servidor:** o servidor continua só em 127.0.0.1, com as checagens de Host/Origin. Não há login.
