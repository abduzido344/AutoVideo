// Substitutos locais do que o toast do Kobra importa de itens Pro (@kobra/alert e @kobra/spinner)
import { Check, CircleX, Info, Loader2, TriangleAlert } from "lucide-react"

export type AlertTone = "success" | "error" | "warning" | "info"

export const ALERT_MARKS = { error: CircleX, warning: TriangleAlert, info: Info } as const

export function StatusBadge({ state }: { state: "done" | "loading" }) {
  return state === "done"
    ? <Check className="size-4 text-success" aria-hidden />
    : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
}
