import { useState } from "react"
import { Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api, type Agenda, type PerfilDetalhe, type Rede } from "@/api"
import { FolhaPersonagem } from "@/components/FolhaPersonagem"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { go } from "@/lib/route"
import { usePoll } from "@/lib/usePoll"
import { Pagina, Secao } from "@/pages/Pagina"

const ABAS = [["series", "Séries"], ["ideias", "Banco de ideias"], ["universo", "Universo"], ["agenda", "Agenda"], ["contas", "Contas"]] as const
const STATUS: Record<string, string> = {
  queued: "Na fila", in_progress: "Em andamento", awaiting_approval: "Aguardando aprovação", completed: "Concluído", failed: "Falhou",
}
const REDES: [Rede, string][] = [["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook", "Facebook"]]
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const erro = (message: string) => (e: Error) => toast({ message, description: e.message, state: "error" })

function Series({ slug, d, refresh }: { slug: string; d: PerfilDetalhe; refresh: () => void }) {
  const pausar = (path_rel: string, paused: boolean) =>
    api.pausarSerie(path_rel, paused).then(refresh, erro(paused ? "Não consegui pausar a série" : "Não consegui continuar a série"))
  const [gerando, setGerando] = useState(false)
  const gerar = () => {
    setGerando(true)
    api.gerar(slug).then(
      () => toast({ message: "Episódio na fila", description: "Acompanhe o andamento na Fila.", state: "success" }),
      erro("Não consegui gerar o episódio")).finally(() => setGerando(false))
  }
  return (
    <div className="space-y-4">
      <Button disabled={gerando} onClick={gerar}>Gerar próximo episódio</Button>
      {d.series.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma série ainda. Aprove uma ideia para o Claude criar a primeira.</p>}
      {d.series.map(({ path_rel, serie, episodios }) => (
        <Card key={path_rel} className="gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">{serie.titulo}</h3>
            <Button variant="outline" size="sm" onClick={() => pausar(path_rel, !serie.paused)}>{serie.paused ? "Continuar série" : "Pausar série"}</Button>
          </div>
          {serie.logline && <p className="text-sm text-muted-foreground">{serie.logline}</p>}
          <ul className="space-y-1 text-sm">
            {episodios.map((ep) => (
              <li key={ep.n} className="flex items-center justify-between gap-2">
                <span>{ep.n}. {ep.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {ep.status ? STATUS[ep.status] ?? ep.status : "Planejado"}{ep.stage ? ` · ${ep.stage}` : ""}
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
  const mudar = (ativo: boolean) => {
    setBusy(true)
    api.salvarPerfil(slug, { ativo }).then(refresh, erro(ativo ? "Não consegui ativar o perfil" : "Não consegui pausar o perfil"))
      .finally(() => setBusy(false))
  }
  return (
    <label className="mb-6 flex w-fit items-center gap-3 text-sm">
      <Switch checked={d.perfil.ativo} disabled={busy} onCheckedChange={mudar} aria-label="Ativo" />
      Ativo: gera episódios sozinho nos horários da agenda
    </label>
  )
}

function AgendaForm({ slug, d }: { slug: string; d: PerfilDetalhe }) {
  const p = d.perfil
  const { data: estilos } = usePoll(api.estilos, 60000)
  const [a, setA] = useState({ gerar_as: p.agenda.gerar_as, por_dia: String(p.agenda.por_dia), postar_as: p.agenda.postar_as.join(", "), eps: String(p.agenda.episodios_por_serie) })
  const [voz, setVoz] = useState(p.voz_id)
  const [estilo, setEstilo] = useState(p.estilo)
  const set = (k: keyof typeof a) => (e: { target: { value: string } }) => setA((v) => ({ ...v, [k]: e.target.value }))

  function salvar() {
    const eps = Number(a.eps), porDia = Number(a.por_dia)
    if (!Number.isInteger(eps) || eps < 1 || eps > 10) return toast({ message: "Episódios por série: de 1 a 10", state: "error" })
    if (!Number.isInteger(porDia) || porDia < 1 || porDia > 5) return toast({ message: "Episódios por dia: de 1 a 5", state: "error" })
    const postar = a.postar_as.split(",").map((s) => s.trim()).filter(Boolean)
    if (!HORA.test(a.gerar_as)) return toast({ message: "Horário de gerar inválido", description: "Use HH:MM, por exemplo 03:00.", state: "error" })
    if (postar.length === 0 || !postar.every((h) => HORA.test(h))) return toast({ message: "Horários de postar inválidos", description: "Informe ao menos um, em HH:MM, separados por vírgula.", state: "error" })
    const agenda: Agenda = { gerar_as: a.gerar_as, por_dia: porDia, postar_as: postar, episodios_por_serie: eps }
    api.salvarPerfil(slug, { agenda, voz_id: voz, estilo }).then(() => toast({ message: "Agenda salva", state: "success" }), erro("Não consegui salvar a agenda"))
  }
  const lista = estilos ?? []
  return (
    <form noValidate className="grid max-w-md gap-3" onSubmit={(e) => { e.preventDefault(); salvar() }}>
      <label className="grid gap-1 text-sm">Gerar às<Input type="time" value={a.gerar_as} onChange={set("gerar_as")} /></label>
      <label className="grid gap-1 text-sm">Episódios por dia<Input type="number" min={1} max={5} value={a.por_dia} onChange={set("por_dia")} /></label>
      <label className="grid gap-1 text-sm">Postar às (horários separados por vírgula)<Input placeholder="09:00, 18:00" value={a.postar_as} onChange={set("postar_as")} /></label>
      <label className="grid gap-1 text-sm">Episódios por série<Input type="number" min={1} max={10} value={a.eps} onChange={set("eps")} /></label>
      <label className="grid gap-1 text-sm">Voz (voice_id)<Input value={voz} onChange={(e) => setVoz(e.target.value)} /></label>
      {/* ponytail: select nativo; trocar pelo Select do shadcn se precisar de busca */}
      <label className="grid gap-1 text-sm">Estilo
        <select className="h-10 w-full rounded-control border bg-background px-3 text-sm" value={estilo} onChange={(e) => setEstilo(e.target.value)}>
          {estilo && !lista.some((s) => s.slug === estilo) && <option value={estilo}>{estilo}</option>}
          {lista.map((s) => <option key={s.slug} value={s.slug}>{s.titulo}</option>)}
        </select>
      </label>
      <Button type="submit" className="w-fit">Salvar agenda</Button>
    </form>
  )
}

function Contas({ d }: { d: PerfilDetalhe }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Nesta versão você posta à mão: o painel só marca o episódio como postado.</p>
      {REDES.map(([r, nome]) => (
        <Card key={r} className="flex-row items-center justify-between gap-3 p-4">
          <div>
            <h3 className="font-medium">{nome}</h3>
            <p className="text-sm text-muted-foreground">{d.perfil.contas[r]?.conectada ? `Conectada (${d.perfil.contas[r].usuario})` : "Não conectada"}</p>
          </div>
          <Button variant="outline" disabled title="Chega numa próxima versão" aria-label={`Conectar ${nome}`}>Conectar</Button>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">Conectar contas chega numa próxima versão.</p>
    </div>
  )
}

export function Perfil({ slug, aba }: { slug: string; aba?: string }) {
  const { data, refresh } = usePoll(() => api.perfil(slug), 5000)
  const atual = ABAS.some(([k]) => k === aba) ? aba! : "series"
  return (
    <Pagina titulo={data?.perfil.nome ?? "Perfil"} sub={data?.perfil.assunto}>
      <Tabs value={atual} onValueChange={(v) => go({ name: "perfil", slug, aba: v })}>
        <TabsList className="mb-4 flex-wrap">
          {ABAS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}
        </TabsList>
        {data ? (
          <>
            <TabsContent value="series"><Series slug={slug} d={data} refresh={refresh} /></TabsContent>
            <TabsContent value="ideias"><Ideias slug={slug} d={data} refresh={refresh} /></TabsContent>
            <TabsContent value="universo"><Universo slug={slug} d={data} refresh={refresh} /></TabsContent>
            <TabsContent value="agenda"><Ativo slug={slug} d={data} refresh={refresh} /><AgendaForm slug={slug} d={data} /></TabsContent>
            <TabsContent value="contas"><Contas d={data} /></TabsContent>
          </>
        ) : <p className="text-sm text-muted-foreground">Carregando…</p>}
      </Tabs>
    </Pagina>
  )
}
