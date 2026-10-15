import type { Word } from "@/api"

export type Token = { text: string; cut: boolean; start: number }

// fillers = sugestões da análise; pausa maior que gapS aparece como "silêncio N s" (também sai no corte)
export function tokens(t: { words: Word[]; fillers: number[] }, gapS = 1.0): Token[] {
  const fillers = new Set(t.fillers)
  const out: Token[] = []
  t.words.forEach((w, i) => {
    const prev = t.words[i - 1]
    if (prev && w.start - prev.end > gapS) {
      out.push({ text: `silêncio ${(w.start - prev.end).toFixed(1).replace(".", ",")} s`, cut: true, start: prev.end })
    }
    out.push({ text: w.text, cut: fillers.has(i), start: w.start })
  })
  return out
}
