import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";

// jsdom has no ResizeObserver — Ark UI's Tabs indicator (and any future
// resize-aware primitive) needs one to observe trigger rects.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no scrollable-element layout, so Element.scrollTo is missing —
// Ark UI's Select scrolls its listbox content on open/highlight change.
Element.prototype.scrollTo ??= function scrollTo() {};
