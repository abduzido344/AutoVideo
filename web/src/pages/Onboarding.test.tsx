import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { api, type PerfilDetalhe } from "@/api"
import { Onboarding } from "./Onboarding"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: { perfil: vi.fn(), chat: vi.fn().mockResolvedValue([]), chatSend: vi.fn(), salvarPerfil: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const det = (estilo: string, aprovada: boolean): PerfilDetalhe => ({
  perfil: { slug: "benji", nome: "Benji", estilo, onboarding: 2 } as PerfilDetalhe["perfil"],
  ideias: [], series: [], universo: { mundo: "", historico: "" },
  personagens: [{ slug: "ana", ficha: "x", folha: true, aprovada }],
})

describe("Onboarding", () => {
  it("Ativar fica desabilitado sem folha aprovada", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("benji", false))
    render(<Onboarding slug="benji" />)
    await screen.findByText("ana")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it("Ativar habilita com estilo e folha aprovada", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("benji", true))
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(false)
  })
  it("sem estilo continua desabilitado", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("", true))
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
