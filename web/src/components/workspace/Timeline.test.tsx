import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Timeline } from "./Timeline"

describe("Timeline", () => {
  it("clicar num item pula o player para o tempo dele", async () => {
    const onSeek = vi.fn()
    render(<Timeline onSeek={onSeek} timeline={{ width: 1080, height: 1920,
      segments: [{ src: "a", in: 0, out: 30 }], zooms: [{ at: 12, dur: 1 }] }} />)
    expect(screen.getByText("00:30")).toBeTruthy()
    await userEvent.setup().click(screen.getByRole("button", { name: "Zoom punch em 00:12" }))
    expect(onSeek).toHaveBeenCalledWith(12)
  })
})
