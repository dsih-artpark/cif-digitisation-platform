import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const children = [];

const start = (name, command) => {
  const child = spawn(command, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(1);
    }
  });

  children.push(child);
};

const shutdown = (exitCode = 0) => {
  for (const child of children) {
    if (child.killed) continue;
    if (isWindows) {
      spawn(`taskkill /pid ${child.pid} /T /F`, { shell: true, stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exit(exitCode);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("backend", "npm run dev:backend");
start("frontend", "npm run dev:frontend");
