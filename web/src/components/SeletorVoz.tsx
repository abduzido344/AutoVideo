import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import { api, ApiError, type Voz } from "@/api"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

// Voz do perfil: lista da conta ElevenLabs (/api/vozes), ▶ toca a prévia, escolher salva voz_id.
export function SeletorVoz({ slug, vozId, onSaved }: { slug: string; vozId: string; onSaved?: () => void }) {
  const [vozes, setVozes] = useState<Voz[] | null>(null)
  const [semChave, setSemChave] = useState(false)
  const [escolhida, setEscolhida] = useState<string | null>(null) // até o refresh trazer o voz_id salvo
  const atual = escolhida ?? vozId
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let vivo = true
    api.vozes().then((v) => { if (vivo) setVozes(v) }, (e: Error) => {
      if (!vivo) return
      if (e instanceof ApiError && e.status === 400) setSemChave(true)
      else toast({ message: "Não consegui listar as vozes", description: e.message, state: "error" })
      setVozes([])
    })
    return () => { vivo = false }
  }, [])

  if (semChave) return <p className="text-sm text-muted-foreground">Salve a chave da ElevenLabs em <a className="underline" href="#/config/chaves">Configurações → Chaves API</a>.</p>
  const voz = vozes?.find((v) => v.voice_id === atual)
  function escolher(id: string) {
    setEscolhida(id)
    api.salvarPerfil(slug, { voz_id: id }).then(
      () => { toast({ message: "Voz salva", state: "success" }); onSaved?.() },
      (e: Error) => { setEscolhida(null); toast({ message: "Não consegui salvar a voz", description: e.message, state: "error" }) })
  }
  function tocar() {
    const a = audio.current
    if (!a || !voz?.preview_url) return
    a.src = voz.preview_url
    void a.play()?.catch(() => toast({ message: "Não consegui tocar a prévia", state: "error" }))
  }
  return (
    <div className="grid gap-1 text-sm">
      <span id="voz-rotulo">Voz</span>
      <div className="flex items-center gap-2">
        <Select value={atual} onValueChange={escolher} disabled={!vozes}>
          <SelectTrigger aria-labelledby="voz-rotulo" className="min-w-0 flex-1">
            <SelectValue placeholder={vozes ? "Escolha uma voz" : "Carregando vozes…"} />
          </SelectTrigger>
          <SelectContent>
            {atual && !voz && <SelectItem value={atual}>{atual}</SelectItem>}
            {vozes?.map((v) => <SelectItem key={v.voice_id} value={v.voice_id}>{v.nome}{v.descricao ? ` · ${v.descricao}` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" aria-label="Ouvir a voz" disabled={!voz?.preview_url} onClick={tocar}><Play /></Button>
      </div>
      <audio ref={audio} className="hidden" />
    </div>
  )
}
