import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(cleanup)

// jsdom não tem matchMedia; o sidebar do shadcn (useIsMobile) usa
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList
}
// jsdom não tem ResizeObserver; o toast do Kobra mede as pílulas com ele
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
