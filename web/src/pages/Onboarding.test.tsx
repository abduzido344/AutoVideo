import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type PerfilDetalhe } from "@/api"
import { Onboarding } from "./Onboarding"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: { perfil: vi.fn(), estilo: vi.fn(), vozes: vi.fn().mockResolvedValue([]), chat: vi.fn().mockResolvedValue([]), chatSend: vi.fn(), salvarPerfil: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const det = (estilo: string, aprovada: boolean, onboarding = 6, voz = "v1"): PerfilDetalhe => ({
  perfil: { slug: "benji", nome: "Benji", estilo, onboarding, voz_id: voz } as PerfilDetalhe["perfil"],
  ideias: [], series: [], universo: { mundo: "", historico: "" },
  personagens: [{ slug: "ana", ficha: "x", folha: true, aprovada }],
})

describe("Onboarding", () => {
  beforeEach(() => { vi.mocked(api.estilo).mockResolvedValue({ md: "", json: { voz_padrao: "" } } as never) })
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
  it("onboarding incompleto mantém desabilitado mesmo com a folha aprovada", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("benji", true, 3))
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it("sem estilo continua desabilitado", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("", true))
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it("uma folha ainda não aprovada mantém desabilitado (o servidor exige todas)", async () => {
    const d = det("benji", true)
    vi.mocked(api.perfil).mockResolvedValue({ ...d, personagens: [...d.personagens, { slug: "zeca", ficha: "y", folha: true, aprovada: false }] })
    render(<Onboarding slug="benji" />)
    await screen.findByText("zeca")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it("sem voz no perfil nem no estilo mantém desabilitado; a voz padrão do estilo libera", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("benji", true, 6, ""))
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    vi.mocked(api.estilo).mockResolvedValue({ md: "", json: { voz_padrao: "vp" } } as never)
    render(<Onboarding slug="benji" />)
    await screen.findByText("aprovada")
    await waitFor(() => expect((screen.getByRole("button", { name: "Ativar perfil" }) as HTMLButtonElement).disabled).toBe(false))
  })
  it("lista as 6 etapas marcando a atual", async () => {
    vi.mocked(api.perfil).mockResolvedValue(det("benji", true, 2))
    render(<Onboarding slug="benji" />)
    expect(await screen.findByText("2 de 6 concluídas")).toBeTruthy()
    expect(screen.getByText("Personagens", { selector: "li *" })).toBeTruthy()
  })
})
