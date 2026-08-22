import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Pagination } from "./Pagination";

function TenPages(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  return (
    <Pagination count={100} defaultPageSize={10} {...props}>
      <Pagination.PrevTrigger />
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
      <Pagination.NextTrigger />
    </Pagination>
  );
}

describe("Pagination", () => {
  it("renders a nav landmark labeled 'pagination' by default", () => {
    render(<TenPages />);
    expect(screen.getByRole("navigation", { name: "pagination" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current and data-selected", () => {
    render(<TenPages defaultPage={1} />);
    const pageOne = screen.getByRole("button", { name: "page 1" });
    expect(pageOne).toHaveAttribute("aria-current", "page");
    expect(pageOne).toHaveAttribute("data-selected", "");
    expect(screen.getByRole("button", { name: "page 2" })).not.toHaveAttribute("aria-current");
  });

  it("moves to the clicked page and calls onPageChange", async () => {
    const onPageChange = vi.fn();
    render(<TenPages defaultPage={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "page 3" }));
    expect(onPageChange).toHaveBeenCalledWith({ page: 3, pageSize: 10 });
    expect(screen.getByRole("button", { name: "page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("supports a controlled page: onPageChange fires, and a rerender with the new value is reflected", async () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<TenPages page={1} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "page 2" }));
    expect(onPageChange).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
    expect(screen.getByRole("button", { name: "page 1" })).toHaveAttribute("aria-current", "page");
    rerender(<TenPages page={2} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("disables the previous trigger on the first page and the next trigger on the last page", () => {
    render(<TenPages defaultPage={1} />);
    expect(screen.getByRole("button", { name: "previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "next page" })).not.toBeDisabled();
  });

  it("disables the next trigger on the last page", () => {
    render(<TenPages defaultPage={10} />);
    expect(screen.getByRole("button", { name: "next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "previous page" })).not.toBeDisabled();
  });

  it("jumps to the first/last page via First/Last triggers", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination count={100} defaultPageSize={10} defaultPage={5} onPageChange={onPageChange}>
        <Pagination.FirstTrigger />
        <Pagination.PrevTrigger />
        <Pagination.NextTrigger />
        <Pagination.LastTrigger />
      </Pagination>,
    );
    await userEvent.click(screen.getByRole("button", { name: "last page" }));
    expect(onPageChange).toHaveBeenCalledWith({ page: 10, pageSize: 10 });
    await userEvent.click(screen.getByRole("button", { name: "first page" }));
    expect(onPageChange).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("renders an ellipsis when the page range is truncated", () => {
    render(
      <Pagination count={200} defaultPageSize={10} defaultPage={10}>
        <Pagination.Context>
          {(api) =>
            api.pages.map((page, index) =>
              page.type === "page" ? (
                <Pagination.Item key={index} value={page.value}>
                  {page.value}
                </Pagination.Item>
              ) : (
                <Pagination.Ellipsis key={index} index={index}>
                  …
                </Pagination.Ellipsis>
              ),
            )
          }
        </Pagination.Context>
      </Pagination>,
    );
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
  });

  it("renders the RangeText summary, comma-formatted for large counts", () => {
    render(
      <Pagination count={1234567} defaultPageSize={20} defaultPage={2}>
        <Pagination.RangeText />
      </Pagination>,
    );
    expect(screen.getByText("21–40 of 1,234,567")).toBeInTheDocument();
  });

  it("clamps the RangeText end to count on the last, partial page", () => {
    render(
      <Pagination count={95} defaultPageSize={20} defaultPage={5}>
        <Pagination.RangeText />
      </Pagination>,
    );
    expect(screen.getByText("81–95 of 95")).toBeInTheDocument();
  });

  it("shows a 0-0 range for zero results", () => {
    render(
      <Pagination count={0} defaultPageSize={20}>
        <Pagination.RangeText />
      </Pagination>,
    );
    expect(screen.getByText("0–0 of 0")).toBeInTheDocument();
  });

  it("lets a consumer override the RangeText format", () => {
    render(
      <Pagination count={50} defaultPageSize={10} defaultPage={1}>
        <Pagination.RangeText format={({ start, end, count }) => `${start}-${end} / ${count}`} />
      </Pagination>,
    );
    expect(screen.getByText("1-10 / 50")).toBeInTheDocument();
  });

  it("lets a consumer className override the default item styling via tailwind-merge", () => {
    render(
      <Pagination count={30} defaultPageSize={10}>
        <Pagination.Item value={1} className="bg-status-error">
          1
        </Pagination.Item>
      </Pagination>,
    );
    const item = screen.getByRole("button", { name: "page 1" });
    expect(item).toHaveClass("bg-status-error");
  });

  it("accepts ref as a plain prop pointing at the root nav element", () => {
    let node: HTMLElement | null = null;
    render(
      <Pagination
        count={30}
        defaultPageSize={10}
        ref={(el) => {
          node = el;
        }}
      >
        <Pagination.Item value={1}>1</Pagination.Item>
      </Pagination>,
    );
    expect(node).toBeInstanceOf(HTMLElement);
  });

  it("supports tab/Enter keyboard activation of a page item", async () => {
    const onPageChange = vi.fn();
    render(<TenPages defaultPage={1} onPageChange={onPageChange} />);
    screen.getByRole("button", { name: "page 2" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onPageChange).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
  });

  it("passes an axe scan across a few-pages case, a many-pages truncated case, and the boundaries", async () => {
    const { container } = render(
      <div>
        <TenPages defaultPage={1} aria-label="Ten pages, page 1" />
        <TenPages defaultPage={10} aria-label="Ten pages, page 10" />
        <Pagination
          count={2000}
          defaultPageSize={10}
          defaultPage={50}
          aria-label="Many pages, truncated"
        >
          <Pagination.FirstTrigger />
          <Pagination.PrevTrigger />
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
          <Pagination.NextTrigger />
          <Pagination.LastTrigger />
          <Pagination.RangeText />
        </Pagination>
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
