import { useCallback, useEffect, useRef, useState } from "react"
import { api, type Auth, type Doctor } from "@/api"
import { AppSidebar, TopBar } from "@/components/AppSidebar"
import { ConnectClaude } from "@/components/ConnectClaude"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { toast, Toasts } from "@/components/ui/toast"
import { SoundEffects } from "@/components/ui/sound"
import { go, isNewVideoShortcut, useRoute } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { NewVideo } from "@/pages/NewVideo"
import { Workspace } from "@/pages/Workspace"

const OFFLINE: Doctor = { ok: false, checks: [{ name: "resposta do servidor", ok: false, detail: "sem resposta do /api/doctor" }] }

export default function App() {
  const route = useRoute()
  const jobs = usePoll(api.jobs)
  const [stages, setStages] = useState<string[]>([])
  const [doctor, setDoctor] = useState<Doctor | null>(null)

  useEffect(() => { api.stages().then(setStages).catch(() => {}) }, [])
  useEffect(() => { api.doctor().then(setDoctor, () => setDoctor(OFFLINE)) }, [])
  // conta do Claude: sem login, a janela "Conectar o Claude" abre sozinha ao carregar
  const [auth, setAuth] = useState<Auth | null>(null)
  const [connect, setConnect] = useState(false)
  useEffect(() => { api.auth().then((a) => { setAuth(a); if (!a.ok) setConnect(true) }, () => {}) }, [])
  const connected = useCallback((a: Auth) => { setAuth(a); api.doctor().then(setDoctor, () => {}) }, [])
  // queda do servidor vira um toast fixo (pending não some sozinho); na volta, o mesmo id troca para sucesso e some
  const offline = Boolean(jobs.error)
  const wasOffline = useRef(false)
  useEffect(() => {
    if (offline) toast({ id: "offline", message: "Sem conexão com o servidor — tentando de novo…", state: "pending" })
    else if (wasOffline.current) toast({ id: "offline", message: "Conexão restabelecida", state: "success" })
    wasOffline.current = offline
  }, [offline])
  // soltar um arquivo fora de uma tela que o aceite faria o navegador abri-lo e perder a página; texto em textarea segue livre
  useEffect(() => {
    const block = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault() }
    addEventListener("dragover", block)
    addEventListener("drop", block)
    return () => { removeEventListener("dragover", block); removeEventListener("drop", block) }
  }, [])
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (isNewVideoShortcut(e)) { e.preventDefault(); go({ name: "new" }) }
    }
    addEventListener("keydown", on)
    return () => removeEventListener("keydown", on)
  }, [])

  return (
    <SoundEffects>
      <SidebarProvider>
        <AppSidebar jobs={jobs.data ?? []} route={route} doctor={doctor} auth={auth} onAccount={() => setConnect(true)} />
        <SidebarInset>
          <TopBar />
          {route.name === "project"
            ? <Workspace key={route.id} id={route.id} stages={stages} onChange={jobs.refresh} />
            : <NewVideo doctor={doctor} onCreated={(id) => { jobs.refresh(); go({ name: "project", id }) }} />}
        </SidebarInset>
      </SidebarProvider>
      <ConnectClaude open={connect} onOpenChange={setConnect} onConnected={connected} />
      <Toasts />
    </SoundEffects>
  )
}
