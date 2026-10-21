import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { toast } from "@/components/ui/toast"
import App from "./App"

vi.mock("@/api", () => ({ api: {
  fila: vi.fn().mockResolvedValue({ paused: false, paused_until: null, reason: "", jobs: [
    { id: 1, status: "awaiting_approval", recipe: "episodio" }, { id: 2, status: "completed", recipe: "episodio" },
  ] }),
  perfis: vi.fn().mockResolvedValue([{ slug: "benji", nome: "Benji", onboarding: 6 }]),
  episodio: vi.fn().mockReturnValue(new Promise(() => {})),
  doctor: vi.fn().mockResolvedValue({ ok: true, checks: [] }), auth: vi.fn().mockResolvedValue({ ok: true, detail: "logado" }),
  config: vi.fn().mockResolvedValue({ keys: {}, image_provider: "openrouter", image_model: "m", max_imagens: 40 }),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

describe("App", () => {
  beforeEach(() => { history.replaceState(null, "", "#/perfis") })

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

  it.each([["#/fila", "#/producao"], ["#/revisao", "#/producao"], ["#/revisao/1", "#/producao/1"]])("%s redireciona para %s", async (de, para) => {
    history.replaceState(null, "", de)
    render(<App />)
    expect(location.hash).toBe(para)
    // com o painel de revisão aberto o resto fica aria-hidden
    expect(await screen.findByRole("heading", { name: "Produção", hidden: true })).toBeTruthy()
  })

  it("Produção mostra a esteira de 4 colunas e #/producao/<jid> abre o painel de revisão", async () => {
    history.replaceState(null, "", "#/producao/1")
    render(<App />)
    expect(await screen.findByRole("region", { name: "Para revisar", hidden: true })).toBeTruthy()
    expect(screen.getAllByRole("region", { hidden: true })).toHaveLength(4)
    expect(await screen.findByRole("dialog")).toBeTruthy()
  })

  it("#/config/conexoes abre a aba Conexões", async () => {
    history.replaceState(null, "", "#/config/conexoes")
    render(<App />)
    expect((await screen.findByRole("tab", { name: "Conexões" })).getAttribute("aria-selected")).toBe("true")
    expect(await screen.findByText(/Nesta versão você posta à mão/)).toBeTruthy()
  })

  it("o app tem o tamanho da tela: o wrapper não deixa a página rolar", () => {
    const { container } = render(<App />)
    const wrapper = container.querySelector("[data-slot=sidebar-wrapper]")!
    expect(wrapper.className).toContain("h-svh")
    expect(wrapper.className).toContain("overflow-hidden")
  })
})
