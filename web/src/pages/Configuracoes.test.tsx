import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Config } from "@/api"
import { Configuracoes } from "./Configuracoes"

vi.mock("@/api", () => ({ api: { config: vi.fn(), saveConfig: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))

const cfg = (eleven: boolean): Config => ({
  keys: { ELEVENLABS_API_KEY: eleven, OPENROUTER_API_KEY: false, APIFY_TOKEN: false },
  image_provider: "openrouter", image_model: "google/gemini", max_imagens: 40,
})

beforeEach(() => { vi.mocked(api.config).mockResolvedValue(cfg(true)); vi.mocked(api.saveConfig).mockReset() })

describe("Configuracoes", () => {
  it("chaves são campos de senha vazios com o estado salva/não salva", async () => {
    render(<Configuracoes />)
    expect(await screen.findByText("salva")).toBeTruthy()
    expect(screen.getAllByText("não salva")).toHaveLength(2)
    for (const id of ["ELEVENLABS_API_KEY", "OPENROUTER_API_KEY", "APIFY_TOKEN"]) {
      const el = document.getElementById(id) as HTMLInputElement
      expect(el.type).toBe("password")
      expect(el.value).toBe("")
    }
  })
  it("salvar chama saveConfig só com as chaves digitadas, limpa o campo e mostra o modelo e o limite", async () => {
    vi.mocked(api.saveConfig).mockResolvedValue({ ...cfg(true), keys: { ...cfg(true).keys, OPENROUTER_API_KEY: true }, max_imagens: 25 })
    render(<Configuracoes />)
    await screen.findByText("salva")
    expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("google/gemini")
    const limite = screen.getByLabelText("Limite de imagens por episódio")
    await userEvent.clear(limite)
    await userEvent.type(limite, "25")
    const campo = document.getElementById("OPENROUTER_API_KEY") as HTMLInputElement
    await userEvent.type(campo, "sk-segredo")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith({
      image_model: "google/gemini", max_imagens: 25, OPENROUTER_API_KEY: "sk-segredo",
    }))
    await waitFor(() => expect(campo.value).toBe(""))
    expect(document.body.textContent).not.toContain("sk-segredo")
    expect(screen.queryAllByText("não salva")).toHaveLength(1)
  })
  it("Higgsfield aparece desabilitado como em breve", async () => {
    render(<Configuracoes />)
    await userEvent.click(await screen.findByRole("combobox", { name: "Provedor de imagem" }))
    const h = await screen.findByRole("option", { name: /Higgsfield/ })
    expect(h.textContent).toContain("em breve")
    expect(h.getAttribute("aria-disabled")).toBe("true")
  })
  it("limite inválido não chama a API", async () => {
    render(<Configuracoes />)
    await screen.findByText("salva")
    const limite = screen.getByLabelText("Limite de imagens por episódio")
    await userEvent.clear(limite)
    await userEvent.type(limite, "0")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(api.saveConfig).not.toHaveBeenCalled()
  })
})
