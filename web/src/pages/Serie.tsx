import { useState } from "react"
import { api } from "@/api"
import { COR, ICONE } from "@/components/secoes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import { ETAPAS, STATUS, usd } from "@/lib/etapas"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina } from "@/pages/Pagina"

export function Serie({ path_rel }: { path_rel: string }) {
  const { data: d, error, refresh } = usePoll(() => api.serieDetalhe(path_rel), 5000)
  const [busy, setBusy] = useState(false)
  const total = d?.episodios.length ?? 0
  const noAr = d?.episodios.filter((e) => e.aprovado).length ?? 0
  const pausar = (paused: boolean) => {
    if (busy) return
    setBusy(true)
    api.pausarSerie(path_rel, paused).then(refresh, (e: Error) =>
      toast({ message: paused ? "Não consegui pausar a série" : "Não consegui continuar a série", description: e.message, state: "error" }))
      .finally(() => setBusy(false))
  }
  return (
    <Pagina titulo={d?.serie.titulo ?? "Série"} icone={ICONE.producao} cor={COR.producao.caixa} largo
      sub={d ? undefined : error ? "Não consegui carregar a série" : "Carregando…"}
      acoes={d && <Button variant="outline" disabled={busy} onClick={() => pausar(!d.serie.paused)}>{d.serie.paused ? "Continuar série" : "Pausar série"}</Button>}>
      {d && (
        <div className="space-y-6">
          <div className="max-w-2xl space-y-2">
            {d.serie.logline && <p className="text-sm text-muted-foreground">{d.serie.logline}</p>}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{noAr} de {total} no ar</span>
              <span className="text-muted-foreground">{usd(d.custo_usd)}</span>
            </div>
            <Progress value={total ? (noAr / total) * 100 : 0} />
          </div>
          {total === 0 && <p className="text-sm text-muted-foreground">Esta série ainda não tem episódios planejados.</p>}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {d.episodios.map((ep) => {
              const corpo = (
                <>
                  {ep.capa && <img src={ep.capa} alt="" className="aspect-[9/16] w-full rounded-md border object-cover" />}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{ep.n}. {ep.titulo}</span>
                    <Badge variant="secondary">{ep.status ? STATUS[ep.status] ?? ep.status : "Planejado"}</Badge>
                  </div>
                  {ep.stage && <p className="text-xs text-muted-foreground">{ETAPAS.find(([k]) => k === ep.stage)?.[1] ?? ep.stage}</p>}
                  {ep.job !== null && <p className="text-xs text-muted-foreground">{usd(ep.custo_usd)}</p>}
                  <p className="text-xs text-muted-foreground">{ep.sinopse}</p>
                </>
              )
              return ep.job !== null
                ? <Card key={ep.n} className="w-56 min-w-56 shrink-0 p-0"><button type="button" onClick={() => go({ name: "episodio", jid: ep.job! })}
                  className="flex h-full w-full flex-col gap-2 rounded-[inherit] p-3 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50">{corpo}</button></Card>
                : <Card key={ep.n} className="flex w-56 min-w-56 shrink-0 flex-col gap-2 p-3">{corpo}</Card>
            })}
          </div>
        </div>
      )}
    </Pagina>
  )
}
