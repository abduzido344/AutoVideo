import { describe, expect, it } from "vitest"
import { tokens } from "./transcript"

describe("tokens", () => {
  it("risca fillers e marca pausas longas", () => {
    const words = [
      { text: "Vem", start: 0, end: 0.3 }, { text: "cá.", start: 0.35, end: 0.6 },
      { text: "é…", start: 0.7, end: 1.0 }, { text: "Se", start: 3.1, end: 3.3 },
    ]
    expect(tokens({ words, fillers: [2] })).toEqual([
      { text: "Vem", cut: false, start: 0 }, { text: "cá.", cut: false, start: 0.35 },
      { text: "é…", cut: true, start: 0.7 }, { text: "silêncio 2,1 s", cut: true, start: 1.0 },
      { text: "Se", cut: false, start: 3.1 },
    ])
  })
})
