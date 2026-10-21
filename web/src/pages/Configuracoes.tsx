import { useEffect, useState } from "react"
import { api, type Auth, type Config, type ConfigPatch, type Perfil, type Rede } from "@/api"
import { COR, ICONE } from "@/components/secoes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { Abas, Pagina, Secao } from "@/pages/Pagina"

const CHAVES = [
  { id: "ELEVENLABS_API_KEY", label: "ElevenLabs", dica: "Narração das cenas" },
  { id: "OPENROUTER_API_KEY", label: "OpenRouter", dica: "Imagens das cenas" },
  { id: "HIGGSFIELD_API_KEY", label: "Higgsfield", dica: "Imagens das cenas · formato KEY_ID:KEY_SECRET" },
  { id: "OPENAI_API_KEY", label: "OpenAI", dica: "Imagens das cenas" },
  { id: "APIFY_TOKEN", label: "Apify", dica: "Análise de perfis do Instagram" },
] as const

const DICA_MODELO = {
  openrouter: "ID do modelo no openrouter.ai (ex.: google/gemini-2.5-flash-image)",
  higgsfield: "ID do endpoint no console.higgsfield.ai (ex.: xai/grok-imagine-image-2.0)",
  openai: "ID do modelo na OpenAI (ex.: gpt-image-2)",
}

const ABAS = [{ aba: "chaves", label: "Chaves API" }, { aba: "conexoes", label: "Conexões" }, { aba: "imagens", label: "Imagens" }] as const
const SUB: Record<string, string> = {
  chaves: "As chaves ficam só neste computador e nunca voltam para a tela.",
  conexoes: "A conta do Claude que roda os agentes e as redes de cada perfil.",
  imagens: "Quem gera as imagens das cenas e quantas por episódio.",
}
const REDES: [Rede, string][] = [["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook", "Facebook"]]

