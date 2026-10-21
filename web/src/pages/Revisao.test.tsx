import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Episodio, type FilaJob } from "@/api"
import { toast } from "@/components/ui/toast"
import { Revisao } from "./Revisao"

vi.mock("@/api", () => ({ api: { fila: vi.fn(), episodio: vi.fn(), aprovar: vi.fn(), ajustar: vi.fn(), descartar: vi.fn(), postado: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/components/ui/video", () => ({ Video: ({ src }: { src: string }) => <video data-testid="player" src={src} /> }))

const ep = {
  job: { id: 5, status: "awaiting_approval" }, perfil: "benji", serie: "s", n: 2, titulo: "Ep Dois", roteiro: "Era uma vez",
  episodio: { titulo: "Ep Dois", resumo: "", post: { caption: "Legenda boa", hashtags: ["#a", "#b"] } },
  revisao: { ok: false, fixes: [{ role: "diretor_arte", scene: "s04", note: "rosto torto" }] },
  final: "/projects/x/out/final.mp4", capa: "/projects/x/out/capa.jpg", aprovado: false,
} as unknown as Episodio

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fila).mockResolvedValue({ paused: false, paused_until: null, reason: "", jobs: [
    { id: 5, status: "awaiting_approval", titulo: "Ep Dois", perfil: "benji", n: 2 } as FilaJob] })
  vi.mocked(api.episodio).mockResolvedValue(ep)
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe("Revisao", () => {
  it("lista os que aguardam aprovação", async () => {
    render(<Revisao />)
    expect(await screen.findByText(/Ep Dois/)).toBeTruthy()
  })
  it("detalhe mostra fixes do revisor", async () => {
    render(<Revisao jid={5} />)
    expect(await screen.findByText(/rosto torto/)).toBeTruthy()
    expect(screen.getByTestId("player").getAttribute("src")).toBe("/projects/x/out/final.mp4")
  })
  it("Exportar aponta para final e copia legenda + hashtags", async () => {
    render(<Revisao jid={5} />)
    const link = await screen.findByRole("link", { name: /Exportar/ })
    expect(link.getAttribute("href")).toBe("/projects/x/out/final.mp4")
    expect(link.hasAttribute("download")).toBe(true)
    await userEvent.click(link)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Legenda boa\n\n#a #b")
  })
  it("Descartar pede confirmação", async () => {
    vi.mocked(api.descartar).mockResolvedValue({ ok: true })
    render(<Revisao jid={5} />)
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }))
    expect(api.descartar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Sim, descartar" }))
    expect(api.descartar).toHaveBeenCalledWith(5)
  })
  it("Pedir ajuste exige texto", async () => {
    vi.mocked(api.ajustar).mockResolvedValue({ ok: true })
    render(<Revisao jid={5} />)
    const b = await screen.findByRole("button", { name: "Pedir ajuste" })
    expect((b as HTMLButtonElement).disabled).toBe(true)
    await userEvent.type(screen.getByLabelText("O que ajustar"), "mais lento")
    await userEvent.click(b)
    await waitFor(() => expect(api.ajustar).toHaveBeenCalledWith(5, "mais lento"))
  })
  it("Copiar legenda copia; sem clipboard ou com falha vira toast de erro", async () => {
    render(<Revisao jid={5} />)
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
    render(<Revisao jid={5} />)
    const b = await screen.findByRole("button", { name: "Postado no TikTok" })
    expect((b as HTMLButtonElement).disabled).toBe(true)
  })
  it("falha ao carregar o episódio mostra aviso", async () => {
    vi.mocked(api.episodio).mockRejectedValue(new Error("x"))
    render(<Revisao jid={5} />)
    expect(await screen.findByText("Não consegui carregar o episódio")).toBeTruthy()
  })
  it("Marcar como postado registra a rede", async () => {
    vi.mocked(api.postado).mockResolvedValue({ ok: true, postado: ["tiktok"] })
    vi.mocked(api.episodio).mockResolvedValue({ ...ep, aprovado: true } as Episodio)
    render(<Revisao jid={5} />)
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como postado no TikTok" }))
    expect(api.postado).toHaveBeenCalledWith(5, "tiktok")
  })
  it("antes de aprovar não há Marcar como postado, só Exportar", async () => {
    render(<Revisao jid={5} />)
    await screen.findByRole("link", { name: /Exportar/ })
    expect(screen.queryByRole("button", { name: /Marcar como postado/ })).toBeNull()
  })
})
