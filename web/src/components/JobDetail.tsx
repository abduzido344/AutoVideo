import { useState } from "react"
import { toast } from "sonner"
import { api, type JobDetail as JD } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Video } from "@/components/ui/video"

export function JobDetail({ job, stages, onChange }: { job: JD; stages: string[]; onChange: () => void }) {
  const [fb, setFb] = useState("")
  const [busy, setBusy] = useState(false)
  const idx = job.status === "completed" ? stages.length : Math.max(0, stages.indexOf(job.stage))
  const gate = job.status === "awaiting_approval"
  const cost = job.files.decisions.reduce((s, d) => s + (d.cost_usd ?? 0), 0)
  const act = (run: () => Promise<unknown>) => {
    setBusy(true)
    return run().then(onChange).catch((e: Error) => toast.error(e.message)).finally(() => setBusy(false))
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Job #{job.id} · {job.recipe}</CardTitle>
        <Progress value={(idx / Math.max(stages.length, 1)) * 100} />
        <p className="text-sm text-muted-foreground">
          {job.status} · etapa {job.stage || "-"} · custo ${cost.toFixed(2)}{job.error && ` · erro: ${job.error}`}
        </p>
      </CardHeader>
      <CardContent className="grid gap-8">
        {job.files.has_final && job.rel !== null &&
          <Video src={`/projects/${job.rel}/out/final.mp4?t=${job.updated}`} className="aspect-auto [&_video]:max-h-[70vh]" />}
        {job.status === "failed" && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <p className="text-sm">Falhou em <b>{job.stage || "-"}</b>. Retomar refaz a partir dessa etapa.</p>
            <Button disabled={busy} onClick={() => act(() => api.resume(job.id))}>Retomar</Button>
          </div>
        )}
        {gate && (
          <div className="grid gap-3 rounded-lg border p-4">
            <p className="text-sm">Aguardando sua aprovação em <b>{job.stage}</b>.</p>
            <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Feedback (para rejeitar)" />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => act(() => api.approve(job.id))}>Aprovar</Button>
              <Button variant="secondary" disabled={busy || !fb.trim()}
                onClick={() => act(() => api.reject(job.id, fb).then(() => setFb("")))}>Rejeitar com feedback</Button>
            </div>
          </div>
        )}
        <Tabs defaultValue="brief">
          <TabsList><TabsTrigger value="brief">Brief</TabsTrigger><TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger></TabsList>
          <TabsContent value="brief"><pre className="whitespace-pre-wrap text-sm">{job.files.brief ?? "—"}</pre></TabsContent>
          <TabsContent value="post">
            {job.files.post ? <pre className="whitespace-pre-wrap text-sm">
              {`${job.files.post.title}\n\n${job.files.post.caption}\n${job.files.post.hashtags.join(" ")}`}</pre> : "—"}
          </TabsContent>
          <TabsContent value="agents">
            <ScrollArea className="h-64"><ul className="grid gap-2 text-sm">
              {job.files.decisions.map((d, i) => (
                <li key={i} className="rounded-md border p-2"><b>{d.role}</b> · tentativa {d.attempt} · ${(d.cost_usd ?? 0).toFixed(3)}
                  <p className="text-muted-foreground">{d.result}</p></li>))}
            </ul></ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
