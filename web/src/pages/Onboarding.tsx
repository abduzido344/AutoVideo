import { useEffect, useState } from "react"
import { api } from "@/api"
import { TodoList, type TodoItem } from "@/components/agents/todo-list"
import { Chat } from "@/components/Chat"
import { FolhaPersonagem } from "@/components/FolhaPersonagem"
import { COR, ICONE } from "@/components/secoes"
import { SeletorVoz } from "@/components/SeletorVoz"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

const ETAPAS = ["Nome, assunto e público", "Estilo", "Personagens", "Mundo e regras", "Primeiras ideias de série", "Agenda e contas"]

export function Onboarding({ slug }: { slug: string }) {
  const { data, error, refresh } = usePoll(() => api.perfil(slug), 5000)
  const perfil = data?.perfil
  // mesma regra do servidor (data.ready): estilo, as 6 etapas e todas as folhas aprovadas
  const ps = data?.personagens ?? []
  // a voz vem do perfil ou, na falta dela, do voz_padrao do estilo
  const [vozPadrao, setVozPadrao] = useState("")
  const [busy, setBusy] = useState(false)
  const estilo = perfil?.estilo
  useEffect(() => {
    setVozPadrao("") // não deixa a voz do estilo anterior valendo
    if (estilo) api.estilo(estilo).then((e) => setVozPadrao(e.json.voz_padrao), () => setVozPadrao(""))
  }, [estilo])
  const pode = Boolean(perfil?.estilo) && (perfil?.onboarding ?? 0) >= 6 && ps.length > 0 && ps.every((p) => p.folha && p.aprovada) && Boolean(perfil?.voz_id || vozPadrao)
  const feitas = perfil?.onboarding ?? 0
  const etapas: TodoItem[] = ETAPAS.map((t, i) => ({ id: String(i), title: t, status: feitas > i ? "completed" : feitas === i ? "in-progress" : "pending" }))

  async function ativar() {
    if (busy) return
    setBusy(true)
    try {
      await api.salvarPerfil(slug, { ativo: true })
      go({ name: "perfil", slug })
    } catch (e) {
      toast({ message: "Não consegui ativar o perfil", description: (e as Error).message, state: "error" })
    } finally { setBusy(false) }
  }

  return (
    <Pagina titulo={perfil?.nome ?? (error && !data ? "Perfil não encontrado" : "Novo perfil")} icone={ICONE.onboarding} cor={COR.perfil.caixa} largo
      sub={error && !data ? "Não consegui carregar este perfil. Ele pode não existir." : "Converse com o Claude para montar o perfil, etapa por etapa."}>
      {/* no desktop o chat ocupa a altura do corpo e a coluna das etapas rola sozinha */}
      <div className="grid gap-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Chat kind="onboarding" slug={slug} onReply={() => refresh()} className="h-[32rem] lg:h-full" />
        <div className="lg:min-h-0 lg:overflow-y-auto">
          <TodoList title="Etapas" items={etapas} collapseOnComplete={false} maxHeight={320} />
          <Secao>Personagens</Secao>
          <div className="space-y-3">
            {(data?.personagens ?? []).map((p) => <FolhaPersonagem key={p.slug} perfil={slug} personagem={p} onChange={refresh} />)}
            {data && data.personagens.length === 0 && <p className="text-sm text-muted-foreground">Os personagens aparecem aqui quando o Claude os criar.</p>}
          </div>
          <div className="mt-6"><SeletorVoz slug={slug} vozId={perfil?.voz_id ?? ""} onSaved={refresh} /></div>
          <Button className="mt-4 w-full" disabled={!pode || busy} onClick={ativar}>Ativar perfil</Button>
          {!pode && <p className="mt-2 text-xs text-muted-foreground">Libera quando as 6 etapas estiverem concluídas, todas as folhas de personagem aprovadas e a voz escolhida.</p>}
        </div>
      </div>
    </Pagina>
  )
}
