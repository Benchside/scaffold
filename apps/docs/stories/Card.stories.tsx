import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "@benchside/scaffold-react";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  argTypes: {
    variant: { control: "select", options: ["outline", "filled"] },
    density: { control: "select", options: ["default", "compact"] },
    selected: { control: "boolean" },
    as: { control: false },
  },
};

export default meta;

type Story = StoryObj<typeof Card>;

/** Drag the Controls panel to try every variant/density/selected combination live. */
export const Default: Story = {
  args: {
    variant: "outline",
    density: "default",
    selected: false,
  },
  render: (args) => (
    <div className="w-80">
      <Card {...args}>
        <Card.Header>Experiment Run #42</Card.Header>
        <Card.Body>Sample throughput, latency, and error-rate summary for this run.</Card.Body>
        <Card.Footer>Completed 2m ago</Card.Footer>
      </Card>
    </div>
  ),
};

/** Documentation/visual-regression reference — every variant at once, not interactive. */
export const AllVariants: Story = {
  render: () => (
    <div className="w-80 flex flex-col gap-stack-md">
      {(["outline", "filled"] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <Card.Header>Experiment Run #{variant === "outline" ? "42" : "43"}</Card.Header>
          <Card.Body>Sample throughput, latency, and error-rate summary for this run.</Card.Body>
          <Card.Footer>Completed 2m ago</Card.Footer>
        </Card>
      ))}
      <Card density="compact">
        <Card.Header>Compact density</Card.Header>
        <Card.Body>Tighter padding for dense dashboard grids.</Card.Body>
      </Card>
      <Card selected>
        <Card.Body>Selected state</Card.Body>
      </Card>
    </div>
  ),
};

/** Native keyboard nav via `as="button"`/`as="a"` — Tab to focus, Enter/Space to activate. */
export const Interactive: Story = {
  render: () => (
    <div className="w-80 flex flex-col gap-stack-sm">
      <Card as="button" onClick={() => {}}>
        <Card.Body>Clickable card (as=&quot;button&quot;) — try Tab + Enter</Card.Body>
      </Card>
      <Card as="a" href="#">
        <Card.Body>Link card (as=&quot;a&quot;)</Card.Body>
      </Card>
    </div>
  ),
};
