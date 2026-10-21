import type { Doctor } from "@/api"

export function doctorText(d: Doctor | null): { ok: boolean | null; text: string } {
  if (!d) return { ok: null, text: "Verificando o sistema…" }
  const bad = d.checks.find((c) => !c.ok)
  if (!bad) return { ok: true, text: "Tudo pronto" }
  return { ok: false, text: `Falta: ${bad.name}${bad.detail ? ` — ${bad.detail}` : ""}` }
}
