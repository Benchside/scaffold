import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "@benchside/scaffold-react";

const SIZES = ["sm", "md", "lg", "xl"] as const;

// `size` lives on Dialog.Content, not Dialog itself — folded into one args
// object so the Controls panel can drive both from a single story.
interface DialogStoryArgs extends ComponentProps<typeof Dialog> {
  size?: ComponentProps<typeof Dialog.Content>["size"];
}

const meta: Meta<DialogStoryArgs> = {
  title: "Components/Dialog",
  component: Dialog,
  argTypes: {
    role: { control: "select", options: ["dialog", "alertdialog"] },
    closeOnOutsideClick: { control: "boolean" },
    size: { control: "select", options: SIZES },
  },
};

export default meta;

type Story = StoryObj<DialogStoryArgs>;

/** Click the trigger to open, then drag the Controls panel — closed by default. */
export const Default: Story = {
  args: {
    role: "dialog",
    size: "md",
  },
  render: ({ size, ...args }) => (
    <Dialog {...args}>
      <Dialog.Trigger>Delete run</Dialog.Trigger>
      <Dialog.Content size={size}>
        <Dialog.Header>
          <Dialog.Title>Delete run?</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Description>This cannot be undone.</Dialog.Description>
        <Dialog.Footer>
          <button type="button">Cancel</button>
          <button type="button">Delete</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

/** Documentation/visual-regression reference — header, description, scrollable body, and footer all at once, opened by default. */
export const AllVariants: Story = {
  render: () => (
    <Dialog defaultOpen>
      <Dialog.Trigger>Edit assay parameters</Dialog.Trigger>
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Title>Edit assay parameters</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Description>
          Changes apply to this run only and don&apos;t affect the saved protocol.
        </Dialog.Description>
        <Dialog.Body>
          <div className="flex flex-col gap-stack-sm">
            <label className="flex flex-col gap-stack-2xs text-label">
              Cycle count
              <input
                className="rounded-md border border-border px-inset-sm py-inset-xs"
                defaultValue={40}
              />
            </label>
            <label className="flex flex-col gap-stack-2xs text-label">
              Annealing temperature (°C)
              <input
                className="rounded-md border border-border px-inset-sm py-inset-xs"
                defaultValue={58}
              />
            </label>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <button type="button">Cancel</button>
          <button type="button">Save changes</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

/** `role="alertdialog"` for an irreversible action — initial focus lands on the close button, not the destructive action. */
export const AlertDialog: Story = {
  render: () => (
    <Dialog defaultOpen role="alertdialog">
      <Dialog.Trigger>Delete experiment</Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Dialog.Title>Delete experiment?</Dialog.Title>
        </Dialog.Header>
        <Dialog.Description>
          This permanently deletes all runs and results. This cannot be undone.
        </Dialog.Description>
        <Dialog.Footer>
          <button type="button">Cancel</button>
          <button type="button">Delete</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

/** `size="xl"` for content-heavy dialogs — a results table, not just a form. */
export const Large: Story = {
  render: () => (
    <Dialog defaultOpen>
      <Dialog.Trigger>View run results</Dialog.Trigger>
      <Dialog.Content size="xl">
        <Dialog.Header>
          <Dialog.Title>Run #4021 results</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Description>qPCR amplification summary, 8 samples.</Dialog.Description>
        <Dialog.Body>
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="font-medium px-inset-sm py-inset-xs text-left">Sample</th>
                <th className="font-medium px-inset-sm py-inset-xs text-left">Ct</th>
                <th className="font-medium px-inset-sm py-inset-xs text-left">Call</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-inset-sm py-inset-xs">Sample {i + 1}</td>
                  <td className="px-inset-sm py-inset-xs">{(24 + i * 1.3).toFixed(1)}</td>
                  <td className="px-inset-sm py-inset-xs">
                    {i % 3 === 0 ? "Negative" : "Positive"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Dialog.Body>
        <Dialog.Footer>
          <button type="button">Export CSV</button>
          <button type="button">Close</button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

/** `closeOnOutsideClick={false}` — backdrop clicks are ignored, only the close button or Escape dismiss. */
export const NonDismissable: Story = {
  render: () => (
    <Dialog defaultOpen closeOnOutsideClick={false}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Processing</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Description>Clicking outside this dialog won&apos;t close it.</Dialog.Description>
      </Dialog.Content>
    </Dialog>
  ),
};

/** Documentation/visual-regression reference — the full width scale. */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-stack-lg">
      {SIZES.map((size) => (
        <Dialog key={size}>
          <Dialog.Trigger>Open {size}</Dialog.Trigger>
          <Dialog.Content size={size}>
            <Dialog.Header>
              <Dialog.Title>{size} dialog</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>Content sized to the {size} variant.</Dialog.Body>
          </Dialog.Content>
        </Dialog>
      ))}
    </div>
  ),
};
