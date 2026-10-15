import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/api"
import { NewVideo } from "./NewVideo"

vi.mock("@/api", () => ({
  api: {
    recipeInfo: vi.fn(),
    create: vi.fn(),
  },
}))

const recipes = [
  { id: "talking-head-punchy", title: "Talking head punchy", mode: "speech", aspect: "9:16",
    captions: { enabled: true, component: "caption-pill-karaoke" }, pacing: { max_gap: 0.35 }, audio: { lufs: -14 } },
  { id: "screen-tutorial", title: "Screen tutorial", mode: "speech", aspect: "16:9",
    captions: { enabled: true, component: "caption-pill" }, pacing: { max_gap: 0.5 }, audio: { lufs: -14 } },
]

describe("NewVideo", () => {
  beforeEach(() => {
    vi.mocked(api.recipeInfo).mockResolvedValue(recipes as never)
    vi.mocked(api.create).mockResolvedValue({ id: 7 })
  })

  it("só envia com vídeo e navega para o job criado", async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const { container } = render(<NewVideo doctor={null} onCreated={onCreated} />)
    expect(await screen.findByText("Verificando o sistema…")).toBeTruthy()
    const send = screen.getByRole("button", { name: "Criar vídeo" })
    expect((send as HTMLButtonElement).disabled).toBe(true)

    await user.click(await screen.findByRole("button", { name: "Screen tutorial" }))
    expect(screen.getByText("16:9")).toBeTruthy()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "tela gravada.mp4", { type: "video/mp4" })])
    expect(screen.getByText("tela gravada.mp4")).toBeTruthy()
    await user.type(screen.getByLabelText("Roteiro ou pedido"), "tutorial curto")
    await user.click(send)

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(7))
    const fd = vi.mocked(api.create).mock.calls[0][0]
    expect(fd.get("recipe")).toBe("screen-tutorial")
    expect((fd.get("videos") as File).name).toBe("tela gravada.mp4")
    expect((fd.get("script") as File).name).toBe("roteiro.md")
  })

  it("remove um anexo", async () => {
    const user = userEvent.setup()
    const { container } = render(<NewVideo doctor={{ ok: true, checks: [] }} onCreated={() => {}} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [new File(["v"], "a.mp4", { type: "video/mp4" })])
    await user.click(screen.getByRole("button", { name: "Remover a.mp4" }))
    expect(screen.queryByText("a.mp4")).toBeNull()
  })
})
