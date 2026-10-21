import { useEffect, useRef, useState } from "react"
import { api, ApiError, type ChatKind, type ChatMsg } from "@/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// Conversa com o agente (onboarding ou estilo). Fallback shadcn: card + textarea (Kobra conversation/chat-input exigem Pro).
export function Chat({ kind, slug, onReply, className }: { kind: ChatKind; slug: string; onReply?: (etapa: number) => void; className?: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let vivo = true
    api.chat(kind, slug).then((h) => { if (vivo) setMsgs(h) }, (e: Error) => toast({ message: "Não consegui ler a conversa", description: e.message, state: "error" }))
    return () => { vivo = false }
  }, [kind, slug])
  useEffect(() => { fim.current?.scrollIntoView?.({ block: "end" }) }, [msgs, enviando])

  async function enviar() {
    const m = texto.trim()
    if (!m || enviando) return
    setEnviando(true)
    setMsgs((h) => [...h, { autor: "voce", texto: m }])
    setTexto("")
    try {
      const r = await api.chatSend(kind, slug, m)
      setMsgs(r.historico)
      onReply?.(r.etapa)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) toast({ message: "Limite de uso do Claude atingido", description: e.message, state: "error" })
      else toast({ message: "O Claude não respondeu", description: (e as Error).message, state: "error" })
      setMsgs((h) => h.slice(0, -1)) // o servidor não gravou este turno
      setTexto(m)
    } finally { setEnviando(false); setTimeout(() => campo.current?.focus()) }
  }

  return (
    <Card className={cn("flex min-h-0 flex-col gap-3 p-4", className)}>
      <div className="flex-1 space-y-3 overflow-y-auto" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap", m.autor === "voce" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
            {m.texto}
          </div>
        ))}
        {enviando && <p className="text-sm text-muted-foreground">O Claude está pensando…</p>}
        <div ref={fim} />
      </div>
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void enviar() }}>
        <Textarea ref={campo} aria-label="Mensagem" value={texto} disabled={enviando} rows={2} className="min-h-10 flex-1"
          placeholder="Escreva para o Claude"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar() } }} />
        <Button type="submit" disabled={enviando || !texto.trim()}>Enviar</Button>
      </form>
    </Card>
  )
}
