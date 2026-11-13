import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, RAYON_NUM_THREADS: "1", UV_THREADPOOL_SIZE: "2" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
