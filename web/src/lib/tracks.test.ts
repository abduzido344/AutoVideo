import { describe, expect, it } from "vitest"
import type { TimelineJSON } from "@/api"
import { duration, timelineTracks } from "./tracks"

const base: TimelineJSON = {
  width: 1080, height: 1920,
  segments: [{ src: "input/a.mp4", in: 1, out: 5 }, { src: "input/a.mp4", in: 6, out: 12 }],
}

describe("timelineTracks", () => {
  it("vídeo contíguo no eixo de saída e 6 faixas", () => {
    expect(duration(base)).toBe(10)
    const t = timelineTracks(base)
    expect(t.map((x) => x.key)).toEqual(["video", "zoom", "overlay", "captions", "music", "sfx"])
    expect(t[0].clips.map((c) => [c.left, c.width, c.at])).toEqual([[0, 40, 0], [40, 60, 4]])
    expect(t[3].clips).toHaveLength(1) // captions ausente = ligado
  })
  it("rótulos e listas opcionais", () => {
    const t = timelineTracks({
      ...base, captions: false,
      zooms: [{ at: 1, dur: 1, kind: "push", scale: 1.12 }, { at: 5, dur: 0.5 }],
      overlays: [{ start: 0, dur: 2.5, src: "compositions/hook.html" }],
      broll: [{ start: 3, dur: 1, src: "assets/x.mp4" }],
      music: { src: "assets/trilha boa.mp3" },
      sfx: [{ at: 4, src: "assets/whoosh.wav" }],
    })
    expect(t[1].clips.map((c) => c.label)).toEqual(["112%", "punch"])
    expect(t[2].clips.map((c) => c.label)).toEqual(["hook", "b-roll"])
    expect(t[3].clips).toHaveLength(0)
    expect(t[4].clips[0].label).toBe("trilha boa")
    expect(t[5].clips[0]).toMatchObject({ label: "whoosh", at: 4 })
  })
  it("itens além do fim ficam dentro de 0–100%", () => {
    const t = timelineTracks({ ...base, overlays: [{ start: 9.9, dur: 5, src: "compositions/x.html" }],
      sfx: [{ at: 50, src: "assets/s.wav", dur: 1 }] })
    for (const track of t) for (const c of track.clips) {
      expect(c.left).toBeGreaterThanOrEqual(0)
      expect(c.left + c.width).toBeLessThanOrEqual(100.0001)
    }
  })
})
