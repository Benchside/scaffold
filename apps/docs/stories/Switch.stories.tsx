import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Switch> = {
  title: "Components/Switch",
  component: Switch,
  argTypes: {
    size: { control: "select", options: SIZES },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Switch>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Enable notifications",
    hint: "You can turn this off later",
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      {SIZES.map((size) => (
        <Switch key={size} label={`Size ${size}`} size={size} defaultChecked />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      <Switch label="Off" />
      <Switch label="On" defaultChecked />
      <Switch label="Required" required />
      <Switch label="Broken" error="Something went wrong" />
      <Switch label="Disabled off" disabled />
      <Switch label="Disabled on" disabled defaultChecked />
    </div>
  ),
};
