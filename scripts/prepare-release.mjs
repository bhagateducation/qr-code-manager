import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = process.cwd();
const destination = resolve(root, "release", "qr-manager");
// Only a clean allowlist is copied. Never copy .env, database files, node_modules,
// .next, tests, credentials or private bootstrap data.
const entries = [
  "app",
  "components",
  "lib",
  "prisma",
  "docs",
  "scripts",
  "README.md",
  "PRODUCT.md",
  "DESIGN.md",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "next-env.d.ts",
  "tsconfig.json",
  ".env.example",
];
for (const entry of entries) {
  await mkdir(resolve(destination, entry, ".."), { recursive: true });
  await cp(join(root, entry), join(destination, entry), { recursive: true });
}
await writeFile(
  join(destination, "RELEASE-NOTES.txt"),
  "QR Manager. Run npm ci, set the environment from .env.example, then npm run build and npm start. See docs/DEPLOYMENT.md.\n",
);
console.log(destination);
