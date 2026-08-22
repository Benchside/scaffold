import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Tooltip } from "./Tooltip";

function BasicTooltip(props: Partial<React.ComponentProps<typeof Tooltip>> = {}) {
  return (
    <Tooltip {...props}>
      <Tooltip.Trigger>Info</Tooltip.Trigger>
      <Tooltip.Content>Runs must be calibrated first.</Tooltip.Content>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("does not render its content until opened", () => {
    render(<BasicTooltip />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip on focus and wires it to the trigger via aria-describedby", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);
    await user.tab();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Runs must be calibrated first.");
    expect(screen.getByRole("button", { name: "Info" })).toHaveAttribute(
      "aria-describedby",
      tooltip.id,
    );
  });

  it("hides the tooltip on blur", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <BasicTooltip />
        <button type="button">Elsewhere</button>
      </div>,
    );
    await user.tab();
    await screen.findByRole("tooltip");
    await user.tab();
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("hides the tooltip when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);
    await user.tab();
    await screen.findByRole("tooltip");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("does not show the tooltip immediately on hover, only after the delay", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);
    await user.hover(screen.getByRole("button", { name: "Info" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("passes an axe scan while open", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);
    await user.tab();
    await screen.findByRole("tooltip");
    expect((await axe(container)).violations.length).toBe(0);
  });
});
