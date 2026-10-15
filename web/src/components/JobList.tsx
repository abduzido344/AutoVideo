import type { Job } from "@/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const tone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default", awaiting_approval: "secondary", failed: "destructive", in_progress: "outline", queued: "outline",
}

export function JobList({ jobs, current, onSelect }: { jobs: Job[]; current: number | null; onSelect: (id: number) => void }) {
  if (!jobs.length) return <p className="text-sm text-muted-foreground">Nenhum job ainda.</p>
  return (
    <ul className="grid gap-1">
      {jobs.map((j) => (
        <li key={j.id}>
          <button onClick={() => onSelect(j.id)}
            className={cn("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted",
              current === j.id && "bg-muted")}>
            <span className="truncate text-sm">#{j.id} · {j.recipe}</span>
            <Badge variant={tone[j.status] ?? "outline"}>{j.status === "awaiting_approval" ? `aprovar · ${j.stage}` : j.status}</Badge>
          </button>
        </li>
      ))}
    </ul>
  )
}
