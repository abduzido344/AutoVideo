import { describe, expect, it } from "vitest"
import { buildForm, classify, EMPTY, removeFile } from "./compose-form"

const f = (name: string, type = "", body = "x") => new File([body], name, { type })

describe("compose-form", () => {
  it("classify separa vídeo, roteiro e assets", () => {
    const a = classify([f("a b.mp4", "video/mp4"), f("c.MOV"), f("roteiro.md"), f("trilha.mp3", "audio/mpeg")], EMPTY)
    expect(a.videos.map((x) => x.name)).toEqual(["a b.mp4", "c.MOV"])
    expect(a.script?.name).toBe("roteiro.md")
    expect(a.assets.map((x) => x.name)).toEqual(["trilha.mp3"])
    expect(classify([f("d.mp4", "video/mp4")], a).videos).toHaveLength(3)
  })
  it("removeFile tira só aquele arquivo", () => {
    const v = f("a.mp4", "video/mp4"); const s = f("r.txt")
    const a = removeFile(classify([v, s], EMPTY), s)
    expect(a.script).toBeNull()
    expect(a.videos).toEqual([v])
  })
  it("texto sem arquivo vira roteiro.md; aprovar etapas = auto false", async () => {
    const fd = await buildForm(classify([f("a.mp4", "video/mp4")], EMPTY), "  reels de 45 s  ", "talking-head-punchy", true)
    expect(fd.get("recipe")).toBe("talking-head-punchy")
    expect(fd.get("auto")).toBe("false")
    expect(fd.getAll("videos")).toHaveLength(1)
    const script = fd.get("script") as File
    expect(script.name).toBe("roteiro.md")
    expect(await script.text()).toBe("reels de 45 s")
    expect(fd.getAll("assets")).toHaveLength(0)
  })
  it("arquivo de roteiro + texto: nada se perde", async () => {
    const a = classify([f("a.mp4", "video/mp4"), f("meu roteiro.md", "", "# Roteiro\nOlá")], EMPTY)
    const fd = await buildForm(a, "hook mais forte", "talking-head-punchy", false)
    expect(fd.get("auto")).toBe("true")
    const script = fd.get("script") as File
    expect(script.name).toBe("meu roteiro.md")
    expect(await script.text()).toBe("# Roteiro\nOlá\n\n## Pedido\nhook mais forte\n")
  })
  it("sem texto e sem roteiro não manda script", async () => {
    const fd = await buildForm(classify([f("a.mp4", "video/mp4")], EMPTY), "   ", "montage-beat", true)
    expect(fd.has("script")).toBe(false)
  })
})
