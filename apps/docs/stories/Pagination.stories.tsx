import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "@benchside/scaffold-react";

const meta: Meta<typeof Pagination> = {
  title: "Components/Pagination",
  component: Pagination,
  argTypes: {
    count: { control: "number" },
    defaultPage: { control: "number" },
    defaultPageSize: { control: "number" },
    siblingCount: { control: "number" },
    boundaryCount: { control: "number" },
  },
};

export default meta;

type Story = StoryObj<typeof Pagination>;

function Pages() {
  return (
    <Pagination.Context>
      {(api) =>
        api.pages.map((page, index) =>
          page.type === "page" ? (
            <Pagination.Item key={index} value={page.value}>
              {page.value}
            </Pagination.Item>
          ) : (
            <Pagination.Ellipsis key={index} index={index} />
          ),
        )
      }
    </Pagination.Context>
  );
}

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    count: 100,
    defaultPageSize: 10,
    defaultPage: 1,
  },
  render: (args) => (
    <Pagination {...args}>
      <Pagination.PrevTrigger />
      <Pages />
      <Pagination.NextTrigger />
    </Pagination>
  ),
};

/** Documentation/visual-regression reference — full first/prev/pages/next/last composition. */
export const FullComposition: Story = {
  render: () => (
    <Pagination count={100} defaultPageSize={10} defaultPage={1}>
      <Pagination.FirstTrigger />
      <Pagination.PrevTrigger />
      <Pages />
      <Pagination.NextTrigger />
      <Pagination.LastTrigger />
    </Pagination>
  ),
};

/** Documentation/visual-regression reference — many pages, truncated on both sides of the active page. */
export const Truncated: Story = {
  render: () => (
    <Pagination count={2000} defaultPageSize={10} defaultPage={50}>
      <Pagination.FirstTrigger />
      <Pagination.PrevTrigger />
      <Pages />
      <Pagination.NextTrigger />
      <Pagination.LastTrigger />
    </Pagination>
  ),
};

/** Documentation/visual-regression reference — boundary states: first page and last page. */
export const Boundaries: Story = {
  render: () => (
    <div className="flex flex-col gap-stack-lg">
      <Pagination count={100} defaultPageSize={10} defaultPage={1}>
        <Pagination.FirstTrigger />
        <Pagination.PrevTrigger />
        <Pages />
        <Pagination.NextTrigger />
        <Pagination.LastTrigger />
      </Pagination>
      <Pagination count={100} defaultPageSize={10} defaultPage={10}>
        <Pagination.FirstTrigger />
        <Pagination.PrevTrigger />
        <Pages />
        <Pagination.NextTrigger />
        <Pagination.LastTrigger />
      </Pagination>
    </div>
  ),
};

/** Documentation/visual-regression reference — RangeText summary, comma-formatted for a large dataset. */
export const WithRangeText: Story = {
  render: () => (
    <div className="flex items-center gap-stack-lg">
      <Pagination count={1234567} defaultPageSize={20} defaultPage={3}>
        <Pagination.PrevTrigger />
        <Pages />
        <Pagination.NextTrigger />
      </Pagination>
      <Pagination count={1234567} defaultPageSize={20} defaultPage={3}>
        <Pagination.RangeText />
      </Pagination>
    </div>
  ),
};
