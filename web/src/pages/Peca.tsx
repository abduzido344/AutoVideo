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
  const etapas: TodoItem[] = ETAPAS.map(([k, t], i) => ({ id: k, title: t, status: i < atual ? "completed" : i === atual ? "in-progress" : "pending" }))

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
            <TodoList title="Etapas" items={etapas} collapseOnComplete={false} maxHeight={360} />
            <Secao>Conversa dos agentes</Secao>
            <ConversaAgentes decisions={ep.decisions} etapa={ETAPAS[atual]?.[1] ?? ep.job.stage} />
            <PromptInput value={texto} onValueChange={setTexto} onSubmit={pedir} disabled={busy} minRows={2}
              aria-label="Pedir ajuste ao Diretor" placeholder="Pedir ajuste ao Diretor" />
          </div>
          <Tabs defaultValue="storyboard">
            <TabsList>
              <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
              <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
              <TabsTrigger value="video">Vídeo</TabsTrigger>
            </TabsList>
            <TabsContent value="storyboard"><Storyboard cenas={arte?.cenas ?? []} erro={erroCenas && !arte} /></TabsContent>
            <TabsContent value="roteiro"><p className="whitespace-pre-wrap">{ep.roteiro}</p></TabsContent>
            <TabsContent value="video">
              {ep.final ? <Video src={ep.final} className="aspect-[9/16] max-w-sm" /> : <p className="text-muted-foreground">Ainda renderizando</p>}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Pagina>
  )
}
