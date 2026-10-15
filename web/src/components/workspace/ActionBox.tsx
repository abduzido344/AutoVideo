import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api, type JobDetail } from "@/api"
import { Button } from "@/components/ui/button"
import { appendChip, STAGE_LABEL } from "@/lib/format"

const CHIPS: Record<string, string[]> = {
  gate1: ["hook mais forte", "mais curto", "menos zoom", "tom mais calmo"],
  gate2: ["legenda maior", "menos zoom", "música mais baixa", "outro hook"],
}
const BOX = "grid gap-2.5 rounded-2xl border border-input p-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]"

export function ActionBox({ job, onDone }: { job: JobDetail; onDone: () => void }) {
  const [fb, setFb] = useState("")
  const [busy, setBusy] = useState(false)
  const act = (run: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    run().then(() => { toast.success(ok); setFb(""); onDone() })
      .catch((e: Error) => toast.error(e.message)).finally(() => setBusy(false))
  }

  if (job.status === "awaiting_approval") return (
    <div className={BOX}>
      <label htmlFor="fb" className="sr-only">O que mudar</label>
      <textarea id="fb" rows={2} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Algo para mudar?"
        className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground" />
      <div role="group" aria-label="Ajustes rápidos" className="flex flex-wrap gap-1.5">
        {(CHIPS[job.stage] ?? []).map((c) => (
          <Button key={c} type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs font-normal"
            onClick={() => setFb((v) => appendChip(v, c))}>{c}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy || !fb.trim()}
          onClick={() => act(() => api.reject(job.id, fb.trim()), "Pedido enviado — refazendo")}>Pedir ajustes</Button>
        <Button disabled={busy} onClick={() => act(() => api.approve(job.id), "Aprovado")}>Aprovar</Button>
      </div>
    </div>
  )

  if (job.status === "failed") return (
    <div className={BOX}>
      <p className="text-sm">{job.error.includes("interrompido") ? "Interrompido" : "Falhou"} em <b className="font-medium">{STAGE_LABEL[job.stage] ?? job.stage}</b>.</p>
      {job.error && <p className="line-clamp-4 text-xs text-muted-foreground">{job.error}</p>}
      <Button disabled={busy} onClick={() => act(() => api.resume(job.id), "Retomando")}>Retomar</Button>
    </div>
  )

  if (job.status === "completed") return (
    <p className="rounded-2xl border p-3 text-sm">Pronto. Vídeo, capa e post estão na pasta <code>out/</code> do projeto.</p>
  )

  return (
    <p role="status" className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />{STAGE_LABEL[job.stage] ?? "Na fila"}…
    </p>
  )
}
