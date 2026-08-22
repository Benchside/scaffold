// Auto-generates a markdown token reference from tokens.json. Walks the
// same token/group tree as resolve-type.ts (with the same
// $type-inheritance resolution), but collects a flat row per token instead
// of just flagging errors.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface TokenRow {
  path: string;
  type: string;
  value: unknown;
  description: string;
}

function collectRows(
  node: Record<string, unknown>,
  path: string,
  inheritedType: string | undefined,
  rows: TokenRow[],
): void {
  const ownType = typeof node.$type === "string" ? node.$type : undefined;
  const effectiveType = ownType ?? inheritedType;
  const isToken = Object.prototype.hasOwnProperty.call(node, "$value");

  if (isToken) {
    rows.push({
      path,
      type: effectiveType ?? "unknown",
      value: node.$value,
      description: typeof node.$description === "string" ? node.$description : "",
    });
    return;
  }

  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (isPlainObject(child)) {
      collectRows(child, path ? `${path}.${key}` : key, effectiveType, rows);
    }
  }
}

function formatValue(type: string, value: unknown): string {
  if (type === "color" && isPlainObject(value)) {
    const { colorSpace, components } = value as { colorSpace: unknown; components: unknown };
    if (Array.isArray(components)) {
      return `${String(colorSpace)}(${components.join(" ")})`;
    }
  }
  if (type === "dimension" && isPlainObject(value)) {
    const { value: n, unit } = value as { value: unknown; unit: unknown };
    return `${String(n)}${String(unit)}`;
  }
  if (type === "fontFamily" && Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  return JSON.stringify(value);
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** Renders one markdown table per top-level token group (color, size, radius, font, ...). */
export function generateMarkdown(tokens: unknown): string {
  const rows: TokenRow[] = [];
  if (isPlainObject(tokens)) {
    collectRows(tokens, "", undefined, rows);
  }

  const groups = new Map<string, TokenRow[]>();
  for (const row of rows) {
    const groupName = row.path.split(".")[0] ?? row.path;
    const list = groups.get(groupName) ?? [];
    list.push(row);
    groups.set(groupName, list);
  }

  const lines: string[] = [
    "# @benchside/scaffold — Token Reference",
    "",
    "Auto-generated from `tokens.json`. Do not edit by hand — run the generator script instead.",
    "",
  ];

  for (const groupName of [...groups.keys()].toSorted()) {
    const groupRows = groups.get(groupName);
    if (!groupRows) continue;
    lines.push(
      `## ${groupName}`,
      "",
      "| Token | Type | Value | Description |",
      "|---|---|---|---|",
    );
    for (const row of groupRows) {
      lines.push(
        `| \`${escapeCell(row.path)}\` | ${escapeCell(row.type)} | \`${escapeCell(formatValue(row.type, row.value))}\` | ${escapeCell(row.description)} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
