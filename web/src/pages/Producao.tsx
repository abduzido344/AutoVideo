import { useState } from "react"
import { api, type Episodio, type FilaJob, type Rede } from "@/api"
import { COR, ICONE } from "@/components/secoes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { Video } from "@/components/ui/video"
import { ETAPAS } from "@/lib/etapas"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { cn } from "@/lib/utils"
import { Pagina, Secao } from "@/pages/Pagina"

const etapa = (s: string) => ETAPAS.find(([k]) => k === s)?.[1] ?? s
const COLUNAS = [["fila", "Na fila"], ["produzindo", "Produzindo"], ["revisar", "Para revisar"], ["prontos", "Prontos"]] as const
type Coluna = (typeof COLUNAS)[number][0]
const POR_STATUS: Record<string, Coluna> = { queued: "fila", in_progress: "produzindo", awaiting_approval: "revisar", completed: "prontos" }
// falhou não é coluna: o cartão fica na etapa em que parou
const coluna = (j: FilaJob): Coluna => j.status !== "failed" ? POR_STATUS[j.status] ?? "fila"
  : !j.stage ? "fila" : j.stage === "aprovacao" ? "revisar" : "produzindo"
const TODOS = "__todos"
const REDES: [Rede, string][] = [["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook", "Facebook"]]
const hora = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
const erro = (message: string) => (e: Error) => toast({ message, description: e.message, state: "error" })

