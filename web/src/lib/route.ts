import { useEffect, useState } from "react"

export type Route = { name: "new" } | { name: "project"; id: number }

export function parseHash(hash: string): Route {
  const m = /^#\/p\/(\d+)$/.exec(hash)
  return m ? { name: "project", id: Number(m[1]) } : { name: "new" }
}

export function go(r: Route): void {
  location.hash = r.name === "project" ? `#/p/${r.id}` : "#/"
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
