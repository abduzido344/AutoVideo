import { Fragment } from "react"
import type { TimelineJSON } from "@/api"
import { clock } from "@/lib/format"
import { duration, type Track, timelineTracks } from "@/lib/tracks"
import { cn } from "@/lib/utils"

const STYLE: Record<Track["key"], string> = {
  video: "border-[#DCDCDC] bg-[#EDEDED] text-[#4A4A4A]",
  zoom: "border-[#C7D8FF] bg-[#E8F0FF] text-[#2F5BD3]",
  overlay: "border-[#DCCFFF] bg-[#F1EBFF] text-[#6941C6]",
  captions: "border-[#F5E3A3] bg-[#FFF6D6] text-[#8A6A00]",
  music: "border-[#BFE6D2] bg-[#E5F6EE] text-[#1E7A50]",
  sfx: "border-[#FFD2BF] bg-[#FFEDE5] text-[#B5451B]",
}

// onSeek só existe quando o player mostra o vídeo final: o eixo da timeline é o de saída, não o da fonte
export function Timeline({ timeline, onSeek }: { timeline: TimelineJSON; onSeek?: (t: number) => void }) {
  const T = duration(timeline)
  return (
    <section aria-label="Timeline" className="grid gap-2 rounded-2xl border p-3.5">
      <div className="flex items-center gap-3">
        <div className="grid gap-0.5">
          <h2 className="text-sm font-semibold">Timeline</h2>
          {!onSeek && <p className="text-xs text-muted-foreground">Prévia sem cortes — a timeline fica clicável depois do render.</p>}
        </div>
        {onSeek && <span className="text-xs text-muted-foreground">clique num item para pular até ele</span>}
        <span className="flex-1" />
        <span className="font-mono text-xs text-muted-foreground">{clock(T)}</span>
      </div>
      <div className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
        {timelineTracks(timeline).map((t) => (
          <Fragment key={t.key}>
            <span className="text-xs text-muted-foreground">{t.name}</span>
            <div className="relative h-5 rounded-md bg-muted">
              {t.clips.map((c, i) => {
                const name = `${t.name}${c.label ? ` ${c.label}` : ""} em ${clock(c.at)}`
                const base = cn("absolute inset-y-0.5 overflow-hidden whitespace-nowrap rounded border px-1 text-left text-[10px] font-medium", STYLE[t.key])
                const style = { left: `${c.left}%`, width: `${c.width}%` }
                return onSeek
                  ? <button key={i} type="button" onClick={() => onSeek(c.at)} aria-label={name}
                      className={cn(base, "focus-visible:z-10")} style={style}>{c.label}</button>
                  : <div key={i} title={name} className={base} style={style}>{c.label}</div>
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
