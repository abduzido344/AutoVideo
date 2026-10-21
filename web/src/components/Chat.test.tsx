import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "@/api"
import { toast } from "@/components/ui/toast"
import { Chat } from "./Chat"

vi.mock("@/api", async (orig) => ({ ...(await orig<typeof import("@/api")>()), api: { chat: vi.fn(), chatSend: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

beforeEach(() => { vi.mocked(api.chat).mockResolvedValue([{ autor: "claude", texto: "Oi, qual o assunto?" }]); vi.mocked(toast).mockClear() })

describe("Chat", () => {
  it("envia, trava o input durante o envio e mostra a resposta", async () => {
    let fim!: (v: Awaited<ReturnType<typeof api.chatSend>>) => void
    vi.mocked(api.chatSend).mockReturnValue(new Promise((r) => { fim = r }))
    const onReply = vi.fn()
    render(<Chat kind="onboarding" slug="benji" onReply={onReply} />)
    await screen.findByText("Oi, qual o assunto?")
    await userEvent.type(screen.getByLabelText("Mensagem"), "Terror")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(api.chatSend).toHaveBeenCalledWith("onboarding", "benji", "Terror")
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).disabled).toBe(true)
    fim({ resposta: "Ótimo", etapa: 1, historico: [{ autor: "voce", texto: "Terror" }, { autor: "claude", texto: "Ótimo" }] })
    await screen.findByText("Ótimo")
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).disabled).toBe(false)
    expect(onReply).toHaveBeenCalledWith(1)
  })
  it("429 vira toast de limite e devolve o texto ao campo", async () => {
    vi.mocked(api.chatSend).mockRejectedValue(new ApiError("tente às 15h", 429))
    render(<Chat kind="onboarding" slug="benji" />)
    await userEvent.type(screen.getByLabelText("Mensagem"), "oi")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Limite de uso do Claude atingido" })))
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("oi")
  })
  it("falha 502 remove a bolha otimista, restaura o texto e avisa", async () => {
    vi.mocked(api.chatSend).mockRejectedValue(new ApiError("falhou", 502))
    render(<Chat kind="onboarding" slug="benji" />)
    await screen.findByText("Oi, qual o assunto?")
    await userEvent.type(screen.getByLabelText("Mensagem"), "oi")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "O Claude não respondeu" })))
    expect(screen.queryByText("oi", { selector: "div" })).toBeNull()
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("oi")
  })
  it("falha depois de o servidor gravar o turno: mostra o histórico dele e não devolve o texto", async () => {
    vi.mocked(api.chatSend).mockRejectedValue(new ApiError("arquivo inválido", 502))
    render(<Chat kind="onboarding" slug="benji" />)
    await screen.findByText("Oi, qual o assunto?")
    vi.mocked(api.chat).mockResolvedValueOnce([
      { autor: "claude", texto: "Oi, qual o assunto?" }, { autor: "voce", texto: "terror" }, { autor: "claude", texto: "Gravei." }])
    await userEvent.type(screen.getByLabelText("Mensagem"), "terror")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText("Gravei.")).toBeTruthy()
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("")
  })
  it("mostra o estado pensando enquanto o POST está pendente", async () => {
    let fim!: (v: Awaited<ReturnType<typeof api.chatSend>>) => void
    vi.mocked(api.chatSend).mockReturnValue(new Promise((r) => { fim = r }))
    render(<Chat kind="estilo" slug="x" />)
    await screen.findByText("Oi, qual o assunto?")
    expect(screen.queryByRole("status")).toBeNull()
    await userEvent.type(screen.getByLabelText("Mensagem"), "oi")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect((await screen.findByRole("status")).textContent).toContain("Lendo o estilo")
    fim({ resposta: "ok", etapa: 0, historico: [{ autor: "voce", texto: "oi" }, { autor: "claude", texto: "ok" }] })
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
  })
  it("renderiza o markdown das respostas", async () => {
    vi.mocked(api.chat).mockResolvedValue([{ autor: "claude", texto: "Veja **negrito** e `codigo`\n\n- um\n- dois" }])
    const { container } = render(<Chat kind="onboarding" slug="benji" />)
    await screen.findByText("negrito")
    expect(container.querySelector("strong")?.textContent).toBe("negrito")
    expect(container.querySelector("code")?.textContent).toBe("codigo")
    expect(container.querySelectorAll("li")).toHaveLength(2)
  })
  it("Enter envia e Shift+Enter quebra a linha", async () => {
    vi.mocked(api.chatSend).mockResolvedValue({ resposta: "ok", etapa: 0, historico: [] })
    render(<Chat kind="onboarding" slug="benji" />)
    const campo = screen.getByLabelText("Mensagem") as HTMLTextAreaElement
    expect((screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.type(campo, "a{Shift>}{Enter}{/Shift}b")
    expect(campo.value).toBe("a\nb")
    expect(api.chatSend).not.toHaveBeenCalled()
    await userEvent.type(campo, "{Enter}")
    expect(api.chatSend).toHaveBeenCalledWith("onboarding", "benji", "a\nb")
  })
})
