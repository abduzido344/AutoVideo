export type Attachments = { videos: File[]; script: File | null; assets: File[] }
export const EMPTY: Attachments = { videos: [], script: null, assets: [] }

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i
const SCRIPT_EXT = /\.(md|txt)$/i

export function classify(files: File[], prev: Attachments): Attachments {
  const out: Attachments = { videos: [...prev.videos], script: prev.script, assets: [...prev.assets] }
  for (const f of files) {
    if (f.type.startsWith("video/") || VIDEO_EXT.test(f.name)) out.videos.push(f)
    else if (SCRIPT_EXT.test(f.name)) out.script = f
    else out.assets.push(f)
  }
  return out
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
