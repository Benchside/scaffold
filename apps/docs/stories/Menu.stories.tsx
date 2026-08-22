import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil, Copy, Archive, Trash2 } from "lucide-react";
import { Menu } from "@benchside/scaffold-react";

const meta: Meta<typeof Menu> = {
  title: "Components/Menu",
  component: Menu,
  argTypes: {
    closeOnSelect: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Menu>;

/** Click the trigger to open, then drag the Controls panel. */
export const Default: Story = {
  args: {
    closeOnSelect: true,
  },
  render: (args) => (
    <Menu {...args}>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Item value="rename">Rename</Menu.Item>
        <Menu.Item value="duplicate">Duplicate</Menu.Item>
        <Menu.Item value="archive">Archive</Menu.Item>
        <Menu.Separator />
        <Menu.Item value="delete" destructive>
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};

/** Documentation/visual-regression reference — icons, shortcuts, groups, disabled, and destructive tone all at once, opened by default. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-stack-2xl">
      <Menu defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.ItemGroup label="Edit">
            <Menu.Item
              value="rename"
              icon={<Pencil className="size-4" aria-hidden="true" />}
              shortcut="⌘R"
            >
              Rename
            </Menu.Item>
            <Menu.Item
              value="duplicate"
              icon={<Copy className="size-4" aria-hidden="true" />}
              shortcut="⌘D"
            >
              Duplicate
            </Menu.Item>
            <Menu.Item
              value="archive"
              icon={<Archive className="size-4" aria-hidden="true" />}
              disabled
            >
              Archive
            </Menu.Item>
          </Menu.ItemGroup>
          <Menu.Separator />
          <Menu.Item
            value="delete"
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            destructive
          >
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  ),
};

/**
 * Opened via a right-click on an arbitrary target, for row/cell actions in
 * data tables. Positioning is pointer-driven, so unlike `AllVariants` this
 * can't be shown pre-opened with `defaultOpen` — there's no click yet to
 * anchor against. The visual-regression test right-clicks it directly.
 */
export const ContextTrigger: Story = {
  render: () => (
    <Menu>
      <Menu.ContextTrigger asChild>
        <div className="w-72 rounded-md border border-dashed border-border p-inset-lg text-center text-label text-text-secondary">
          Right-click this area
        </div>
      </Menu.ContextTrigger>
      <Menu.Content>
        <Menu.Item value="view">View details</Menu.Item>
        <Menu.Item value="duplicate">Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item value="delete" destructive>
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};
