import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { computeNextActiveCell, useDataTableKeyboardNav } from "./useDataTableKeyboardNav";

const rowIds = ["r1", "r2", "r3", "r4", "r5"];
const columnIds = ["a", "b", "c"];
const grid = { rowIds, columnIds };

describe("computeNextActiveCell", () => {
  it("moves down a row on ArrowDown", () => {
    expect(computeNextActiveCell(grid, { rowId: "r1", columnId: "b" }, "ArrowDown", 2)).toEqual({
      rowId: "r2",
      columnId: "b",
    });
  });

  it("clamps at the last row on ArrowDown", () => {
    expect(computeNextActiveCell(grid, { rowId: "r5", columnId: "b" }, "ArrowDown", 2)).toEqual({
      rowId: "r5",
      columnId: "b",
    });
  });

  it("moves up a row on ArrowUp", () => {
    expect(computeNextActiveCell(grid, { rowId: "r3", columnId: "a" }, "ArrowUp", 2)).toEqual({
      rowId: "r2",
      columnId: "a",
    });
  });

  it("clamps at the first row on ArrowUp", () => {
    expect(computeNextActiveCell(grid, { rowId: "r1", columnId: "a" }, "ArrowUp", 2)).toEqual({
      rowId: "r1",
      columnId: "a",
    });
  });

  it("moves right a column on ArrowRight, without wrapping to the next row", () => {
    expect(computeNextActiveCell(grid, { rowId: "r2", columnId: "a" }, "ArrowRight", 2)).toEqual({
      rowId: "r2",
      columnId: "b",
    });
    expect(computeNextActiveCell(grid, { rowId: "r2", columnId: "c" }, "ArrowRight", 2)).toEqual({
      rowId: "r2",
      columnId: "c",
    });
  });

  it("moves left a column on ArrowLeft, without wrapping to the previous row", () => {
    expect(computeNextActiveCell(grid, { rowId: "r2", columnId: "c" }, "ArrowLeft", 2)).toEqual({
      rowId: "r2",
      columnId: "b",
    });
    expect(computeNextActiveCell(grid, { rowId: "r2", columnId: "a" }, "ArrowLeft", 2)).toEqual({
      rowId: "r2",
      columnId: "a",
    });
  });

  it("moves to the first column in the row on Home", () => {
    expect(computeNextActiveCell(grid, { rowId: "r3", columnId: "c" }, "Home", 2)).toEqual({
      rowId: "r3",
      columnId: "a",
    });
  });

  it("moves to the last column in the row on End", () => {
    expect(computeNextActiveCell(grid, { rowId: "r3", columnId: "a" }, "End", 2)).toEqual({
      rowId: "r3",
      columnId: "c",
    });
  });

  it("moves to the first cell of the grid on ctrl+Home", () => {
    expect(computeNextActiveCell(grid, { rowId: "r4", columnId: "c" }, "ctrl+Home", 2)).toEqual({
      rowId: "r1",
      columnId: "a",
    });
  });

  it("moves to the last cell of the grid on ctrl+End", () => {
    expect(computeNextActiveCell(grid, { rowId: "r1", columnId: "a" }, "ctrl+End", 2)).toEqual({
      rowId: "r5",
      columnId: "c",
    });
  });

  it("moves down by pageSize rows on PageDown, clamped at the last row", () => {
    expect(computeNextActiveCell(grid, { rowId: "r1", columnId: "b" }, "PageDown", 2)).toEqual({
      rowId: "r3",
      columnId: "b",
    });
    expect(computeNextActiveCell(grid, { rowId: "r4", columnId: "b" }, "PageDown", 2)).toEqual({
      rowId: "r5",
      columnId: "b",
    });
  });

  it("moves up by pageSize rows on PageUp, clamped at the first row", () => {
    expect(computeNextActiveCell(grid, { rowId: "r5", columnId: "b" }, "PageUp", 2)).toEqual({
      rowId: "r3",
      columnId: "b",
    });
    expect(computeNextActiveCell(grid, { rowId: "r2", columnId: "b" }, "PageUp", 2)).toEqual({
      rowId: "r1",
      columnId: "b",
    });
  });

  it("returns the first cell when there is no current active cell", () => {
    expect(computeNextActiveCell(grid, null, "ArrowDown", 2)).toEqual({
      rowId: "r1",
      columnId: "a",
    });
  });

  it("returns null for an empty grid", () => {
    expect(computeNextActiveCell({ rowIds: [], columnIds: [] }, null, "ArrowDown", 2)).toBeNull();
  });
});