// cartão de contas de um perfil (antes na aba Contas do perfil)
function Contas({ perfil }: { perfil: Perfil }) {
  return (
    <Card className="gap-3 p-4">
      <h3 className="font-medium">{perfil.nome}</h3>
      <p className="text-sm text-muted-foreground">Nesta versão você posta à mão: o painel só marca o episódio como postado.</p>
      <ul className="divide-y">
        {REDES.map(([r, nome]) => (
          <li key={r} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm font-medium">{nome}</p>
              <p className="text-xs text-muted-foreground">{perfil.contas?.[r]?.conectada ? `Conectada (${perfil.contas[r].usuario})` : "Não conectada"}</p>
            </div>
            <Button variant="outline" size="sm" disabled title="Chega numa próxima versão" aria-label={`Conectar ${nome} de ${perfil.nome}`}>Conectar</Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Conectar contas chega numa próxima versão.</p>
    </Card>
  )
}

function Conexoes({ perfis, auth, onClaude }: { perfis: Perfil[]; auth: Auth | null; onClaude: () => void }) {
  return (
    <>
      <Secao>Agentes</Secao>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Claude</h3>
            <span className={auth?.ok ? "text-xs text-success" : auth ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {auth === null ? "verificando…" : auth.ok ? "conectado" : "não conectado"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Roda os agentes com o login do Claude Code desta máquina.</p>
          <Button variant="outline" size="sm" className="w-fit" onClick={onClaude}>Conectar o Claude</Button>
        </Card>
        <Card aria-disabled="true" className="gap-2 p-4 opacity-60">
          <h3 className="font-medium">Codex</h3>
          <p className="text-sm text-muted-foreground">Chega numa próxima versão.</p>
          <Button variant="outline" size="sm" className="w-fit" disabled aria-label="Conectar o Codex">Conectar</Button>
        </Card>
      </div>
      <Secao>Redes sociais</Secao>
      {perfis.length === 0 && <p className="text-sm text-muted-foreground">Crie um perfil para ver as contas dele aqui.</p>}
      <div className="space-y-3">{perfis.map((p) => <Contas key={p.slug} perfil={p} />)}</div>
    </>
  )
}

export function Configuracoes({ aba, perfis = [], auth = null, onClaude = () => {} }: {
  aba?: string; perfis?: Perfil[]; auth?: Auth | null; onClaude?: () => void
}) {
  const atual = ABAS.some((a) => a.aba === aba) ? aba! : "chaves"
  const [cfg, setCfg] = useState<Config | null>(null)
  const [novas, setNovas] = useState<Record<string, string>>({})
  const [provedor, setProvedor] = useState("openrouter")
  const [modelos, setModelos] = useState({ openrouter: "", higgsfield: "", openai: "" })
  const [limite, setLimite] = useState("")
  const [salvando, setSalvando] = useState(false)

  const aplica = (c: Config) => { setCfg(c); setProvedor(c.image_provider); setModelos({ openrouter: c.image_model, higgsfield: c.higgsfield_model, openai: c.openai_model }); setLimite(String(c.max_imagens)) }
  useEffect(() => {
    api.config().then(aplica, (e: Error) => toast({ message: "Não consegui ler as configurações", description: e.message, state: "error" }))
  }, [])

  // cada aba salva só o que é dela e só recarrega o que é dela (não apaga o que foi digitado na outra)
  async function enviar(patch: ConfigPatch, depois: (c: Config) => void) {
    setSalvando(true)
    try {
      depois(await api.saveConfig(patch))
      toast({ message: "Configurações salvas", state: "success" })
    } catch (e) {
      toast({ message: "Não consegui salvar", description: (e as Error).message, state: "error" })
    } finally { setSalvando(false) }
  }
  function salvarChaves() {
    const patch: ConfigPatch = {}
    for (const { id } of CHAVES) if (novas[id]?.trim()) patch[id] = novas[id].trim()
    if (!Object.keys(patch).length) return toast({ message: "Digite ao menos uma chave para salvar", state: "error" })
    void enviar(patch, (c) => { setCfg(c); setNovas({}) })
  }
  function salvarImagens() {
    const n = Number(limite)
    if (!Number.isInteger(n) || n < 1) return toast({ message: "O limite de imagens deve ser um inteiro maior que zero", state: "error" })
    if (Object.values(modelos).some((m) => !m.trim())) return toast({ message: "O modelo de imagem não pode ficar vazio", state: "error" })
    void enviar({ image_provider: provedor, image_model: modelos.openrouter.trim(), higgsfield_model: modelos.higgsfield.trim(), openai_model: modelos.openai.trim(), max_imagens: n }, aplica)
  }

  const salvar = (onClick: () => void) => <Button className="mt-8" onClick={onClick} disabled={!cfg || salvando}>Salvar</Button>
  return (
    <Pagina titulo="Configurações" icone={ICONE.config} cor={COR.config.caixa} sub={SUB[atual]}
      abas={<Abas label="Seções das configurações" valor={atual} itens={ABAS} onChange={(a) => go({ name: "config", aba: a })} />}>
      {atual === "chaves" && <>
        <div className="space-y-4">
          {CHAVES.map(({ id, label, dica }) => {
            const salva = cfg?.keys[id] ?? false
            return (
              <div key={id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
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
        {salvar(salvarChaves)}
      </>}

      {atual === "conexoes" && <Conexoes perfis={perfis} auth={auth} onClaude={onClaude} />}

      {atual === "imagens" && <>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provedor</Label>
            <Select value={provedor} onValueChange={setProvedor}>
              <SelectTrigger aria-label="Provedor de imagem" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="higgsfield">Higgsfield</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image_model">Modelo</Label>
            <Input id="image_model" value={modelos[provedor as keyof typeof modelos] ?? ""}
              onChange={(e) => setModelos({ ...modelos, [provedor]: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              {DICA_MODELO[provedor as keyof typeof DICA_MODELO]}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_imagens">Limite de imagens por episódio</Label>
            <Input id="max_imagens" type="number" min={1} value={limite} onChange={(e) => setLimite(e.target.value)} className="w-32 font-mono" />
          </div>
        </div>
        {salvar(salvarImagens)}
      </>}
    </Pagina>
  )
}
