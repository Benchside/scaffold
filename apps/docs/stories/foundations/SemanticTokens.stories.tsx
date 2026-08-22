import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

// The semantic layer (light.css/dark.css/typography.css/spacing.css) is
// pure CSS — there's no JS export to iterate the way
// PrimitiveTokens.stories.tsx does for the primitive palette. The
// variable *names* below are the semantic layer's stable public contract
// (the same names every component references), so listing them is
// reasonable; the *values* are read live via `getComputedStyle` rather
// than copied in, so a retuned token can't go stale here.

function useResolvedVar(varName: string): string {
  const [value, setValue] = useState("");
  useEffect(() => {
    const read = () =>
      setValue(getComputedStyle(document.documentElement).getPropertyValue(varName).trim());
    read();
    // Re-read on theme toggle: the toolbar decorator mutates `data-theme`
    // on <html>, which doesn't itself trigger a React re-render here.
    // Typography/spacing don't vary by theme, but color does, and this
    // hook is shared across all three sections below.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [varName]);
  return value;
}

const COLOR_GROUPS: Record<string, string[]> = {
  Surface: ["bg-base", "bg-subtle", "bg-elevated", "bg-overlay", "bg-hover", "bg-inverse"],
  Text: ["text-primary", "text-secondary", "text-disabled", "text-placeholder", "text-inverse"],
  Border: ["border-default", "border-strong", "border-focus", "border-error"],
  Accent: ["accent-default", "accent-hover", "accent-active", "accent-subtle", "accent-text"],
  Status: [
    "status-success",
    "status-success-bg",
    "status-warning",
    "status-warning-bg",
    "status-error",
    "status-error-bg",
    "status-info",
    "status-info-bg",
    "status-neutral",
    "status-neutral-bg",
  ],
};

function ColorSwatch({ name }: { name: string }) {
  const resolvedTo = useResolvedVar(`--color-${name}`);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          border: "1px solid var(--color-border-default)",
          background: `var(--color-${name})`,
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 13, fontFamily: "monospace" }}>{name}</div>
        <div style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>{resolvedTo}</div>
      </div>
    </div>
  );
}

function ColorGroups() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {Object.entries(COLOR_GROUPS).map(([group, names]) => (
        <div key={group}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
            {group}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {names.map((name) => (
              <ColorSwatch key={name} name={name} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Every role typography.css declares — a composite of family/size/
// weight/line-height/letter-spacing, exposed as one `--font-<role>`
// shorthand. Letter-spacing isn't part of the CSS `font` shorthand
// grammar (a hard CSS limitation, not a Scaffold gap — see
// typography.css's own header), so it's applied as a second declaration
// here, same as a real component would.
const FONT_ROLES = [
  "heading-1",
  "heading-2",
  "heading-3",
  "heading-4",
  "body-lg",
  "body",
  "body-sm",
  "label",
  "label-lg",
  "caption",
  "data",
  "code",
  "code-lg",
];

function TypeSpecimen({ role }: { role: string }) {
  const shorthand = useResolvedVar(`--font-${role}`);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        borderBottom: "1px solid var(--color-border-default)",
        paddingBottom: 8,
      }}
    >
      <div
        style={{ width: 72, fontSize: 12, fontFamily: "monospace", opacity: 0.6, flexShrink: 0 }}
      >
        {role}
      </div>
      <div
        style={{
          font: `var(--font-${role})`,
          letterSpacing: `var(--font-${role}-letter-spacing)`,
          color: "var(--color-text-primary)",
        }}
      >
        The quick brown fox jumps
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace", marginLeft: "auto" }}>
        {shorthand}
      </div>
    </div>
  );
}

function TypeRoles() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {FONT_ROLES.map((role) => (
        <TypeSpecimen key={role} role={role} />
      ))}
    </div>
  );
}

// The three roles spacing.css defines, each a named-step scale chaining
// to a `--size-*` primitive — never a raw px literal. See spacing.css's
// own header for why these three (not raw CSS property names).
const INSET_STEPS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const STACK_STEPS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const INLINE_STEPS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];

function InsetRow({ step }: { step: string }) {
  const value = useResolvedVar(`--space-inset-${step}`);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, fontSize: 12, fontFamily: "monospace", opacity: 0.6 }}>{step}</div>
      <div
        style={{
          display: "inline-block",
          padding: `var(--space-inset-${step})`,
          border: "1px dashed var(--color-border-strong)",
        }}
      >
        <div style={{ width: 24, height: 24, background: "var(--color-accent-subtle)" }} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function StackRow({ step }: { step: string }) {
  const value = useResolvedVar(`--space-stack-${step}`);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, fontSize: 12, fontFamily: "monospace", opacity: 0.6 }}>{step}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: `var(--space-stack-${step})` }}>
        <div style={{ width: 48, height: 8, background: "var(--color-accent-subtle)" }} />
        <div style={{ width: 48, height: 8, background: "var(--color-accent-subtle)" }} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function InlineRow({ step }: { step: string }) {
  const value = useResolvedVar(`--space-inline-${step}`);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, fontSize: 12, fontFamily: "monospace", opacity: 0.6 }}>{step}</div>
      <div style={{ display: "flex", gap: `var(--space-inline-${step})` }}>
        <div style={{ width: 24, height: 24, background: "var(--color-accent-subtle)" }} />
        <div style={{ width: 24, height: 24, background: "var(--color-accent-subtle)" }} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function SpacingRoles() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
          Inset — padding inside a container
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INSET_STEPS.map((step) => (
            <InsetRow key={step} step={step} />
          ))}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
          Stack — vertical gap between stacked elements
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STACK_STEPS.map((step) => (
            <StackRow key={step} step={step} />
          ))}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
          Inline — horizontal gap between inline elements
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INLINE_STEPS.map((step) => (
            <InlineRow key={step} step={step} />
          ))}
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Foundations/Semantic Tokens",
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  name: "Colors (current theme)",
  render: () => <ColorGroups />,
};

export const Typography: Story = {
  name: "Typography",
  render: () => <TypeRoles />,
};

export const Spacing: Story = {
  name: "Spacing (inset / stack / inline)",
  render: () => <SpacingRoles />,
};
