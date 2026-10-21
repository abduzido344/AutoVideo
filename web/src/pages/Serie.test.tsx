import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type SerieDetalhe } from "@/api"
import { go } from "@/lib/route"
import { Serie } from "./Serie"

vi.mock("@/api", () => ({ api: { serieDetalhe: vi.fn(), pausarSerie: vi.fn() } }))
vi.mock("@/lib/route", () => ({ go: vi.fn() }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const base = { sinopse: "Sinopse", job: null, status: null, stage: null, aprovado: false, custo_usd: 0, capa: null }
const det = (paused = false): SerieDetalhe => ({
  serie: { slug: "s", titulo: "A Série", logline: "Uma logline", ideia: null, paused, episodios: [] },
  perfil: "benji", custo_usd: 1.5,
  episodios: [
    { ...base, n: 1, titulo: "Primeiro", job: 7, status: "completed", stage: "aprovacao", aprovado: true, custo_usd: 0.31, capa: "/projects/x/capa.png" },
    { ...base, n: 2, titulo: "Segundo", job: 8, status: "in_progress", stage: "imagens", custo_usd: 0.2 },
    { ...base, n: 3, titulo: "Terceiro", sinopse: "Ainda no papel" },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.serieDetalhe).mockResolvedValue(det())
  vi.mocked(api.pausarSerie).mockResolvedValue({ ok: true })
})

describe("Serie", () => {
  it("cabeçalho e três episódios com status", async () => {
    render(<Serie path_rel="p/s" />)
    expect(await screen.findByText("Uma logline")).toBeTruthy()
    expect(screen.getByText("1 de 3 no ar")).toBeTruthy()
    expect(screen.getByText("US$ 1,50")).toBeTruthy()
    expect(screen.getByText("Concluído")).toBeTruthy()
    expect(screen.getByText("Em andamento")).toBeTruthy()
    expect(screen.getByText("US$ 0,31")).toBeTruthy()
  })
  it("clicar em episódio com job abre a peça", async () => {
    render(<Serie path_rel="p/s" />)
    await userEvent.click(await screen.findByRole("button", { name: /Primeiro/ }))
    expect(go).toHaveBeenCalledWith({ name: "episodio", jid: 7 })
  })
  it("episódio sem job não é clicável e diz Planejado", async () => {
    render(<Serie path_rel="p/s" />)
    await screen.findByText(/Terceiro/)
    expect(screen.queryByRole("button", { name: /Terceiro/ })).toBeNull()
    expect(screen.getByText("Planejado")).toBeTruthy()
    expect(screen.getByText("Ainda no papel")).toBeTruthy()
  })
  it("Pausar chama api.pausarSerie", async () => {
    render(<Serie path_rel="p/s" />)
    await userEvent.click(await screen.findByRole("button", { name: "Pausar série" }))
    await waitFor(() => expect(api.pausarSerie).toHaveBeenCalledWith("p/s", true))
  })
  it("falha ao carregar mostra aviso", async () => {
    vi.mocked(api.serieDetalhe).mockRejectedValue(new Error("x"))
    render(<Serie path_rel="p/s" />)
    expect(await screen.findByText("Não consegui carregar a série")).toBeTruthy()
  })
})
