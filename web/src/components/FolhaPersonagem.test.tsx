import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { api } from "@/api"
import { toast } from "@/components/ui/toast"
import { describe, expect, it, vi } from "vitest"
import { FolhaPersonagem } from "./FolhaPersonagem"

vi.mock("@/api", () => ({ api: { gerarFolha: vi.fn(), aprovarPersonagem: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const p = (o: object) => ({ slug: "ana", ficha: "ruiva", folha: false, aprovada: false, ...o })

describe("FolhaPersonagem", () => {
  it("sem folha: só Gerar folha, sem imagem nem Aprovar", () => {
    render(<FolhaPersonagem perfil="benji" personagem={p({})} onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "Gerar folha" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Aprovar" })).toBeNull()
    expect(screen.queryByRole("img")).toBeNull()
  })
  it("com folha: imagem, Aprovar e Gerar de novo", () => {
    render(<FolhaPersonagem perfil="benji" personagem={p({ folha: true })} onChange={() => {}} />)
    expect(screen.getByRole("img").getAttribute("src")).toBe("/projects/benji/personagens/ana/folha.png")
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Gerar de novo" })).toBeTruthy()
  })
  it("aprovada: sem botão Aprovar", () => {
    render(<FolhaPersonagem perfil="benji" personagem={p({ folha: true, aprovada: true })} onChange={() => {}} />)
    expect(screen.queryByRole("button", { name: "Aprovar" })).toBeNull()
    expect(screen.getByText("aprovada")).toBeTruthy()
  })
  it("Gerar de novo chama a API e troca o src com ?v=", async () => {
    vi.mocked(api.gerarFolha).mockResolvedValue({ ok: true })
    const onChange = vi.fn()
    render(<FolhaPersonagem perfil="benji" personagem={p({ folha: true })} onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Gerar de novo" }))
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toMatch(/folha\.png\?v=\d+/))
    expect(api.gerarFolha).toHaveBeenCalledWith("benji", "ana")
    expect(onChange).toHaveBeenCalled()
  })
  it("Aprovar chama a API", async () => {
    vi.mocked(api.aprovarPersonagem).mockResolvedValue({ ok: true })
    render(<FolhaPersonagem perfil="benji" personagem={p({ folha: true })} onChange={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }))
    await waitFor(() => expect(api.aprovarPersonagem).toHaveBeenCalledWith("benji", "ana"))
  })
  it("falha vira toast", async () => {
    vi.mocked(api.gerarFolha).mockRejectedValue(new Error("sem imagem"))
    render(<FolhaPersonagem perfil="benji" personagem={p({})} onChange={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: "Gerar folha" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Não consegui gerar a folha" })))
  })
})
