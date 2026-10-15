export type Attachments = { videos: File[]; script: File | null; assets: File[] }
export const EMPTY: Attachments = { videos: [], script: null, assets: [] }

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i
const SCRIPT_EXT = /\.(md|txt)$/i

const isVideo = (f: File) => f.type.startsWith("video/") || VIDEO_EXT.test(f.name)
// um vídeo também "ocupa" o nome sem extensão: a.mp4 e a.MOV colidem no servidor
const keys = (f: File) => [f.name.toLowerCase(), ...(isVideo(f) ? [f.name.replace(/\.[^.]*$/, "").toLowerCase()] : [])]

export function classify(files: File[], prev: Attachments): { next: Attachments; skipped: string[] } {
  const next: Attachments = { videos: [...prev.videos], script: prev.script, assets: [...prev.assets] }
  const taken = new Set([...next.videos, ...next.assets, ...(next.script ? [next.script] : [])].flatMap(keys))
  const skipped: string[] = []
  for (const f of files) {
    if (keys(f).some((k) => taken.has(k))) { skipped.push(f.name); continue }
    keys(f).forEach((k) => taken.add(k))
    if (isVideo(f)) next.videos.push(f)
    else if (SCRIPT_EXT.test(f.name)) next.script = f
    else next.assets.push(f)
  }
  return { next, skipped }
}

export function removeFile(a: Attachments, f: File): Attachments {
  return { videos: a.videos.filter((x) => x !== f), script: a.script === f ? null : a.script, assets: a.assets.filter((x) => x !== f) }
}

// texto digitado vira roteiro; com arquivo de roteiro, o texto entra no fim como "## Pedido"
export async function buildForm(a: Attachments, text: string, recipe: string, approve: boolean): Promise<FormData> {
  const fd = new FormData()
  fd.set("recipe", recipe)
  fd.set("auto", approve ? "false" : "true")
  a.videos.forEach((v) => fd.append("videos", v))
  const note = text.trim()
  let script = a.script
  if (note) {
    const body = script ? `${await script.text()}\n\n## Pedido\n${note}\n` : note
    script = new File([body], script?.name ?? "roteiro.md", { type: "text/markdown" })
  }
  if (script) fd.set("script", script)
  a.assets.forEach((x) => fd.append("assets", x))
  return fd
}
