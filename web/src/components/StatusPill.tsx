import type { Doctor } from "@/api"
import { doctorText } from "@/lib/format"
import { cn } from "@/lib/utils"

export function StatusPill({ doctor }: { doctor: Doctor | null }) {
  const t = doctorText(doctor)
  return (
    <p role="status" className={cn("flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]",
      t.ok === false ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info")}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full",
        t.ok === null ? "bg-info/40" : t.ok ? "bg-success" : "bg-destructive")} />
      {t.text}
    </p>
  )
}
