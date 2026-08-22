// Test-only helper: runs the real Tailwind v4 engine (`@tailwindcss/postcss`)
// over a fixture entry CSS file, the same engine a consuming app's own
// build would use. Not part of the package's public surface.
import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

export async function compileFixture(fixturePath: string): Promise<string> {
  const css = readFileSync(fixturePath, "utf-8");
  const result = await postcss([tailwindcss()]).process(css, {
    from: fixturePath,
    to: path.join(path.dirname(fixturePath), "out.css"),
  });
  return result.css;
}
