import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StageBar } from "./StageBar"

const stages = ["ingest", "clean", "director", "gate1", "copywriter"]

describe("StageBar", () => {
  it("marca feito, atual e futuro e escreve a etapa", () => {
    const { container } = render(<StageBar stages={stages} job={{ status: "awaiting_approval", stage: "gate1" }} />)
    const states = [...container.querySelectorAll("[data-state]")].map((e) => e.getAttribute("data-state"))
    expect(states).toEqual(["done", "done", "done", "current", "todo"])
    expect(screen.getByText("Aprovar o brief")).toBeTruthy()
    expect(container.textContent).toContain("Etapa 4 de 5")
  })
  it("concluído", () => {
    render(<StageBar stages={stages} job={{ status: "completed", stage: "post" }} />)
    expect(screen.getByText("Concluído")).toBeTruthy()
  })
})
