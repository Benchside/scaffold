import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@benchside/scaffold-react";

const INTENTS = ["primary", "secondary", "destructive"] as const;
const EMPHASES = ["solid", "outline", "ghost"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    intent: { control: "select", options: INTENTS },
    emphasis: { control: "select", options: EMPHASES },
    size: { control: "select", options: SIZES },
    iconOnly: { control: "boolean" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    as: { control: false },
    children: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

/** Drag the Controls panel to try every intent/emphasis/size/state combination live. */
export const Default: Story = {
  args: {
    children: "Save changes",
    intent: "primary",
    emphasis: "solid",
    size: "md",
  },
};

/** Documentation/visual-regression reference — every intent x emphasis combination. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-stack-sm">
      {INTENTS.map((intent) => (
        <div key={intent} className="flex items-center gap-inline-sm">
          {EMPHASES.map((emphasis) => (
            <Button key={emphasis} intent={intent} emphasis={emphasis}>
              {intent}/{emphasis}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-inline-sm">
      {SIZES.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** iconOnly requires an aria-label — there's no visible text for assistive tech otherwise. */
export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-inline-sm">
      {SIZES.map((size) => (
        <Button key={size} iconOnly size={size} aria-label="Refresh">
          <RefreshIcon />
        </Button>
      ))}
    </div>
  ),
};

/** disabled mutes the color; loading keeps it and overlays a spinner without resizing. */
export const States: Story = {
  render: () => (
    <div className="flex items-center gap-inline-sm">
      <Button>Default</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button intent="destructive" loading>
        Deleting
      </Button>
    </div>
  ),
};

/** Native keyboard nav via `as="a"` — Tab to focus, Enter to follow the link. */
export const AsLink: Story = {
  render: () => (
    <Button as="a" href="#">
      Go to results
    </Button>
  ),
};
