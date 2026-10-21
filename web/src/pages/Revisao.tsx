import { useState } from "react"
import { api, type Episodio, type Rede } from "@/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { Video } from "@/components/ui/video"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

const REDES: [Rede, string][] = [["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook", "Facebook"]]
const erro = (message: string) => (e: Error) => toast({ message, description: e.message, state: "error" })

type Post = { caption: string; hashtags: string[] }
type Fix = { role: string; scene: string | null; note: string }
const postDe = (ep: Episodio): Post | null => (ep.episodio as { post?: Post } | null)?.post ?? null
const tags = (p: Post) => Array.isArray(p.hashtags) ? p.hashtags : []
const textoPost = (p: Post) => `${p.caption}\n\n${tags(p).join(" ")}`
async function copiar(t: string) {
  try { await navigator.clipboard.writeText(t); toast({ message: "Legenda copiada", state: "success" }) }
  catch (e) { erro("Não consegui copiar a legenda")(e instanceof Error ? e : new Error("a área de transferência não está disponível")) }
}

function Detalhe({ jid }: { jid: number }) {
  const { data: ep, error, refresh } = usePoll(() => api.episodio(jid))
  const [marcando, setMarcando] = useState<Rede | null>(null)
  const [ajuste, setAjuste] = useState("")
  const [confirma, setConfirma] = useState(false)
  const [postado, setPostado] = useState<Rede[]>([])
  const [busy, setBusy] = useState(false)
  if (!ep) return <Pagina titulo="Revisão">{error && <p className="text-sm text-destructive">Não consegui carregar o episódio</p>}</Pagina>
  const post = postDe(ep)
  const fx = (ep.revisao as { fixes?: Fix[] } | null)?.fixes
  const fixes = Array.isArray(fx) ? fx : []
  const feitos = new Set([...(ep.postado ?? []), ...postado])
  const aguarda = ep.job.status === "awaiting_approval"
  // depois da ação o episódio sai da lista de revisão: volta para ela
  async function acao(p: Promise<unknown>, ok: string, falha: string) {
    setBusy(true)
    try { await p; toast({ message: ok, state: "success" }); setAjuste(""); setConfirma(false); go({ name: "revisao" }) }
    catch (e) { erro(falha)(e as Error); refresh() }
    finally { setBusy(false) }
  }
  return (
    <Pagina titulo={ep.titulo ?? `Episódio ${jid}`} sub={[ep.perfil, ep.n && `episódio ${ep.n}`].filter(Boolean).join(" · ")}>
      <Button variant="ghost" size="sm" onClick={() => go({ name: "revisao" })}>← Voltar</Button>
      <div className="mt-3 grid gap-6 sm:grid-cols-[minmax(0,260px)_1fr]">
        <div className="space-y-3">
          {ep.final ? <Video src={ep.final} className="aspect-[9/16]" /> : <p className="text-sm text-muted-foreground">O vídeo ainda não foi renderizado.</p>}
          {ep.capa && <img src={ep.capa} alt="Capa" className="w-full rounded-xl border" />}
        </div>
        <div className="space-y-6">
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
      <div className="flex flex-wrap items-center gap-2">
        {aguarda && <Button disabled={busy} onClick={() => acao(api.aprovar(jid), "Episódio aprovado", "Não consegui aprovar")}>Aprovar</Button>}
        {ep.final && (
          <Button asChild variant="outline">
            <a href={ep.final} download={`episodio-${jid}.mp4`} onClick={() => { if (post) void copiar(textoPost(post)) }}>Exportar</a>
          </Button>
        )}
        {aguarda && (confirma ? (
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
    </Pagina>
  )
}

export function Revisao({ jid }: { jid?: number }) {
  const { data } = usePoll(api.fila)
  if (jid !== undefined) return <Detalhe key={jid} jid={jid} />
  const lista = (data?.jobs ?? []).filter((j) => j.status === "awaiting_approval")
  return (
    <Pagina titulo="Revisão" sub="Episódios prontos esperando a sua decisão.">
      {data && lista.length === 0 && <p className="text-sm text-muted-foreground">Nada aguardando aprovação.</p>}
      <div className="space-y-2">
        {lista.map((j) => (
          <Card key={j.id} className="flex-row items-center justify-between px-5 py-4">
            <p className="text-sm font-medium">{[j.perfil, j.titulo ?? `job ${j.id}`].filter(Boolean).join(" · ")}</p>
            <Button size="sm" onClick={() => go({ name: "revisao", jid: j.id })}>Revisar</Button>
          </Card>
        ))}
      </div>
    </Pagina>
  )
}
