import { CalendarClock, Clapperboard, Globe, Lightbulb, ListChecks, ListVideo, Palette, Settings, UserRound, UsersRound } from "lucide-react"

// cor de cada seção: quadradinho do cabeçalho e ícone da sidebar (tokens --sec-* do index.css)
export const COR = {
  producao: { caixa: "bg-sec-producao/12 text-sec-producao", icone: "text-sec-producao" },
  perfil: { caixa: "bg-sec-perfil/12 text-sec-perfil", icone: "text-sec-perfil" },
  estilos: { caixa: "bg-sec-estilos/12 text-sec-estilos", icone: "text-sec-estilos" },
  config: { caixa: "bg-sec-config/12 text-sec-config", icone: "text-sec-config" },
} as const

export const ICONE = { producao: ListVideo, perfis: UsersRound, perfil: UserRound, onboarding: ListChecks, estilos: Palette, config: Settings }

// abas do perfil: viram itens da sidebar e abas do cabeçalho
export const ABAS_PERFIL = [
  { aba: "series", label: "Séries", icon: Clapperboard },
  { aba: "ideias", label: "Ideias", icon: Lightbulb },
  { aba: "universo", label: "Universo", icon: Globe },
  { aba: "agenda", label: "Agenda e voz", icon: CalendarClock },
] as const
