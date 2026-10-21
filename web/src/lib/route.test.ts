import { describe, expect, it } from "vitest"
import { formatHash, parseHash, type Route } from "./route"

describe("rotas", () => {
  const casos: [string, Route][] = [
    ["#/perfis", { name: "perfis" }],
    ["#/perfil/benji", { name: "perfil", slug: "benji" }],
    ["#/perfil/benji/agenda", { name: "perfil", slug: "benji", aba: "agenda" }],
    ["#/onboarding/benji", { name: "onboarding", slug: "benji" }],
    ["#/estilos", { name: "estilos" }],
    ["#/estilo/meu-estilo", { name: "estilo", slug: "meu-estilo" }],
    ["#/producao", { name: "producao" }],
    ["#/producao/7", { name: "producao", jid: 7 }],
    ["#/config", { name: "config" }],
    ["#/config/conexoes", { name: "config", aba: "conexoes" }],
  ]
  it.each(casos)("%s <-> rota", (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
    expect(formatHash(route)).toBe(hash)
  })
  it("Fila e Revisão caem em Produção", () => {
    expect(parseHash("#/fila")).toEqual({ name: "producao" })
    expect(parseHash("#/revisao")).toEqual({ name: "producao" })
    expect(parseHash("#/revisao/7")).toEqual({ name: "producao", jid: 7 })
  })
  it("cai em perfis no que não existe ou está incompleto", () => {
    for (const h of ["", "#/", "#/xyz", "#/perfil", "#/onboarding"]) expect(parseHash(h)).toEqual({ name: "perfis" })
    expect(parseHash("#/estilo")).toEqual({ name: "estilos" })
    expect(parseHash("#/producao/abc")).toEqual({ name: "producao" })
  })
  it("codifica o slug", () => {
    expect(formatHash({ name: "perfil", slug: "a b" })).toBe("#/perfil/a%20b")
    expect(parseHash("#/perfil/a%20b")).toEqual({ name: "perfil", slug: "a b" })
  })
})
