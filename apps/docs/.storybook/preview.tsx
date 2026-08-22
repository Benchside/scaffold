import type { Decorator, Preview } from "@storybook/react-vite";
import "./preview.css";

// The dark-mode toggle goes through this project's own `[data-theme]`
// cascade (@benchside/scaffold-theme-default), not Storybook's built-in
// dark-mode/backgrounds addon.
const withTheme: Decorator = (Story, context) => {
  document.documentElement.setAttribute("data-theme", String(context.globals.theme ?? "light"));
  return <Story />;
};

const preview: Preview = {
  // Every story gets an autodocs page generated from its component's
  // TypeScript props and JSDoc — no per-story tag or hand-written MDX
  // needed.
  tags: ["autodocs"],
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Global theme applied via [data-theme]",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  parameters: {
    a11y: {
      // Every component must have zero axe violations — fail the story,
      // not just warn, on any violation.
      test: "error",
    },
    options: {
      // Puts the doc pages a first-time reader wants before the component
      // gallery, instead of the default alphabetical order.
      storySort: {
        order: ["Get Started", "Foundations", "Components", "*"],
      },
    },
  },
};

export default preview;
