import { useEffect, useRef, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { api, type Auth } from "@/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const LOGIN = "claude auth login"

// O login é do próprio Claude Code (no terminal); o painel só abre o terminal e confere o status a cada 3 s
export function ConnectClaude({ open, onOpenChange, onConnected }: {
  open: boolean; onOpenChange: (open: boolean) => void; onConnected: (auth: Auth) => void
}) {
  const [auth, setAuth] = useState<Auth | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [copied, setCopied] = useState(false)
  const was = useRef<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    was.current = null
    let alive = true
    const check = () => api.auth().then((a) => {
      if (!alive) return
      setAuth(a)
      if (a.ok && was.current === false) {
        toast({ message: "Claude conectado", state: "success" })
        onConnected(a)
        onOpenChange(false)
      }
      was.current = a.ok
    }, () => {})
    check()
    const t = setInterval(check, 3000)
    return () => { alive = false; clearInterval(t); setWaiting(false) }
  }, [open, onConnected, onOpenChange])

  const openTerminal = () => {
    setWaiting(true)
    api.authLogin().catch((e: Error) => {
      setWaiting(false)
      toast({ message: "Não deu para abrir o terminal", description: e.message, state: "error" })
    })
  }
  const copy = () => {
    navigator.clipboard?.writeText(LOGIN).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => {})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar o Claude</DialogTitle>
          <DialogDescription>
            Os agentes do AutoVideo usam a sua conta do Claude Code. O login é feito pelo próprio Claude Code, no
            terminal: o AutoVideo não vê nem guarda a sua senha.
          </DialogDescription>
        </DialogHeader>

        <p role="status" className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full",
            auth === null ? "bg-input" : auth.ok ? "bg-success" : "bg-destructive")} />
          {auth === null ? "Verificando…" : auth.ok ? `Conectado — ${auth.detail}` : "Não conectado"}
        </p>

        {!auth?.ok && (waiting
          ? <p className="flex items-center gap-2 rounded-xl bg-info/10 px-3 py-2.5 text-sm text-info">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Aguardando o login no terminal. O navegador abre para você entrar.
            </p>
          : <Button onClick={openTerminal}>Abrir o terminal e entrar</Button>)}

        {!auth?.ok && (
          <div className="grid gap-1.5 text-sm text-muted-foreground">
            <span>Ou rode no seu terminal:</span>
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5">
              <code className="flex-1 font-mono text-foreground">{LOGIN}</code>
              <Button variant="ghost" size="icon" className="size-7" onClick={copy} aria-label="Copiar o comando">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <span className="text-xs">Uso não pessoal? Defina <code>ANTHROPIC_API_KEY</code> antes de rodar <code>autovideo serve</code>.</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
