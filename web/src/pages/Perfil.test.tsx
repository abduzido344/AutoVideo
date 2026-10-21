import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError, type PerfilDetalhe } from "@/api"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { Perfil } from "./Perfil"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: {
  perfil: vi.fn(), estilos: vi.fn(), vozes: vi.fn(), salvarPerfil: vi.fn(), addIdeia: vi.fn(), delIdeia: vi.fn(), gerar: vi.fn(), pausarSerie: vi.fn(), salvarMundo: vi.fn(),
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
  vi.mocked(api.vozes).mockResolvedValue([{ voice_id: "v1", nome: "Ana", preview_url: "http://p/a.mp3", descricao: "paulista" }, { voice_id: "v2", nome: "Beto", preview_url: null, descricao: "" }])
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

  it.each([["Episódios por dia", "0"], ["Episódios por dia", "6"], ["Gerar às", ""], ["Postar às (horários separados por vírgula)", "9h"], ["Postar às (horários separados por vírgula)", ""]])(
    "Agenda rejeita %s = %j", async (rotulo, valor) => {
      render(<Perfil slug="benji" aba="agenda" />)
      const campo = await screen.findByLabelText(rotulo)
      await userEvent.clear(campo)
      if (valor) await userEvent.type(campo, valor)
      await userEvent.click(screen.getByRole("button", { name: "Salvar agenda" }))
      expect(api.salvarPerfil).not.toHaveBeenCalled()
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ state: "error" }))
    })

  it("Gerar próximo episódio bloqueia duplo clique", async () => {
    let fim!: () => void
    vi.mocked(api.gerar).mockReturnValue(new Promise((r) => { fim = () => r({ ok: true }) }))
    render(<Perfil slug="benji" aba="series" />)
    const b = await screen.findByRole("button", { name: "Gerar próximo episódio" })
    await userEvent.click(b)
    await userEvent.click(b)
    expect(api.gerar).toHaveBeenCalledTimes(1)
    fim()
  })

  it("Agenda envia o PUT com agenda inteira e estilo (a voz salva à parte)", async () => {
    vi.mocked(api.salvarPerfil).mockResolvedValue(det().perfil)
    render(<Perfil slug="benji" aba="agenda" />)
    const campo = await screen.findByLabelText("Episódios por série")
    await userEvent.clear(campo)
    await userEvent.type(campo, "5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar agenda" }))
    await waitFor(() => expect(api.salvarPerfil).toHaveBeenCalledWith("benji", {
      agenda: { gerar_as: "03:00", por_dia: 1, postar_as: ["09:00"], episodios_por_serie: 5 }, estilo: "fabula",
    }))
  })

  it("escolher a voz salva voz_id na hora", async () => {
    vi.mocked(api.salvarPerfil).mockResolvedValue(det().perfil)
    render(<Perfil slug="benji" aba="agenda" />)
    await screen.findByLabelText("Ouvir a voz")
    await userEvent.click(screen.getByRole("combobox", { name: "Voz" }))
    await userEvent.click(await screen.findByRole("option", { name: "Beto" }))
    await waitFor(() => expect(api.salvarPerfil).toHaveBeenCalledWith("benji", { voz_id: "v2" }))
  })
  it("sem a chave da ElevenLabs mostra o aviso com link", async () => {
    vi.mocked(api.vozes).mockRejectedValue(new ApiError("salve a chave da ElevenLabs em Configurações", 400))
    render(<Perfil slug="benji" aba="agenda" />)
    const link = await screen.findByRole("link", { name: /Configurações → Chaves API/ })
    expect(link.getAttribute("href")).toBe("#/config/chaves")
    expect(screen.queryByLabelText("Voz (voice_id)")).toBeNull()
  })

  it("cabeçalho: nome, abas Séries | Ideias | Universo | Agenda e voz e só a seção escolhida", async () => {
    const { container } = render(<Perfil slug="benji" aba="ideias" />)
    expect(await screen.findByRole("heading", { name: "Benji" })).toBeTruthy()
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Séries", "Ideias", "Universo", "Agenda e voz"])
    expect(screen.getByRole("tab", { name: "Ideias" }).getAttribute("aria-selected")).toBe("true")
    await screen.findByText("Um gato astronauta")
    expect(screen.queryByText("Gato no espaço")).toBeNull()
    expect(screen.getByRole("button", { name: "Gerar próximo episódio" })).toBeTruthy()
    expect(screen.getByRole("switch", { name: "Ativo" })).toBeTruthy()
    await userEvent.click(screen.getByRole("tab", { name: "Universo" }))
    expect(go).toHaveBeenCalledWith({ name: "perfil", slug: "benji", aba: "universo" })
    expect(container.textContent).not.toMatch(/opcional/i)
  })
  it("a aba Contas saiu: cai em Séries", async () => {
    render(<Perfil slug="benji" aba="contas" />)
    expect(await screen.findByText("Gato no espaço")).toBeTruthy()
    expect(screen.queryByRole("tab", { name: "Contas" })).toBeNull()
  })

  it("Universo: salva o mundo", async () => {
    vi.mocked(api.salvarMundo).mockResolvedValue({ ok: true })
    render(<Perfil slug="benji" aba="universo" />)
    const t = await screen.findByLabelText("Mundo")
    await userEvent.type(t, "!")
    await userEvent.click(screen.getByRole("button", { name: "Salvar mundo" }))
    expect(api.salvarMundo).toHaveBeenCalledWith("benji", "Mundo velho!")
  })

  it("Agenda: switch Ativo envia PUT {ativo} e mostra o 409 do servidor", async () => {
    vi.mocked(api.perfil).mockResolvedValue({ ...det(), perfil: { ...det().perfil, ativo: false } })
    vi.mocked(api.salvarPerfil).mockRejectedValue(new ApiError("perfil ainda não pode ser ativado: crie ao menos um personagem", 409))
    render(<Perfil slug="benji" aba="agenda" />)
    const sw = await screen.findByRole("switch", { name: "Ativo" })
    expect(sw.getAttribute("aria-checked")).toBe("false")
    await userEvent.click(sw)
    expect(api.salvarPerfil).toHaveBeenCalledWith("benji", { ativo: true })
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      state: "error", description: "perfil ainda não pode ser ativado: crie ao menos um personagem" })))
    expect(sw.getAttribute("aria-checked")).toBe("false")
  })

  it("Gerar: recusa do servidor vira toast com o motivo", async () => {
    vi.mocked(api.gerar).mockRejectedValue(new ApiError("a fila está pausada", 409))
    render(<Perfil slug="benji" aba="series" />)
    await userEvent.click(await screen.findByRole("button", { name: "Gerar próximo episódio" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ state: "error", description: "a fila está pausada" })))
  })
})
