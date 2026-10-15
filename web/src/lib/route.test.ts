import { describe, expect, it } from "vitest"
import { parseHash } from "./route"

describe("parseHash", () => {
  it("lê o workspace e cai na home no resto", () => {
    expect(parseHash("#/p/12")).toEqual({ name: "project", id: 12 })
    expect(parseHash("#/")).toEqual({ name: "new" })
    expect(parseHash("")).toEqual({ name: "new" })
    expect(parseHash("#/p/abc")).toEqual({ name: "new" })
  })
})
