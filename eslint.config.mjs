import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      // Artefacts build / Prisma — ne pas linter (CommonJS, require, types générés)
      "backend/dist/**",
      "backend/src/generated/**",
      // Config PM2 (CommonJS + require) — hors périmètre TypeScript/ESM du projet
      "ecosystem.config.cjs",
    ],
  },
];

export default eslintConfig;
