import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Toast, useToast } from "./Toast";

function Harness() {
  const toast = useToast();
  return (
    <div>
      <Toast.Toaster />
      <button type="button" onClick={() => toast.success({ title: "Calibration complete" })}>
        Fire success
      </button>
      <button type="button" onClick={() => toast.info({ title: "Export started" })}>
        Fire info
      </button>
      <button type="button" onClick={() => toast.warning({ title: "Sensor drifting" })}>
        Fire warning
      </button>
      <button type="button" onClick={() => toast.error({ title: "Run failed" })}>
        Fire error
      </button>
      <button type="button" onClick={() => toast.clear()}>
        Clear
      </button>
    </div>
  );
}

function ExplicitDurationHarness() {
  const toast = useToast();
  return (
    <div>
      <Toast.Toaster />
      <button type="button" onClick={() => toast.error({ title: "Run failed", duration: 1000 })}>
        Fire timed error
      </button>
    </div>
  );
}

/**
 * zag's internal dismiss timer drives itself off `performance.now()`, not
 * just `requestAnimationFrame` — vitest's fake-timer default doesn't fake
 * `performance`, so without this the rAF loop keeps firing but its
 * elapsed-time math stays pinned near 0 forever and the timer never
 * "elapses" no matter how far fake time is advanced.
 */
function useFakeToastTimers() {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
}

/**
 * Advances fake time in small steps rather than one big jump: React's effect
 * scheduler needs a chance to flush between requestAnimationFrame ticks, and
 * a single huge jump starves it of that chance.
 */
async function advanceInSteps(totalMs: number, stepMs = 100) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    await vi.advanceTimersByTimeAsync(stepMs);
  }
}

describe("Toast", () => {
  beforeEach(() => {
    // The toaster is a module-level store shared across every test in this
    // file (consumers call useToast() from anywhere without a Provider), so
    // each test starts by clearing any toast left over from the previous
    // one. Unmounted explicitly (rather than relying on RTL's automatic
    // afterEach cleanup) so this render is gone before the test's own
    // render mounts — otherwise both "Clear" buttons coexist and every
    // query in the test becomes ambiguous.
    const { getByRole, unmount } = render(<Harness />);
    getByRole("button", { name: "Clear" }).click();
    unmount();
  });

  it("assigns role=status to a success toast", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Fire success" }).click();
    const toastEl = await screen.findByRole("status");
    expect(toastEl).toHaveTextContent("Calibration complete");
  });

  it("assigns role=status to an info toast", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Fire info" }).click();
    const toastEl = await screen.findByRole("status");
    expect(toastEl).toHaveTextContent("Export started");
  });

  it("assigns role=alert to a warning toast", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Fire warning" }).click();
    const toastEl = await screen.findByRole("alert");
    expect(toastEl).toHaveTextContent("Sensor drifting");
  });

  it("assigns role=alert to an error toast", async () => {
    render(<Harness />);
    screen.getByRole("button", { name: "Fire error" }).click();
    const toastEl = await screen.findByRole("alert");
    expect(toastEl).toHaveTextContent("Run failed");
  });

  it("passes an axe scan while a toast is visible", async () => {
    const { container } = render(<Harness />);
    screen.getByRole("button", { name: "Fire error" }).click();
    await screen.findByRole("alert");
    expect((await axe(container)).violations.length).toBe(0);
  });

  it("auto-dismisses a success toast after its default duration", async () => {
    useFakeToastTimers();
    try {
      render(<Harness />);
      screen.getByRole("button", { name: "Fire success" }).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.getByRole("status")).toBeInTheDocument();
      // zag's success default is 2000ms visible + 200ms removeDelay exit;
      // padded further since the two run back-to-back (dismiss fires near
      // the 2000ms mark, then removeDelay only starts counting from there).
      await advanceInSteps(3000);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-dismiss an error toast by default", async () => {
    useFakeToastTimers();
    try {
      render(<Harness />);
      screen.getByRole("button", { name: "Fire error" }).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      await advanceInSteps(10_000);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("auto-dismisses an error toast when an explicit duration is passed", async () => {
    useFakeToastTimers();
    try {
      render(<ExplicitDurationHarness />);
      screen.getByRole("button", { name: "Fire timed error" }).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      // 1000ms explicit duration + 200ms removeDelay, padded for the same
      // back-to-back reason as the success-toast test above.
      await advanceInSteps(2000);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
