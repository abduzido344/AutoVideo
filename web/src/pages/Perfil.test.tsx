import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type PerfilDetalhe } from "@/api"
import { toast } from "@/components/ui/toast"
import { Perfil } from "./Perfil"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: {
  perfil: vi.fn(), estilos: vi.fn(), salvarPerfil: vi.fn(), addIdeia: vi.fn(), delIdeia: vi.fn(), gerar: vi.fn(), pausarSerie: vi.fn(), salvarMundo: vi.fn(),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/lib/route", () => ({ go: vi.fn() }))

const redes = { youtube: { conectada: false, usuario: "" }, tiktok: { conectada: false, usuario: "" }, instagram: { conectada: false, usuario: "" }, facebook: { conectada: false, usuario: "" } }
const det = (): PerfilDetalhe => ({
  perfil: { slug: "benji", nome: "Benji", assunto: "", publico: "", estilo: "fabula", voz_id: "v1", ativo: true, onboarding: 6,
    agenda: { gerar_as: "03:00", por_dia: 1, postar_as: ["09:00"], episodios_por_serie: 3 }, contas: redes },
  ideias: [{ id: "i1", texto: "Um gato astronauta", origem: "claude", usada: false }],
  personagens: [],
  series: [{ path_rel: "benji/series/01-x", serie: { slug: "01-x", titulo: "Gato no espaço", logline: "", ideia: null, paused: false, episodios: [] },
    episodios: [{ n: 1, titulo: "Decolagem", job: 7, status: "awaiting_approval", stage: "revisao" }] }],
  universo: { mundo: "Mundo velho", historico: "Ep 1: ..." },
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.perfil).mockResolvedValue(det())
  vi.mocked(api.estilos).mockResolvedValue([{ slug: "fabula", origem: "fabrica", titulo: "Fábula" }])
})

describe("Perfil", () => {
  it("Séries: status em português, pausar e gerar", async () => {
    vi.mocked(api.pausarSerie).mockResolvedValue({ ok: true })
    vi.mocked(api.gerar).mockResolvedValue({ ok: true })
    render(<Perfil slug="benji" aba="series" />)
    expect(await screen.findByText(/Aguardando aprovação/)).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Pausar série" }))
    expect(api.pausarSerie).toHaveBeenCalledWith("benji/series/01-x", true)
    await userEvent.click(screen.getByRole("button", { name: "Gerar próximo episódio" }))
    expect(api.gerar).toHaveBeenCalledWith("benji")
  })

  it("Ideias: adiciona e remove", async () => {
    vi.mocked(api.addIdeia).mockResolvedValue({ id: "i2", texto: "Nova", origem: "usuario", usada: false })
    vi.mocked(api.delIdeia).mockResolvedValue({ ok: true })
    render(<Perfil slug="benji" aba="ideias" />)
    await screen.findByText("Um gato astronauta")
    await userEvent.type(screen.getByLabelText("Nova ideia"), "Nova")
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }))
    expect(api.addIdeia).toHaveBeenCalledWith("benji", "Nova")
    await userEvent.click(screen.getByRole("button", { name: "Remover Um gato astronauta" }))
    expect(api.delIdeia).toHaveBeenCalledWith("benji", "i1")
  })

  it("Agenda rejeita 11 episódios no cliente", async () => {
    render(<Perfil slug="benji" aba="agenda" />)
    const campo = await screen.findByLabelText("Episódios por série")
    await userEvent.clear(campo)
    await userEvent.type(campo, "11")
    await userEvent.click(screen.getByRole("button", { name: "Salvar agenda" }))
    expect(api.salvarPerfil).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ state: "error" }))
  })

  it("Agenda envia o PUT com agenda inteira, voz e estilo", async () => {
    vi.mocked(api.salvarPerfil).mockResolvedValue(det().perfil)
    render(<Perfil slug="benji" aba="agenda" />)
    const campo = await screen.findByLabelText("Episódios por série")
    await userEvent.clear(campo)
    await userEvent.type(campo, "5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar agenda" }))
    await waitFor(() => expect(api.salvarPerfil).toHaveBeenCalledWith("benji", {
      agenda: { gerar_as: "03:00", por_dia: 1, postar_as: ["09:00"], episodios_por_serie: 5 }, voz_id: "v1", estilo: "fabula",
    }))
  })

  it("Contas: 4 redes não conectadas, Conectar desabilitado, sem a palavra opcional", async () => {
    const { container } = render(<Perfil slug="benji" aba="contas" />)
    await screen.findAllByText("Não conectada")
    expect(screen.getAllByText("Não conectada")).toHaveLength(4)
    const bot = screen.getAllByRole("button", { name: /Conectar/ })
    expect(bot).toHaveLength(4)
    expect(bot.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(container.textContent).not.toMatch(/opcional/i)
  })

  it("Universo: salva o mundo", async () => {
    vi.mocked(api.salvarMundo).mockResolvedValue({ ok: true })
    render(<Perfil slug="benji" aba="universo" />)
    const t = await screen.findByLabelText("Mundo")
    await userEvent.type(t, "!")
    await userEvent.click(screen.getByRole("button", { name: "Salvar mundo" }))
    expect(api.salvarMundo).toHaveBeenCalledWith("benji", "Mundo velho!")
  })
})
