import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Episodio, type Fila as FilaT, type FilaJob } from "@/api"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { Producao } from "./Producao"

vi.mock("@/api", () => ({ api: {
  fila: vi.fn(), pausarFila: vi.fn(), continuarFila: vi.fn(), retomar: vi.fn(),
  episodio: vi.fn(), aprovar: vi.fn(), ajustar: vi.fn(), descartar: vi.fn(), postado: vi.fn(),
} }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/components/ui/video", () => ({ Video: ({ src }: { src: string }) => <video data-testid="player" src={src} /> }))
vi.mock("@/lib/route", () => ({ go: vi.fn() }))

const job = (o: Partial<FilaJob>): FilaJob => ({
  id: 1, project_dir: "", recipe: "episodio", auto: 0, status: "queued", stage: "", error: "", created: 0, updated: 0,
  perfil: "benji", serie: "s", n: 1, titulo: "Ep Um", ...o,
})
const fila = (o: Partial<FilaT>): FilaT => ({ paused: false, paused_until: null, reason: "", jobs: [], ...o })
const coluna = (nome: string) => screen.getByRole("region", { name: nome })

const ep = {
  job: { id: 5, status: "awaiting_approval" }, perfil: "benji", serie: "s", n: 2, titulo: "Ep Dois", roteiro: "Era uma vez",
  episodio: { titulo: "Ep Dois", resumo: "", post: { caption: "Legenda boa", hashtags: ["#a", "#b"] } },
  revisao: { ok: false, fixes: [{ role: "diretor_arte", scene: "s04", note: "rosto torto" }] },
  final: "/projects/x/out/final.mp4", capa: "/projects/x/out/capa.jpg", aprovado: false, postado: [],
} as unknown as Episodio

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.retomar).mockResolvedValue({ ok: true })
  vi.mocked(api.fila).mockResolvedValue(fila({}))
  vi.mocked(api.episodio).mockResolvedValue(ep)
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe("Produção: esteira", () => {
  it("cabeçalho mostra pausa por limite de uso com a hora e Retomar fila", async () => {
    const t = new Date(2026, 9, 21, 14, 5).getTime() / 1000
    vi.mocked(api.fila).mockResolvedValue(fila({ paused: true, paused_until: t, reason: "limite de uso do Claude" }))
    vi.mocked(api.continuarFila).mockResolvedValue({ ok: true })
    render(<Producao />)
    expect(await screen.findByText(/Pausada até 14:05 — limite de uso/)).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Retomar fila" }))
    expect(api.continuarFila).toHaveBeenCalled()
  })
  it("rodando mostra o estado e Pausar fila", async () => {
    vi.mocked(api.pausarFila).mockResolvedValue({ ok: true })
    render(<Producao />)
    expect(await screen.findByText("Rodando")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Pausar fila" }))
    expect(api.pausarFila).toHaveBeenCalled()
  })
  it("4 colunas, cada job na sua; falhou fica na etapa em que parou", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [
      job({ id: 1, status: "queued", titulo: "Esperando" }),
      job({ id: 2, status: "in_progress", stage: "sfx", titulo: "Rodando agora" }),
      job({ id: 3, status: "awaiting_approval", stage: "aprovacao", titulo: "Pronto pra ver" }),
      job({ id: 4, status: "completed", titulo: "Aprovado" }),
      job({ id: 6, status: "failed", stage: "voz", error: "ElevenLabs caiu", titulo: "Quebrado" }),
    ] }))
    render(<Producao />)
    await screen.findByText("Esperando")
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Na fila", "Produzindo", "Para revisar", "Prontos"])
    expect(within(coluna("Na fila")).getByText("Esperando")).toBeTruthy()
    expect(within(coluna("Produzindo")).getByText("Rodando agora")).toBeTruthy()
    expect(within(coluna("Produzindo")).getByText("Quebrado")).toBeTruthy()
    expect(within(coluna("Para revisar")).getByText("Pronto pra ver")).toBeTruthy()
    expect(within(coluna("Prontos")).getByText("Aprovado")).toBeTruthy()
  })
  it("cartão mostra série · perfil (pelo nome) e Parte N", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [job({ id: 1, serie: "Gato no espaço", n: 3 })] }))
    render(<Producao perfis={[{ slug: "benji", nome: "Benji" }]} />)
    expect(await screen.findByText("Gato no espaço · Benji")).toBeTruthy()
    expect(screen.getByText("Parte 3")).toBeTruthy()
  })
  it("job atual mostra a etapa legível; failed mostra erro, ver detalhes e Retomar", async () => {
    const longo = "Traceback\n" + "linha do hyperframes ".repeat(200)
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [
      job({ id: 1, status: "in_progress", stage: "sfx", titulo: "Rodando" }),
      job({ id: 2, status: "failed", stage: "voz", error: longo, titulo: "Quebrado" }),
    ] }))
    render(<Producao />)
    expect((await screen.findAllByText("Sons")).length).toBeGreaterThan(0)
    expect(screen.getByText(/^Traceback/).className).toContain("line-clamp-2")
    await userEvent.click(screen.getByRole("button", { name: "ver detalhes" }))
    expect(within(await screen.findByRole("dialog")).getByText(/^Traceback/)).toBeTruthy()
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "Retomar" }))
    expect(api.retomar).toHaveBeenCalledWith(2)
  })
  it("análise de estilo aparece com o @ e Retomar funciona", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [
      job({ id: 9, recipe: "estilo", status: "failed", stage: "analise", error: "Apify caiu", perfil: null, serie: null, n: null, titulo: "@abc" }),
    ] }))
    render(<Producao />)
    expect(await screen.findByText("@abc")).toBeTruthy()
    expect(screen.getByText("Análise de estilo")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Retomar" }))
    expect(api.retomar).toHaveBeenCalledWith(9)
  })
  it("pronto postado ganha o selo e a capa", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [job({ id: 4, status: "completed", titulo: "Aprovado", capa: "/projects/x/out/capa.jpg", video: true, aprovado: true, postado: ["tiktok"] })] }))
    const { container } = render(<Producao />)
    expect(await within(coluna("Prontos")).findByText("postado")).toBeTruthy()
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/projects/x/out/capa.jpg")
    expect(api.episodio).not.toHaveBeenCalled()
  })
  it("filtro por perfil esconde os outros", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [job({ id: 1, titulo: "Do Benji" }), job({ id: 2, perfil: "lum", titulo: "Da Lum" })] }))
    render(<Producao perfis={[{ slug: "benji", nome: "Benji" }, { slug: "lum", nome: "Lum" }]} />)
    await screen.findByText("Da Lum")
    expect(screen.getByRole("combobox", { name: "Filtrar por perfil" }).textContent).toContain("Todos os perfis")
    await userEvent.click(screen.getByRole("combobox", { name: "Filtrar por perfil" }))
    await userEvent.click(await screen.findByRole("option", { name: "Lum" }))
    expect(screen.queryByText("Do Benji")).toBeNull()
    expect(screen.getByText("Da Lum")).toBeTruthy()
  })
  it("clicar num cartão Para revisar abre a revisão em #/producao/<jid>", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [job({ id: 5, status: "awaiting_approval", titulo: "Ep Dois" })] }))
    render(<Producao />)
    await userEvent.click(await screen.findByRole("button", { name: /Ep Dois/ }))
    expect(go).toHaveBeenCalledWith({ name: "producao", jid: 5 })
  })
})

