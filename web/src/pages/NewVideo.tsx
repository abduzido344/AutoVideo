import { ArrowUp, ChevronDown, FileText, Paperclip, Play, Plus, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api, type Doctor, type RecipeInfo } from "@/api"
import { StatusPill } from "@/components/StatusPill"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { type Attachments, buildForm, classify, EMPTY, removeFile } from "@/lib/compose-form"
import { cn } from "@/lib/utils"

const KIND = { video: "gravação", script: "roteiro", asset: "asset" } as const

export function NewVideo({ doctor, onCreated }: { doctor: Doctor | null; onCreated: (id: number) => void }) {
  const [recipes, setRecipes] = useState<RecipeInfo[]>([])
  const [recipe, setRecipe] = useState("talking-head-punchy")
  const [att, setAtt] = useState<Attachments>(EMPTY)
  const [text, setText] = useState("")
  const [approve, setApprove] = useState(true)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { api.recipeInfo().then(setRecipes, (e: Error) => toast.error(e.message)) }, [])
  const r = recipes.find((x) => x.id === recipe)
  const files = [
    ...att.videos.map((f) => ({ f, kind: "video" as const })),
    ...(att.script ? [{ f: att.script, kind: "script" as const }] : []),
    ...att.assets.map((f) => ({ f, kind: "asset" as const })),
  ]

  async function send() {
    setBusy(true)
    try {
      const { id } = await api.create(await buildForm(att, text, recipe, approve))
      setAtt(EMPTY)
      setText("")
      onCreated(id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-5">
      <StatusPill doctor={doctor} />
      <div className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-7 py-8">
        <h1 className="text-center text-5xl font-extrabold tracking-[-0.04em] md:text-6xl">AUTOVIDEO</h1>

        <div>
          <div className="relative z-10 grid gap-3 rounded-[22px] border border-input bg-background p-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.06)]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setAtt((a) => classify([...e.dataTransfer.files], a)) }}>
            {files.length > 0 && (
              <ul aria-label="Anexos" className="flex flex-wrap gap-2">
                {files.map(({ f, kind }, i) => (
                  <li key={`${kind}-${f.name}-${i}`} className="flex items-center gap-2.5 rounded-xl border bg-muted py-1.5 pl-1.5 pr-1">
                    <span aria-hidden="true" className="flex h-11 w-8 items-center justify-center rounded-md bg-[#DADADA] text-white">
                      {kind === "video" ? <Play className="size-3 fill-current" /> : kind === "script" ? <FileText className="size-3.5" /> : <Paperclip className="size-3.5" />}
                    </span>
                    <span className="grid">
                      <span className="text-[13px] font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{KIND[kind]}</span>
                    </span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${f.name}`}
                      onClick={() => setAtt((a) => removeFile(a, f))}><X className="size-3" /></Button>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="pedido" className="sr-only">Roteiro ou pedido</label>
            <textarea id="pedido" rows={2} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Cole o roteiro ou diga o que quer — “reels de 45 s, hook forte, legenda grande”"
              className="w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-1.5">
              <input ref={input} type="file" multiple hidden
                onChange={(e) => { const fs = [...(e.target.files ?? [])]; setAtt((a) => classify(fs, a)); e.target.value = "" }} />
              <Button type="button" variant="ghost" size="icon" aria-label="Adicionar gravações, roteiro ou assets"
                onClick={() => input.current?.click()}><Plus className="size-5" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="rounded-full">
                    {r?.title ?? recipe}<ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {recipes.map((x) => (
                    <DropdownMenuItem key={x.id} onSelect={() => setRecipe(x.id)}>
                      {x.title}<span className="ml-auto pl-4 text-xs text-muted-foreground">{x.aspect}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {r && <span className="rounded-full border border-input px-3 py-1 font-mono text-xs">{r.aspect}</span>}
              <span className="flex-1" />
              <label className="flex items-center gap-2 text-[13px]">
                Aprovar etapas <Switch checked={approve} onCheckedChange={setApprove} />
              </label>
              <Button type="button" size="icon" className="ml-1.5 rounded-full" aria-label="Criar vídeo"
                disabled={busy || att.videos.length === 0} onClick={send}><ArrowUp className="size-4" /></Button>
            </div>
          </div>
          {r && (
            <div className="mx-4 -mt-2.5 flex flex-wrap gap-5 rounded-b-2xl bg-muted px-4 pb-2.5 pt-5 text-[13px] text-muted-foreground">
              <span>Legenda <b className="font-medium text-foreground">{r.captions.enabled ? r.captions.component : "sem legenda"}</b></span>
              <span>Pausa máx. <b className="font-medium text-foreground">{String(r.pacing.max_gap).replace(".", ",")} s</b></span>
              <span>Áudio <b className="font-medium text-foreground">{r.audio.lufs} LUFS</b></span>
            </div>
          )}
        </div>

        <div role="group" aria-label="Receitas" className="flex flex-wrap justify-center gap-2">
          {recipes.map((x) => (
            <Button key={x.id} type="button" variant="outline" aria-pressed={x.id === recipe}
              className={cn("rounded-full font-normal", x.id === recipe && "border-foreground")}
              onClick={() => setRecipe(x.id)}>{x.title}</Button>
          ))}
        </div>
      </div>
    </div>
  )
}
