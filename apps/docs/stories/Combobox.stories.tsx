import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Combobox } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const GENE_ITEMS = [
  { label: "BRCA1", value: "brca1" },
  { label: "BRCA2", value: "brca2" },
  { label: "TP53", value: "tp53" },
  { label: "EGFR", value: "egfr" },
  { label: "KRAS", value: "kras" },
  { label: "PTEN", value: "pten", disabled: true },
];

const MANY_GENE_ITEMS = Array.from({ length: 500 }, (_, i) => ({
  label: `Gene ${String(i).padStart(3, "0")}`,
  value: `gene-${i}`,
}));

const GENE_CATEGORY: Record<string, string> = {
  brca1: "Tumor suppressor",
  brca2: "Tumor suppressor",
  tp53: "Tumor suppressor",
  pten: "Tumor suppressor",
  egfr: "Receptor",
  kras: "Oncogene",
};

const GENE_DATABASE = [
  { label: "BRCA1", value: "brca1" },
  { label: "BRCA2", value: "brca2" },
  { label: "TP53", value: "tp53" },
  { label: "EGFR", value: "egfr" },
  { label: "KRAS", value: "kras" },
  { label: "PTEN", value: "pten" },
  { label: "MYC", value: "myc" },
  { label: "RB1", value: "rb1" },
];

function fakeGeneSearch(query: string): Promise<typeof GENE_DATABASE> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const needle = query.toLowerCase();
      resolve(GENE_DATABASE.filter((gene) => gene.label.toLowerCase().includes(needle)));
    }, 300);
  });
}

/**
 * Server-driven mode: `items` is a controlled prop the consumer replaces on
 * each search, `loading` reflects the in-flight fetch, and `filter={null}`
 * turns off Combobox's own client-side filtering since the server already
 * filtered. Debouncing and stale-response handling are the consumer's job
 * — Combobox only forwards the raw `onInputValueChange` — hence the
 * request-id guard below, matching the pattern documented on the prop.
 */
function AsyncComboboxDemo() {
  const [items, setItems] = useState(GENE_DATABASE);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleInputValueChange(inputValue: string) {
    clearTimeout(debounceTimer.current);
    setLoading(true);
    const thisRequestId = ++requestId.current;
    debounceTimer.current = setTimeout(async () => {
      const results = await fakeGeneSearch(inputValue);
      if (thisRequestId !== requestId.current) return; // a newer keystroke superseded this one
      setItems(results);
      setLoading(false);
    }, 300);
  }

  return (
    <Combobox
      label="Gene symbol"
      placeholder="Search a gene database"
      hint="Simulates a debounced server search"
      items={items}
      loading={loading}
      filter={null}
      onInputValueChange={handleInputValueChange}
    />
  );
}

const GENE_ITEMS_WITH_REASON = [
  { label: "BRCA1", value: "brca1" },
  { label: "BRCA2", value: "brca2" },
  { label: "TP53", value: "tp53" },
  { label: "EGFR", value: "egfr" },
  { label: "KRAS", value: "kras" },
  {
    label: "PTEN",
    value: "pten",
    disabled: true,
    disabledReason: "Requires a germline consent form on file",
  },
];

const meta: Meta<typeof Combobox> = {
  title: "Components/Combobox",
  component: Combobox,
  argTypes: {
    size: { control: "select", options: SIZES },
    multiple: { control: "boolean" },
    clearable: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    highlightMatch: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Combobox>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Gene symbol",
    hint: "Type to filter by HGNC symbol",
    items: GENE_ITEMS,
    placeholder: "Search genes",
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <Combobox
          key={size}
          label={`Size ${size}`}
          items={GENE_ITEMS}
          size={size}
          defaultValue="brca1"
        />
      ))}
    </div>
  ),
};

/** Multi-select with removable pills — each pick adds a pill and clears the input for the next search. */
export const Multiple: Story = {
  args: {
    label: "Gene symbols",
    items: GENE_ITEMS,
    placeholder: "Search genes",
    multiple: true,
    clearable: true,
    defaultValue: ["brca1", "tp53"],
  },
};

/** Options grouped under a header — group order follows each group's first appearance in `items`, not alphabetically. */
export const Grouped: Story = {
  args: {
    label: "Gene symbol",
    items: GENE_ITEMS,
    placeholder: "Search genes",
    groupBy: (item: { value: string }) => GENE_CATEGORY[item.value] ?? "Other",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await expect(canvas.getByRole("listbox")).toBeVisible();
  },
};

/**
 * A disabled option with a reason: shown as a tooltip on hover, and
 * reachable via aria-describedby regardless of input method. Only opens
 * the listbox itself — the tooltip-open screenshot is driven by a real
 * `.hover()` in the Playwright spec rather than this `play` function,
 * since a synthetic hover dispatched here doesn't reliably still read as
 * "hovering" by the time a separate Playwright assertion checks for it.
 */
export const DisabledWithReason: Story = {
  args: {
    label: "Gene symbol",
    items: GENE_ITEMS_WITH_REASON,
    placeholder: "Search genes",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await expect(canvas.getByRole("option", { name: "PTEN" })).toBeVisible();
  },
};

/** Async/server-driven mode — see `AsyncComboboxDemo` above for the debounce + stale-response pattern this relies on. */
export const Async: Story = {
  render: () => <AsyncComboboxDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    for (const ch of "brca") {
      await userEvent.keyboard(ch);
    }
    await expect(canvas.getByRole("status")).toBeVisible();
    await expect(canvas.getByRole("option", { name: "BRCA1" })).toBeVisible();
    await expect(canvas.queryByRole("option", { name: "TP53" })).not.toBeInTheDocument();
  },
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-72 flex flex-col gap-stack-lg">
      <Combobox label="Placeholder" items={GENE_ITEMS} placeholder="Search genes" />
      <Combobox label="Selected" items={GENE_ITEMS} defaultValue="tp53" />
      <Combobox label="Required" items={GENE_ITEMS} required />
      <Combobox label="Broken" items={GENE_ITEMS} error="Pick a gene" />
      <Combobox label="Disabled" items={GENE_ITEMS} disabled defaultValue="brca1" />
      <Combobox label="Clearable" items={GENE_ITEMS} clearable defaultValue="egfr" />
      <Combobox
        label="Multiple, clearable"
        items={GENE_ITEMS}
        multiple
        clearable
        defaultValue={["brca1", "tp53"]}
      />
      <Combobox label="Empty" items={[]} placeholder="No genes match" />
    </div>
  ),
};

/**
 * Visual-regression reference for virtualization: opens the listbox over
 * 500 items and arrows well past the initial window before the screenshot,
 * so a row-misalignment regression (wrong item text at the highlighted
 * position, gaps between rows) would actually show up in the diff — a
 * short, unscrolled list wouldn't exercise virtualization at all.
 */
export const LargeList: Story = {
  args: {
    label: "Gene symbol",
    items: MANY_GENE_ITEMS,
    placeholder: "Search 500 genes",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    for (let i = 0; i < 40; i++) {
      await userEvent.keyboard("{ArrowDown}");
    }
    const activeDescendantId = input.getAttribute("aria-activedescendant");
    await expect(activeDescendantId).toBeTruthy();
    await expect(document.getElementById(activeDescendantId!)).toHaveTextContent("Gene 039");
  },
};
