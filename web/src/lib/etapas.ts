// mesma ordem do episode.STAGES do servidor
export const ETAPAS: [string, string][] = [
  ["roteiro", "Roteiro"], ["cenas", "Cenas"], ["voz", "Voz"], ["imagens", "Imagens"], ["sfx", "Sons"],
  ["montagem", "Montagem"], ["render", "Render"], ["revisao", "Revisão"], ["aprovacao", "Aprovação"],
]

export const STATUS: Record<string, string> = {
  queued: "Na fila", in_progress: "Em andamento", awaiting_approval: "Aguardando aprovação", completed: "Concluído", failed: "Falhou",
}
export const usd = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
