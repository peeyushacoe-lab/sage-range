import nextConfig from "eslint-config-next";

const eslintConfig = [
  // Exclude build artifacts, codegen output, and internal tooling from linting
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".claude/**",
    ],
  },
  ...nextConfig,
  // React 19 compiler rules — designed for the React Compiler (Forget) opt-in.
  // This codebase does not use the compiler, so these rules produce false positives
  // for valid React patterns (Date.now in render, setState in init effects, etc.).
  // Re-enable when the project adopts the React Compiler.
  {
    rules: {
      "react-hooks/purity":              "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components":   "off",
      "react-hooks/immutability":        "off",
      "react-hooks/refs":                "off",
    },
  },
];

export default eslintConfig;
