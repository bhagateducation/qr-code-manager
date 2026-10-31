import { chmodSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const enginesDirectory = join(process.cwd(), "node_modules", "@prisma", "engines");

if (process.platform !== "win32" && existsSync(enginesDirectory)) {
  for (const entry of readdirSync(enginesDirectory)) {
    const filePath = join(enginesDirectory, entry);
    if (statSync(filePath).isFile() && (entry.includes("engine") || entry.startsWith("libquery_engine"))) {
      try {
        chmodSync(filePath, 0o755);
      } catch {
        // The build will surface a clear error if the host forbids this change.
      }
    }
  }
}
