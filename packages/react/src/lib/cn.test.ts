import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a semantic text-color class alongside an unrelated typography role class", () => {
    expect(cn("text-body-sm", "text-status-warning")).toContain("text-body-sm");
    expect(cn("text-body-sm", "text-status-warning")).toContain("text-status-warning");
  });

  it("still resolves conflicting classes within the same group in the consumer's favor", () => {
    expect(cn("text-status-warning", "text-status-error")).toBe("text-status-error");
    expect(cn("text-body", "text-body-sm")).toBe("text-body-sm");
  });

  it("collapses a role-based padding shorthand over the axis classes it supersedes", () => {
    expect(cn("px-inset-lg", "py-inset-sm", "p-inset-lg")).toBe("p-inset-lg");
  });

  it("still resolves conflicting classes within the same spacing role/axis", () => {
    expect(cn("gap-inline-sm", "gap-inline-md")).toBe("gap-inline-md");
  });
});
