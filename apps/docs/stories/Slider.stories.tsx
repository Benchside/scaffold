import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof Slider> = {
  title: "Components/Slider",
  component: Slider,
  argTypes: {
    size: { control: "select", options: SIZES },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Slider>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    defaultValue: 25,
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-96 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <Slider key={size} label={`Size ${size}`} size={size} defaultValue={40} />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-96 flex flex-col gap-stack-lg">
      <Slider label="Default" defaultValue={30} />
      <Slider label="Broken" error="Value is out of range" defaultValue={50} />
      <Slider label="Disabled" disabled defaultValue={60} />
      <Slider label="Read-only" readOnly defaultValue={70} />
    </div>
  ),
};

/**
 * `editable={false}` hides the numeric input but never removes the value
 * from the DOM — it falls back to a formatted, unit-suffixed `Slider.ValueText`.
 */
export const NonEditable: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    defaultValue: 25,
    editable: false,
  },
};

/** A custom `formatValue` and `unit` — decimal-precision concentration values. */
export const CustomFormatting: Story = {
  args: {
    label: "Dilution factor",
    unit: "x",
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 2.5,
  },
};

/**
 * `range` renders two thumbs with independent numeric inputs and distinct
 * accessible names ("Concentration Minimum"/"Concentration Maximum").
 */
export const Range: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    range: true,
    defaultValue: [20, 80],
  },
};

/** `minStepsBetweenThumbs` keeps the thumbs from crossing or getting too close. */
export const RangeWithMinGap: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    step: 1,
    minStepsBetweenThumbs: 10,
    range: true,
    defaultValue: [40, 50],
  },
};

/** A combined, unit-suffixed range display when `editable={false}`. */
export const RangeNonEditable: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    range: true,
    defaultValue: [20, 80],
    editable: false,
  },
};

/** Tick marks at discrete concentration steps — purely visual, `aria-hidden`. */
export const Marks: Story = {
  args: {
    label: "Concentration",
    unit: "µM",
    min: 0,
    max: 100,
    step: 25,
    defaultValue: 50,
    marks: [
      { value: 0, label: "0" },
      { value: 25, label: "25" },
      { value: 50, label: "50" },
      { value: 75, label: "75" },
      { value: 100, label: "100" },
    ],
  },
};
