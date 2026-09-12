import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const binaryName = process.platform === "win32" ? "server.exe" : "server";
const binary = path.join(dir, "..", "dist", binaryName);

const child = spawn(binary, [], {
  stdio: "inherit",
  env: { ...process.env, GIN_MODE: process.env.GIN_MODE ?? "release" },
});
child.on("error", (err) => {
  console.error(`[run-dist] failed to start ${binary}: ${err.message}`);
  console.error("[run-dist] run `pnpm --filter @tgb-resolver/server run build` first.");
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => child.kill(sig));
}
