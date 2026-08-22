import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Spinner> = {
  title: "Components/Spinner",
  component: Spinner,
  argTypes: {
    size: { control: "select", options: SIZES },
    label: { control: "text" },
    decorative: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Spinner>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    size: "md",
    label: "Loading",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-stack-lg">
      {SIZES.map((size) => (
        <Spinner key={size} size={size} label={`Size ${size}`} />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — decorative use, composed next to its own visible caption. */
export const Decorative: Story = {
  render: () => (
    <div className="flex items-center gap-inline-xs">
      <Spinner decorative />
      <span className="text-label text-text">Fetching results…</span>
    </div>
  ),
};
