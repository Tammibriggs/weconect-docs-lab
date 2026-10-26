// Start the API and the frontend together with your own settings:
//
//   npm run start:real
//
// Unlike npm run dev, this uses YOUR database: the API reads api/.env (your
// MongoDB URL and secrets) and the frontend reads web/.env.local. Anything you
// do in the app changes real data.
//
// The API runs under nodemon, so it restarts when you edit files in api/, and
// this script restarts it if it crashes (unliking a post does). Ctrl+C stops both.

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(ROOT, "api");
const WEB_DIR = path.join(ROOT, "web");

// ─── Checks before starting anything ────────────────────────────
function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

const problems = [];
// A file isn't needed if the settings are already in the environment.
if (!fs.existsSync(path.join(API_DIR, ".env")) && !process.env.MONGO_URL) {
  problems.push(
    "api/.env is missing. Create it from api/.env.example with your MongoDB URL and two secrets, and set",
    "  ALLOWED_HOST=http://localhost:3000  (otherwise the browser blocks the frontend's requests)",
  );
}
if (!fs.existsSync(path.join(WEB_DIR, ".env.local")) && !process.env.REACT_APP_SEVER_BASE_URL) {
  problems.push(
    "web/.env.local is missing. Create it with these two lines:",
    "  REACT_APP_SEVER_BASE_URL=http://localhost:8800/api/",
    "  REACT_APP_SOCKET_URL=http://localhost:8800",
  );
}
// web/ needs --legacy-peer-deps: its unused @material-ui/icons v4 expects React 16 or 17, not 18.
for (const [dir, name, install] of [[API_DIR, "api", "npm ci"], [WEB_DIR, "web", "npm ci --legacy-peer-deps"]]) {
  if (!fs.existsSync(path.join(dir, "node_modules"))) problems.push(`${name}/ has no dependencies installed. Run: cd ${name} && ${install}`);
}
for (const [port, what] of [[8800, "the API"], [3000, "the frontend"]]) {
  if (await portInUse(port)) problems.push(`Port ${port}, needed by ${what}, is in use. Stop whatever is using it (for example, npm run dev).`);
}
if (problems.length) {
  console.error(["Can't start yet:", ...problems.map((p) => (p.startsWith("  ") ? p : `- ${p}`))].join("\n"));
  process.exit(1);
}

// ─── Running the two processes ──────────────────────────────────
const COLORS = { api: "\x1b[36m", web: "\x1b[35m" };
const children = {};
let stopping = false;

function prefix(name, data) {
  const text = data.toString().replace(/^(?=.)/gm, `${COLORS[name]}[${name}]\x1b[0m `);
  process.stdout.write(text);
}

function run(name, command, args, cwd, env = {}) {
  // detached: each child gets its own process group, so stopping it also stops
  // the processes it starts (react-scripts and nodemon both start one).
  // stdin stays open on purpose: react-scripts exits when its stdin closes.
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, detached: true, stdio: ["pipe", "pipe", "pipe"] });
  child.stdout.on("data", (d) => prefix(name, d));
  child.stderr.on("data", (d) => prefix(name, d));
  children[name] = child;
  return child;
}

function startApi() {
  const api = run("api", path.join(API_DIR, "node_modules", ".bin", "nodemon"), ["--exitcrash", "index.js"], API_DIR);
  api.on("exit", (code) => {
    if (stopping) return;
    console.log(`\nThe API exited (code ${code}). Restarting it.`);
    setTimeout(startApi, 1000);
  });
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of Object.values(children)) {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* already stopped */ }
  }
  setTimeout(() => process.exit(exitCode), 500);
}

console.log("Using YOUR settings: api/.env (your real database) and web/.env.local. Changes in the app are real.\n");
startApi();
const web = run("web", path.join(WEB_DIR, "node_modules", ".bin", "react-scripts"), ["start"], WEB_DIR, { PORT: "3000" });
web.on("exit", (code) => {
  if (stopping) return;
  console.log(`\nThe frontend exited (code ${code}). Stopping the API too.`);
  stop(code ?? 1);
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
