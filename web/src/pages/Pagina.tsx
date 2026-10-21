import type { ReactNode } from "react"

// Casca das telas: header sticky, título 22px e corpo rolável (padrão do Lum Studio).
// As telas de Perfis, Perfil, Onboarding, Estilos, Fila e Revisão entram por cima disto nas Tasks 14–16.
export function Pagina({ titulo, sub, children }: { titulo: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 bg-background/95 px-8 pt-6 pb-4 backdrop-blur-sm lg:px-12">
        <h1 className="font-serif text-[22px] font-medium tracking-tight">{titulo}</h1>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </header>
      <div className="flex-1 overflow-y-auto px-8 pb-10 lg:px-12">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  )
}

export function Secao({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{children}</h2>
}

export function EmBreve({ titulo }: { titulo: string }) {
  return <Pagina titulo={titulo}><p className="text-sm text-muted-foreground">Esta tela chega nas próximas etapas.</p></Pagina>
}
