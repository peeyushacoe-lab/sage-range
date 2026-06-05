// Starts Ollama (if not already running) then launches the Next.js dev server.
const { spawn } = require("child_process");
const http = require("http");

const OLLAMA_EXE = process.env.OLLAMA_EXE ?? "E:\\Ollama\\ollama.exe";

function isOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434", () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let shuttingDown = false;
process.on("SIGINT",  () => { shuttingDown = true; process.exit(0); });
process.on("SIGTERM", () => { shuttingDown = true; process.exit(0); });

function startNext() {
  const child = spawn("npx", ["next", "dev", "--turbopack"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown || signal === "SIGINT" || signal === "SIGTERM") return;
    console.error(`\n[dev] Next.js crashed (code=${code ?? signal}). Restarting in 2 s…\n`);
    setTimeout(startNext, 2000);
  });
}

async function main() {
  const running = await isOllamaRunning();

  if (running) {
    console.log("[dev] Ollama already running — skipping start.");
  } else {
    console.log("[dev] Starting Ollama...");
    const ollama = spawn(OLLAMA_EXE, ["serve"], {
      detached: true,
      stdio: "ignore",
      shell: false,
    });
    ollama.on("error", (err) => {
      console.error(`[dev] Could not start Ollama: ${err.message}`);
      console.error(`[dev] Check OLLAMA_EXE in .env (currently: ${OLLAMA_EXE})`);
    });
    ollama.unref();
    // Give Ollama ~3 s to bind its port before Next.js loads the app
    await wait(3000);
    console.log("[dev] Ollama started.");
  }

  startNext();
}

main();
