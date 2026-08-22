import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";
import { Tooltip } from "@benchside/scaffold-react";

const meta: Meta<typeof Tooltip> = {
  title: "Components/Tooltip",
  component: Tooltip,
  argTypes: {
    openDelay: { control: { type: "number", min: 0, step: 50 } },
    closeDelay: { control: { type: "number", min: 0, step: 50 } },
    interactive: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

/** Hover or focus the icon, then drag the Controls panel. */
export const Default: Story = {
  args: {
    openDelay: 300,
    closeDelay: 150,
    interactive: false,
    disabled: false,
  },
  render: (args) => (
    <Tooltip {...args}>
      <Tooltip.Trigger className="inline-flex cursor-pointer rounded-sm text-text-secondary hover:text-text">
        <Info className="size-4" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Content>Runs must be calibrated first.</Tooltip.Content>
    </Tooltip>
  ),
};

/** Documentation/visual-regression reference — the bubble and arrow, opened by default. */
export const AllVariants: Story = {
  render: () => (
    <div className="p-inset-3xl">
      <Tooltip defaultOpen>
        <Tooltip.Trigger className="inline-flex cursor-pointer rounded-sm text-text-secondary hover:text-text">
          <Info className="size-4" aria-hidden="true" />
        </Tooltip.Trigger>
        <Tooltip.Content>Runs must be calibrated first.</Tooltip.Content>
      </Tooltip>
    </div>
  ),
};

/** Wrapping a disabled `Button` works without extra setup — the scaffold `Button` uses `aria-disabled`, not native `disabled`, so it stays focusable and hoverable. */
export const OnDisabledControl: Story = {
  render: () => (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-disabled="true"
          className="cursor-not-allowed rounded-md border border-border bg-bg-elevated px-inset-md py-inset-sm text-label opacity-50"
        >
          Start run
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>Calibrate the instrument before starting a run.</Tooltip.Content>
    </Tooltip>
  ),
};