function Etapas({ atual }: { atual: string }) {
  const i = ETAPAS.findIndex(([k]) => k === atual)
  return (
    <div>
      <ol aria-label="Etapas" className="flex gap-0.5">
        {ETAPAS.map(([k, label], n) => (
          <li key={k} title={label} aria-current={n === i ? "step" : undefined}
            className={cn("h-1.5 flex-1 rounded-full", n === i ? "bg-pink" : n < i ? "bg-foreground/50" : "bg-muted")}>
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-muted-foreground">{atual ? etapa(atual) : "iniciando"}</p>
    </div>
  )
}

function Cartao({ j, nomePerfil, busy, onRetomar }: { j: FilaJob; nomePerfil: (s: string | null) => string | null; busy: boolean; onRetomar: () => void }) {
  const falhou = j.status === "failed"
  const estilo = j.recipe === "estilo"
  const titulo = j.titulo ?? (estilo ? "Análise de estilo" : `Episódio ${j.id}`)
  const sub = estilo ? "Análise de estilo" : [j.serie, nomePerfil(j.perfil)].filter(Boolean).join(" · ")
  // falhou na aprovação: abre para descartar (o servidor aceita descartar job failed)
  const abre = falhou ? j.stage === "aprovacao" : j.status === "awaiting_approval" || Boolean(j.video)
  const corpo = (
    <div className="flex gap-3">
      {j.capa && <img src={j.capa} alt="" className="aspect-[9/16] w-12 shrink-0 rounded-md border object-cover" />}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug font-medium break-words">{titulo}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {j.n !== null && !estilo && <span className="text-xs text-muted-foreground">Parte {j.n}</span>}
          {j.status === "completed" && (j.postado?.length ?? 0) > 0 && <Badge variant="secondary">postado</Badge>}
        </div>
      </div>
    </div>
  )
  return (
    <Card className={cn("gap-2 p-3", falhou && "ring-2 ring-destructive/70")}>
      {abre
        ? <button type="button" className="-m-1 rounded-md p-1 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => go({ name: "producao", jid: j.id })}>{corpo}</button>
        : corpo}
      {j.status === "in_progress" && (estilo ? <Badge variant="secondary">{j.stage ? etapa(j.stage) : "iniciando"}</Badge> : <Etapas atual={j.stage} />)}
      {falhou && (
        <>
          {j.error && <p className="line-clamp-2 text-xs break-words text-destructive">{j.error}</p>}
          <div className="flex items-center justify-between gap-2">
            {j.error ? (
              <Dialog>
                <DialogTrigger asChild><Button variant="link" size="sm" className="h-auto px-0 text-xs">ver detalhes</Button></DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>Erro em {titulo}</DialogTitle></DialogHeader>
                  <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-words">{j.error}</pre>
                </DialogContent>
              </Dialog>
            ) : <span />}
            <Button size="sm" disabled={busy} onClick={onRetomar}>Retomar</Button>
          </div>
        </>
      )}
    </Card>
  )
}

type Post = { caption: string; hashtags: string[] }
type Fix = { role: string; scene: string | null; note: string }
const postDe = (ep: Episodio): Post | null => (ep.episodio as { post?: Post } | null)?.post ?? null
const tags = (p: Post) => Array.isArray(p.hashtags) ? p.hashtags : []
const textoPost = (p: Post) => `${p.caption}\n\n${tags(p).join(" ")}`
async function copiar(t: string) {
  try { await navigator.clipboard.writeText(t); toast({ message: "Legenda copiada", state: "success" }) }
  catch (e) { erro("Não consegui copiar a legenda")(e instanceof Error ? e : new Error("a área de transferência não está disponível")) }
}

// Revisão: o painel central que abre em #/producao/<jid>
function Revisao({ jid }: { jid: number }) {
  const { data: ep, error, refresh } = usePoll(() => api.episodio(jid))
  const [marcando, setMarcando] = useState<Rede | null>(null)
  const [ajuste, setAjuste] = useState("")
  const [confirma, setConfirma] = useState(false)
  const [postado, setPostado] = useState<Rede[]>([])
  const [busy, setBusy] = useState(false)
  if (!ep) return (
    <DialogHeader>
      <DialogTitle>Episódio {jid}</DialogTitle>
      <DialogDescription>{error ? "Não consegui carregar o episódio" : "Carregando…"}</DialogDescription>
    </DialogHeader>
  )
  const post = postDe(ep)
  const fx = (ep.revisao as { fixes?: Fix[] } | null)?.fixes
  const fixes = Array.isArray(fx) ? fx : []
  const feitos = new Set([...(ep.postado ?? []), ...postado])
  const aguarda = ep.job.status === "awaiting_approval"
  const falhou = ep.job.status === "failed"
  // depois da ação o episódio sai da revisão: fecha o painel
  async function acao(p: Promise<unknown>, ok: string, falha: string) {
    setBusy(true)
    try { await p; toast({ message: ok, state: "success" }); setAjuste(""); setConfirma(false); go({ name: "producao" }) }
    catch (e) { erro(falha)(e as Error); refresh() }
    finally { setBusy(false) }
  }
  return (
    <>
      <DialogHeader className="pr-12">
        <DialogTitle className="font-serif text-[22px] font-medium">{ep.titulo ?? `Episódio ${jid}`}</DialogTitle>
        <DialogDescription>{[ep.serie, ep.perfil, ep.n && `Parte ${ep.n}`].filter(Boolean).join(" · ")}</DialogDescription>
        <Button variant="link" size="sm" className="h-auto w-fit px-0" onClick={() => go({ name: "episodio", jid })}>Abrir página completa</Button>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
          <div className="space-y-3">
            {ep.final ? <Video src={ep.final} className="aspect-[9/16]" /> : <p className="text-sm text-muted-foreground">O vídeo ainda não foi renderizado.</p>}
            {ep.capa && <img src={ep.capa} alt="Capa" className="w-full rounded-xl border" />}
          </div>
          <div className="min-w-0 space-y-6">
            {ep.edicao?.fallback && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">Edição simplificada</Badge>
                <span className="text-muted-foreground">o editor falhou e o vídeo saiu pela montagem básica.{ep.edicao.motivo && ` Motivo: ${ep.edicao.motivo}`}</span>
              </p>
            )}
            <section>
              <Secao>Legenda</Secao>
              <Card className="px-5 py-4 text-sm">
                {post ? <><p className="whitespace-pre-wrap">{post.caption}</p><p className="mt-2 text-muted-foreground">{tags(post).join(" ")}</p></>
                  : <p className="text-muted-foreground">Sem legenda ainda.</p>}
              </Card>
              {post && <Button className="mt-2" variant="outline" size="sm" onClick={() => copiar(textoPost(post))}>Copiar legenda</Button>}
            </section>
            {fixes.length > 0 && (
              <section>
                <Secao>Apontamentos do revisor</Secao>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {fixes.map((f, i) => <li key={i}>{f.role}{f.scene ? ` (${f.scene})` : ""}: {f.note}</li>)}
                </ul>
              </section>
            )}
            <section>
              <Secao>Roteiro</Secao>
              <pre className="max-h-64 overflow-y-auto rounded-xl bg-muted p-4 text-sm whitespace-pre-wrap">{ep.roteiro || "—"}</pre>
            </section>
          </div>
        </div>
        <Secao>Decisão</Secao>
        {!aguarda && !falhou && !ep.aprovado && (
          <p className="mb-2 text-sm text-muted-foreground">
            Ainda em produção (etapa: {ep.job.stage ? etapa(ep.job.stage) : "iniciando"}). O botão Aprovar aparece quando o episódio chegar em “Para revisar”.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {aguarda && <Button disabled={busy} onClick={() => acao(api.aprovar(jid), "Episódio aprovado", "Não consegui aprovar")}>Aprovar</Button>}
          {ep.final && (
            <Button asChild variant="outline">
              <a href={ep.final} download={`episodio-${jid}.mp4`}>Exportar</a>
            </Button>
          )}
          {(aguarda || falhou) && (confirma ? (
            <>
              <Button variant="destructive" disabled={busy} onClick={() => acao(api.descartar(jid), "Episódio descartado", "Não consegui descartar")}>Sim, descartar</Button>
              <Button variant="ghost" onClick={() => setConfirma(false)}>Cancelar</Button>
            </>
          ) : <Button variant="outline" onClick={() => setConfirma(true)}>Descartar</Button>)}
        </div>
        {aguarda && (
          <div className="mt-4 space-y-2">
            <Textarea aria-label="O que ajustar" placeholder="O que ajustar neste episódio?" value={ajuste} onChange={(e) => setAjuste(e.target.value)} />
            <Button variant="outline" disabled={busy || !ajuste.trim()} onClick={() => acao(api.ajustar(jid, ajuste.trim()), "Ajuste pedido", "Não consegui pedir o ajuste")}>Pedir ajuste</Button>
          </div>
        )}
        {/* o servidor só aceita marcar postado depois de aprovado (409) */}
        {ep.aprovado && <>
          <Secao>Postagem manual</Secao>
          <p className="mb-2 text-sm text-muted-foreground">Só registra que você postou. Nada é publicado daqui.</p>
          <div className="flex flex-wrap gap-2">
            {REDES.map(([r, nome]) => (
              <Button key={r} variant="outline" size="sm" disabled={feitos.has(r) || marcando !== null}
                onClick={() => { setMarcando(r); api.postado(jid, r).then((x) => setPostado(x.postado), erro("Não consegui marcar como postado")).finally(() => setMarcando(null)) }}>
                {feitos.has(r) ? `Postado no ${nome}` : `Marcar como postado no ${nome}`}
              </Button>
            ))}
          </div>
        </>}
      </div>
    </>
  )
}

export function Producao({ jid, perfis = [] }: { jid?: number; perfis?: { slug: string; nome: string }[] }) {
  const { data, error, refresh } = usePoll(api.fila)
  const [busy, setBusy] = useState(false)
  const [filtro, setFiltro] = useState(TODOS)
  // uma ação por vez: evita clique duplo em Pausar/Retomar
  const act = (f: () => Promise<unknown>, msg: string) => {
    if (busy) return
    setBusy(true)
    f().then(refresh, erro(msg)).finally(() => setBusy(false))
  }
  const nomePerfil = (s: string | null) => s && (perfis.find((p) => p.slug === s)?.nome ?? s)
  const jobs = (data?.jobs ?? []).filter((j) => filtro === TODOS || j.perfil === filtro)
  const slugs = [...new Set([...perfis.map((p) => p.slug), ...(data?.jobs ?? []).flatMap((j) => j.perfil ? [j.perfil] : [])])]
  const limite = data?.reason.includes("limite de uso")
  const estado = !data ? null : !data.paused ? "Rodando"
    : data.paused_until ? `Pausada até ${hora(data.paused_until)}${limite ? " — limite de uso" : data.reason ? ` — ${data.reason}` : ""}`
    : `Pausada${data.reason ? ` — ${data.reason}` : ""}`
  return (
    <Pagina titulo="Produção" icone={ICONE.producao} cor={COR.producao.caixa} largo
      sub="A esteira dos episódios: da fila até prontos para postar."
      extra={estado && <Badge variant={data?.paused ? "outline" : "secondary"} title={estado} className="max-w-full truncate">{estado}</Badge>}
      acoes={<>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger aria-label="Filtrar por perfil" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os perfis</SelectItem>
            {slugs.map((s) => <SelectItem key={s} value={s}>{nomePerfil(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        {data && (data.paused
          ? <Button disabled={busy} onClick={() => act(api.continuarFila, "Não consegui retomar a fila")}>Retomar fila</Button>
          : <Button variant="outline" disabled={busy} onClick={() => act(api.pausarFila, "Não consegui pausar a fila")}>Pausar fila</Button>)}
      </>}>
      {error && !data && <p role="alert" className="mb-3 text-sm text-destructive">Não consegui carregar a fila. Tentando de novo…</p>}
      {/* as colunas rolam por dentro; em tela estreita a esteira rola na horizontal, nunca a página */}
      <div className="flex h-full min-h-[24rem] gap-3 overflow-x-auto pb-1">
        {COLUNAS.map(([id, titulo]) => {
          const lista = jobs.filter((j) => coluna(j) === id)
          return (
            <section key={id} aria-label={titulo} className="flex min-h-0 w-64 min-w-64 flex-1 flex-col rounded-panel bg-muted/60">
              <h2 className="flex items-center justify-between px-3 pt-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {titulo}<span className="font-mono tracking-normal">{lista.length}</span>
              </h2>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {lista.map((j) => (
                  <Cartao key={j.id} j={j} nomePerfil={nomePerfil} busy={busy} onRetomar={() => act(() => api.retomar(j.id), "Não consegui retomar")} />
                ))}
                {data && lista.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">Nada aqui.</p>}
              </div>
            </section>
          )
        })}
      </div>
      <Dialog open={jid !== undefined} onOpenChange={(o) => { if (!o) go({ name: "producao" }) }}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-2 sm:max-w-4xl">
          {jid !== undefined && <Revisao key={jid} jid={jid} />}
        </DialogContent>
      </Dialog>
    </Pagina>
  )
}
