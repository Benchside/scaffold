import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@benchside/scaffold-react";

const VARIANTS = ["default", "success", "warning", "error", "info"] as const;
const SIZES = ["sm", "md", "lg"] as const;

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "select", options: SIZES },
    shape: { control: "select", options: ["pill", "rounded"] },
    appearance: { control: "select", options: ["solid", "outline"] },
    children: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

/** Drag the Controls panel to try every variant/size/shape/appearance combination live. */
export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
    size: "md",
    shape: "pill",
    appearance: "solid",
  },
};

/** Documentation/visual-regression reference — every variant at once, not interactive. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-stack-md">
      {(["solid", "outline"] as const).map((appearance) => (
        <div key={appearance} className="flex flex-col gap-stack-sm">
          {SIZES.map((size) => (
            <div key={size} className="flex items-center gap-inline-sm">
              {VARIANTS.map((variant) => (
                <Badge key={variant} variant={variant} appearance={appearance} size={size}>
                  {variant}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-inline-sm">
      <Badge variant="info" shape="pill">
        pill
      </Badge>
      <Badge variant="info" shape="rounded">
        rounded
      </Badge>
    </div>
  ),
};

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.5L5 9L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const WithIcon: Story = {
  render: () => (
    <Badge variant="success">
      <CheckIcon />
      Passed
    </Badge>
  ),
};
