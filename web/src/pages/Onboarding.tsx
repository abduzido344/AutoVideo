import { Check } from "lucide-react"
import { api } from "@/api"
import { Chat } from "@/components/Chat"
import { FolhaPersonagem } from "@/components/FolhaPersonagem"
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
  const pode = Boolean(perfil?.estilo) && (data?.personagens ?? []).some((p) => p.aprovada)

  async function ativar() {
    try {
      await api.salvarPerfil(slug, { ativo: true })
      go({ name: "perfil", slug })
    } catch (e) {
      toast({ message: "Não consegui ativar o perfil", description: (e as Error).message, state: "error" })
    }
  }

  return (
    <Pagina titulo={perfil?.nome ?? "Novo perfil"} sub="Converse com o Claude para montar o perfil, etapa por etapa.">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Chat kind="onboarding" slug={slug} onReply={refresh} className="h-[32rem]" />
        <div>
          <Secao>Etapas</Secao>
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
          {!pode && <p className="mt-2 text-xs text-muted-foreground">Precisa de um estilo e de ao menos uma folha aprovada.</p>}
        </div>
      </div>
    </Pagina>
  )
}
