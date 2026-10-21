import { ChevronsUpDown, ClipboardCheck, ListVideo, Palette, Plus, Settings, UserRound } from "lucide-react"
import type { Auth, Doctor, Perfil } from "@/api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar"
import { doctorText } from "@/lib/format"
import { go, type Route } from "@/lib/route"
import { cn } from "@/lib/utils"

export function TopBar() {
  return (
    <header className="flex h-11 items-center gap-2 px-3">
      <SidebarTrigger aria-label="Abrir ou fechar o menu" />
    </header>
  )
}

export function AppSidebar({ perfis, perfilSlug, onPerfil, aguardando, route, doctor, auth, onAccount, onNovoPerfil }: {
  perfis: Perfil[]; perfilSlug: string | null; onPerfil: (slug: string) => void; aguardando: number
  route: Route; doctor: Doctor | null; auth: Auth | null; onAccount: () => void; onNovoPerfil: () => void
}) {
  const sys = doctorText(doctor)
  const { setOpenMobile } = useSidebar()
  const links = [
    { to: { name: "fila" } as Route, icon: ListVideo, label: "Fila" },
    { to: { name: "revisao" } as Route, icon: ClipboardCheck, label: "Revisão", badge: aguardando },
    { to: { name: "estilos" } as Route, icon: Palette, label: "Estilos" },
    { to: { name: "config" } as Route, icon: Settings, label: "Configurações" },
  ]
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <a href="#/perfis" aria-label="AutoVideo" className="px-2 pt-1 font-serif text-2xl font-semibold tracking-tight">
          autovideo<span className="text-pink">.</span>
        </a>
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
            <DropdownMenuItem onSelect={() => { setOpenMobile(false); go({ name: "estilos" }) }}>Novo estilo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {links.map(({ to, icon: Icon, label, badge }) => {
              const active = route.name === to.name || (to.name === "estilos" && route.name === "estilo")
              return (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton asChild isActive={active}>
                    <a href={`#/${to.name}`} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                      <Icon />
                      <span>{label}</span>
                      {badge ? (
                        <span aria-label={`${badge} aguardando`} className="ml-auto rounded-full bg-pink px-1.5 font-mono text-[11px] leading-5 text-white">{badge}</span>
                      ) : null}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
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
          {sys.ok === false && <p className="mt-0.5 pl-4">Corrija e recarregue a página</p>}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
