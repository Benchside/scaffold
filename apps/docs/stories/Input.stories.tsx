import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  argTypes: {
    size: { control: "select", options: SIZES },
    type: { control: "select", options: ["text", "number", "email", "password", "search"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    showCount: { control: "boolean" },
    copyable: { control: "boolean" },
    label: { control: "text" },
    description: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Email address",
    description: "We'll never share this with anyone.",
    hint: "Use your work email",
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      {SIZES.map((size) => (
        <Input key={size} label={`Size ${size}`} size={size} placeholder="Type here" />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      <Input label="Default" hint="A helpful hint" />
      <Input label="Required" required />
      <Input label="Broken" error="This field is required" defaultValue="oops" />
      <Input label="Disabled" disabled defaultValue="Can't touch this" />
      <Input label="Read-only" readOnly defaultValue="Computed result: 42" copyable />
      <Input label="Bio" showCount maxLength={40} defaultValue="Structural biologist" />
    </div>
  ),
};

/** Documentation/visual-regression reference — prefix/suffix and the password toggle. */
export const Slots: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-md">
      <Input label="Amount" prefix={<span>$</span>} suffix={<span>USD</span>} />
      <Input label="Threshold" type="number" suffix={<span>µM</span>} />
      <Input label="Password" type="password" defaultValue="hunter2" />
    </div>
  ),
};
