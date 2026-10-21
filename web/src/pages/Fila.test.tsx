import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Fila as FilaT, type FilaJob } from "@/api"
import { Fila } from "./Fila"

vi.mock("@/api", () => ({ api: { fila: vi.fn(), pausarFila: vi.fn(), continuarFila: vi.fn(), retomar: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const job = (o: Partial<FilaJob>): FilaJob => ({
  id: 1, project_dir: "", recipe: "episodio", auto: 0, status: "queued", stage: "", error: "", created: 0, updated: 0,
  perfil: "benji", serie: "s", n: 1, titulo: "Ep Um", ...o,
})
const fila = (o: Partial<FilaT>): FilaT => ({ paused: false, paused_until: null, reason: "", jobs: [], ...o })

beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.retomar).mockResolvedValue({ ok: true }) })

describe("Fila", () => {
  it("banner mostra limite de uso com a hora", async () => {
    const t = new Date(2026, 9, 21, 14, 5).getTime() / 1000
    vi.mocked(api.fila).mockResolvedValue(fila({ paused: true, paused_until: t, reason: "limite de uso do Claude" }))
    render(<Fila />)
    expect(await screen.findByText(/pausada até 14:05 — limite de uso/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
  })
  it("rodando mostra Pausar", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({}))
    vi.mocked(api.pausarFila).mockResolvedValue({ ok: true })
    render(<Fila />)
    await userEvent.click(await screen.findByRole("button", { name: "Pausar" }))
    expect(api.pausarFila).toHaveBeenCalled()
  })
  it("job atual mostra a etapa legível e failed mostra erro e Retomar", async () => {
    vi.mocked(api.fila).mockResolvedValue(fila({ jobs: [
      job({ id: 1, status: "in_progress", stage: "sfx", titulo: "Rodando" }),
      job({ id: 2, status: "failed", stage: "voz", error: "ElevenLabs caiu", titulo: "Quebrado" }),
    ] }))
    render(<Fila />)
    expect((await screen.findAllByText("Sons")).length).toBeGreaterThan(0)
    expect(screen.getByText("ElevenLabs caiu")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Retomar" }))
    expect(api.retomar).toHaveBeenCalledWith(2)
  })
})
