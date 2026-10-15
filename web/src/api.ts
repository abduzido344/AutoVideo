export type Job = {
  id: number; project_dir: string; recipe: string; auto: number; status: string; stage: string; error: string
  created: number; updated: number
}
// linhas de decisions.log: agentes (role/cost_usd...), reversão de revisão (review_round), beats_error (stage) e validation_error
export type Decision = {
  ts: number; role?: string; attempt?: number; cost_usd?: number | null; turns?: number | null; is_error?: boolean; result?: string
  review_round?: number; stage?: string; beats_error?: string; validation_error?: string
}
export type Word = { text: string; start: number; end: number }
export type TimelineJSON = {
  width: number; height: number; fps?: number
  segments: { src: string; in: number; out: number }[]
  zooms?: { at: number; dur: number; scale?: number; kind?: string }[]
  overlays?: { start: number; dur: number; src: string }[]
  broll?: { start: number; dur: number; src: string }[]
  sfx?: { at: number; src: string; dur?: number }[]
  music?: { src: string; volume?: number } | null
  captions?: boolean
}
export type Review = { issues_restantes: { code?: string | null; message?: string | null }[]; lufs: number | null }
export type RecipeInfo = {
  id: string; title: string; mode: "speech" | "montage"; aspect: string
  captions: { enabled: boolean; component: string }; pacing: { max_gap: number }; audio: { lufs: number }
}
export type Doctor = { ok: boolean; checks: { name: string; ok: boolean; detail: string }[] }
export type JobDetail = Job & {
  rel: string | null
  files: {
    brief: string | null; post: { title: string; caption: string; hashtags: string[] } | null
    has_final: boolean; decisions: Decision[]
    preview: string | null; aspect: string | null
    transcript: { words: Word[]; fillers: number[] } | null
    timeline: TimelineJSON | null; review: Review | null; script: string | null
  }
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init)
  if (!r.ok) {
    const body = await r.text()
    let msg: unknown = body
    try { msg = JSON.parse(body).detail ?? body } catch { /* corpo não é JSON */ }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return r.json() as Promise<T>
}

export const api = {
  recipeInfo: () => j<RecipeInfo[]>("/api/recipe-info"),
  doctor: () => j<Doctor>("/api/doctor"),
  stages: () => j<string[]>("/api/stages"),
  jobs: () => j<Job[]>("/api/jobs"),
  job: (id: number) => j<JobDetail>(`/api/jobs/${id}`),
  create: (fd: FormData) => j<{ id: number }>("/api/jobs", { method: "POST", body: fd }),
  approve: (id: number) => j<{ ok: boolean }>(`/api/jobs/${id}/approve`, { method: "POST" }),
  resume: (id: number) => j<{ ok: boolean }>(`/api/jobs/${id}/resume`, { method: "POST" }),
  reject: (id: number, feedback: string) =>
    j<{ ok: boolean }>(`/api/jobs/${id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }),
    }),
}
