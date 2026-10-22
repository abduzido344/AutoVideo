import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { Estilos, NovoEstilo } from "./Estilos"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: {
  estilos: vi.fn(), estilo: vi.fn(), analisarEstilo: vi.fn(), chat: vi.fn().mockResolvedValue([]), chatSend: vi.fn(),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/lib/route", () => ({ go: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.estilos).mockResolvedValue([{ slug: "fabula", origem: "fabrica", titulo: "Fábula" }, { slug: "meu", origem: "usuario", titulo: "Meu" }])
})

describe("Estilos", () => {
  it("lista com a origem", async () => {
    render(<Estilos onNovo={() => {}} />)
    expect(await screen.findByText("Fábula")).toBeTruthy()
    expect(screen.getByText("fábrica")).toBeTruthy()
    expect(screen.getByText("seu")).toBeTruthy()
  })
  it("Analisar perfil avisa que o job está em Produção", async () => {
    vi.mocked(api.analisarEstilo).mockResolvedValue({ job: 9 })
    render(<Estilos onNovo={() => {}} />)
    await userEvent.type(await screen.findByLabelText("Perfil a analisar"), "@fulano")
    await userEvent.click(screen.getByRole("button", { name: "Analisar perfil" }))
    expect(api.analisarEstilo).toHaveBeenCalledWith("@fulano")
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ state: "success", description: expect.stringContaining("Produção") }))
  })
  it("Novo estilo pede o nome e abre a conversa com o slug", async () => {
    render(<NovoEstilo open onOpenChange={() => {}} />)
    await userEvent.type(screen.getByLabelText("Nome do estilo"), "Câmera Lenta 2")
    await userEvent.click(screen.getByRole("button", { name: "Criar conversando" }))
    expect(go).toHaveBeenCalledWith({ name: "estilo", slug: "camera-lenta-2" })
  })
})
