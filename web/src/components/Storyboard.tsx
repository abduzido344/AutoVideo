import { Smartphone } from "lucide-react"
import type { Cena } from "@/api"

function Quadro({ c }: { c: Cena }) {
  return (
    <figure className="space-y-1.5">
      <div className="grid aspect-[9/16] place-items-center overflow-hidden rounded-lg border bg-muted text-xs text-muted-foreground">
        {c.imagem ? <img src={c.imagem} alt={`Cena ${c.id}`} className="size-full object-cover" />
          : c.kind === "screen" ? <span className="flex flex-col items-center gap-1"><Smartphone className="size-5" />tela de celular</span>
          : <span>gerando…</span>}
      </div>
      <figcaption className="space-y-1 text-xs">
        <p className="font-medium">{c.id}</p>
        <p className="line-clamp-3 text-muted-foreground">{c.narration}</p>
        {c.camera && <p className="text-muted-foreground/70">{c.camera}</p>}
        {c.audio && <audio controls aria-label={`Narração ${c.id}`} src={c.audio} className="h-7 w-full" />}
      </figcaption>
    </figure>
  )
}

export function Storyboard({ cenas, erro }: { cenas: Cena[]; erro?: boolean }) {
  if (erro) return <p className="text-sm text-destructive">Não consegui carregar as cenas</p>
  if (!cenas.length) return <p className="text-sm text-muted-foreground">As cenas aparecem aqui quando o roteiro for dividido.</p>
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{cenas.map((c) => <Quadro key={c.id} c={c} />)}</div>
}
