import { describe, expect, it } from "vitest";
import { floatingArrowStyle } from "./floating";

describe("floatingArrowStyle", () => {
  it("hides the arrow when there is no position data yet", () => {
    expect(floatingArrowStyle(null)).toEqual({ visibility: "hidden" });
  });

  it("straddles the static side opposite the content's placement by half its size", () => {
    // Content placed above the trigger ("top") — the arrow straddles the
    // content's own bottom edge, pointing down at the trigger.
    expect(floatingArrowStyle({ x: 12, y: undefined, side: "top" })).toMatchObject({
      position: "absolute",
      left: "12px",
      bottom: "-4px",
    });
  });

  it("straddles the left edge when the content is placed to the right", () => {
    expect(floatingArrowStyle({ x: undefined, y: 20, side: "right" })).toMatchObject({
      position: "absolute",
      top: "20px",
      left: "-4px",
    });
  });

  it("scales the straddle offset with a custom arrow size", () => {
    expect(floatingArrowStyle({ x: 0, y: undefined, side: "bottom" }, 10)).toMatchObject({
      top: "-5px",
    });
  });
});
