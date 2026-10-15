import { describe, expect, it } from "vitest"
import { appendChip, assetUrl, clock, doctorText, money, playerClass, projectName, stageIndex, statusInfo, totalCost } from "./format"

describe("format", () => {
  it("projectName tira o carimbo de data e troca hífens", () => {
    expect(projectName("C:\\Users\\x\\projects\\20261015-102328-instagram-reels")).toBe("Instagram reels")
    expect(projectName("/p/20261015-102328-rengoku-2")).toBe("Rengoku 2")
    expect(projectName("solto")).toBe("Solto")
  })
  it("statusInfo dá rótulo e tom", () => {
    expect(statusInfo({ status: "awaiting_approval", error: "" })).toEqual({ label: "aprovar", tone: "blue" })
    expect(statusInfo({ status: "failed", error: "interrompido" })).toEqual({ label: "interrompido", tone: "red" })
    expect(statusInfo({ status: "failed", error: "AgentOutputError: x" }).label).toBe("falhou")
    expect(statusInfo({ status: "in_progress", error: "" })).toEqual({ label: "rodando", tone: "gray" })
    expect(statusInfo({ status: "completed", error: "" }).tone).toBe("green")
    expect(statusInfo({ status: "queued", error: "" })).toEqual({ label: "na fila", tone: "gray" })
  })
  it("assetUrl codifica cada segmento (espaço, acento, #)", () => {
    expect(assetUrl("20261015-1-a", "input/meu vídeo #1.clean.mp4"))
      .toBe("/projects/20261015-1-a/input/meu%20v%C3%ADdeo%20%231.clean.mp4")
    expect(assetUrl("r", "out/final.mp4", 42)).toBe("/projects/r/out/final.mp4?t=42")
  })
  it("custos, relógio e etapa", () => {
    expect(totalCost([{ cost_usd: 0.2 }, { cost_usd: null }, { cost_usd: 0.35 }])).toBeCloseTo(0.55)
    expect(totalCost([{ cost_usd: 0.1 }, {}, { cost_usd: undefined }])).toBeCloseTo(0.1)
    expect(money(1.846)).toBe("$1,85")
    expect(clock(41)).toBe("00:41")
    expect(clock(125.6)).toBe("02:05")
    const st = ["ingest", "gate1", "post"]
    expect(stageIndex({ status: "awaiting_approval", stage: "gate1" }, st)).toBe(1)
    expect(stageIndex({ status: "completed", stage: "post" }, st)).toBe(3)
    expect(stageIndex({ status: "queued", stage: "" }, st)).toBe(0)
  })
  it("appendChip não duplica e junta com vírgula", () => {
    expect(appendChip("", "mais curto")).toBe("mais curto")
    expect(appendChip("hook forte ", "mais curto")).toBe("hook forte, mais curto")
    expect(appendChip("mais curto", "mais curto")).toBe("mais curto")
  })
  it("doctorText cobre verificando, ok e falha", () => {
    expect(doctorText(null)).toEqual({ ok: null, text: "Verificando o sistema…" })
    expect(doctorText({ ok: true, checks: [] }).ok).toBe(true)
    expect(doctorText({ ok: false, checks: [{ name: "claude auth", ok: false, detail: "rode claude login" }] }))
      .toEqual({ ok: false, text: "Falta: claude auth — rode claude login" })
  })
  it("playerClass respeita o formato", () => {
    expect(playerClass("9:16")).toContain("aspect-[9/16]")
    expect(playerClass("1:1")).toContain("aspect-square")
    expect(playerClass(null)).toContain("aspect-video")
  })
})
