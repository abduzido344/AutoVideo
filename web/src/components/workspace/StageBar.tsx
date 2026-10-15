import { STAGE_LABEL, stageIndex } from "@/lib/format"
import { cn } from "@/lib/utils"

export function StageBar({ job, stages }: { job: { status: string; stage: string }; stages: string[] }) {
  const i = stageIndex(job, stages)
  const done = job.status === "completed"
  return (
    <div className="grid gap-2">
      <div aria-hidden="true" className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(0, 1fr))` }}>
        {stages.map((s, k) => {
          const state = k < i ? "done" : k === i ? "current" : "todo"
          return <span key={s} data-state={state} className={cn("h-1 rounded-full",
            state === "done" ? "bg-primary" : state === "current" ? (job.status === "failed" ? "bg-destructive" : "bg-info") : "bg-input")} />
        })}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {done ? <b className="font-medium text-foreground">Concluído</b>
          : <>Etapa {i + 1} de {stages.length} · <b className="font-medium text-foreground">{job.status === "queued" ? "Na fila" : STAGE_LABEL[job.stage] ?? (job.stage || "Na fila")}</b></>}
      </p>
    </div>
  )
}
