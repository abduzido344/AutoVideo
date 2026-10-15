import { useRef } from "react"
import { api } from "@/api"
import { ActionBox } from "@/components/workspace/ActionBox"
import { DetailTabs } from "@/components/workspace/DetailTabs"
import { StageBar } from "@/components/workspace/StageBar"
import { Timeline } from "@/components/workspace/Timeline"
import { Transcript } from "@/components/workspace/Transcript"
import { Button } from "@/components/ui/button"
import { Video } from "@/components/ui/video"
import { assetUrl, money, playerClass, projectName, totalCost } from "@/lib/format"
import { usePoll } from "@/lib/usePoll"

export function Workspace({ id, stages, onChange }: { id: number; stages: string[]; onChange: () => void }) {
  const { data: job, error, refresh } = usePoll(() => api.job(id))
  const stage = useRef<HTMLDivElement>(null)
  if (!job) return <p className="p-8 text-sm text-muted-foreground">{error ? "Projeto não encontrado ou servidor offline." : "Carregando…"}</p>

  const f = job.files
  const src = job.rel === null ? null
    : f.has_final ? assetUrl(job.rel, "out/final.mp4", job.updated)
      : f.preview ? assetUrl(job.rel, f.preview, job.updated) : null
  const after = () => { refresh(); onChange() }
  // o Video da Kobra não expõe o elemento: acha o <video> dentro do palco
  const seek = (t: number) => { if (!Number.isFinite(t)) return; const v = stage.current?.querySelector("video"); if (v) v.currentTime = t }

  return (
    <div className="flex flex-col gap-4 p-5 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight">{projectName(job.project_dir)}</h1>
          <p className="text-[13px] text-muted-foreground">{job.recipe}{f.aspect && ` · ${f.aspect}`} · {money(totalCost(f.decisions))}</p>
        </div>
        <span className="flex-1" />
        {f.has_final && job.rel !== null &&
          <Button variant="outline" asChild><a href={assetUrl(job.rel, "out/final.mp4", job.updated)} download={`${projectName(job.project_dir)}.mp4`}>Baixar</a></Button>}
      </header>
      <StageBar job={job} stages={stages} />
      <div className="flex flex-wrap gap-4">
        <section aria-label="Prévia" className="flex min-w-0 flex-[999_1_520px] flex-col gap-3">
          <div ref={stage} className="flex min-h-[420px] items-center justify-center rounded-2xl bg-muted p-5">
            {src
              ? <Video src={src} className={playerClass(f.aspect)} />
              : <p className="text-sm text-muted-foreground">{job.rel === null ? "Este projeto está fora da pasta de projetos atual (AUTOVIDEO_HOME)." : "A prévia aparece depois da limpeza do áudio."}</p>}
          </div>
          {f.timeline ? <Timeline timeline={f.timeline} onSeek={f.has_final ? seek : undefined} />
            : f.transcript && <Transcript transcript={f.transcript} />}
        </section>
        <aside aria-label="Detalhes e aprovação" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 md:max-w-[360px]">
          <DetailTabs job={job} />
          <ActionBox key={`${job.stage}-${job.status}`} job={job} onDone={after} />
        </aside>
      </div>
    </div>
  )
}
