import { useState } from "react"
import { api, type FilaJob } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

// mesma ordem do episode.STAGES do servidor
const ETAPAS: [string, string][] = [
  ["roteiro", "Roteiro"], ["cenas", "Cenas"], ["voz", "Voz"], ["imagens", "Imagens"], ["sfx", "Sons"],
  ["montagem", "Montagem"], ["render", "Render"], ["revisao", "Revisão"], ["aprovacao", "Aprovação"],
]
const etapa = (s: string) => ETAPAS.find(([k]) => k === s)?.[1] ?? s
const GRUPOS: [string, string][] = [
  ["in_progress", "Rodando"], ["awaiting_approval", "Aguardando aprovação"], ["queued", "Na fila"], ["failed", "Falhou"], ["completed", "Concluídos"],
]
const hora = (t: number) => new Date(t * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
const nome = (j: FilaJob) => j.recipe === "estilo" ? `Análise de estilo${j.titulo ? ` — ${j.titulo}` : ""}`
  : [j.perfil, j.titulo ?? `job ${j.id}`].filter(Boolean).join(" · ")
const erro = (message: string) => (e: Error) => toast({ message, description: e.message, state: "error" })

function Etapas({ atual }: { atual: string }) {
  const i = ETAPAS.findIndex(([k]) => k === atual)
  return (
    <ol className="mt-3 flex flex-wrap gap-1.5">
      {ETAPAS.map(([k, label], n) => (
        <li key={k} aria-current={n === i ? "step" : undefined}
          className={`rounded-full px-2.5 py-0.5 text-xs ${n === i ? "bg-primary text-primary-foreground" : n < i ? "bg-muted text-foreground" : "text-muted-foreground"}`}>{label}</li>
      ))}
    </ol>
  )
}

export function Fila() {
  const { data, refresh } = usePoll(api.fila)
  const [busy, setBusy] = useState(false)
  // uma ação por vez: evita clique duplo em Pausar/Continuar/Retomar
  const act = (f: () => Promise<unknown>, msg: string) => {
    if (busy) return
    setBusy(true)
    f().then(refresh, erro(msg)).finally(() => setBusy(false))
  }
  const jobs = data?.jobs ?? []
  const limite = data?.reason.includes("limite de uso")
  return (
    <Pagina titulo="Fila" sub="O que está sendo feito agora e o que vem depois.">
      {data && (
        <Card className="flex-row items-center justify-between gap-4 px-5 py-4">
          <p className="text-sm">
            {!data.paused ? "Rodando"
              : data.paused_until ? `Fila pausada até ${hora(data.paused_until)}${limite ? " — limite de uso" : data.reason ? ` — ${data.reason}` : ""}`
              : `Fila pausada${data.reason ? ` — ${data.reason}` : ""}`}
          </p>
          {data.paused
            ? <Button disabled={busy} onClick={() => act(api.continuarFila, "Não consegui continuar a fila")}>Continuar</Button>
            : <Button variant="outline" disabled={busy} onClick={() => act(api.pausarFila, "Não consegui pausar a fila")}>Pausar</Button>}
        </Card>
      )}
      {data && jobs.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nada na fila.</p>}
      {GRUPOS.map(([status, titulo]) => {
        const lista = jobs.filter((j) => j.status === status)
        if (!lista.length) return null
        return (
          <section key={status}>
            <Secao>{titulo}</Secao>
            <div className="space-y-2">
              {lista.map((j) => (
                <Card key={j.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{nome(j)}</p>
                    <div className="flex items-center gap-2">
                      {j.stage && status !== "in_progress" && <Badge variant="secondary">{etapa(j.stage)}</Badge>}
                      {status === "awaiting_approval" && <Button size="sm" onClick={() => go({ name: "revisao", jid: j.id })}>Revisar</Button>}
                      {status === "failed" && <Button size="sm" disabled={busy} onClick={() => act(() => api.retomar(j.id), "Não consegui retomar")}>Retomar</Button>}
                    </div>
                  </div>
                  {status === "in_progress" && j.recipe === "episodio" && <Etapas atual={j.stage} />}
                  {status === "in_progress" && j.recipe !== "episodio" && <Badge className="mt-2" variant="secondary">{j.stage || "iniciando"}</Badge>}
                  {status === "failed" && j.error && <p className="mt-2 text-sm text-destructive">{j.error}</p>}
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </Pagina>
  )
}
