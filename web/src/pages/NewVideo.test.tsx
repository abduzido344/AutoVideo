import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "@/components/ui/toast"
import { api } from "@/api"
import { NewVideo } from "./NewVideo"

vi.mock("@/api", () => ({
  api: {
    recipeInfo: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }))

const recipes = [
  { id: "talking-head-punchy", title: "Talking head punchy", mode: "speech", aspect: "9:16",
    captions: { enabled: true, component: "caption-pill-karaoke" }, pacing: { max_gap: 0.35 }, audio: { lufs: -14 } },
  { id: "screen-tutorial", title: "Screen tutorial", mode: "speech", aspect: "16:9",
    captions: { enabled: true, component: "caption-pill" }, pacing: { max_gap: 0.5 }, audio: { lufs: -14 } },
]

describe("NewVideo", () => {
  beforeEach(() => {
    vi.mocked(api.recipeInfo).mockResolvedValue(recipes as never)
    vi.mocked(api.create).mockResolvedValue({ id: 7 })
    vi.mocked(toast).mockClear()
  })

  it("só envia com vídeo e navega para o job criado", async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const { container } = render(<NewVideo doctor={null} onCreated={onCreated} />)
    expect(await screen.findByText("Verificando o sistema…")).toBeTruthy()
    const send = screen.getByRole("button", { name: "Criar vídeo" })
    expect((send as HTMLButtonElement).disabled).toBe(true)

    await user.click(await screen.findByRole("button", { name: "Screen tutorial" }))
    expect(screen.getByText("16:9")).toBeTruthy()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "tela gravada.mp4", { type: "video/mp4" })])
    expect(screen.getByText("tela gravada.mp4")).toBeTruthy()
    await user.type(screen.getByLabelText("Roteiro ou pedido"), "tutorial curto")
    await user.click(send)

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(7))
    const fd = vi.mocked(api.create).mock.calls[0][0]
    expect(fd.get("recipe")).toBe("screen-tutorial")
    expect((fd.get("videos") as File).name).toBe("tela gravada.mp4")
    expect((fd.get("script") as File).name).toBe("roteiro.md")
  })

  it("remove um anexo", async () => {
    const user = userEvent.setup()
    const { container } = render(<NewVideo doctor={{ ok: true, checks: [] }} onCreated={() => {}} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "a.mp4", { type: "video/mp4" })])
    await user.click(screen.getByRole("button", { name: "Remover a.mp4" }))
    expect(screen.queryByText("a.mp4")).toBeNull()
  })

  it("soltar um arquivo na janela anexa; soltar texto não anexa", async () => {
    render(<NewVideo doctor={null} onCreated={() => {}} />)
    const file = new File(["v"], "solto.mp4", { type: "video/mp4" })
    fireEvent.drop(window, { dataTransfer: { types: ["text/plain"], files: [] } })
    fireEvent.drop(window, { dataTransfer: { types: ["Files"], files: [file] } })
    expect(await screen.findByText("solto.mp4")).toBeTruthy()
  })

  it("avisa de duplicado e de roteiro trocado", async () => {
    render(<NewVideo doctor={null} onCreated={() => {}} />)
    const drop = (...files: File[]) => fireEvent.drop(window, { dataTransfer: { types: ["Files"], files } })
    drop(new File(["v"], "a.mp4", { type: "video/mp4" }), new File(["r"], "velho.md"))
    await screen.findByText("a.mp4")
    drop(new File(["v"], "a.MOV"), new File(["r"], "novo.md"))
    await screen.findByText("novo.md")
    expect(screen.queryByText("a.MOV")).toBeNull()
    expect(toast).toHaveBeenCalledWith({ message: "Já anexado: a.MOV", state: "info" })
    expect(toast).toHaveBeenCalledWith({ message: "Roteiro trocado: velho.md → novo.md", state: "info" })
  })

  it("mostra a dica enquanto não há gravação", async () => {
    const user = userEvent.setup()
    const { container } = render(<NewVideo doctor={null} onCreated={() => {}} />)
    expect(screen.getByText("Adicione ao menos uma gravação (mp4, mov…)")).toBeTruthy()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "a.mp4", { type: "video/mp4" })])
    expect(screen.queryByText("Adicione ao menos uma gravação (mp4, mov…)")).toBeNull()
  })

  it("escolhe a primeira receita quando a padrão não existe", async () => {
    vi.mocked(api.recipeInfo).mockResolvedValue(recipes.slice(1) as never)
    render(<NewVideo doctor={null} onCreated={() => {}} />)
    expect(await screen.findByRole("button", { name: "Screen tutorial", pressed: true })).toBeTruthy()
  })

  it("se criar falhar, texto e anexos continuam lá", async () => {
    vi.mocked(api.create).mockRejectedValue(new Error("falhou"))
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const { container } = render(<NewVideo doctor={null} onCreated={onCreated} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "a.mp4", { type: "video/mp4" })])
    await user.type(screen.getByLabelText("Roteiro ou pedido"), "meu pedido")
    const send = screen.getByRole("button", { name: "Criar vídeo" })
    await user.click(send)
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: "falhou", state: "error" })))
    await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false))
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByText("a.mp4")).toBeTruthy()
    expect((screen.getByLabelText("Roteiro ou pedido") as HTMLTextAreaElement).value).toBe("meu pedido")
  })
})
