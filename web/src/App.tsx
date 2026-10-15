import { useCallback, useEffect, useState } from "react"
import { api, type Job, type JobDetail as JD } from "@/api"
import { JobDetail } from "@/components/JobDetail"
import { JobList } from "@/components/JobList"
import { NewJobForm } from "@/components/NewJobForm"
import { SoundEffects } from "@/components/ui/sound"
import { Toaster } from "@/components/ui/sonner"

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  const [detail, setDetail] = useState<JD | null>(null)

  const refresh = useCallback(async () => {
    try {
      setJobs(await api.jobs())
      if (current !== null) setDetail(await api.job(current))
    } catch { /* servidor fora do ar: tenta de novo no próximo ciclo */ }
  }, [current])

  useEffect(() => { api.stages().then(setStages).catch(() => {}) }, [])
  useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t) }, [refresh])

  return (
    <SoundEffects>
      <main className="mx-auto grid max-w-6xl gap-8 p-4 md:grid-cols-[340px_1fr] md:p-10">
        <div className="grid content-start gap-8">
          <NewJobForm onCreated={setCurrent} />
          <JobList jobs={jobs} current={current} onSelect={setCurrent} />
        </div>
        {detail && detail.id === current
          ? <JobDetail key={detail.id} job={detail} stages={stages} onChange={refresh} />
          : <p className="text-sm text-muted-foreground">Selecione ou crie um job.</p>}
      </main>
      <Toaster />
    </SoundEffects>
  )
}
