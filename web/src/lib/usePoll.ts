import { useCallback, useEffect, useRef, useState } from "react"

// ponytail: polling fixo; SSE se 3 s ficar lento demais
// Uma nova identidade de `fn` não refaz o fetch: quem chama deve usar `key` no componente.
export function usePoll<T>(fn: () => Promise<T>, ms = 3000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const fnRef = useRef(fn)
  const seq = useRef(0)
  const alive = useRef(true)
  useEffect(() => { fnRef.current = fn })
  const refresh = useCallback(() => {
    const my = ++seq.current // resposta mais antiga nunca sobrescreve a mais nova
    fnRef.current().then(
      (d) => { if (my === seq.current && alive.current) { setData(d); setError(false) } },
      () => { if (my === seq.current && alive.current) setError(true) },
    )
  }, [])
  useEffect(() => {
    alive.current = true
    refresh()
    const t = setInterval(refresh, ms)
    return () => { alive.current = false; clearInterval(t) }
  }, [refresh, ms])
  return { data, error, refresh }
}
