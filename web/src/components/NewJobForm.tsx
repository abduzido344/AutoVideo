import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function NewJobForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [recipes, setRecipes] = useState<string[]>([])
  const [recipe, setRecipe] = useState("talking-head-punchy")
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.recipes().then(setRecipes).catch((e: Error) => toast.error(e.message)) }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget // currentTarget vira null depois do primeiro await
    const fd = new FormData(form)
    fd.set("recipe", recipe)
    fd.set("auto", fd.get("auto") ? "true" : "false")
    if (!(fd.get("script") as File | null)?.size) fd.delete("script")
    const assets = fd.getAll("assets").filter((f) => (f as File).size) // sem arquivo o browser manda uma parte vazia
    fd.delete("assets")
    assets.forEach((f) => fd.append("assets", f))
    setBusy(true)
    try {
      const { id } = await api.create(fd)
      form.reset()
      onCreated(id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Novo vídeo</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2"><Label htmlFor="videos">Gravações</Label>
            <Input id="videos" name="videos" type="file" accept="video/*" multiple required /></div>
          <div className="grid gap-2"><Label htmlFor="script">Roteiro (opcional)</Label>
            <Input id="script" name="script" type="file" accept=".md,.txt" /></div>
          <div className="grid gap-2"><Label htmlFor="assets">B-roll, música, sfx (opcional)</Label>
            <Input id="assets" name="assets" type="file" multiple /></div>
          <div className="grid gap-2"><Label htmlFor="recipe">Receita</Label>
            <Select value={recipe} onValueChange={setRecipe}>
              <SelectTrigger id="recipe" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{recipes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select></div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="auto" className="accent-primary" /> 100% automático (sem aprovação)</label>
          <Button disabled={busy}>{busy ? "Enviando…" : "Criar"}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
