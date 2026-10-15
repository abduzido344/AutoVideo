import { useEffect, useState } from "react"
import { api, type Doctor } from "@/api"
import { AppSidebar, TopBar } from "@/components/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toasts } from "@/components/ui/toast"
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
        <AppSidebar jobs={jobs.data ?? []} route={route} doctor={doctor} />
        <SidebarInset>
          <TopBar />
          {jobs.error && <p role="status" className="rounded-t-xl bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
            Sem conexão com o servidor — tentando de novo…</p>}
          {route.name === "project"
            ? <Workspace key={route.id} id={route.id} stages={stages} onChange={jobs.refresh} />
            : <NewVideo doctor={doctor} onCreated={(id) => { jobs.refresh(); go({ name: "project", id }) }} />}
        </SidebarInset>
      </SidebarProvider>
      <Toasts />
    </SoundEffects>
  )
}
