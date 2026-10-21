import { useEffect, useState } from "react"

export type Route =
  | { name: "perfis" }
  | { name: "perfil"; slug: string; aba?: string }
  | { name: "onboarding"; slug: string }
  | { name: "estilos" }
  | { name: "estilo"; slug: string }
  | { name: "fila" }
  | { name: "revisao"; jid?: number }
  | { name: "config" }

const dec = (s: string) => { try { return decodeURIComponent(s) } catch { return s } }

export function parseHash(hash: string): Route {
  const [head, a, b] = hash.replace(/^#\/?/, "").split("/").map(dec)
  switch (head) {
    case "perfil": return a ? { name: "perfil", slug: a, ...(b ? { aba: b } : {}) } : { name: "perfis" }
    case "onboarding": return a ? { name: "onboarding", slug: a } : { name: "perfis" }
    case "estilos": return { name: "estilos" }
    case "estilo": return a ? { name: "estilo", slug: a } : { name: "estilos" }
    case "fila": return { name: "fila" }
    case "revisao": return /^\d+$/.test(a ?? "") ? { name: "revisao", jid: Number(a) } : { name: "revisao" }
    case "config": return { name: "config" }
    default: return { name: "perfis" }
  }
}

export function formatHash(r: Route): string {
  const e = encodeURIComponent
  switch (r.name) {
    case "perfil": return `#/perfil/${e(r.slug)}${r.aba ? `/${e(r.aba)}` : ""}`
    case "onboarding": return `#/onboarding/${e(r.slug)}`
    case "estilo": return `#/estilo/${e(r.slug)}`
    case "revisao": return r.jid === undefined ? "#/revisao" : `#/revisao/${r.jid}`
    default: return `#/${r.name}`
  }
}

export function go(r: Route): void {
  location.hash = formatHash(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash))
    addEventListener("hashchange", on)
    return () => removeEventListener("hashchange", on)
  }, [])
  return route
}
