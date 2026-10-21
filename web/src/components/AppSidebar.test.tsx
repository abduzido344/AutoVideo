import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Perfil } from "@/api"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Route } from "@/lib/route"
import { Pagina } from "@/pages/Pagina"
import { AppSidebar } from "./AppSidebar"

const perfil = (slug: string, nome: string, onboarding = 6) => ({ slug, nome, onboarding }) as Perfil

function setup(o: Partial<Parameters<typeof AppSidebar>[0]> = {}) {
  const onPerfil = vi.fn()
  const props = {
    perfis: [perfil("benji", "Benji"), perfil("lum", "Lum", 2)], perfilSlug: "benji", onPerfil, aguardando: 0,
    route: { name: "producao" } as Route, doctor: null, auth: null, onAccount: () => {}, onNovoPerfil: () => {}, onNovoEstilo: () => {}, ...o,
  }
  render(<SidebarProvider><AppSidebar {...props} /><SidebarInset><Pagina titulo="X" /></SidebarInset></SidebarProvider>)
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
  it("mostra a contagem de revisão em Produção só quando há episódios aguardando", () => {
    setup({ aguardando: 3 })
    expect(screen.getByRole("link", { name: /Produção/ }).textContent).toContain("3")
    expect(screen.getByLabelText("3 aguardando")).toBeTruthy()
  })
  it("sem aguardando não há contagem", () => {
    setup()
    expect(screen.queryByLabelText(/aguardando/)).toBeNull()
  })
  it("links gerais e rota ativa", () => {
    setup({ route: { name: "estilo", slug: "x" } })
    expect(screen.getByRole("link", { name: "Produção" }).getAttribute("href")).toBe("#/producao")
    expect(screen.getByRole("link", { name: "Configurações" }).getAttribute("href")).toBe("#/config")
    expect(screen.getByRole("link", { name: "Estilos" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Produção" }).getAttribute("aria-current")).toBeNull()
  })
  it("grupo do perfil: as 4 abas como links, com a aba da rota ativa", () => {
    setup({ route: { name: "perfil", slug: "benji", aba: "ideias" } })
    expect(screen.getByRole("link", { name: "Séries" }).getAttribute("href")).toBe("#/perfil/benji/series")
    expect(screen.getByRole("link", { name: "Universo" }).getAttribute("href")).toBe("#/perfil/benji/universo")
    expect(screen.getByRole("link", { name: "Agenda e voz" }).getAttribute("href")).toBe("#/perfil/benji/agenda")
    expect(screen.getByRole("link", { name: "Ideias" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Séries" }).getAttribute("aria-current")).toBeNull()
  })
  it("perfil sem onboarding completo mostra só Continuar onboarding", () => {
    setup({ perfilSlug: "lum" })
    expect(screen.getByRole("link", { name: "Continuar onboarding" }).getAttribute("href")).toBe("#/onboarding/lum")
    expect(screen.queryByRole("link", { name: "Séries" })).toBeNull()
  })
  it("o botão Criar oferece novo perfil e novo estilo", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: /Criar/ }))
    expect(await screen.findByRole("menuitem", { name: "Novo perfil" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Novo estilo" })).toBeTruthy()
  })
  it("Novo estilo chama onNovoEstilo", async () => {
    const onNovoEstilo = vi.fn()
    setup({ onNovoEstilo })
    await userEvent.click(screen.getByRole("button", { name: /Criar/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Novo estilo" }))
    expect(onNovoEstilo).toHaveBeenCalled()
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
  it("o gatilho vive no cabeçalho da sidebar; fechada, a página ganha o seu para reabrir", async () => {
    setup()
    const fechar = screen.getByRole("button", { name: "Fechar o menu" })
    expect(fechar.closest("main")).toBeNull()
    expect(screen.queryByRole("button", { name: "Abrir o menu" })).toBeNull()
    await userEvent.click(fechar)
    expect(screen.getByRole("button", { name: "Abrir o menu" }).closest("main")).toBeTruthy()
  })
})
