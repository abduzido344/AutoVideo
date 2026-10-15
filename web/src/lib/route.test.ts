import { describe, expect, it } from "vitest"
import { isNewVideoShortcut, parseHash } from "./route"

describe("parseHash", () => {
  it("lê o workspace e cai na home no resto", () => {
    expect(parseHash("#/p/12")).toEqual({ name: "project", id: 12 })
    expect(parseHash("#/")).toEqual({ name: "new" })
    expect(parseHash("")).toEqual({ name: "new" })
    expect(parseHash("#/p/abc")).toEqual({ name: "new" })
  })
})

describe("isNewVideoShortcut", () => {
  const ev = (o: Partial<Parameters<typeof isNewVideoShortcut>[0]> = {}) =>
    ({ key: "k", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target: document.body, ...o })
  it("aceita Ctrl/Cmd+K fora de campos de texto", () => {
    expect(isNewVideoShortcut(ev())).toBe(true)
    expect(isNewVideoShortcut(ev({ ctrlKey: false, metaKey: true, key: "K" }))).toBe(true)
  })
  it("ignora campos de texto, modificadores extras e eventos já tratados", () => {
    for (const tag of ["textarea", "input"]) expect(isNewVideoShortcut(ev({ target: document.createElement(tag) }))).toBe(false)
    const ce = document.createElement("div"); ce.setAttribute("contenteditable", "true")
    expect(isNewVideoShortcut(ev({ target: ce }))).toBe(false)
    expect(isNewVideoShortcut(ev({ shiftKey: true }))).toBe(false)
    expect(isNewVideoShortcut(ev({ altKey: true }))).toBe(false)
    expect(isNewVideoShortcut(ev({ defaultPrevented: true }))).toBe(false)
    expect(isNewVideoShortcut(ev({ ctrlKey: false }))).toBe(false)
    expect(isNewVideoShortcut(ev({ key: "j" }))).toBe(false)
  })
})
