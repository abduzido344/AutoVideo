import type { HTMLAttributes } from "react"
import Markdown from "react-markdown"
import type { JobDetail } from "@/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { money } from "@/lib/format"

const TAB = "rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 font-normal text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
// react-markdown passa `node` para componentes customizados: não pode ir para o DOM
type MdProps = { node?: unknown } & HTMLAttributes<HTMLElement>
const md = (Tag: "h3" | "p" | "ul" | "ol", className: string) =>
  ({ node: _node, ...p }: MdProps) => <Tag className={className} {...p} />
const H = "mt-3 text-[13px] font-semibold first:mt-0"
const MD = {
  h1: md("h3", H), h2: md("h3", H), h3: md("h3", H),
  p: md("p", "mt-1 leading-relaxed text-[#3A3A3A]"),
  ul: md("ul", "mt-1 list-disc space-y-1 pl-4 text-[#3A3A3A]"),
  ol: md("ol", "mt-1 list-decimal space-y-1 pl-4 text-[#3A3A3A]"),
  // brief vem de LLM: links abrem fora do painel e imagens remotas nunca são buscadas
  a: ({ node: _node, ...p }: MdProps & { href?: string }) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-info underline" />,
  img: () => null,
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function DetailTabs({ job }: { job: JobDetail }) {
  const f = job.files
  const final = f.has_final
  const issues = f.review?.issues_restantes ?? []
  return (
    <Tabs key={final ? "final" : "draft"} defaultValue={final ? "review" : "brief"} className="min-h-0">
      <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0">
        {final
          ? <><TabsTrigger value="review" className={TAB}>Revisão</TabsTrigger><TabsTrigger value="post" className={TAB}>Post</TabsTrigger></>
          : <><TabsTrigger value="brief" className={TAB}>Brief</TabsTrigger><TabsTrigger value="script" className={TAB}>Roteiro × fala</TabsTrigger></>}
        <TabsTrigger value="agents" className={TAB}>Agentes</TabsTrigger>
      </TabsList>

      <TabsContent value="brief" className="max-h-[52vh] overflow-auto pt-3 text-sm">
        {f.brief ? <Markdown components={MD}>{f.brief}</Markdown> : <Empty>O diretor ainda não escreveu o brief.</Empty>}
      </TabsContent>
      <TabsContent value="script" className="grid max-h-[52vh] gap-4 overflow-auto pt-3 text-sm">
        <div><h3 className="text-[13px] font-semibold">Roteiro</h3>
          <p className="mt-1 whitespace-pre-wrap text-[#3A3A3A]">{f.script ?? "Sem roteiro — o diretor usa só a fala."}</p></div>
        <div><h3 className="text-[13px] font-semibold">Fala transcrita</h3>
          <p className="mt-1 text-[#3A3A3A]">{f.transcript ? f.transcript.words.map((w) => w.text).join(" ") : "—"}</p></div>
      </TabsContent>
      <TabsContent value="review" className="grid gap-3 pt-3 text-sm">
        <dl className="grid grid-cols-3 gap-2">
          {[["Loudness", f.review?.lufs != null ? f.review.lufs.toFixed(1).replace(".", ",") : "—"],
            ["Cortes", String(f.timeline?.segments.length ?? "—")],
            ["Avisos", String(issues.length)]].map(([k, v]) => (
            <div key={k} className="grid gap-0.5 rounded-xl bg-muted px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tracking-tight">{v}</dd>
            </div>
          ))}
        </dl>
        {issues.length > 0
          ? <ul className="grid gap-1.5">{issues.map((x, i) => <li key={i} className="text-[13px] text-[#3A3A3A]">{x.message ?? x.code}</li>)}</ul>
          : <Empty>Nenhum aviso restante na revisão automática.</Empty>}
      </TabsContent>
      <TabsContent value="post" className="grid gap-2 pt-3 text-sm">
        {f.post ? <>
          <p className="font-semibold">{f.post.title}</p>
          <p className="whitespace-pre-wrap text-[#3A3A3A]">{f.post.caption}</p>
          <p className="text-info">{f.post.hashtags.join(" ")}</p>
        </> : <Empty>O post é gerado depois que você aprova o corte.</Empty>}
      </TabsContent>
      <TabsContent value="agents" className="max-h-[52vh] overflow-auto pt-3">
        {f.decisions.length === 0 ? <Empty>Nenhum agente rodou ainda.</Empty> : (
          <ul className="grid gap-2">
            {f.decisions.map((d, i) => {
              const text = d.beats_error ?? d.validation_error ?? d.result
              return (
                <li key={i} className="grid gap-0.5 rounded-xl border p-2.5 text-[13px]">
                  <span className="flex gap-2">
                    <b className="font-medium capitalize">{d.role ?? d.stage ?? "sistema"}</b>
                    {d.attempt !== undefined && <span className="text-muted-foreground">tentativa {d.attempt}</span>}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{money(d.cost_usd ?? 0)}</span>
                  </span>
                  {text && <span className="line-clamp-3 text-muted-foreground">{text}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}
