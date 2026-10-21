import { useState } from "react"
import { api, type Personagem } from "@/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"

// Card de um personagem: ficha, folha (imagem), gerar/aprovar. Aprovar só existe com a folha gerada.
export function FolhaPersonagem({ perfil, personagem, onChange }: { perfil: string; personagem: Personagem; onChange: () => void }) {
  const [busy, setBusy] = useState<"folha" | "aprovar" | null>(null)
  const [v, setV] = useState(0) // cache-busting depois de gerar de novo
  const { slug, ficha, folha, aprovada } = personagem

  async function rodar(qual: "folha" | "aprovar") {
    setBusy(qual)
    try {
      if (qual === "folha") { await api.gerarFolha(perfil, slug); setV(Date.now()) } else await api.aprovarPersonagem(perfil, slug)
      onChange()
    } catch (e) {
      toast({ message: qual === "folha" ? "Não consegui gerar a folha" : "Não consegui aprovar", description: (e as Error).message, state: "error" })
    } finally { setBusy(null) }
  }

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{slug}</h3>
        {aprovada && <span className="text-xs text-success">aprovada</span>}
      </div>
      {ficha && <p className="line-clamp-3 text-sm text-muted-foreground">{ficha}</p>}
      {folha && (
        <img alt={`Folha de ${slug}`} className="w-full rounded-lg border"
          src={`/projects/${encodeURIComponent(perfil)}/personagens/${encodeURIComponent(slug)}/folha.png${v ? `?v=${v}` : ""}`} />
      )}
      <div className="flex gap-2">
        <Button variant={folha ? "outline" : "default"} disabled={busy !== null} onClick={() => rodar("folha")}>
          {busy === "folha" ? "Gerando…" : folha ? "Gerar de novo" : "Gerar folha"}
        </Button>
        {folha && !aprovada && <Button disabled={busy !== null} onClick={() => rodar("aprovar")}>Aprovar</Button>}
      </div>
    </Card>
  )
}
