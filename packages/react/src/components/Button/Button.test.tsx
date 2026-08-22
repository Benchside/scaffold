import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Button } from "./Button";

describe("Button", () => {
  it("renders as a native button with type=button by default", () => {
    render(<Button>Save</Button>);
    const el = screen.getByRole("button", { name: "Save" });
    expect(el.tagName).toBe("BUTTON");
    expect(el).toHaveAttribute("type", "button");
  });

  it("respects an explicit type override", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("renders as an anchor when as='a'", () => {
    render(
      <Button as="a" href="/results">
        Go
      </Button>,
    );
    const el = screen.getByRole("link", { name: "Go" });
    expect(el.tagName).toBe("A");
    expect(el).toHaveAttribute("href", "/results");
  });

  it.each([
    ["primary", "solid", "bg-accent", "text-text-on-solid"],
    ["primary", "outline", "border-accent", "text-accent-text"],
    ["primary", "ghost", "text-accent-text", "hover:bg-accent-subtle"],
    ["secondary", "solid", "bg-bg-subtle", "text-text"],
    ["secondary", "outline", "border-border", "text-text"],
    ["secondary", "ghost", "text-text-secondary", "hover:bg-bg-hover"],
    ["destructive", "solid", "bg-status-error", "text-text-on-solid"],
    ["destructive", "outline", "border-status-error", "text-status-error"],
    ["destructive", "ghost", "text-status-error", "hover:bg-status-error-bg"],
  ] as const)(
    "renders %s/%s with its semantic token classes",
    (intent, emphasis, classA, classB) => {
      render(
        <Button intent={intent} emphasis={emphasis}>
          Label
        </Button>,
      );
      expect(screen.getByRole("button")).toHaveClass(classA, classB);
    },
  );

  it.each([
    ["xs", "text-caption"],
    ["sm", "text-label"],
    ["md", "text-label"],
    ["lg", "text-label-lg"],
    ["xl", "text-label-lg"],
  ] as const)("uses the right typography role at size %s", (size, textClass) => {
    render(<Button size={size}>Label</Button>);
    expect(screen.getByRole("button")).toHaveClass(textClass);
  });

  it("uses symmetric square padding when iconOnly is set", () => {
    render(
      <Button iconOnly size="md" aria-label="Refresh">
        <svg aria-hidden="true" />
      </Button>,
    );
    const el = screen.getByRole("button");
    expect(el).toHaveClass("p-inset-lg");
    expect(el).not.toHaveClass("px-inset-lg", "py-inset-sm");
  });

  it("shows a focus-visible ring", () => {
    render(<Button>Label</Button>);
    expect(screen.getByRole("button")).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-border-focus",
    );
  });

  describe("disabled", () => {
    it("sets aria-disabled and mutes the color", () => {
      render(<Button disabled>Save</Button>);
      const el = screen.getByRole("button");
      expect(el).toHaveAttribute("aria-disabled", "true");
      expect(el).toHaveClass("opacity-50", "cursor-not-allowed");
    });

    it("prevents the click handler from firing", async () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Save
        </Button>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("loading", () => {
    it("sets aria-busy and aria-disabled without muting the color", () => {
      render(<Button loading>Save</Button>);
      const el = screen.getByRole("button");
      expect(el).toHaveAttribute("aria-busy", "true");
      expect(el).toHaveAttribute("aria-disabled", "true");
      expect(el).not.toHaveClass("opacity-50");
      expect(el).toHaveClass("cursor-wait");
    });

    it("prevents the click handler from firing", async () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("keeps the label in the DOM but visually hidden, without changing button width", () => {
      render(<Button loading>Save</Button>);
      const label = screen.getByText("Save");
      expect(label).toHaveClass("invisible");
    });

    it("overlays a spinner", () => {
      const { container } = render(<Button loading>Save</Button>);
      expect(container.querySelector(".animate-spin")).not.toBeNull();
    });
  });

  it("lets a consumer className override the default intent via tailwind-merge", () => {
    render(
      <Button intent="primary" className="bg-status-error">
        Label
      </Button>,
    );
    const el = screen.getByRole("button");
    expect(el).toHaveClass("bg-status-error");
    expect(el).not.toHaveClass("bg-accent");
  });

  it("accepts ref as a plain prop", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          node = el as HTMLButtonElement;
        }}
      >
        Label
      </Button>,
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes an axe scan across intents, emphases, sizes, and states", async () => {
    const { container } = render(
      <div>
        <Button intent="primary">Primary</Button>
        <Button intent="secondary" emphasis="outline">
          Secondary
        </Button>
        <Button intent="destructive" emphasis="ghost">
          Destructive
        </Button>
        <Button size="xs">Small</Button>
        <Button size="xl">Large</Button>
        <Button iconOnly aria-label="Refresh">
          <svg aria-hidden="true" />
        </Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button as="a" href="/results">
          Link
        </Button>
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
