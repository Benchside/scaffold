import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Menu } from "./Menu";

function BasicMenu(props: Partial<React.ComponentProps<typeof Menu>> = {}) {
  return (
    <Menu {...props}>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Item value="rename">Rename</Menu.Item>
        <Menu.Item value="duplicate">Duplicate</Menu.Item>
        <Menu.Item value="archive" disabled>
          Archive
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item value="delete" destructive>
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

describe("Menu", () => {
  it("renders a trigger button with aria-haspopup=menu", () => {
    render(<BasicMenu />);
    expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("opens the menu with its items when the trigger is clicked", async () => {
    render(<BasicMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  });

  it("calls onSelect with the item value and closes the menu", async () => {
    const onSelect = vi.fn();
    render(<BasicMenu onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onSelect).toHaveBeenCalledWith("rename");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("does not select a disabled item and leaves onSelect uncalled", async () => {
    const onSelect = vi.fn();
    render(<BasicMenu onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    const archiveItem = screen.getByRole("menuitem", { name: "Archive" });
    expect(archiveItem).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(archiveItem);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("supports a full keyboard flow: open, navigate, select", async () => {
    const onSelect = vi.fn();
    render(<BasicMenu onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    // Opening highlights the first item ("rename") automatically, so one
    // ArrowDown moves the highlight on to "duplicate".
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("duplicate");
  });

  it("returns focus to the trigger after selecting an item", async () => {
    render(<BasicMenu />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("opens via the context trigger on right-click", async () => {
    render(
      <Menu>
        <Menu.ContextTrigger>
          <div>Right click me</div>
        </Menu.ContextTrigger>
        <Menu.Content>
          <Menu.Item value="a">A</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    fireEvent.contextMenu(screen.getByText("Right click me"), { clientX: 20, clientY: 40 });
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
  });

  it("groups items under a labeled section", async () => {
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.ItemGroup label="Edit">
            <Menu.Item value="rename">Rename</Menu.Item>
          </Menu.ItemGroup>
        </Menu.Content>
      </Menu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("group", { name: "Edit" })).toBeInTheDocument();
  });

  it("applies destructive styling to a destructive item", async () => {
    render(<BasicMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveClass("text-status-error");
  });

  it("renders an icon and a shortcut hint on an item", async () => {
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item value="rename" icon={<span data-testid="icon" />} shortcut="⌘R">
            Rename
          </Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("⌘R")).toBeInTheDocument();
  });

  it("lets a consumer className override the trigger's default border via tailwind-merge", async () => {
    render(
      <Menu>
        <Menu.Trigger className="border-status-error">Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item value="a">A</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveClass("border-status-error");
    expect(trigger).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Menu>
        <Menu.Trigger
          ref={(el) => {
            node = el;
          }}
        >
          Actions
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item value="a">A</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
    expect(node).toBe(screen.getByRole("button", { name: "Actions" }));
  });

  it("passes an axe scan with the menu open", async () => {
    const { container } = render(<BasicMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");
    expect((await axe(container)).violations.length).toBe(0);
  });
});
