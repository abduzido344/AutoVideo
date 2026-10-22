import { useState } from "react"
import { Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api, type Agenda, type PerfilDetalhe } from "@/api"
import { FolhaPersonagem } from "@/components/FolhaPersonagem"
import { ABAS_PERFIL, COR } from "@/components/secoes"
import { SeletorVoz } from "@/components/SeletorVoz"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ETAPAS, STATUS } from "@/lib/etapas"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const erro = (message: string) => (e: Error) => toast({ message, description: e.message, state: "error" })

function Gerar({ slug }: { slug: string }) {
  const [gerando, setGerando] = useState(false)
  const gerar = () => {
    if (gerando) return
    setGerando(true)
    api.gerar(slug).then(
      () => toast({ message: "Episódio na fila", description: "Acompanhe o andamento em Produção.", state: "success" }),
      erro("Não consegui gerar o episódio")).finally(() => setGerando(false))
  }
  return <Button disabled={gerando} onClick={gerar}>Gerar próximo episódio</Button>
}

function Series({ d, refresh }: { d: PerfilDetalhe; refresh: () => void }) {
  const [busy, setBusy] = useState(false)
  const pausar = (path_rel: string, paused: boolean) => {
    if (busy) return
    setBusy(true)
    api.pausarSerie(path_rel, paused).then(refresh, erro(paused ? "Não consegui pausar a série" : "Não consegui continuar a série"))
      .finally(() => setBusy(false))
  }
  return (
    <div className="space-y-4">
      {d.series.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma série ainda. Aprove uma ideia para o Claude criar a primeira.</p>}
      {d.series.map(({ path_rel, serie, episodios }) => (
        <Card key={path_rel} className="gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium"><button type="button" className="text-left hover:underline" onClick={() => go({ name: "serie", path_rel })}>{serie.titulo}</button></h3>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => pausar(path_rel, !serie.paused)}>{serie.paused ? "Continuar série" : "Pausar série"}</Button>
          </div>
          {serie.logline && <p className="text-sm text-muted-foreground">{serie.logline}</p>}
          <ul className="space-y-1 text-sm">
            {episodios.map((ep) => (
              <li key={ep.n} className="flex items-center justify-between gap-2">
                <span>{ep.n}. {ep.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {ep.status ? STATUS[ep.status] ?? ep.status : "Planejado"}{ep.stage ? ` · ${ETAPAS.find(([k]) => k === ep.stage)?.[1] ?? ep.stage}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function Ideias({ slug, d, refresh }: { slug: string; d: PerfilDetalhe; refresh: () => void }) {
  const [texto, setTexto] = useState("")
  const add = () => { const t = texto.trim(); if (t) api.addIdeia(slug, t).then(() => { setTexto(""); refresh() }, erro("Não consegui adicionar a ideia")) }
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
        <Input aria-label="Nova ideia" placeholder="Uma ideia de série ou episódio" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Button type="submit" disabled={!texto.trim()}>Adicionar</Button>
      </form>
      {d.ideias.length === 0 && <p className="text-sm text-muted-foreground">O banco está vazio.</p>}
      <ul className="space-y-2">
        {d.ideias.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <span className="flex-1">{i.texto}</span>
            <span className="text-xs text-muted-foreground">{i.origem === "claude" ? "do Claude" : "sua"}{i.usada ? " · usada" : ""}</span>
            <Button variant="ghost" size="icon" aria-label={`Remover ${i.texto}`}
              onClick={() => api.delIdeia(slug, i.id).then(refresh, erro("Não consegui remover a ideia"))}><Trash2 className="size-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Universo({ slug, d, refresh }: { slug: string; d: PerfilDetalhe; refresh: () => void }) {
  const [mundo, setMundo] = useState(d.universo.mundo)
  return (
    <div>
      <Secao>Mundo</Secao>
      <Textarea aria-label="Mundo" rows={10} value={mundo} onChange={(e) => setMundo(e.target.value)} />
      <Button className="mt-2" onClick={() => api.salvarMundo(slug, mundo).then(() => toast({ message: "Mundo salvo", state: "success" }), erro("Não consegui salvar o mundo"))}>Salvar mundo</Button>
      <Secao>Histórico</Secao>
      {d.universo.historico.trim()
        ? <div className="text-sm"><ReactMarkdown>{d.universo.historico}</ReactMarkdown></div>
        : <p className="text-sm text-muted-foreground">O histórico cresce a cada episódio aprovado.</p>}
      <Secao>Fichas</Secao>
      <div className="space-y-3">
        {d.personagens.map((p) => <FolhaPersonagem key={p.slug} perfil={slug} personagem={p} onChange={refresh} />)}
        {d.personagens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum personagem ainda.</p>}
      </div>
    </div>
  )
}

function Ativo({ slug, d, refresh }: { slug: string; d: PerfilDetalhe; refresh: () => void }) {
  const [busy, setBusy] = useState(false)
  // o servidor recusa (409) ativar perfil sem estilo válido ou com folha de personagem não aprovada
  // o Switch é controlado por d.perfil.ativo: se falhar, o refresh devolve o valor real
  const mudar = (ativo: boolean) => {
    if (busy) return
    setBusy(true)
    api.salvarPerfil(slug, { ativo }).then(refresh, (e: Error) => { erro(ativo ? "Não consegui ativar o perfil" : "Não consegui pausar o perfil")(e); refresh() })
      .finally(() => setBusy(false))
  }
  return (
    <label title="Gera episódios sozinho nos horários da agenda" className="flex items-center gap-2 text-sm">
      <Switch checked={d.perfil.ativo} disabled={busy} onCheckedChange={mudar} aria-label="Ativo" />
      Ativo
    </label>
  )
}

function AgendaForm({ slug, d, refresh }: { slug: string; d: PerfilDetalhe; refresh: () => void }) {
  const p = d.perfil
  const { data: estilos } = usePoll(api.estilos, 60000)
  const [a, setA] = useState({ gerar_as: p.agenda.gerar_as, por_dia: String(p.agenda.por_dia), postar_as: p.agenda.postar_as.join(", "), eps: String(p.agenda.episodios_por_serie) })
  const [estilo, setEstilo] = useState(p.estilo)
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof a) => (e: { target: { value: string } }) => setA((v) => ({ ...v, [k]: e.target.value }))

  function salvar() {
    const eps = Number(a.eps), porDia = Number(a.por_dia)
    if (!Number.isInteger(eps) || eps < 1 || eps > 10) return toast({ message: "Episódios por série: de 1 a 10", state: "error" })
    if (!Number.isInteger(porDia) || porDia < 1 || porDia > 5) return toast({ message: "Episódios por dia: de 1 a 5", state: "error" })
    const postar = a.postar_as.split(",").map((s) => s.trim()).filter(Boolean)
    if (!HORA.test(a.gerar_as)) return toast({ message: "Horário de gerar inválido", description: "Use HH:MM, por exemplo 03:00.", state: "error" })
    if (postar.length === 0 || !postar.every((h) => HORA.test(h))) return toast({ message: "Horários de postar inválidos", description: "Informe ao menos um, em HH:MM, separados por vírgula.", state: "error" })
    const agenda: Agenda = { gerar_as: a.gerar_as, por_dia: porDia, postar_as: postar, episodios_por_serie: eps }
    if (salvando) return
    setSalvando(true)
    api.salvarPerfil(slug, { agenda, estilo }).then(() => toast({ message: "Agenda salva", state: "success" }), erro("Não consegui salvar a agenda"))
      .finally(() => setSalvando(false))
  }
  const lista = estilos ?? []
  return (
    <form noValidate className="grid max-w-md gap-3" onSubmit={(e) => { e.preventDefault(); salvar() }}>
      <label className="grid gap-1 text-sm">Gerar às<Input type="time" value={a.gerar_as} onChange={set("gerar_as")} /></label>
      <label className="grid gap-1 text-sm">Episódios por dia<Input type="number" min={1} max={5} value={a.por_dia} onChange={set("por_dia")} /></label>
      <label className="grid gap-1 text-sm">Postar às (horários separados por vírgula)<Input placeholder="09:00, 18:00" value={a.postar_as} onChange={set("postar_as")} /></label>
      <label className="grid gap-1 text-sm">Episódios por série<Input type="number" min={1} max={10} value={a.eps} onChange={set("eps")} /></label>
      <SeletorVoz slug={slug} vozId={p.voz_id} onSaved={refresh} />
      {/* ponytail: select nativo; trocar pelo Select do shadcn se precisar de busca */}
      <label className="grid gap-1 text-sm">Estilo
        <select className="h-10 w-full rounded-control border bg-background px-3 text-sm" value={estilo} onChange={(e) => setEstilo(e.target.value)}>
          {estilo && !lista.some((s) => s.slug === estilo) && <option value={estilo}>{estilo}</option>}
          {lista.map((s) => <option key={s.slug} value={s.slug}>{s.titulo}</option>)}
        </select>
      </label>
      <Button type="submit" className="w-fit" disabled={salvando}>Salvar agenda</Button>
    </form>
  )
}

export function Perfil({ slug, aba }: { slug: string; aba?: string }) {
  const { data, error, refresh } = usePoll(() => api.perfil(slug), 5000)
  const sec = ABAS_PERFIL.find((a) => a.aba === aba) ?? ABAS_PERFIL[0]
  const atual = sec.aba
  // as seções já estão na sidebar: o título é a seção, e o perfil vai no subtítulo
  const sub = data && [data.perfil.nome, data.perfil.assunto].filter(Boolean).join(" · ")
  return (
    <Pagina titulo={sec.label} icone={sec.icon} cor={COR.perfil.caixa} sub={sub || undefined}
      acoes={data && <><Ativo slug={slug} d={data} refresh={refresh} /><Gerar slug={slug} /></>}>
      {!data ? <p className="text-sm text-muted-foreground">{error ? "Não encontrei este perfil ou não consegui carregá-lo." : "Carregando…"}</p>
        : atual === "series" ? <Series d={data} refresh={refresh} />
        : atual === "ideias" ? <Ideias slug={slug} d={data} refresh={refresh} />
        : atual === "universo" ? <Universo slug={slug} d={data} refresh={refresh} />
        : <AgendaForm slug={slug} d={data} refresh={refresh} />}
    </Pagina>
  )
}
