import { useState } from "react"
import { api, type Perfil } from "@/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { Pagina } from "@/pages/Pagina"

export function NovoPerfil({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [nome, setNome] = useState("")
  const [busy, setBusy] = useState(false)
  async function criar() {
    if (!nome.trim() || busy) return
    setBusy(true)
    try {
      const p = await api.novoPerfil(nome.trim())
      setNome("")
      onOpenChange(false)
      go({ name: "onboarding", slug: p.slug })
    } catch (e) {
      toast({ message: "Não consegui criar o perfil", description: (e as Error).message, state: "error" })
    } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo perfil</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void criar() }}>
          <Input aria-label="Nome do perfil" placeholder="Nome do perfil" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
          <DialogFooter className="mt-4"><Button type="submit" disabled={!nome.trim() || busy}>Criar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const proximo = (p: Perfil) => (p.ativo ? `Gera às ${p.agenda.gerar_as}${p.agenda.postar_as.length ? ` · posta às ${p.agenda.postar_as.join(", ")}` : ""}` : "Sem horário")

export function Perfis({ perfis, onNovo }: { perfis: Perfil[] | null; onNovo: () => void }) {
  return (
    <Pagina titulo="Perfis" sub="Cada perfil é uma conta de conteúdo com assunto, estilo e personagens.">
      <Button onClick={onNovo}>Novo perfil</Button>
      {perfis && perfis.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nenhum perfil ainda. Crie o primeiro.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(perfis ?? []).map((p) => (
          <a key={p.slug} href={!p.ativo && p.onboarding < 6 ? `#/onboarding/${p.slug}` : `#/perfil/${p.slug}`}>
            <Card className="gap-1 p-4 hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{p.nome}</h3>
                <span className={p.ativo ? "text-xs text-success" : "text-xs text-muted-foreground"}>{p.ativo ? "ativo" : "pausado"}</span>
              </div>
              <p className="text-sm text-muted-foreground">{p.assunto || "Sem assunto"}</p>
              <p className="text-sm">Estilo: {p.estilo || "não definido"}</p>
              <p className="text-xs text-muted-foreground">{proximo(p)}</p>
            </Card>
          </a>
        ))}
      </div>
    </Pagina>
  )
}
