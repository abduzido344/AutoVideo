import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { ConnectClaude } from "./ConnectClaude"

vi.mock("@/api", () => ({ api: { auth: vi.fn(), authLogin: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }))

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe("ConnectClaude", () => {
  it("abre o terminal e fecha sozinho quando o login fica pronto", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(api.auth).mockResolvedValue({ ok: false, detail: "sem autenticação do Claude" })
    vi.mocked(api.authLogin).mockResolvedValue({ ok: true })
    const onConnected = vi.fn(), onOpenChange = vi.fn()
    render(<ConnectClaude open onOpenChange={onOpenChange} onConnected={onConnected} />)
    expect(await screen.findByText("Não conectado")).toBeTruthy()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Abrir o terminal e entrar" }))
    expect(api.authLogin).toHaveBeenCalledOnce()
    expect(screen.getByText(/Aguardando o login no terminal/)).toBeTruthy()

    vi.mocked(api.auth).mockResolvedValue({ ok: true, detail: "logado (claude.ai)" })
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await waitFor(() => expect(onConnected).toHaveBeenCalledWith({ ok: true, detail: "logado (claude.ai)" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("aberto já conectado só mostra o status, sem fechar", async () => {
    vi.mocked(api.auth).mockResolvedValue({ ok: true, detail: "logado (claude.ai)" })
    const onOpenChange = vi.fn()
    render(<ConnectClaude open onOpenChange={onOpenChange} onConnected={() => {}} />)
    expect(await screen.findByText("Conectado — logado (claude.ai)")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Abrir o terminal e entrar" })).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
