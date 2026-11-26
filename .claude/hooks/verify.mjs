// PostToolUse hook : vérifie le sous-projet touché (cargo check / tsc). Exit 2 = erreur renvoyée à Claude.
import { execSync } from "node:child_process";

let raw = "";
for await (const c of process.stdin) raw += c;
let p = "";
try { p = (JSON.parse(raw).tool_input?.file_path ?? "").replace(/\\/g, "/"); } catch { process.exit(0); }

const cmd = /\/backend\/.*\.rs$/.test(p) ? "cargo check --manifest-path backend/Cargo.toml --quiet"
          : /\/frontend\/src\/.*\.tsx?$/.test(p) ? "npx tsc -p frontend/tsconfig.app.json --noEmit"
          : null;
if (!cmd) process.exit(0);

try {
  execSync(cmd, { stdio: "pipe", cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd() });
} catch (e) {
  process.stderr.write(`${cmd} a échoué :\n${e.stdout ?? ""}${e.stderr ?? ""}`.slice(0, 4000));
  process.exit(2);
}
