import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { api, ApiError, type ChatKind, type ChatMsg } from "@/api"
import { Message, MessageBubble, MessageBubbleContent, MessageContent, MessageScroller } from "@/components/agents/message"
import { PromptInput } from "@/components/agents/prompt-input"
import { ReasoningText } from "@/components/agents/loading-states/reasoning-text"
import { StreamingResponse } from "@/components/agents/streaming-response"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// frases que giram enquanto o POST não volta
const FRASES: Record<ChatKind, string[]> = {
  onboarding: ["Lendo o perfil", "Pensando na próxima etapa", "Gravando o que decidimos"],
  estilo: ["Lendo o estilo", "Ajustando as regras", "Gravando o estilo"],
}

// A API devolve a resposta inteira (sem streaming): isto só anima a revelação, palavra a palavra.
// ponytail: o markdown parcial pisca (ex.: "**neg" aparece cru até fechar); trocar por fade do bloco se incomodar.
function useRevelar(texto: string, ativo: boolean) {
  const [n, setN] = useState(ativo ? 0 : Infinity)
  const partes = texto.split(/(\s+)/)
  useEffect(() => {
    if (!ativo || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(Infinity); return }
    setN(1)
    const passo = Math.max(2, Math.ceil(partes.length / 60)) // ~1,5 s no máximo
    const t = setInterval(() => setN((k) => { if (k + passo >= partes.length) { clearInterval(t); return Infinity } return k + passo }), 25)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, ativo])
  return { texto: n === Infinity ? texto : partes.slice(0, n).join(""), pronto: n === Infinity }
}

function RespostaClaude({ texto, anima }: { texto: string; anima: boolean }) {
  const r = useRevelar(texto, anima)
  return (
    <StreamingResponse status={r.pronto ? "complete" : "streaming"} showActions={false} announce={false}>
      <ReactMarkdown>{r.texto}</ReactMarkdown>
    </StreamingResponse>
  )
}

// Conversa com o agente (onboarding ou estilo): componentes do beui (prompt-input, message, reasoning-text, streaming-response).
export function Chat({ kind, slug, onReply, className }: { kind: ChatKind; slug: string; onReply?: (etapa: number) => void; className?: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [novo, setNovo] = useState(-1) // índice da resposta recém-chegada: só ela anima
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivo = true
    api.chat(kind, slug).then((h) => { if (vivo) { setMsgs(h); setNovo(-1) } }, (e: Error) => toast({ message: "Não consegui ler a conversa", description: e.message, state: "error" }))
    return () => { vivo = false }
  }, [kind, slug])

  async function enviar(m: string) {
    if (!m || enviando) return
    setEnviando(true)
    setMsgs((h) => [...h, { autor: "voce", texto: m }])
    setTexto("")
    try {
      const r = await api.chatSend(kind, slug, m)
      setMsgs(r.historico)
      setNovo(r.historico.at(-1)?.autor === "claude" ? r.historico.length - 1 : -1)
      onReply?.(r.etapa)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) toast({ message: "Limite de uso do Claude atingido", description: e.message, state: "error" })
      else toast({ message: "O Claude não respondeu", description: (e as Error).message, state: "error" })
      // o servidor às vezes grava o turno e só depois falha (agente gravou arquivo inválido): a verdade é o histórico dele
      const antes = msgs.length
      const h = await api.chat(kind, slug).catch(() => msgs)
      setMsgs(h)
      setNovo(-1)
      if (h.length <= antes) setTexto(m) // não gravou: devolve o texto para reenviar
    } finally { setEnviando(false); setTimeout(() => raiz.current?.querySelector("textarea")?.focus()) }
  }

  return (
    <Card className={cn("flex min-h-0 flex-col gap-3 p-4", className)}>
      <MessageScroller label="Conversa" busy={enviando} className="flex-1" contentClassName="flex flex-col gap-4 pb-1">
        {msgs.map((m, i) => (
          <Message key={i} from={m.autor === "voce" ? "user" : "assistant"} aria-label={m.autor === "voce" ? "Você" : "Claude"}>
            <MessageContent>
              <MessageBubble variant={m.autor === "voce" ? "solid" : "soft"}>
                <MessageBubbleContent>
                  {m.autor === "voce" ? <p className="whitespace-pre-wrap">{m.texto}</p> : <RespostaClaude texto={m.texto} anima={i === novo} />}
                </MessageBubbleContent>
              </MessageBubble>
            </MessageContent>
          </Message>
        ))}
        {enviando && (
          <Message from="assistant" aria-label="Claude">
            <MessageContent><ReasoningText phrases={FRASES[kind]} /></MessageContent>
          </Message>
        )}
      </MessageScroller>
      <div ref={raiz}>
        <PromptInput value={texto} onValueChange={setTexto} onSubmit={enviar} disabled={enviando} minRows={2}
          aria-label="Mensagem" placeholder="Escreva para o Claude" />
      </div>
    </Card>
  )
}
