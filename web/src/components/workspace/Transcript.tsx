import type { Word } from "@/api"
import { tokens } from "@/lib/transcript"

export function Transcript({ transcript }: { transcript: { words: Word[]; fillers: number[] } }) {
  return (
    <section aria-label="Transcrição" className="grid gap-2 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">Transcrição</h2>
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-sm border border-[#F6C7C2] bg-[#FDECEA]" />provável corte
        </span>
      </div>
      <p className="text-[15px] leading-7 text-[#3A3A3A]">
        {tokens(transcript).map((t, i) => t.cut
          ? <del key={i} className="mx-0.5 rounded bg-[#FDECEA] px-1 text-[#A8322A]">{t.text}</del>
          : <span key={i}>{t.text} </span>)}
      </p>
    </section>
  )
}
