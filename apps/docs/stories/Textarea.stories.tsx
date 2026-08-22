import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Textarea> = {
  title: "Components/Textarea",
  component: Textarea,
  argTypes: {
    size: { control: "select", options: SIZES },
    variant: { control: "select", options: ["prose", "code"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    showCount: { control: "boolean" },
    copyable: { control: "boolean" },
    autoResize: { control: "boolean" },
    label: { control: "text" },
    description: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Textarea>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Notes",
    description: "Visible to your team only.",
    hint: "Markdown supported",
    size: "md",
  },
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-80 flex flex-col gap-stack-md">
      <Textarea label="Default" hint="A helpful hint" />
      <Textarea label="Required" required />
      <Textarea label="Broken" error="This field is required" defaultValue="oops" />
      <Textarea label="Disabled" disabled defaultValue="Can't touch this" />
      <Textarea label="Read-only" readOnly defaultValue="Computed summary output" copyable />
      <Textarea label="Bio" showCount maxLength={80} defaultValue="Structural biologist" />
    </div>
  ),
};

/** variant="code" switches to the monospace role and makes Tab insert a tab character. */
export const CodeVariant: Story = {
  render: () => (
    <Textarea
      label="Sequence"
      variant="code"
      autoResize
      defaultValue={"ATGCGTACGTAGCTAGCTAGCTAGCTAGCTA\nGGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC"}
    />
  ),
};
