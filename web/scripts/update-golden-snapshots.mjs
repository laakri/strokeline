import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const vitestCli = path.join(webRoot, "node_modules", "vitest", "vitest.mjs")
const result = spawnSync(
  process.execPath,
  [vitestCli, "run", "src/renderer/__tests__/goldenFrames.test.ts"],
  {
    cwd: webRoot,
    env: { ...process.env, UPDATE_GOLDEN_SNAPSHOTS: "1" },
    stdio: "inherit",
  }
)

process.exit(result.status ?? 1)