describe("Produção: painel de revisão", () => {
  it("abre com jid, mostra o player e os fixes do revisor; fechar volta para #/producao", async () => {
    render(<Producao jid={5} />)
    const painel = await screen.findByRole("dialog")
    expect(await within(painel).findByText(/rosto torto/)).toBeTruthy()
    expect(within(painel).getByTestId("player").getAttribute("src")).toBe("/projects/x/out/final.mp4")
    await userEvent.keyboard("{Escape}")
    expect(go).toHaveBeenCalledWith({ name: "producao" })
  })
  it("Exportar aponta para final e copia legenda + hashtags", async () => {
    render(<Producao jid={5} />)
    const link = await screen.findByRole("link", { name: /Exportar/ })
    expect(link.getAttribute("href")).toBe("/projects/x/out/final.mp4")
    expect(link.hasAttribute("download")).toBe(true)
    await userEvent.click(link)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Legenda boa\n\n#a #b")
  })
  it("Aprovar fecha o painel", async () => {
    vi.mocked(api.aprovar).mockResolvedValue({ ok: true })
    render(<Producao jid={5} />)
    await userEvent.click(await screen.findByRole("button", { name: "Aprovar" }))
    expect(api.aprovar).toHaveBeenCalledWith(5)
    await waitFor(() => expect(go).toHaveBeenCalledWith({ name: "producao" }))
  })
  it("Descartar pede confirmação", async () => {
    vi.mocked(api.descartar).mockResolvedValue({ ok: true })
    render(<Producao jid={5} />)
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }))
    expect(api.descartar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Sim, descartar" }))
    expect(api.descartar).toHaveBeenCalledWith(5)
  })
  it("Pedir ajuste exige texto", async () => {
    vi.mocked(api.ajustar).mockResolvedValue({ ok: true })
    render(<Producao jid={5} />)
    const b = await screen.findByRole("button", { name: "Pedir ajuste" })
    expect((b as HTMLButtonElement).disabled).toBe(true)
    await userEvent.type(screen.getByLabelText("O que ajustar"), "mais lento")
    await userEvent.click(b)
    await waitFor(() => expect(api.ajustar).toHaveBeenCalledWith(5, "mais lento"))
  })
  it("Copiar legenda copia; sem clipboard ou com falha vira toast de erro", async () => {
    render(<Producao jid={5} />)
    const b = await screen.findByRole("button", { name: "Copiar legenda" })
    await userEvent.click(b)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Legenda boa\n\n#a #b")
    Object.assign(navigator, { clipboard: undefined })
    await userEvent.click(b)
    await waitFor(() => expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ state: "error" })))
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("negado")) } })
    await userEvent.click(b)
    await waitFor(() => expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ description: "negado" })))
  })
  it("redes já postadas vêm do servidor e ficam desabilitadas", async () => {
    vi.mocked(api.episodio).mockResolvedValue({ ...ep, aprovado: true, postado: ["tiktok"] } as Episodio)
    render(<Producao jid={5} />)
    const b = await screen.findByRole("button", { name: "Postado no TikTok" })
    expect((b as HTMLButtonElement).disabled).toBe(true)
  })
  it("falha ao carregar o episódio mostra aviso", async () => {
    vi.mocked(api.episodio).mockRejectedValue(new Error("x"))
    render(<Producao jid={5} />)
    expect(await screen.findByText("Não consegui carregar o episódio")).toBeTruthy()
  })
  it("Marcar como postado registra a rede", async () => {
    vi.mocked(api.postado).mockResolvedValue({ ok: true, postado: ["tiktok"] })
    vi.mocked(api.episodio).mockResolvedValue({ ...ep, aprovado: true } as Episodio)
    render(<Producao jid={5} />)
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como postado no TikTok" }))
    expect(api.postado).toHaveBeenCalledWith(5, "tiktok")
  })
  it("antes de aprovar não há Marcar como postado, só Exportar", async () => {
    render(<Producao jid={5} />)
    await screen.findByRole("link", { name: /Exportar/ })
    expect(screen.queryByRole("button", { name: /Marcar como postado/ })).toBeNull()
  })
})
