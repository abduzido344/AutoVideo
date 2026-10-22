import { useState } from "react"
import { api } from "@/api"
import { TodoList, type TodoItem } from "@/components/agents/todo-list"
import { PromptInput } from "@/components/agents/prompt-input"
import { ConversaAgentes } from "@/components/ConversaAgentes"
import { COR, ICONE } from "@/components/secoes"
import { Storyboard } from "@/components/Storyboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { Video } from "@/components/ui/video"
import { ETAPAS } from "@/lib/etapas"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

export function Peca({ jid }: { jid: number }) {
  const { data: ep, error } = usePoll(() => api.episodio(jid))
  const { data: arte, error: erroCenas } = usePoll(() => api.artefatos(jid))
  const [texto, setTexto] = useState("")
  const [busy, setBusy] = useState(false)
  const atual = ETAPAS.findIndex(([k]) => k === ep?.job.stage)
  const concluido = ep?.job.status === "completed"
  const falhou = ep?.job.status === "failed"
  const v = (u: string) => ep?.job.updated ? `${u}?v=${ep.job.updated}` : u // evita cache obsoleto após ajuste
  const etapas: TodoItem[] = ETAPAS.map(([k, t], i) => ({ id: k, title: t, status: concluido || i < atual ? "completed" : i === atual ? (falhou ? "cancelled" : "in-progress") : "pending" }))
  const podeAjustar = ep?.job.status === "awaiting_approval" // mesmo estado que episode.adjust aceita

  async function pedir(m: string) {
    if (busy) return
    setBusy(true)
    try { await api.ajustar(jid, m); setTexto(""); toast({ message: "Ajuste pedido", state: "success" }) }
    catch (e) { toast({ message: "Não consegui pedir o ajuste", description: (e as Error).message, state: "error" }) }
    finally { setBusy(false) }
  }

  return (
    <Pagina titulo={ep?.titulo ?? `Episódio ${jid}`} icone={ICONE.producao} cor={COR.producao.caixa} largo
      sub={ep ? undefined : error ? "Não consegui carregar o episódio" : "Carregando…"}>
      {ep && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            {ep.job.status === "awaiting_approval" && (
              <p className="text-sm">Aguardando sua aprovação. <a className="font-medium underline" href={`#/producao/${jid}`}>Aprovar ou descartar em Produção</a></p>
            )}
            {falhou && <p className="text-sm text-destructive">Falhou{ep.job.error ? `: ${ep.job.error}` : ""}. Retome em <a className="underline" href="#/producao">Produção</a>.</p>}
            <TodoList title="Etapas" items={etapas} collapseOnComplete={false} maxHeight={360} />
            <Secao>Conversa dos agentes</Secao>
            <ConversaAgentes decisions={ep.decisions} etapa={ETAPAS[atual]?.[1] ?? ep.job.stage} />
            <PromptInput value={texto} onValueChange={setTexto} onSubmit={pedir} disabled={busy || !podeAjustar} minRows={2}
              aria-label="Pedir ajuste ao Diretor"
              placeholder={podeAjustar ? "Pedir ajuste ao Diretor" : "Só dá para pedir ajuste com o episódio aguardando revisão"} />
          </div>
          <Tabs defaultValue="storyboard">
            <TabsList>
              <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
              <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
              <TabsTrigger value="video">Vídeo</TabsTrigger>
            </TabsList>
            <TabsContent value="storyboard"><Storyboard cenas={arte?.cenas ?? []} erro={erroCenas && !arte} /></TabsContent>
            <TabsContent value="roteiro"><p className="whitespace-pre-wrap">{ep.roteiro || <span className="text-muted-foreground">Sem roteiro ainda.</span>}</p></TabsContent>
            <TabsContent value="video">
              {ep.final ? <Video src={v(ep.final)} className="aspect-[9/16] max-w-sm" />
                : <p className="text-muted-foreground">{falhou ? "O vídeo não foi gerado: a produção falhou." : "Ainda renderizando"}</p>}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Pagina>
  )
}
