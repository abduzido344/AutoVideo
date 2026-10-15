import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Job } from "@/api"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar, TopBar } from "./AppSidebar"

const job = (id: number, status: string, dir: string, error = ""): Job =>
  ({ id, status, error, project_dir: dir, recipe: "talking-head-punchy", auto: 0, stage: "gate1", created: 0, updated: 0 })

describe("AppSidebar", () => {
  it("lista os projetos com estado e marca o atual", () => {
    render(<SidebarProvider><AppSidebar route={{ name: "project", id: 2 }} doctor={null} jobs={[
      job(2, "awaiting_approval", "/p/20261015-102328-rengoku"),
      job(1, "failed", "/p/20261014-225146-instagram", "interrompido"),
    ]} /></SidebarProvider>)
    const current = screen.getByRole("link", { name: /Rengoku/ })
    expect(current.getAttribute("href")).toBe("#/p/2")
    expect(current.getAttribute("data-active")).toBe("true")
    expect(current.getAttribute("aria-current")).toBe("page")
    expect(current.textContent).toContain("aprovar")
    expect(screen.getByRole("link", { name: /Instagram/ }).textContent).toContain("interrompido")
    expect(screen.getByText("Verificando o sistema…")).toBeTruthy()
  })
  it("mostra o vazio e a falha do doctor", () => {
    render(<SidebarProvider><AppSidebar route={{ name: "new" }} jobs={[]}
      doctor={{ ok: false, checks: [{ name: "claude auth", ok: false, detail: "" }] }} /></SidebarProvider>)
    expect(screen.getByText("Nenhum vídeo ainda.")).toBeTruthy()
    expect(screen.getByText("Falta: claude auth")).toBeTruthy()
    expect(screen.getByText("Corrija e recarregue a página")).toBeTruthy()
    expect(screen.getByTitle("Falta: claude auth")).toBeTruthy()
    expect(screen.getByText("Nenhum vídeo ainda.").closest("ul")).toBeNull()
  })
  it("mostra Tudo pronto quando o sistema está ok", () => {
    render(<SidebarProvider><AppSidebar route={{ name: "new" }} jobs={[]} doctor={{ ok: true, checks: [] }} /></SidebarProvider>)
    expect(screen.getByText("Tudo pronto")).toBeTruthy()
    expect(screen.queryByText("Corrija e recarregue a página")).toBeNull()
  })
  it("o gatilho do menu vive no conteúdo e abre/fecha o sidebar", () => {
    render(<SidebarProvider><AppSidebar route={{ name: "new" }} jobs={[]} doctor={null} /><SidebarInset><TopBar /></SidebarInset></SidebarProvider>)
    const t = screen.getByRole("button", { name: "Abrir ou fechar o menu" })
    expect(t.closest("main")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Abrir ou fechar o menu" })).toHaveLength(1)
  })
})
