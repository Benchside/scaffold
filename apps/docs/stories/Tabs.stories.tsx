import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "@benchside/scaffold-react";

const SIZES = ["sm", "md", "lg"] as const;
const VARIANTS = ["underline", "segmented"] as const;

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "select", options: SIZES },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
};

export default meta;

type Story = StoryObj<typeof Tabs>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    variant: "underline",
    size: "md",
    defaultValue: "account",
  },
  render: (args) => (
    <div className="w-96">
      <Tabs {...args}>
        <Tabs.List>
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="password">Password</Tabs.Trigger>
          <Tabs.Trigger value="billing" disabled>
            Billing
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="account">Manage your account details here.</Tabs.Content>
        <Tabs.Content value="password">Change your password here.</Tabs.Content>
        <Tabs.Content value="billing">Billing is unavailable on this plan.</Tabs.Content>
      </Tabs>
    </div>
  ),
};

/** Documentation/visual-regression reference — both visual variants. */
export const AllVariants: Story = {
  render: () => (
    <div className="w-96 flex flex-col gap-stack-2xl">
      {VARIANTS.map((variant) => (
        <Tabs key={variant} variant={variant} defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
            <Tabs.Trigger value="billing" disabled>
              Billing
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">Manage your account details here.</Tabs.Content>
          <Tabs.Content value="password">Change your password here.</Tabs.Content>
          <Tabs.Content value="billing">Billing is unavailable on this plan.</Tabs.Content>
        </Tabs>
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-96 flex flex-col gap-stack-2xl">
      {SIZES.map((size) => (
        <Tabs key={size} size={size} defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">Manage your account details here.</Tabs.Content>
          <Tabs.Content value="password">Change your password here.</Tabs.Content>
        </Tabs>
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — vertical orientation, both variants. */
export const Orientation: Story = {
  render: () => (
    <div className="flex gap-stack-2xl">
      {VARIANTS.map((variant) => (
        <Tabs key={variant} variant={variant} orientation="vertical" defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
            <Tabs.Trigger value="billing" disabled>
              Billing
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">Manage your account details here.</Tabs.Content>
          <Tabs.Content value="password">Change your password here.</Tabs.Content>
          <Tabs.Content value="billing">Billing is unavailable on this plan.</Tabs.Content>
        </Tabs>
      ))}
    </div>
  ),
};
