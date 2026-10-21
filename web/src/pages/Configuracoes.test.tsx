import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, type Config, type Perfil } from "@/api"
import { go } from "@/lib/route"
import { Configuracoes } from "./Configuracoes"

vi.mock("@/api", () => ({ api: { config: vi.fn(), saveConfig: vi.fn() } }))
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn(), Toasts: () => null }))
vi.mock("@/lib/route", () => ({ go: vi.fn() }))

const cfg = (eleven: boolean): Config => ({
  keys: { ELEVENLABS_API_KEY: eleven ? { mascara: "sk_••••3f9c", ambiente: false } : null, OPENROUTER_API_KEY: null, HIGGSFIELD_API_KEY: null, OPENAI_API_KEY: null, APIFY_TOKEN: null },
  image_provider: "openrouter", image_model: "google/gemini", higgsfield_model: "xai/grok", openai_model: "gpt-image-2", max_imagens: 40,
})
const redes = { youtube: { conectada: false, usuario: "" }, tiktok: { conectada: false, usuario: "" }, instagram: { conectada: false, usuario: "" }, facebook: { conectada: false, usuario: "" } }
const benji = { slug: "benji", nome: "Benji", contas: redes } as Perfil

beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.config).mockResolvedValue(cfg(true)); vi.mocked(api.saveConfig).mockReset() })

