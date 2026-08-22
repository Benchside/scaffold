import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Progress> = {
  title: "Components/Progress",
  component: Progress,
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    size: { control: "select", options: SIZES },
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    value: 60,
    size: "md",
  },
  render: (args) => (
    <div className="w-72">
      <Progress {...args}>
        <Progress.Label>Uploading</Progress.Label>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
        <Progress.ValueText />
      </Progress>
    </div>
  ),
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <Progress key={size} value={60} size={size}>
          <Progress.Label>{`Size ${size}`}</Progress.Label>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress>
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — loading, complete, and indeterminate. */
export const States: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      <Progress value={35}>
        <Progress.Label>Loading</Progress.Label>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
        <Progress.ValueText />
      </Progress>
      <Progress value={100}>
        <Progress.Label>Complete</Progress.Label>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
        <Progress.ValueText />
      </Progress>
      <Progress value={null}>
        <Progress.Label>Indeterminate</Progress.Label>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress>
    </div>
  ),
};

/** Documentation/visual-regression reference — the circular ring, determinate and indeterminate. */
export const Circular: Story = {
  render: () => (
    <div className="flex items-center gap-stack-2xl">
      {SIZES.map((size) => (
        <div key={size} className="flex flex-col items-center gap-stack-xs">
          <Progress value={70} size={size}>
            <Progress.Circle>
              <Progress.CircleTrack />
              <Progress.CircleRange />
            </Progress.Circle>
          </Progress>
          <span className="text-caption text-text-secondary">{size}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-stack-xs">
        <Progress value={null} size="xl">
          <Progress.Circle>
            <Progress.CircleTrack />
            <Progress.CircleRange />
          </Progress.Circle>
        </Progress>
        <span className="text-caption text-text-secondary">indeterminate</span>
      </div>
    </div>
  ),
};
