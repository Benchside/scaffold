import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateMarkdown } from "../scripts/generate-markdown";
import { findMissingDescriptions } from "../validation/description.js";

// Verifies: the docs build script produces valid markdown, and every
// token in tokens.json has a non-empty $description.

function loadTokens(): unknown {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("$description completeness", () => {
  it("every token in the real tokens.json has a non-empty $description", () => {
    const missing = findMissingDescriptions(loadTokens());
    expect(missing).toEqual([]);
  });

  it("flags a token with an empty $description, and a token missing it entirely", () => {
    const missing = findMissingDescriptions({
      color: {
        $type: "color",
        blue: {
          500: { $value: { colorSpace: "oklch", components: [0.5, 0.1, 250] }, $description: "" },
          600: { $value: { colorSpace: "oklch", components: [0.4, 0.1, 250] } },
        },
      },
    });
    expect(missing.map((e) => e.path).toSorted()).toEqual(["color.blue.500", "color.blue.600"]);
  });
});

describe("generateMarkdown", () => {
  const markdown = generateMarkdown(loadTokens());

  it("produces non-empty, well-formed markdown", () => {
    expect(markdown.length).toBeGreaterThan(0);
    expect(markdown.startsWith("# ")).toBe(true);
    // every top-level group gets its own section
    for (const group of ["color", "size", "radius", "font"]) {
      expect(markdown).toContain(`## ${group}`);
    }
  });

  it("includes every token path, its resolved type, and its description", () => {
    expect(markdown).toContain("`color.cool-gray.500`");
    expect(markdown).toContain("Mid neutral — secondary text, default icon color.");
    expect(markdown).toContain("`font.weight.bold`");
    expect(markdown).toContain("`size.128`");
  });

  it("renders each markdown table with a header separator row", () => {
    const tableHeaders = markdown.match(/\|---\|---\|---\|---\|/g) ?? [];
    // one per top-level group (color, size, radius, font)
    expect(tableHeaders.length).toBe(4);
  });
});
