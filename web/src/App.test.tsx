import { fireEvent, render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { toast } from "@/components/ui/toast"
import App from "./App"

vi.mock("@/api", () => ({ api: {
  jobs: vi.fn().mockResolvedValue([]), stages: vi.fn().mockResolvedValue([]),
  doctor: vi.fn().mockResolvedValue({ ok: true, checks: [] }), auth: vi.fn().mockResolvedValue({ ok: true, detail: "logado" }), recipeInfo: vi.fn().mockResolvedValue([]),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

describe("App", () => {
  it("bloqueia só o drop de arquivos (texto em textarea segue livre)", () => {
    render(<App />)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["Files"], files: [] } })).toBe(false)
    expect(fireEvent.dragOver(window, { dataTransfer: { types: ["Files"] } })).toBe(false)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["text/plain"], files: [] } })).toBe(true)
  })

  it("servidor fora do ar vira um toast fixo de conexão", async () => {
    vi.mocked(api.jobs).mockRejectedValueOnce(new Error("Failed to fetch"))
    render(<App />)
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ id: "offline", state: "pending" })))
  })
})
