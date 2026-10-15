import type { Doctor } from "@/api"

export const STAGE_LABEL: Record<string, string> = {
  ingest: "Recebendo os arquivos", clean: "Limpando o áudio", transcribe: "Transcrevendo", analyze: "Analisando",
  director: "Diretor escrevendo o brief", gate1: "Aprovar o brief", copywriter: "Copywriter escolhendo os takes",
  plan: "Planejando os cortes", designer: "Designer criando o estilo", editor: "Editor montando a timeline",
  render: "Renderizando", gate2: "Aprovar o corte", post: "Gerando o post",
}

export type Tone = "blue" | "gray" | "green" | "red"
export const TONE_TEXT: Record<Tone, string> = {
  blue: "text-info", gray: "text-muted-foreground", green: "text-success", red: "text-destructive",
}

export function projectName(projectDir: string): string {
  const base = projectDir.split(/[\\/]/).filter(Boolean).pop() ?? projectDir
  const name = base.replace(/^\d{8}-\d{6}-/, "").replace(/-/g, " ").trim() || base
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function statusInfo(job: { status: string; error: string }): { label: string; tone: Tone } {
  switch (job.status) {
    case "awaiting_approval": return { label: "aprovar", tone: "blue" }
    case "completed": return { label: "pronto", tone: "green" }
    case "queued": return { label: "na fila", tone: "gray" }
    case "failed": return { label: job.error?.includes("interrompido") ? "interrompido" : "falhou", tone: "red" }
    default: return { label: "rodando", tone: "gray" }
  }
}

export const totalCost = (ds: { cost_usd?: number | null }[]) => ds.reduce((s, d) => s + (d.cost_usd ?? 0), 0)
export const money = (v: number) => `$${v.toFixed(2).replace(".", ",")}`

export function clock(s: number): string {
  const t = Math.max(0, Math.floor(s))
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

export function assetUrl(rel: string, path: string, bust?: number): string {
  const enc = [...rel.split("/"), ...path.split("/")].map(encodeURIComponent).join("/")
  return `/projects/${enc}${bust ? `?t=${bust}` : ""}`
}

export function stageIndex(job: { status: string; stage: string }, stages: string[]): number {
  return job.status === "completed" ? stages.length : Math.max(0, stages.indexOf(job.stage))
}

export function appendChip(text: string, chip: string): string {
  const t = text.trim()
  if (t.includes(chip)) return t
  return t ? `${t}, ${chip}` : chip
}

export function doctorText(d: Doctor | null): { ok: boolean | null; text: string } {
  if (!d) return { ok: null, text: "Verificando o sistema…" }
  const bad = d.checks.find((c) => !c.ok)
  if (!bad) return { ok: true, text: "Tudo pronto" }
  return { ok: false, text: `Falta: ${bad.name}${bad.detail ? ` — ${bad.detail}` : ""}` }
}

export function playerClass(aspect: string | null): string {
  if (aspect === "9:16") return "aspect-[9/16] h-[60vh] w-auto"
  if (aspect === "1:1") return "aspect-square h-[60vh] w-auto"
  return "aspect-video w-full"
}
