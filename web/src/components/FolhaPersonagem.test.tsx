import { render, screen } from "@testing-library/react"
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
})
