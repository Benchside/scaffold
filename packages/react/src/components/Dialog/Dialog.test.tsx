import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Dialog } from "./Dialog";

function BasicDialog(props: Partial<React.ComponentProps<typeof Dialog>> = {}) {
  return (
    <Dialog {...props}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete run?</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Description>This cannot be undone.</Dialog.Description>
        <Dialog.Body>
          <input aria-label="Confirmation text" />
        </Dialog.Body>
        <Dialog.Footer>
          <button type="button">Cancel</button>
          <button type="button">Delete</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens the dialog with its content when the trigger is clicked", async () => {
    render(<BasicDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sets aria-modal=true on the dialog content", async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("wires the title to aria-labelledby on the content", async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId!)).toHaveTextContent("Delete run?");
  });

  it("wires the description to aria-describedby on the content", async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)).toHaveTextContent("This cannot be undone.");
  });

  // Escape-close, backdrop-click-close (and its closeOnOutsideClick=false
  // negative), the Tab focus-trap cycle, and focus returning to the trigger
  // after any close path are exercised in
  // `apps/docs/visual/dialog.visual.test.ts` (Playwright) instead of here.
  // zag-js's dismissable-layer registration and focus-trap's
  // visible-focusable-element lookup both need real layout
  // (`getBoundingClientRect`/`offsetWidth`), which jsdom reports as zero for
  // everything: `Tab` cannot reliably leave the content container, and
  // Escape/backdrop dismissal cannot close the dialog under jsdom.

  it("closes the dialog when the close trigger is clicked", async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("calls onOpenChange(true) when the trigger is clicked", async () => {
    const onOpenChange = vi.fn();
    render(<BasicDialog onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("supports role=alertdialog for confirmation-style dialogs", async () => {
    render(<BasicDialog role="alertdialog" />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("applies the size variant's width class to the content", async () => {
    render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toHaveClass("max-w-md");
  });

  it("lets a consumer className override the content's default background via tailwind-merge", async () => {
    render(
      <Dialog>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content className="bg-bg-subtle">
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("bg-bg-subtle");
    expect(dialog).not.toHaveClass("bg-bg-elevated");
  });

  it("accepts ref as a plain prop pointing at the content element", async () => {
    let node: HTMLDivElement | null = null;
    render(
      <Dialog defaultOpen>
        <Dialog.Content
          ref={(el) => {
            node = el;
          }}
        >
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    await screen.findByRole("dialog");
    expect(node).toBeInstanceOf(HTMLDivElement);
    expect(node).toBe(screen.getByRole("dialog"));
  });

  it("passes an axe scan with the dialog open", async () => {
    const { container } = render(<BasicDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect((await axe(container)).violations.length).toBe(0);
  });
});
