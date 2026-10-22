import { ChevronsUpDown, Plus, UserRound, type LucideIcon } from "lucide-react"
import type { Auth, Doctor, Perfil } from "@/api"
import { ABAS_PERFIL, COR, ICONE } from "@/components/secoes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar"
import { doctorText } from "@/lib/format"
import { formatHash, type Route } from "@/lib/route"
import { cn } from "@/lib/utils"

type Item = { to: Route; icon: LucideIcon; label: string; cor: string; active: boolean; badge?: number }

function Links({ itens }: { itens: Item[] }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      {itens.map(({ to, icon: Icon, label, cor, active, badge }) => (
        <SidebarMenuItem key={label}>
          <SidebarMenuButton asChild isActive={active}>
            <a href={formatHash(to)} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined}>
              <Icon className={cor} />
              <span>{label}</span>
              {badge ? (
                <span role="img" aria-label={`${badge} aguardando`} className="ml-auto rounded-full bg-pink px-1.5 font-mono text-xs font-bold leading-5 text-black">{badge}</span>
              ) : null}
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

export function AppSidebar({ perfis, perfilSlug, onPerfil, aguardando, route, doctor, auth, onAccount, onNovoPerfil, onNovoEstilo }: {
  perfis: Perfil[]; perfilSlug: string | null; onPerfil: (slug: string) => void; aguardando: number
  route: Route; doctor: Doctor | null; auth: Auth | null; onAccount: () => void; onNovoPerfil: () => void; onNovoEstilo: () => void
}) {
  const sys = doctorText(doctor)
  const { setOpenMobile } = useSidebar()
  const perfil = perfis.find((p) => p.slug === perfilSlug)
  const doPerfil: Item[] = !perfil ? []
    : perfil.onboarding < 6
      ? [{ to: { name: "onboarding", slug: perfil.slug }, icon: ICONE.onboarding, label: "Continuar onboarding", cor: COR.perfil.icone,
        active: route.name === "onboarding" && route.slug === perfil.slug }]
      : ABAS_PERFIL.map(({ aba, label, icon }) => ({
        to: { name: "perfil", slug: perfil.slug, aba }, icon, label, cor: COR.perfil.icone,
        active: route.name === "perfil" && route.slug === perfil.slug && (route.aba ?? "series") === aba,
      }))
  const geral: Item[] = [
    { to: { name: "producao" }, icon: ICONE.producao, label: "Produção", cor: COR.producao.icone, active: route.name === "producao", badge: aguardando },
    { to: { name: "estilos" }, icon: ICONE.estilos, label: "Estilos", cor: COR.estilos.icone, active: route.name === "estilos" || route.name === "estilo" },
    { to: { name: "config" }, icon: ICONE.config, label: "Configurações", cor: COR.config.icone, active: route.name === "config" },
  ]
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <a href="#/perfis" aria-label="AutoVideo" className="px-2 pt-1 font-serif text-2xl font-semibold tracking-tight">
            autovideo<span className="text-pink">.</span>
          </a>
          <SidebarTrigger aria-label="Fechar o menu" />
        </div>
        <Select value={perfilSlug ?? undefined} onValueChange={onPerfil} disabled={perfis.length === 0}>
          <SelectTrigger aria-label="Perfil" className="mt-2 w-full bg-background">
            <SelectValue placeholder={perfis.length ? "Escolha um perfil" : "Nenhum perfil"} />
          </SelectTrigger>
          <SelectContent>
            {perfis.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-medium text-primary-foreground outline-none hover:bg-(--primary-hover) focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" />Criar<ChevronsUpDown className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
            <DropdownMenuItem onSelect={() => { setOpenMobile(false); onNovoPerfil() }}>Novo perfil</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setOpenMobile(false); onNovoEstilo() }}>Novo estilo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        {perfil && (
          <SidebarGroup>
            <SidebarGroupLabel>{perfil.nome}</SidebarGroupLabel>
            <Links itens={doPerfil} />
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <Links itens={geral} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { setOpenMobile(false); onAccount() }}>
              <UserRound />
              <span>Conta Claude</span>
              <span className={cn("ml-auto text-xs", auth?.ok ? "text-success" : auth ? "text-destructive" : "text-muted-foreground")}>
                {auth === null ? "…" : auth.ok ? "conectada" : "conectar"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div title={sys.text} className="px-2 pb-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full",
              sys.ok === null ? "bg-input" : sys.ok ? "bg-success" : "bg-destructive")} />
            <span className="truncate">{sys.ok === false ? sys.text.split(" — ")[0] : sys.text}</span>
          </p>
          {sys.ok === false && sys.text.includes(" — ") && (
            <p className="mt-0.5 break-words pl-4">{sys.text.split(" — ").slice(1).join(" — ")}</p>
          )}
          {sys.ok === false && <p className="mt-0.5 pl-4">Corrija e recarregue a página</p>}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
