import { describe, expect, it } from "vitest"
import { doctorText } from "./format"

describe("format", () => {
  it("doctorText cobre verificando, ok e falha", () => {
    expect(doctorText(null)).toEqual({ ok: null, text: "Verificando o sistema…" })
    expect(doctorText({ ok: true, checks: [] })).toEqual({ ok: true, text: "Tudo pronto" })
    expect(doctorText({ ok: false, checks: [{ name: "claude auth", ok: false, detail: "rode claude login" }] }))
      .toEqual({ ok: false, text: "Falta: claude auth — rode claude login" })
  })
})
