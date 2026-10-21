import { useCallback, useEffect, useRef, useState } from "react"
import { api, type Auth, type Doctor } from "@/api"
import { AppSidebar, TopBar } from "@/components/AppSidebar"
import { ConnectClaude } from "@/components/ConnectClaude"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { toast, Toasts } from "@/components/ui/toast"
import { SoundEffects } from "@/components/ui/sound"
import { go, useRoute } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Configuracoes } from "@/pages/Configuracoes"
import { Onboarding } from "@/pages/Onboarding"
import { Estilos, EstiloPagina, NovoEstilo } from "@/pages/Estilos"
import { Perfil } from "@/pages/Perfil"
import { NovoPerfil, Perfis } from "@/pages/Perfis"
import { Fila } from "@/pages/Fila"
import { Revisao } from "@/pages/Revisao"

const OFFLINE: Doctor = { ok: false, checks: [{ name: "resposta do servidor", ok: false, detail: "sem resposta do /api/doctor" }] }

export default function App() {
  const route = useRoute()
  const fila = usePoll(api.fila)
  const perfis = usePoll(api.perfis, 10000)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  // o perfil da rota manda; senão vale o último escolhido; senão o primeiro
  const lista = perfis.data ?? []
  const noRoute = route.name === "perfil" || route.name === "onboarding" ? route.slug : null
  const perfilSlug = noRoute ?? (lista.some((p) => p.slug === escolhido) ? escolhido : lista[0]?.slug ?? null)
  const aguardando = (fila.data?.jobs ?? []).filter((j) => j.status === "awaiting_approval").length

  useEffect(() => { api.doctor().then(setDoctor, () => setDoctor(OFFLINE)) }, [])
  // conta do Claude: sem login, a janela "Conectar o Claude" abre sozinha ao carregar
  const [auth, setAuth] = useState<Auth | null>(null)
  const [connect, setConnect] = useState(false)
  const [novo, setNovo] = useState(false)
  const [novoEstilo, setNovoEstilo] = useState(false)
  useEffect(() => { api.auth().then((a) => { setAuth(a); if (!a.ok) setConnect(true) }, () => {}) }, [])
  const connected = useCallback((a: Auth) => { setAuth(a); api.doctor().then(setDoctor, () => {}) }, [])
  // queda do servidor vira um toast fixo (pending não some sozinho); na volta, o mesmo id troca para sucesso e some
  const offline = Boolean(fila.error)
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

  return (
    <SoundEffects>
      <SidebarProvider>
        <AppSidebar perfis={lista} perfilSlug={perfilSlug} aguardando={aguardando} route={route}
          onPerfil={(slug) => { setEscolhido(slug); go({ name: "perfil", slug }) }}
          doctor={doctor} auth={auth} onAccount={() => setConnect(true)} onNovoPerfil={() => setNovo(true)} onNovoEstilo={() => setNovoEstilo(true)} />
        <SidebarInset>
          <TopBar />
          {route.name === "config" ? <Configuracoes />
            : route.name === "perfis" ? <Perfis perfis={perfis.data} onNovo={() => setNovo(true)} />
            : route.name === "perfil" ? <Perfil key={route.slug} slug={route.slug} aba={route.aba} />
            : route.name === "estilos" ? <Estilos onNovo={() => setNovoEstilo(true)} />
            : route.name === "estilo" ? <EstiloPagina key={route.slug} slug={route.slug} />
            : route.name === "onboarding" ? <Onboarding key={route.slug} slug={route.slug} />
            : route.name === "fila" ? <Fila />
            : <Revisao jid={route.jid} />}
        </SidebarInset>
      </SidebarProvider>
      <NovoEstilo open={novoEstilo} onOpenChange={setNovoEstilo} />
      <NovoPerfil open={novo} onOpenChange={setNovo} />
      <ConnectClaude open={connect} onOpenChange={setConnect} onConnected={connected} />
      <Toasts />
    </SoundEffects>
  )
}
