export function Workspace({ id }: { id: number; stages: string[]; onChange: () => void }) {
  return <p className="p-8 text-sm text-muted-foreground">Projeto #{id}</p>
}
