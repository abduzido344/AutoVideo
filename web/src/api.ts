export type Job = {
  id: number; project_dir: string; recipe: string; auto: number; status: string; stage: string; error: string
  created: number; updated: number
}
export type Decision = { ts: number; role: string; attempt: number; cost_usd: number | null; turns: number | null; is_error: boolean; result: string }
export type JobDetail = Job & {
  rel: string | null
  files: { brief: string | null; post: { title: string; caption: string; hashtags: string[] } | null; has_final: boolean; decisions: Decision[] }
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
  recipes: () => j<string[]>("/api/recipes"),
  stages: () => j<string[]>("/api/stages"),
  jobs: () => j<Job[]>("/api/jobs"),
  job: (id: number) => j<JobDetail>(`/api/jobs/${id}`),
  create: (fd: FormData) => j<{ id: number }>("/api/jobs", { method: "POST", body: fd }),
  approve: (id: number) => j<{ ok: boolean }>(`/api/jobs/${id}/approve`, { method: "POST" }),
  reject: (id: number, feedback: string) =>
    j<{ ok: boolean }>(`/api/jobs/${id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }),
    }),
}
