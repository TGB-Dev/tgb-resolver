import { execFile } from "node:child_process";

const binary = process.platform === "win32" ? "dist/server.exe" : "dist/server";
const child = execFile(binary, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
