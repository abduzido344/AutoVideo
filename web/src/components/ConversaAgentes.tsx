import type { Decision } from "@/api"
import { Message, MessageBubble, MessageBubbleContent, MessageContent } from "@/components/agents/message"
import { usd } from "@/lib/etapas"
import { cn } from "@/lib/utils"

export function ConversaAgentes({ decisions, etapa }: { decisions: Decision[]; etapa: string }) {
  if (!decisions.length) return <p className="text-sm text-muted-foreground">Nenhum agente falou ainda. Etapa atual: {etapa}.</p>
  return (
    <div className="flex flex-col gap-3">
      {decisions.map((d, i) => {
        const papel = d.role ?? "agente"
        const meta = [d.model, d.cost_usd != null && usd(d.cost_usd), d.turns != null && `${d.turns} turnos`].filter(Boolean)
        return (
          <Message key={i} from="assistant" aria-label={papel}>
            <MessageContent>
              <MessageBubble variant="soft" className={cn(d.is_error && "ring-1 ring-destructive")}>
                <MessageBubbleContent>
                  <p className={cn("text-xs font-semibold", d.is_error && "text-destructive")}>{papel}{d.is_error && " · erro"}</p>
                  <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">{meta.map((m) => <span key={String(m)}>{m}</span>)}</p>
                  {d.result && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm">{d.result}</p>}
                </MessageBubbleContent>
              </MessageBubble>
            </MessageContent>
          </Message>
        )
      })}
    </div>
  )
}