describe("Configuracoes", () => {
  it("abas Chaves API | Conexões | Imagens, ligadas à rota", async () => {
    render(<Configuracoes aba="imagens" />)
    const abas = screen.getAllByRole("tab")
    expect(abas.map((t) => t.textContent)).toEqual(["Chaves API", "Conexões", "Imagens"])
    expect(screen.getByRole("tab", { name: "Imagens" }).getAttribute("aria-selected")).toBe("true")
    await userEvent.click(screen.getByRole("tab", { name: "Conexões" }))
    expect(go).toHaveBeenCalledWith({ name: "config", aba: "conexoes" })
  })
  it("aba desconhecida cai em Chaves API", () => {
    render(<Configuracoes aba="xyz" />)
    expect(screen.getByRole("tab", { name: "Chaves API" }).getAttribute("aria-selected")).toBe("true")
  })
  it("chave salva mostra a máscara com Editar e Excluir; as outras, o campo vazio", async () => {
    render(<Configuracoes />)
    expect((await screen.findByLabelText("Chave ElevenLabs salva")).textContent).toBe("sk_••••3f9c")
    expect(screen.getByRole("button", { name: "Editar a chave ElevenLabs" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Excluir a chave ElevenLabs" })).toBeTruthy()
    expect(document.getElementById("ELEVENLABS_API_KEY")).toBeNull()
    for (const id of ["OPENROUTER_API_KEY", "HIGGSFIELD_API_KEY", "OPENAI_API_KEY", "APIFY_TOKEN"]) {
      const el = document.getElementById(id) as HTMLInputElement
      expect(el.type).toBe("password")
      expect(el.value).toBe("")
    }
  })
  it("Salvar de uma linha manda só aquela chave e mostra a máscara", async () => {
    const c = cfg(true)
    vi.mocked(api.saveConfig).mockResolvedValue({ ...c, keys: { ...c.keys, OPENROUTER_API_KEY: { mascara: "sk-••••redo", ambiente: false } } })
    render(<Configuracoes aba="chaves" />)
    await screen.findByLabelText("Chave ElevenLabs salva")
    await userEvent.type(document.getElementById("OPENROUTER_API_KEY")!, "sk-segredo")
    await userEvent.click(screen.getByRole("button", { name: "Salvar a chave OpenRouter" }))
    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith({ OPENROUTER_API_KEY: "sk-segredo" }))
    expect(await screen.findByLabelText("Chave OpenRouter salva")).toBeTruthy()
    expect(document.getElementById("OPENROUTER_API_KEY")).toBeNull()
  })
  it("Salvar com o campo vazio não chama a API", async () => {
    render(<Configuracoes aba="chaves" />)
    await screen.findByLabelText("Chave ElevenLabs salva")
    await userEvent.click(screen.getByRole("button", { name: "Salvar a chave Apify" }))
    expect(api.saveConfig).not.toHaveBeenCalled()
  })
  it("Editar abre o campo; Excluir pede confirmação e manda a chave vazia", async () => {
    vi.mocked(api.saveConfig).mockResolvedValue(cfg(false))
    render(<Configuracoes aba="chaves" />)
    await userEvent.click(await screen.findByRole("button", { name: "Editar a chave ElevenLabs" }))
    expect(document.getElementById("ELEVENLABS_API_KEY")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir a chave ElevenLabs" }))
    expect(api.saveConfig).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))
    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith({ ELEVENLABS_API_KEY: "" }))
    expect(await screen.findByRole("button", { name: "Salvar a chave ElevenLabs" })).toBeTruthy()
  })
  it("Imagens mostra o modelo e o limite e salva só os campos dela", async () => {
    vi.mocked(api.saveConfig).mockResolvedValue({ ...cfg(true), max_imagens: 25 })
    render(<Configuracoes aba="imagens" />)
    await waitFor(() => expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("google/gemini"))
    const limite = screen.getByLabelText("Limite de imagens por episódio")
    await userEvent.clear(limite)
    await userEvent.type(limite, "25")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith({
      image_provider: "openrouter", image_model: "google/gemini", higgsfield_model: "xai/grok", openai_model: "gpt-image-2", max_imagens: 25,
    }))
  })
  it("trocar para Higgsfield mostra o modelo dela e salva o provedor", async () => {
    vi.mocked(api.saveConfig).mockResolvedValue({ ...cfg(true), image_provider: "higgsfield" })
    render(<Configuracoes aba="imagens" />)
    await waitFor(() => expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("google/gemini"))
    await userEvent.click(screen.getByRole("combobox", { name: "Provedor de imagem" }))
    await userEvent.click(await screen.findByRole("option", { name: "Higgsfield" }))
    expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("xai/grok")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ image_provider: "higgsfield", higgsfield_model: "xai/grok" })))
  })
  it("limite inválido não chama a API", async () => {
    render(<Configuracoes aba="imagens" />)
    await waitFor(() => expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("google/gemini"))
    const limite = screen.getByLabelText("Limite de imagens por episódio")
    await userEvent.clear(limite)
    await userEvent.type(limite, "0")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(api.saveConfig).not.toHaveBeenCalled()
  })
  it("modelo vazio não chama a API", async () => {
    render(<Configuracoes aba="imagens" />)
    await waitFor(() => expect((screen.getByLabelText("Modelo") as HTMLInputElement).value).toBe("google/gemini"))
    await userEvent.clear(screen.getByLabelText("Modelo"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(api.saveConfig).not.toHaveBeenCalled()
  })
  it("Conexões: Claude abre a janela, Codex desabilitado, contas de cada perfil sem Salvar", async () => {
    const onClaude = vi.fn()
    const { container } = render(<Configuracoes aba="conexoes" perfis={[benji]} auth={{ ok: true, detail: "" }} onClaude={onClaude} />)
    expect(screen.getByText("conectado")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Conectar o Claude" }))
    expect(onClaude).toHaveBeenCalled()
    expect((screen.getByRole("button", { name: "Conectar o Codex" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText("Chega numa próxima versão.")).toBeTruthy()
    expect(screen.getByText(/Nesta versão você posta à mão/)).toBeTruthy()
    expect(screen.getAllByText("Não conectada")).toHaveLength(4)
    const redesBot = screen.getAllByRole("button", { name: /de Benji$/ })
    expect(redesBot).toHaveLength(4)
    expect(redesBot.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull()
    expect(container.textContent).not.toMatch(/opcional/i)
  })
})
