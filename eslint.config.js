import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
