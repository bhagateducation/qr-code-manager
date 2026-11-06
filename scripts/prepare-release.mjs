import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = process.cwd();
const destination = resolve(
  root,
  "release",
  new Date().toISOString().replaceAll(":", "-"),
);
await mkdir(destination, { recursive: true });
const entries = [
  "app",
  "lib",
  "prisma",
  "scripts/bootstrap.mjs",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "next-env.d.ts",
  "tsconfig.json",
  "tailwind.config.ts",
  "postcss.config.js",
  ".env.example",
];
for (const entry of entries) {
  await mkdir(resolve(destination, entry, ".."), { recursive: true });
  await cp(join(root, entry), join(destination, entry), { recursive: true });
}
await mkdir(join(destination, "components"), { recursive: true });
for (const entry of [
  "AuthForm.tsx",
  "Dashboard.tsx",
  "QRStudio.tsx",
  "Systems.tsx",
  "PasswordSettings.tsx",
])
  await cp(
    join(root, "components", entry),
    join(destination, "components", entry),
  );
// Only a clean allowlist is copied. Never copy .env, database files, node_modules,
// the legacy demo HTML/JS/archive, .next, credentials or private bootstrap data.
await writeFile(
  join(destination, "RELEASE-NOTES.txt"),
  "QR Manager foundation. Run npm ci, npm run db:migrate, npm run build. See the repository docs/DEPLOYMENT.md. Payment and email launch gates remain.\n",
);
console.log(destination);
