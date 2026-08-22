import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof RadioGroup> = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  argTypes: {
    size: { control: "select", options: SIZES },
    orientation: { control: "select", options: ["vertical", "horizontal"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Plan",
    hint: "Billed monthly",
    size: "md",
    defaultValue: "pro",
  },
  render: (args) => (
    <RadioGroup {...args}>
      <RadioGroup.Item value="free">Free</RadioGroup.Item>
      <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
      <RadioGroup.Item value="enterprise">Enterprise</RadioGroup.Item>
    </RadioGroup>
  ),
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <RadioGroup key={size} label={`Size ${size}`} size={size} defaultValue="a">
          <RadioGroup.Item value="a">Option A</RadioGroup.Item>
          <RadioGroup.Item value="b">Option B</RadioGroup.Item>
        </RadioGroup>
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-64 flex flex-col gap-stack-lg">
      <RadioGroup label="Unselected">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="Selected" defaultValue="a">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="Required" required>
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="Broken" error="Pick a plan">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="Disabled" disabled defaultValue="a">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="One item disabled" defaultValue="a">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b" disabled>
          Option B
        </RadioGroup.Item>
      </RadioGroup>
      <RadioGroup label="Horizontal" orientation="horizontal" defaultValue="a">
        <RadioGroup.Item value="a">Option A</RadioGroup.Item>
        <RadioGroup.Item value="b">Option B</RadioGroup.Item>
      </RadioGroup>
    </div>
  ),
};
