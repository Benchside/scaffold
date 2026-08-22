import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion } from "@benchside/scaffold-react";

const meta: Meta<typeof Accordion> = {
  title: "Components/Accordion",
  component: Accordion,
  argTypes: {
    multiple: { control: "boolean" },
    collapsible: { control: "boolean" },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Accordion>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    defaultValue: ["shipping"],
  },
  render: (args) => (
    <div className="w-96">
      <Accordion {...args}>
        <Accordion.Item value="shipping">
          <Accordion.ItemTrigger>Shipping</Accordion.ItemTrigger>
          <Accordion.ItemContent>Orders ship within 2 business days.</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="returns">
          <Accordion.ItemTrigger>Returns</Accordion.ItemTrigger>
          <Accordion.ItemContent>
            Returns are accepted within 30 days of delivery.
          </Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="support" disabled>
          <Accordion.ItemTrigger>Support (unavailable)</Accordion.ItemTrigger>
          <Accordion.ItemContent>
            Support hours are Monday through Friday, 9am to 5pm.
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
};

/**
 * Documentation/visual-regression reference — single-expand (default),
 * multiple, and disabled-item states, each with content expanded so it's
 * visible in the screenshot.
 */
export const States: Story = {
  render: () => (
    <div className="w-96 flex flex-col gap-stack-2xl">
      <Accordion defaultValue={["a"]}>
        <Accordion.Item value="a">
          <Accordion.ItemTrigger>Single-expand: item A</Accordion.ItemTrigger>
          <Accordion.ItemContent>Only one item open at a time.</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.ItemTrigger>Single-expand: item B</Accordion.ItemTrigger>
          <Accordion.ItemContent>Opening this closes item A.</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>
      <Accordion multiple defaultValue={["c", "d"]}>
        <Accordion.Item value="c">
          <Accordion.ItemTrigger>Multiple: item C</Accordion.ItemTrigger>
          <Accordion.ItemContent>Both items can stay open together.</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="d">
          <Accordion.ItemTrigger>Multiple: item D</Accordion.ItemTrigger>
          <Accordion.ItemContent>Both items can stay open together.</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>
      <Accordion defaultValue={["e"]}>
        <Accordion.Item value="e">
          <Accordion.ItemTrigger>Disabled item below</Accordion.ItemTrigger>
          <Accordion.ItemContent>This item is expanded.</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="f" disabled>
          <Accordion.ItemTrigger>Disabled</Accordion.ItemTrigger>
          <Accordion.ItemContent>Not reachable.</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
};

/** Documentation/visual-regression reference — horizontal orientation. */
export const Orientation: Story = {
  render: () => (
    <Accordion orientation="horizontal" defaultValue={["a"]} className="max-w-2xl w-full">
      <Accordion.Item value="a">
        <Accordion.ItemTrigger>Item A</Accordion.ItemTrigger>
        <Accordion.ItemContent>
          Arrow-right/left move focus in this orientation.
        </Accordion.ItemContent>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.ItemTrigger>Item B</Accordion.ItemTrigger>
        <Accordion.ItemContent>Second item.</Accordion.ItemContent>
      </Accordion.Item>
    </Accordion>
  ),
};
