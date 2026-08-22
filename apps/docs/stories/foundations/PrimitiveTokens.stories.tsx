import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tokens } from "@benchside/scaffold-tokens";

// Renders directly off the actual `Tokens` export — not a hand-copied
// palette — so this can't drift out of sync with tokens.json. Add a
// family/step/scale entry there and it shows up here automatically.

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

function ColorScale() {
  const families = Object.keys(Tokens.color);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {families.map((family) => (
        <div key={family} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 88, fontSize: 13, fontFamily: "monospace", flexShrink: 0 }}>
            {family}
          </div>
          <div style={{ display: "flex", flex: 1 }}>
            {STEPS.map((step) => {
              const value = (Tokens.color as Record<string, Record<string, string>>)[family]?.[
                step
              ];
              if (!value) return <div key={step} style={{ flex: 1 }} />;
              return (
                <div
                  key={step}
                  title={`${family}-${step}: ${value}`}
                  style={{
                    flex: 1,
                    height: 32,
                    background: value,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 9, color: "var(--color-text-secondary)", marginBottom: 2 }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpacingScale() {
  const entries = Object.entries(Tokens.size).sort(([a], [b]) => Number(a) - Number(b));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 60, fontSize: 12, fontFamily: "monospace" }}>{value}</div>
          <div style={{ height: 12, background: "currentColor", width: value }} />
        </div>
      ))}
    </div>
  );
}

function RadiusScale() {
  const entries = Object.entries(Tokens.radius);
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "currentColor",
              opacity: 0.15,
              border: "2px solid currentColor",
              borderRadius: value,
            }}
          />
          <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 4 }}>{key}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function TypeScale() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(Tokens.font.size).map(([key, value]) => (
        <div key={key} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ width: 40, fontSize: 12, fontFamily: "monospace", opacity: 0.6 }}>
            {key}
          </div>
          <div style={{ fontSize: value, fontFamily: Tokens.font.family.sans }}>
            The quick brown fox
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "Foundations/Primitive Tokens",
  tags: ["!autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  name: "Color scales",
  render: () => <ColorScale />,
};

export const Spacing: Story = {
  name: "Spacing scale",
  render: () => <SpacingScale />,
};

export const Radius: Story = {
  name: "Radius scale",
  render: () => <RadiusScale />,
};

export const Typography: Story = {
  name: "Type scale",
  render: () => <TypeScale />,
};
