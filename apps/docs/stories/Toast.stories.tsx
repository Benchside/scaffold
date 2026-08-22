import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { Toast, useToast } from "@benchside/scaffold-react";

const VARIANTS = ["success", "info", "warning", "error"] as const;

// Toast has no single instance to hand args to — it's fired imperatively via
// useToast(). These args describe what the demo button below creates, not
// props of Toast.Toaster (which only takes `className`).
interface ToastStoryArgs {
  variant: (typeof VARIANTS)[number];
  title: string;
  description: string;
}

const meta: Meta<ToastStoryArgs> = {
  title: "Components/Toast",
  component: Toast.Toaster,
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    title: { control: "text" },
    description: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<ToastStoryArgs>;

function DefaultDemo({ variant, title, description }: ToastStoryArgs) {
  const toast = useToast();
  return (
    <div>
      <Toast.Toaster />
      <button
        type="button"
        className="rounded-md border border-border bg-bg-elevated px-inset-md py-inset-sm text-label"
        onClick={() => toast[variant]({ title, description })}
      >
        Fire {variant} toast
      </button>
    </div>
  );
}

/** Click the button, then drag the Controls panel — toasts fire from anywhere via `useToast()`, independent of where `Toast.Toaster` is mounted. */
export const Default: Story = {
  args: {
    variant: "success",
    title: "Calibration complete",
    description: "Instrument ready for the next run.",
  },
  render: (args) => <DefaultDemo {...args} />,
};

function AllVariantsDemo() {
  const toast = useToast();
  useEffect(() => {
    toast.success({
      title: "Calibration complete",
      description: "Instrument ready for the next run.",
    });
    toast.info({ title: "Export started", description: "results.csv is generating." });
    toast.warning({
      title: "Sensor drifting",
      description: "Recalibrate before the next run.",
    });
    toast.error({ title: "Run failed", description: "Sensor 3 timed out." });
  }, [toast]);
  return <Toast.Toaster />;
}

/** Documentation/visual-regression reference — all four severities stacked, fired on mount. */
export const AllVariants: Story = {
  render: () => <AllVariantsDemo />,
};
