import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Perfil } from "@/api"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Route } from "@/lib/route"
import { AppSidebar, TopBar } from "./AppSidebar"

const perfil = (slug: string, nome: string) => ({ slug, nome }) as Perfil

function setup(o: Partial<Parameters<typeof AppSidebar>[0]> = {}) {
  const onPerfil = vi.fn()
  const props = {
    perfis: [perfil("benji", "Benji"), perfil("lum", "Lum")], perfilSlug: "benji", onPerfil, aguardando: 0,
    route: { name: "fila" } as Route, doctor: null, auth: null, onAccount: () => {}, ...o,
  }
  render(<SidebarProvider><AppSidebar {...props} /><SidebarInset><TopBar /></SidebarInset></SidebarProvider>)
  return { onPerfil }
}

describe("AppSidebar", () => {
  it("o seletor mostra o perfil atual e troca de perfil", async () => {
    const { onPerfil } = setup()
    const sel = screen.getByRole("combobox", { name: "Perfil" })
    expect(sel.textContent).toContain("Benji")
    await userEvent.click(sel)
    await userEvent.click(await screen.findByRole("option", { name: "Lum" }))
    expect(onPerfil).toHaveBeenCalledWith("lum")
  })
  it("mostra a contagem de revisão só quando há episódios aguardando", () => {
    setup({ aguardando: 3 })
    expect(screen.getByRole("link", { name: /Revisão/ }).textContent).toContain("3")
    expect(screen.getByLabelText("3 aguardando")).toBeTruthy()
  })
  it("sem aguardando não há contagem", () => {
    setup()
    expect(screen.queryByLabelText(/aguardando/)).toBeNull()
  })
  it("links e rota ativa", () => {
    setup({ route: { name: "estilo", slug: "x" } })
    expect(screen.getByRole("link", { name: "Fila" }).getAttribute("href")).toBe("#/fila")
    expect(screen.getByRole("link", { name: "Configurações" }).getAttribute("href")).toBe("#/config")
    expect(screen.getByRole("link", { name: "Estilos" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Fila" }).getAttribute("aria-current")).toBeNull()
  })
  it("o botão Criar oferece novo perfil e novo estilo", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: /Criar/ }))
    expect(await screen.findByRole("menuitem", { name: "Novo perfil" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Novo estilo" })).toBeTruthy()
  })
  it("sem perfis o seletor fica desabilitado", () => {
    setup({ perfis: [], perfilSlug: null })
    expect(screen.getByRole("combobox", { name: "Perfil" }).hasAttribute("disabled")).toBe(true)
  })
  it("mostra a falha e o ok do doctor, e a conta", () => {
    setup({ doctor: { ok: false, checks: [{ name: "claude auth", ok: false, detail: "" }] }, auth: { ok: true, detail: "" } })
    expect(screen.getByText("Falta: claude auth")).toBeTruthy()
    expect(screen.getByText("Corrija e recarregue a página")).toBeTruthy()
    expect(screen.getByText("conectada")).toBeTruthy()
  })
  it("o gatilho do menu vive no conteúdo", () => {
    setup()
    expect(screen.getByRole("button", { name: "Abrir ou fechar o menu" }).closest("main")).toBeTruthy()
  })
})
