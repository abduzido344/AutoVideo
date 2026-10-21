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
})
