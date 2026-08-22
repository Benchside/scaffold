import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const ASSAY_ITEMS = [
  { label: "qPCR", value: "qpcr" },
  { label: "ELISA", value: "elisa" },
  { label: "Western Blot", value: "western-blot" },
  { label: "Flow Cytometry", value: "flow-cytometry" },
  { label: "Mass Spectrometry", value: "mass-spec", disabled: true },
];

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  argTypes: {
    size: { control: "select", options: SIZES },
    multiple: { control: "boolean" },
    clearable: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Assay type",
    hint: "Choose the assay used for this run",
    items: ASSAY_ITEMS,
    placeholder: "Select an assay",
    size: "md",
  },
};

/** Multi-select with a clear button — picking a second item switches the trigger to a count. */
export const Multiple: Story = {
  args: {
    label: "Assay types",
    items: ASSAY_ITEMS,
    placeholder: "Select assays",
    multiple: true,
    clearable: true,
    defaultValue: ["qpcr"],
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <Select
          key={size}
          label={`Size ${size}`}
          items={ASSAY_ITEMS}
          size={size}
          defaultValue="qpcr"
        />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      <Select label="Placeholder" items={ASSAY_ITEMS} placeholder="Select an assay" />
      <Select label="Selected" items={ASSAY_ITEMS} defaultValue="elisa" />
      <Select label="Required" items={ASSAY_ITEMS} required />
      <Select label="Broken" items={ASSAY_ITEMS} error="Pick an assay" />
      <Select label="Disabled" items={ASSAY_ITEMS} disabled defaultValue="qpcr" />
      <Select
        label="Multiple, clearable"
        items={ASSAY_ITEMS}
        multiple
        clearable
        defaultValue={["qpcr", "elisa"]}
      />
      <Select label="Empty" items={[]} placeholder="No options here" />
    </div>
  ),
};
