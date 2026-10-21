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
    ["#/fila", { name: "fila" }],
    ["#/revisao", { name: "revisao" }],
    ["#/revisao/7", { name: "revisao", jid: 7 }],
    ["#/config", { name: "config" }],
  ]
  it.each(casos)("%s <-> rota", (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
    expect(formatHash(route)).toBe(hash)
  })
  it("cai em perfis no que não existe ou está incompleto", () => {
    for (const h of ["", "#/", "#/xyz", "#/perfil", "#/onboarding"]) expect(parseHash(h)).toEqual({ name: "perfis" })
    expect(parseHash("#/estilo")).toEqual({ name: "estilos" })
    expect(parseHash("#/revisao/abc")).toEqual({ name: "revisao" })
  })
  it("codifica o slug", () => {
    expect(formatHash({ name: "perfil", slug: "a b" })).toBe("#/perfil/a%20b")
    expect(parseHash("#/perfil/a%20b")).toEqual({ name: "perfil", slug: "a b" })
  })
})
