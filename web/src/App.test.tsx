import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { toast } from "@/components/ui/toast"
import App from "./App"

vi.mock("@/api", () => ({ api: {
  fila: vi.fn().mockResolvedValue({ paused: false, paused_until: null, reason: "", jobs: [
    { id: 1, status: "awaiting_approval", recipe: "episodio" }, { id: 2, status: "completed", recipe: "episodio" },
  ] }),
  perfis: vi.fn().mockResolvedValue([{ slug: "benji", nome: "Benji" }]),
  doctor: vi.fn().mockResolvedValue({ ok: true, checks: [] }), auth: vi.fn().mockResolvedValue({ ok: true, detail: "logado" }),
  config: vi.fn().mockResolvedValue({ keys: {}, image_provider: "openrouter", image_model: "m", max_imagens: 40 }),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

describe("App", () => {
  it("bloqueia só o drop de arquivos (texto em textarea segue livre)", () => {
    render(<App />)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["Files"], files: [] } })).toBe(false)
    expect(fireEvent.dragOver(window, { dataTransfer: { types: ["Files"] } })).toBe(false)
    expect(fireEvent.drop(window, { dataTransfer: { types: ["text/plain"], files: [] } })).toBe(true)
  })

  it("a sidebar traz o perfil e a contagem de revisão vinda da fila", async () => {
    render(<App />)
    expect((await screen.findByRole("combobox", { name: "Perfil" })).textContent).toContain("Benji")
    expect(await screen.findByLabelText("1 aguardando")).toBeTruthy()
  })

  it("servidor fora do ar vira um toast fixo de conexão", async () => {
    vi.mocked(api.fila).mockRejectedValueOnce(new Error("Failed to fetch"))
    render(<App />)
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ id: "offline", state: "pending" })))
  })
})
