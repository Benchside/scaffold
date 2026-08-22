import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@benchside/scaffold-react";

const meta: Meta<typeof Separator> = {
  title: "Components/Separator",
  component: Separator,
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    emphasis: { control: "select", options: ["default", "strong"] },
    decorative: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Separator>;

/** Drag the Controls panel to try every orientation/emphasis/decorative combination live. */
export const Default: Story = {
  args: {
    orientation: "horizontal",
    emphasis: "default",
    decorative: false,
  },
  render: (args) => (
    <div className="w-80">
      <p>Above</p>
      <Separator {...args} />
      <p>Below</p>
    </div>
  ),
};

/** Documentation/visual-regression reference — every combination at once, not interactive. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-stack-md">
      <div className="w-80 flex flex-col gap-stack-sm">
        <p>Default emphasis</p>
        <Separator />
        <p>Strong emphasis</p>
        <Separator emphasis="strong" />
      </div>
      <div className="h-24 flex items-stretch gap-inline-sm">
        <p>Left</p>
        <Separator orientation="vertical" />
        <p>Right</p>
        <Separator orientation="vertical" emphasis="strong" />
        <p>Far right</p>
      </div>
    </div>
  ),
};
