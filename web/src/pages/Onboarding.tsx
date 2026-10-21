import { Check } from "lucide-react"
import { api } from "@/api"
import { Chat } from "@/components/Chat"
import { FolhaPersonagem } from "@/components/FolhaPersonagem"
import { COR, ICONE } from "@/components/secoes"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { cn } from "@/lib/utils"
import { Pagina, Secao } from "@/pages/Pagina"

const ETAPAS = ["Nome, assunto e público", "Estilo", "Personagens", "Mundo e regras", "Primeiras ideias de série", "Agenda e contas"]

export function Onboarding({ slug }: { slug: string }) {
  const { data, refresh } = usePoll(() => api.perfil(slug), 5000)
  const perfil = data?.perfil
  // mesma regra do servidor (data.ready): estilo, as 6 etapas e todas as folhas aprovadas
  const ps = data?.personagens ?? []
  const pode = Boolean(perfil?.estilo) && (perfil?.onboarding ?? 0) >= 6 && ps.length > 0 && ps.every((p) => p.folha && p.aprovada)

  async function ativar() {
    try {
      await api.salvarPerfil(slug, { ativo: true })
      go({ name: "perfil", slug })
    } catch (e) {
      toast({ message: "Não consegui ativar o perfil", description: (e as Error).message, state: "error" })
    }
  }

  return (
    <Pagina titulo={perfil?.nome ?? "Novo perfil"} icone={ICONE.onboarding} cor={COR.perfil.caixa} largo
      sub="Converse com o Claude para montar o perfil, etapa por etapa.">
      {/* no desktop o chat ocupa a altura do corpo e a coluna das etapas rola sozinha */}
      <div className="grid gap-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Chat kind="onboarding" slug={slug} onReply={() => refresh()} className="h-[32rem] lg:h-full" />
        <div className="lg:min-h-0 lg:overflow-y-auto">
          <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Etapas</h2>
          <ol className="space-y-2">
            {ETAPAS.map((t, i) => {
              const feita = (perfil?.onboarding ?? 0) > i
              return (
                <li key={t} className={cn("flex items-center gap-2 text-sm", !feita && "text-muted-foreground")}>
                  <span className={cn("grid size-5 place-items-center rounded-full border text-[11px]", feita && "border-success bg-success text-white")}>
                    {feita ? <Check className="size-3" /> : i + 1}
                  </span>
                  {t}
                </li>
              )
            })}
          </ol>
          <Secao>Personagens</Secao>
          <div className="space-y-3">
            {(data?.personagens ?? []).map((p) => <FolhaPersonagem key={p.slug} perfil={slug} personagem={p} onChange={refresh} />)}
            {data && data.personagens.length === 0 && <p className="text-sm text-muted-foreground">Os personagens aparecem aqui quando o Claude os criar.</p>}
          </div>
          <Button className="mt-6 w-full" disabled={!pode} onClick={ativar}>Ativar perfil</Button>
          {!pode && <p className="mt-2 text-xs text-muted-foreground">Libera quando as 6 etapas estiverem concluídas e todas as folhas de personagem aprovadas.</p>}
        </div>
      </div>
    </Pagina>
  )
}
