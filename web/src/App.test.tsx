import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "./App"

vi.mock("@/api", () => ({ api: {
  jobs: vi.fn().mockResolvedValue([]), stages: vi.fn().mockResolvedValue([]),
  doctor: vi.fn().mockResolvedValue({ ok: true, checks: [] }), recipeInfo: vi.fn().mockResolvedValue([]),
} }))

describe("App", () => {
  it("bloqueia só o drop de arquivos (texto em textarea segue livre)", () => {
    render(<App />)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["Files"], files: [] } })).toBe(false)
    expect(fireEvent.dragOver(window, { dataTransfer: { types: ["Files"] } })).toBe(false)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["text/plain"], files: [] } })).toBe(true)
  })
})
