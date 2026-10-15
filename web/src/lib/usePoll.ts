import { useCallback, useEffect, useRef, useState } from "react"

// ponytail: polling fixo; SSE se 3 s ficar lento demais
export function usePoll<T>(fn: () => Promise<T>, ms = 3000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })
  const refresh = useCallback(() => {
    fnRef.current().then((d) => { setData(d); setError(false) }, () => setError(true))
  }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, ms)
    return () => clearInterval(t)
  }, [refresh, ms])
  return { data, error, refresh }
}
