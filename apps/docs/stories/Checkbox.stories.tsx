import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  argTypes: {
    size: { control: "select", options: SIZES },
    indeterminate: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Accept terms and conditions",
    hint: "You can revoke this later in settings",
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      {SIZES.map((size) => (
        <Checkbox key={size} label={`Size ${size}`} size={size} defaultChecked />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      <Checkbox label="Unchecked" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox label="Required" required />
      <Checkbox label="Broken" error="You must accept to continue" />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled, checked" disabled defaultChecked />
    </div>
  ),
};
