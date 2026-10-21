import { useEffect, useState } from "react"
import { api, type Config, type ConfigPatch } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Pagina, Secao } from "@/pages/Pagina"

const CHAVES = [
  { id: "ELEVENLABS_API_KEY", label: "ElevenLabs", dica: "Narração das cenas" },
  { id: "OPENROUTER_API_KEY", label: "OpenRouter", dica: "Imagens das cenas" },
  { id: "HIGGSFIELD_API_KEY", label: "Higgsfield", dica: "Imagens das cenas · formato KEY_ID:KEY_SECRET" },
  { id: "APIFY_TOKEN", label: "Apify", dica: "Análise de perfis do Instagram" },
] as const

export function Configuracoes() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [novas, setNovas] = useState<Record<string, string>>({})
  const [provedor, setProvedor] = useState("openrouter")
  const [modelos, setModelos] = useState({ openrouter: "", higgsfield: "" })
  const [limite, setLimite] = useState("")
  const [salvando, setSalvando] = useState(false)

  const aplica = (c: Config) => { setCfg(c); setProvedor(c.image_provider); setModelos({ openrouter: c.image_model, higgsfield: c.higgsfield_model }); setLimite(String(c.max_imagens)) }
  useEffect(() => {
    api.config().then(aplica, (e: Error) => toast({ message: "Não consegui ler as configurações", description: e.message, state: "error" }))
  }, [])

  async function salvar() {
    if (!cfg) return
    const n = Number(limite)
    if (!Number.isInteger(n) || n < 1) return toast({ message: "O limite de imagens deve ser um inteiro maior que zero", state: "error" })
    if (!modelos.openrouter.trim() || !modelos.higgsfield.trim()) return toast({ message: "O modelo de imagem não pode ficar vazio", state: "error" })
    const patch: ConfigPatch = { image_provider: provedor, image_model: modelos.openrouter.trim(), higgsfield_model: modelos.higgsfield.trim(), max_imagens: n }
    for (const { id } of CHAVES) if (novas[id]?.trim()) patch[id] = novas[id].trim()
    setSalvando(true)
    try {
      aplica(await api.saveConfig(patch))
      setNovas({})
      toast({ message: "Configurações salvas", state: "success" })
    } catch (e) {
      toast({ message: "Não consegui salvar", description: (e as Error).message, state: "error" })
    } finally { setSalvando(false) }
  }

  return (
    <Pagina titulo="Configurações" sub="Chaves e imagens. As chaves ficam só neste computador e nunca voltam para a tela.">
      <Secao>Chaves</Secao>
      <div className="space-y-4">
        {CHAVES.map(({ id, label, dica }) => {
          const salva = cfg?.keys[id] ?? false
          return (
            <div key={id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={id}>{label} <span className="font-normal text-muted-foreground">· {dica}</span></Label>
                <span className={salva ? "text-xs text-success" : "text-xs text-muted-foreground"}>{salva ? "salva" : "não salva"}</span>
              </div>
              <Input id={id} type="password" autoComplete="off" value={novas[id] ?? ""}
                placeholder={salva ? "Digite para trocar" : "Cole a chave"}
                onChange={(e) => setNovas({ ...novas, [id]: e.target.value })} />
            </div>
          )
        })}
      </div>

      <Secao>Imagens</Secao>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provedor</Label>
          <Select value={provedor} onValueChange={setProvedor}>
            <SelectTrigger aria-label="Provedor de imagem" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="higgsfield">Higgsfield</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="image_model">Modelo</Label>
          <Input id="image_model" value={modelos[provedor as keyof typeof modelos] ?? ""}
            onChange={(e) => setModelos({ ...modelos, [provedor]: e.target.value })} />
          <p className="text-xs text-muted-foreground">
            {provedor === "higgsfield" ? "ID do endpoint no console.higgsfield.ai (ex.: xai/grok-imagine-image-2.0)" : "ID do modelo no openrouter.ai (ex.: google/gemini-2.5-flash-image)"}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max_imagens">Limite de imagens por episódio</Label>
          <Input id="max_imagens" type="number" min={1} value={limite} onChange={(e) => setLimite(e.target.value)} className="w-32 font-mono" />
        </div>
      </div>

      <Button className="mt-8" onClick={salvar} disabled={!cfg || salvando}>Salvar</Button>
    </Pagina>
  )
}
