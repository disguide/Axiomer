import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["server/app.mjs"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev:web"], { stdio: "inherit" }),
];
const stop = () => children.forEach((c) => c.kill("SIGTERM"));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stop();
    process.exit(0);
  });
for (const child of children)
  child.on("exit", (code) => {
    stop();
    process.exit(code || 0);
  });
