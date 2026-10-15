import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { usePoll } from "./usePoll"

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe("usePoll", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("resposta antiga que chega depois não sobrescreve a nova", async () => {
    const a = deferred<string>(), b = deferred<string>()
    const fn = vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const { result } = renderHook(() => usePoll(fn, 1000))
    act(() => { result.current.refresh() }) // segunda chamada, enquanto a primeira está pendente
    await act(async () => { b.resolve("novo") })
    expect(result.current.data).toBe("novo")
    await act(async () => { a.resolve("velho") })
    expect(result.current.data).toBe("novo")
  })

  it("limpa o intervalo ao desmontar e ignora resposta pendente", async () => {
    const d = deferred<string>()
    const fn = vi.fn().mockReturnValueOnce(d.promise).mockResolvedValue("x")
    const { result, unmount } = renderHook(() => usePoll(fn, 1000))
    expect(fn).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => { vi.advanceTimersByTime(5000); d.resolve("tarde") })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBeNull()
  })

  it("repete a cada ms", async () => {
    const fn = vi.fn().mockResolvedValue("x")
    renderHook(() => usePoll(fn, 1000))
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
