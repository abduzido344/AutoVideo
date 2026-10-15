import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { JobDetail } from "@/api"
import { DetailTabs } from "./DetailTabs"

const job = (decisions: JobDetail["files"]["decisions"]): JobDetail => ({
  id: 3, project_dir: "/p/x", recipe: "r", auto: 0, status: "awaiting_approval", stage: "gate1",
  error: "", created: 0, updated: 1, rel: "x",
  files: { brief: "# Título\n\ntexto **forte**", post: null, has_final: false, decisions, preview: null, aspect: null,
    transcript: null, timeline: null, review: null, script: null },
})

describe("DetailTabs", () => {
  it("renderiza o brief em markdown", () => {
    render(<DetailTabs job={job([])} />)
    expect(screen.getByText("Título")).toBeTruthy()
    expect(screen.getByText("forte").tagName).toBe("STRONG")
  })
  it("Agentes aceita linhas sem role e mostra o erro no lugar do resultado", async () => {
    const user = userEvent.setup()
    render(<DetailTabs job={job([
      { ts: 1, stage: "director", beats_error: "beats inválidos", result: "ignorado" },
      { ts: 2, review_round: 1 },
      { ts: 3, role: "designer", cost_usd: 0.5, result: "ok" },
    ])} />)
    await user.click(screen.getByRole("tab", { name: "Agentes" }))
    expect(screen.getByText("director")).toBeTruthy()
    expect(screen.getByText("sistema")).toBeTruthy()
    expect(screen.getByText("beats inválidos")).toBeTruthy()
    expect(screen.queryByText("ignorado")).toBeNull()
    expect(screen.getByText("ok")).toBeTruthy()
  })
})
