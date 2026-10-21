import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Perfil } from "@/api"
import { toast } from "@/components/ui/toast"
import { NovoPerfil, Perfis } from "./Perfis"

vi.mock("@/api", () => ({ api: { novoPerfil: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

beforeEach(() => { vi.mocked(api.novoPerfil).mockReset(); vi.mocked(toast).mockClear(); location.hash = "" })

describe("NovoPerfil", () => {
  it("corta o nome, cria e vai para o onboarding", async () => {
    vi.mocked(api.novoPerfil).mockResolvedValue({ slug: "meu-perfil" } as Perfil)
    const onOpenChange = vi.fn()
    render(<NovoPerfil open onOpenChange={onOpenChange} />)
    await userEvent.type(screen.getByLabelText("Nome do perfil"), "  Meu Perfil  ")
    await userEvent.click(screen.getByRole("button", { name: "Criar" }))
    await waitFor(() => expect(location.hash).toBe("#/onboarding/meu-perfil"))
    expect(api.novoPerfil).toHaveBeenCalledWith("Meu Perfil")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it("erro vira toast e não navega", async () => {
    vi.mocked(api.novoPerfil).mockRejectedValue(new Error("já existe"))
    render(<NovoPerfil open onOpenChange={() => {}} />)
    await userEvent.type(screen.getByLabelText("Nome do perfil"), "X")
    await userEvent.click(screen.getByRole("button", { name: "Criar" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Não consegui criar o perfil" })))
    expect(location.hash).toBe("")
  })
})

describe("Perfis", () => {
  it("o card vai ao onboarding se não ativo e incompleto, senão ao perfil", () => {
    const p = (slug: string, ativo: boolean, onboarding: number) =>
      ({ slug, nome: slug, assunto: "", estilo: "", ativo, onboarding, agenda: { gerar_as: "08:00", postar_as: [] } }) as unknown as Perfil
    render(<Perfis perfis={[p("novo", false, 2), p("pronto", true, 6)]} onNovo={() => {}} />)
    expect(screen.getByRole("link", { name: /novo/ }).getAttribute("href")).toBe("#/onboarding/novo")
    expect(screen.getByRole("link", { name: /pronto/ }).getAttribute("href")).toBe("#/perfil/pronto")
  })
})
