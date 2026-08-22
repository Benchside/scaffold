export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "test", "refactor", "perf", "docs", "chore", "ci"]],
    "scope-empty": [0, "never"], // scope is optional, not required
  },
};
