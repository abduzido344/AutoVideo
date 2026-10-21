import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { api } from "@/api"
import { Chat } from "@/components/Chat"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { COR, ICONE } from "@/components/secoes"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina } from "@/pages/Pagina"

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

// "Criar conversando": o nome vira o slug do estilo e a conversa abre em #/estilo/<slug>.
export function NovoEstilo({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [nome, setNome] = useState("")
  const slug = slugify(nome)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo estilo</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!slug) return; setNome(""); onOpenChange(false); go({ name: "estilo", slug }) }}>
          <Input aria-label="Nome do estilo" placeholder="Nome do estilo" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
          <DialogFooter className="mt-4"><Button type="submit" disabled={!slug}>Criar conversando</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Estilos({ onNovo }: { onNovo: () => void }) {
  const { data } = usePoll(api.estilos, 30000)
  const [handle, setHandle] = useState("")
  const [busy, setBusy] = useState(false)
  async function analisar() {
    const h = handle.trim()
    if (!h || busy) return
    setBusy(true)
    try {
      const { job } = await api.analisarEstilo(h)
      setHandle("")
      toast({ message: "Análise iniciada", description: `Job ${job} na Fila. Quando terminar, o estilo aparece aqui.`, state: "success" })
    } catch (e) {
      toast({ message: "Não consegui analisar o perfil", description: (e as Error).message, state: "error" })
    } finally { setBusy(false) }
  }
  return (
    <Pagina titulo="Estilos" icone={ICONE.estilos} cor={COR.estilos.caixa} largo acoes={<Button onClick={onNovo}>Criar conversando</Button>}
      sub="O jeito de contar: ritmo, imagem, legenda e gancho.">
      <div className="max-w-xl">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void analisar() }}>
          <Input aria-label="Perfil a analisar" placeholder="@perfil de referência" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <Button type="submit" variant="outline" disabled={!handle.trim() || busy}>Analisar perfil</Button>
        </form>
      </div>
      {data && data.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nenhum estilo ainda.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((s) => (
          <a key={s.slug} href={`#/estilo/${encodeURIComponent(s.slug)}`}>
            <Card className="flex-row items-center justify-between p-4 hover:bg-muted/50">
              <h3 className="font-medium">{s.titulo}</h3>
              <span className="text-xs text-muted-foreground">{s.origem === "fabrica" ? "fábrica" : "seu"}</span>
            </Card>
          </a>
        ))}
      </div>
    </Pagina>
  )
}

export function EstiloPagina({ slug }: { slug: string }) {
  const { data, refresh } = usePoll(() => api.estilo(slug), 5000) // estilo novo ainda não existe: fica vazio até a conversa gravar
  return (
    <Pagina titulo={data?.json.titulo ?? slug} icone={ICONE.estilos} cor={COR.estilos.caixa} largo
      sub="Converse com o Claude para criar ou ajustar este estilo.">
      <div className="grid gap-6 lg:h-full lg:grid-cols-2">
        <Chat kind="estilo" slug={slug} onReply={() => refresh()} className="h-[32rem] lg:h-full" />
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">estilo.md</h2>
          {data ? <div className="text-sm"><ReactMarkdown>{data.md}</ReactMarkdown></div>
            : <p className="text-sm text-muted-foreground">O estilo aparece aqui quando o Claude o gravar.</p>}
        </div>
      </div>
    </Pagina>
  )
}
