import type { Doctor } from "@/api"

export function NewVideo(_: { doctor: Doctor | null; onCreated: (id: number) => void }) {
  return <p className="p-8 text-sm text-muted-foreground">Novo vídeo</p>
}