describe("useDataTableKeyboardNav", () => {
  it("defaults activeCell to the grid's first cell", () => {
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
    expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" });
  });

  it("defaults activeCell to null for an empty grid", () => {
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds: [], columnIds: [] }));
    expect(result.current.activeCell).toBeNull();
  });

  it("reports isActive true only for the current active cell", () => {
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
    expect(result.current.isActive("r1", "a")).toBe(true);
    expect(result.current.isActive("r1", "b")).toBe(false);
    expect(result.current.isActive("r2", "a")).toBe(false);
  });

  it("updates activeCell and isActive when setActiveCell is called", () => {
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
    act(() => result.current.setActiveCell({ rowId: "r3", columnId: "b" }));
    expect(result.current.activeCell).toEqual({ rowId: "r3", columnId: "b" });
    expect(result.current.isActive("r3", "b")).toBe(true);
    expect(result.current.isActive("r1", "a")).toBe(false);
  });

  it("moves DOM focus to the newly active cell's registered element", () => {
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
    const el1 = document.createElement("div");
    el1.tabIndex = -1;
    const el2 = document.createElement("div");
    el2.tabIndex = -1;
    document.body.append(el1, el2);
    const focusSpy2 = vi.spyOn(el2, "focus");

    act(() => result.current.registerCell("r1", "a", el1));
    act(() => result.current.registerCell("r2", "a", el2));
    act(() => result.current.setActiveCell({ rowId: "r2", columnId: "a" }));

    expect(focusSpy2).toHaveBeenCalled();
    el1.remove();
    el2.remove();
  });

  it("setActiveCell is a no-op (same object, no re-focus) when the cell is unchanged", () => {
    // Regression test: a second grid mounted on the same page calling
    // setActiveCell for its own already-active cell must not create a new
    // activeCell reference — otherwise it re-runs the focus effect and
    // re-focuses, which (with more than one grid) can steal focus back and
    // forth between them indefinitely (see the focus-management effect's
    // own comment in useDataTableKeyboardNav.ts).
    const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
    const el1 = document.createElement("div");
    el1.tabIndex = -1;
    document.body.append(el1);
    act(() => result.current.registerCell("r1", "a", el1));

    const before = result.current.activeCell;
    const focusSpy = vi.spyOn(el1, "focus");

    act(() => result.current.setActiveCell({ rowId: "r1", columnId: "a" }));

    expect(result.current.activeCell).toBe(before);
    expect(focusSpy).not.toHaveBeenCalled();
    el1.remove();
  });

  describe("editing", () => {
    it("starts with editingCell null and isEditing false everywhere", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
      expect(result.current.editingCell).toBeNull();
      expect(result.current.isEditing("r1", "a")).toBe(false);
    });

    it("startEditing enters edit mode on the current active cell", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
      act(() => result.current.setActiveCell({ rowId: "r2", columnId: "b" }));
      act(() => result.current.startEditing());
      expect(result.current.editingCell).toEqual({ rowId: "r2", columnId: "b" });
      expect(result.current.isEditing("r2", "b")).toBe(true);
      expect(result.current.isEditing("r1", "a")).toBe(false);
    });

    it("stopEditing clears edit mode without changing the active cell", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
      act(() => result.current.startEditing());
      act(() => result.current.stopEditing());
      expect(result.current.editingCell).toBeNull();
      expect(result.current.activeCell).toEqual({ rowId: "r1", columnId: "a" });
    });

    it("moving the active cell away implicitly clears edit mode", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
      act(() => result.current.startEditing());
      act(() => result.current.setActiveCell({ rowId: "r2", columnId: "a" }));
      expect(result.current.editingCell).toBeNull();
    });

    it("startEditing is a no-op when there is no active cell", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds: [], columnIds: [] }));
      act(() => result.current.startEditing());
      expect(result.current.editingCell).toBeNull();
    });

    it("activateAndEdit makes its target both the active and the editing cell in one step", () => {
      const { result } = renderHook(() => useDataTableKeyboardNav({ rowIds, columnIds }));
      // Default active cell is r1/a — targets a different cell to prove
      // this doesn't route through (or depend on) the current activeCell,
      // unlike startEditing.
      act(() => result.current.activateAndEdit({ rowId: "r2", columnId: "b" }));
      expect(result.current.activeCell).toEqual({ rowId: "r2", columnId: "b" });
      expect(result.current.editingCell).toEqual({ rowId: "r2", columnId: "b" });
      expect(result.current.isEditing("r2", "b")).toBe(true);
    });
  });
});
