import { useContext, type ComponentType, type ReactNode } from "react"
import { SidebarContext, SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Icone = ComponentType<{ className?: string }>

// Casca das telas: cabeçalho fixo (ícone + título + ações / abas / subtítulo) e só o corpo rola.
export function Pagina({ titulo, icone: I, cor, extra, acoes, abas, sub, largo, children }: {
  titulo: string; icone?: Icone; cor?: string; extra?: ReactNode; acoes?: ReactNode; abas?: ReactNode; sub?: string
  largo?: boolean; children?: ReactNode
}) {
  // fora do provider (testes de página) não há sidebar para reabrir
  const sb = useContext(SidebarContext)
  const fechada = sb !== null && (sb.isMobile || sb.state === "collapsed")
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 space-y-3 px-4 pt-4 pb-4 md:px-8 md:pt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {fechada && <SidebarTrigger aria-label="Abrir o menu" className="-ml-1" />}
          {I && <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-md", cor)}><I className="size-4" /></span>}
          <h1 className="min-w-0 truncate font-serif text-[22px] font-medium tracking-tight">{titulo}</h1>
          {extra}
          {acoes && <div className="ml-auto flex flex-wrap items-center gap-2">{acoes}</div>}
        </div>
        {abas}
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8">
        {largo ? children : <div className="max-w-3xl">{children}</div>}
      </div>
    </div>
  )
}

// Linha 2 do cabeçalho: abas ligadas à rota (o corpo mostra só a aba escolhida)
export function Abas({ valor, itens, onChange, label }: {
  valor: string; itens: readonly { aba: string; label: string }[]; onChange: (aba: string) => void; label: string
}) {
  return (
    <Tabs value={valor} onValueChange={onChange} className="max-w-full overflow-x-auto">
      <TabsList aria-label={label}>
        {itens.map((i) => <TabsTrigger key={i.aba} value={i.aba}>{i.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}

export function Secao({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{children}</h2>
}
