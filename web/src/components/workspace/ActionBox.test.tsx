import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type JobDetail } from "@/api"
import { ActionBox } from "./ActionBox"

vi.mock("@/api", () => ({ api: { approve: vi.fn(), reject: vi.fn(), resume: vi.fn() } }))

const job = (over: Partial<JobDetail> = {}): JobDetail => ({
  id: 3, project_dir: "/p/x", recipe: "talking-head-punchy", auto: 0, status: "awaiting_approval", stage: "gate1",
  error: "", created: 0, updated: 1, rel: "x",
  files: { brief: null, post: null, has_final: false, decisions: [], preview: null, aspect: null,
    transcript: null, timeline: null, review: null, script: null },
  ...over,
})

describe("ActionBox", () => {
  beforeEach(() => {
    vi.mocked(api.approve).mockResolvedValue({ ok: true })
    vi.mocked(api.reject).mockResolvedValue({ ok: true })
    vi.mocked(api.resume).mockResolvedValue({ ok: true })
  })

  it("pedir ajustes exige texto; chips acrescentam; envia o feedback", async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<ActionBox job={job()} onDone={onDone} />)
    const reject = screen.getByRole("button", { name: "Pedir ajustes" })
    expect((reject as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole("button", { name: "hook mais forte" }))
    await user.click(screen.getByRole("button", { name: "mais curto" }))
    expect((screen.getByLabelText("O que mudar") as HTMLTextAreaElement).value).toBe("hook mais forte, mais curto")
    await user.click(reject)
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(3, "hook mais forte, mais curto"))
    expect(onDone).toHaveBeenCalled()
  })

  it("o texto sobrevive ao polling (re-render com job atualizado)", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ActionBox job={job()} onDone={() => {}} />)
    await user.type(screen.getByLabelText("O que mudar"), "legenda maior")
    rerender(<ActionBox job={job({ updated: 99 })} onDone={() => {}} />)
    expect((screen.getByLabelText("O que mudar") as HTMLTextAreaElement).value).toBe("legenda maior")
  })

  it("aprovar chama a API; falha mostra Retomar; rodando mostra a etapa", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ActionBox key="a" job={job({ stage: "gate2" })} onDone={() => {}} />)
    expect(screen.getByRole("button", { name: "legenda maior" })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Aprovar" }))
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(3))
    rerender(<ActionBox key="b" job={job({ status: "failed", stage: "director", error: "interrompido" })} onDone={() => {}} />)
    expect(screen.getByText(/Interrompido em/)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Retomar" }))
    await waitFor(() => expect(api.resume).toHaveBeenCalledWith(3))
    rerender(<ActionBox key="c" job={job({ status: "in_progress", stage: "render" })} onDone={() => {}} />)
    expect(screen.getByRole("status").textContent).toContain("Renderizando")
  })

  it("na fila mostra só 'Na fila', sem o nome do gate nem spinner", () => {
    const { container } = render(<ActionBox job={job({ status: "queued", stage: "gate1" })} onDone={() => {}} />)
    expect(screen.getByRole("status").textContent).toBe("Na fila")
    expect(container.querySelector("svg")).toBeNull()
  })

  it("concluído oferece baixar o vídeo com cache-bust", () => {
    render(<ActionBox job={job({ status: "completed", stage: "post", files: { ...job().files, has_final: true } })} onDone={() => {}} />)
    expect(screen.getByRole("link", { name: "Baixar vídeo" }).getAttribute("href")).toBe("/projects/x/out/final.mp4?t=1")
  })

  it("uma nova key (mudou a etapa) zera o texto", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ActionBox key="gate1-awaiting_approval" job={job()} onDone={() => {}} />)
    await user.type(screen.getByLabelText("O que mudar"), "algo")
    rerender(<ActionBox key="gate2-awaiting_approval" job={job({ stage: "gate2" })} onDone={() => {}} />)
    expect((screen.getByLabelText("O que mudar") as HTMLTextAreaElement).value).toBe("")
  })
})
