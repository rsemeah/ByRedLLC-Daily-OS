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
  {
    // Next.js only inlines `process.env.NEXT_PUBLIC_*` when accessed as a literal
    // property. `process.env[name]` (bracket + non-literal) silently ships an
    // undefined value to the client bundle and blows up at runtime with
    // "Missing required environment variable". Ban that access shape in files
    // that can end up in a client bundle or in the shared Supabase + proxy layer.
    files: [
      "lib/supabase/**/*.{ts,tsx}",
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "proxy.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[computed=true][object.object.name='process'][object.property.name='env']",
          message:
            "Use literal access (process.env.NAME) — bracket access prevents Next.js from inlining NEXT_PUBLIC_* vars into the client bundle.",
        },
      ],
    },
  },
]

export default config
