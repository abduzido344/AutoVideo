import type { TimelineJSON } from "@/api"

export type Clip = { left: number; width: number; label: string; at: number }
export type Track = { key: "video" | "zoom" | "overlay" | "captions" | "music" | "sfx"; name: string; clips: Clip[] }

const MIN_W = 0.6 // % mínimo para um item curto continuar clicável

const finite = (n: number) => (Number.isFinite(n) ? n : 0)
const segLen = (s: { in: number; out: number }) => { const d = s.out - s.in; return Number.isFinite(d) && d > 0 ? d : 0 }
export const duration = (t: TimelineJSON) => t.segments.reduce((s, x) => s + segLen(x), 0)
// src ausente (overlay/música/sfx sem arquivo) não pode derrubar a página
const stem = (p: string | undefined) => (String(p ?? "").split("/").pop() ?? "").replace(/\.[^.]+$/, "")

export function timelineTracks(t: TimelineJSON): Track[] {
  const T = duration(t) || 1
  const clip = (start0: number, dur0: number, label: string): Clip => {
    const start = finite(start0), dur = finite(dur0)
    const a = Math.min(Math.max(start, 0), T)
    const b = Math.min(Math.max(start + dur, a), T)
    // multiplica antes de dividir: (4/10)*100 dá 40.00000000000001, (4*100)/10 dá 40
    const width = Math.max(((b - a) * 100) / T, MIN_W)
    return { left: Math.min((a * 100) / T, 100 - width), width, label, at: a }
  }
  let off = 0
  const video = t.segments.map((s) => { const c = clip(off, segLen(s), ""); off += segLen(s); return c })
  return [
    { key: "video", name: "Vídeo", clips: video },
    { key: "zoom", name: "Zoom", clips: (t.zooms ?? []).map((z) =>
      clip(z.at, z.dur, z.kind === "push" ? `${Math.round((z.scale ?? 1.12) * 100)}%` : "punch")) },
    { key: "overlay", name: "Overlays", clips: [
      ...(t.overlays ?? []).map((o) => clip(o.start, o.dur, stem(o.src))),
      ...(t.broll ?? []).map((b) => clip(b.start, b.dur, "b-roll"))] },
    { key: "captions", name: "Legendas", clips: t.captions === false ? [] : [clip(0, T, "legendas")] },
    { key: "music", name: "Música", clips: t.music ? [clip(0, T, stem(t.music.src))] : [] },
    { key: "sfx", name: "SFX", clips: (t.sfx ?? []).map((s) => clip(s.at, s.dur ?? 1, stem(s.src))) },
  ]
}
