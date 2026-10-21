import { useEffect, useState } from "react"

export type Route =
  | { name: "perfis" }
  | { name: "perfil"; slug: string; aba?: string }
  | { name: "onboarding"; slug: string }
  | { name: "estilos" }
  | { name: "estilo"; slug: string }
  | { name: "producao"; jid?: number }
  | { name: "serie"; path_rel: string }
  | { name: "episodio"; jid: number }
  | { name: "config"; aba?: string }

const dec = (s: string) => { try { return decodeURIComponent(s) } catch { return s } }
const jid = (a?: string): Route => /^\d+$/.test(a ?? "") ? { name: "producao", jid: Number(a) } : { name: "producao" }

export function parseHash(hash: string): Route {
  const [head, a, b] = hash.replace(/^#\/?/, "").split("/").map(dec)
  switch (head) {
    case "perfil": return a ? { name: "perfil", slug: a, ...(b ? { aba: b } : {}) } : { name: "perfis" }
    case "onboarding": return a ? { name: "onboarding", slug: a } : { name: "perfis" }
    case "estilos": return { name: "estilos" }
    case "estilo": return a ? { name: "estilo", slug: a } : { name: "estilos" }
    case "producao": return jid(a)
    // Fila e Revisão viraram Produção
    case "fila": return { name: "producao" }
    case "revisao": return jid(a)
    case "serie": return a ? { name: "serie", path_rel: a } : { name: "perfis" }
    case "episodio": return /^\d+$/.test(a ?? "") ? { name: "episodio", jid: Number(a) } : { name: "perfis" }
    case "config": return a ? { name: "config", aba: a } : { name: "config" }
    default: return { name: "perfis" }
  }
}

export function formatHash(r: Route): string {
  const e = encodeURIComponent
  switch (r.name) {
    case "perfil": return `#/perfil/${e(r.slug)}${r.aba ? `/${e(r.aba)}` : ""}`
    case "onboarding": return `#/onboarding/${e(r.slug)}`
    case "estilo": return `#/estilo/${e(r.slug)}`
    case "producao": return r.jid === undefined ? "#/producao" : `#/producao/${r.jid}`
    case "serie": return `#/serie/${e(r.path_rel)}`
    case "episodio": return `#/episodio/${r.jid}`
    case "config": return r.aba ? `#/config/${e(r.aba)}` : "#/config"
    default: return `#/${r.name}`
  }
}

export function go(r: Route): void {
  location.hash = formatHash(r)
}

// #/fila e #/revisao[/jid] trocam a URL por #/producao[/jid] sem criar entrada no histórico
function ler(): Route {
  const r = parseHash(location.hash)
  if (/^#\/?(fila|revisao)(\/|$)/.test(location.hash)) history.replaceState(null, "", formatHash(r))
  return r
}

export function useRoute(): Route {
  const [route, setRoute] = useState(ler)
  useEffect(() => {
    const on = () => setRoute(ler())
    addEventListener("hashchange", on)
    return () => removeEventListener("hashchange", on)
  }, [])
  return route
}
