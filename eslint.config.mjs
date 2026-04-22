import eslintConfigNext from "eslint-config-next"

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...eslintConfigNext,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "pnpm-lock.yaml",
      "**/*.gz",
      "**/*.png",
      "**/*.jpg",
    ],
  },
  {
    rules: {
      // Syncing props → local form state in useEffect is standard for By Red OS forms;
      // React 19 compiler rule set-state-in-effect rejects many valid patterns.
      "react-hooks/set-state-in-effect": "off",
      // shadcn skeleton uses Math.random in useMemo — legitimately impure for placeholder width.
      "react-hooks/purity": "off",
    },
  },
]

export default config
