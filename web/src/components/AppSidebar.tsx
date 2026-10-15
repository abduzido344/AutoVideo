import { Plus } from "lucide-react"
import type { Doctor, Job } from "@/api"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar"
import { doctorText, projectName, statusInfo, TONE_TEXT } from "@/lib/format"
import type { Route } from "@/lib/route"
import { cn } from "@/lib/utils"

export function TopBar() {
  return (
    <header className="flex h-11 items-center gap-2 px-3">
      <SidebarTrigger aria-label="Abrir ou fechar o menu" />
    </header>
  )
}

export function AppSidebar({ jobs, route, doctor }: { jobs: Job[]; route: Route; doctor: Doctor | null }) {
  const sys = doctorText(doctor)
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="px-1 pt-1">
          <a href="#/" aria-label="AutoVideo — novo vídeo"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
          </a>
        </div>
        <a href="#/" className="mt-3 flex items-center justify-between rounded-xl border bg-background px-3 py-2.5 text-sm font-medium shadow-xs">
          <span className="flex items-center gap-2"><Plus className="size-4" />Novo vídeo</span>
          <kbd className="font-sans text-xs font-normal text-muted-foreground">Ctrl K</kbd>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projetos</SidebarGroupLabel>
          {jobs.length === 0 && <p className="px-2 text-sm text-muted-foreground">Nenhum vídeo ainda.</p>}
          <SidebarMenu>
            {jobs.map((j) => {
              const s = statusInfo(j)
              return (
                <SidebarMenuItem key={j.id}>
                  <SidebarMenuButton asChild isActive={route.name === "project" && route.id === j.id}>
                    <a href={`#/p/${j.id}`} onClick={() => setOpenMobile(false)} aria-current={route.name === "project" && route.id === j.id ? "page" : undefined}>
                      <span className="truncate">{projectName(j.project_dir)}</span>
                      <span className={cn("ml-auto shrink-0 text-xs", TONE_TEXT[s.tone])}>{s.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
