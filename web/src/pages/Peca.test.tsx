import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Cena, type Episodio } from "@/api"
import { Peca } from "./Peca"

vi.mock("@/api", () => ({ api: { episodio: vi.fn(), artefatos: vi.fn(), ajustar: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/components/ui/video", () => ({ Video: ({ src }: { src: string }) => <video data-testid="player" src={src} /> }))

const cena = (o: Partial<Cena>): Cena => ({
  id: "s01", kind: "image", narration: "Era uma vez", prompt: "", camera: "zoom lento", sfx: "", imagem: null, audio: null, dur: 3, ...o,
})
const ep = (o: Record<string, unknown> = {}) => ({
  job: { id: 5, status: "in_progress", stage: "imagens" }, perfil: "benji", serie: "s", n: 2, titulo: "Ep Dois", roteiro: "Roteiro do episódio",
  decisions: [
    { ts: 1, role: "roteirista", model: "sonnet", cost_usd: 0.31, turns: 4, result: "Escrevi o roteiro" },
    { ts: 2, role: "diretor_arte", model: "opus", cost_usd: 0.1, turns: 2, is_error: true, result: "Falhou o prompt" },
  ],
  final: null, ...o,
}) as unknown as Episodio

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.episodio).mockResolvedValue(ep())
  vi.mocked(api.artefatos).mockResolvedValue({ cenas: [
    cena({ id: "s01", imagem: "/projects/x/s01.png", audio: "/projects/x/s01.mp3" }),
    cena({ id: "s02", kind: "screen" }),
    cena({ id: "s03" }),
  ] })
  vi.mocked(api.ajustar).mockResolvedValue({ ok: true })
})

describe("Peca", () => {
  it("etapa atual em andamento e anteriores concluídas", async () => {
    render(<Peca jid={5} />)
    const itens = (await screen.findAllByRole("listitem")).filter((li) => /Roteiro|Imagens|Voz|Sons/.test(li.textContent ?? ""))
    const txt = (nome: string) => itens.find((li) => li.textContent?.includes(nome))?.textContent
    expect(txt("Imagens")).toContain("Em andamento")
    expect(txt("Roteiro")).toContain("Concluída")
    expect(txt("Sons")).toContain("Pendente")
  })
  it("uma mensagem por decisão com papel e custo", async () => {
    render(<Peca jid={5} />)
    const m = await screen.findByRole("article", { name: "roteirista" })
    expect(within(m).getByText("US$ 0,31")).toBeTruthy()
    expect(within(m).getByText(/Escrevi o roteiro/)).toBeTruthy()
    expect(screen.getByRole("article", { name: "diretor_arte" }).textContent).toContain("US$ 0,10")
  })
  it("storyboard: foto, tela de celular e gerando", async () => {
    const { container } = render(<Peca jid={5} />)
    await screen.findByText("s03")
    expect(container.querySelectorAll("img").length).toBe(1)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/projects/x/s01.png")
    expect(screen.getAllByText("tela de celular").length).toBe(1)
    expect(screen.getAllByText("gerando…").length).toBe(1)
    expect(container.querySelectorAll("audio").length).toBe(1)
  })
  it("pedir ajuste chama api.ajustar", async () => {
    render(<Peca jid={5} />)
    await userEvent.type(await screen.findByLabelText("Pedir ajuste ao Diretor"), "refaz a cena 4")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(api.ajustar).toHaveBeenCalledWith(5, "refaz a cena 4"))
  }, 20000)
  it("aba Vídeo sem final mostra Ainda renderizando; com final, o player", async () => {
    const { unmount } = render(<Peca jid={5} />)
    await userEvent.click(await screen.findByRole("tab", { name: "Vídeo" }))
    expect(await screen.findByText("Ainda renderizando")).toBeTruthy()
    unmount()
    vi.mocked(api.episodio).mockResolvedValue(ep({ final: "/projects/x/final.mp4" }))
    render(<Peca jid={5} />)
    await userEvent.click(await screen.findByRole("tab", { name: "Vídeo" }))
    expect((await screen.findByTestId("player")).getAttribute("src")).toBe("/projects/x/final.mp4")
  })
  it("falha ao carregar mostra aviso", async () => {
    vi.mocked(api.episodio).mockRejectedValue(new Error("x"))
    render(<Peca jid={5} />)
    expect(await screen.findByText("Não consegui carregar o episódio")).toBeTruthy()
  })
})
