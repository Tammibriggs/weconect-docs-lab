// Start the API from api/ against an in-memory MongoDB, with throwaway secrets.
// Used by tests/capture.mjs and scripts/dev.mjs, so tests and local use run
// the API the same way.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const API_DIR = path.join(ROOT, "api");
// PORT lets the tests and npm run dev run while something else uses 8800,
// for example npm run start:real. The API reads the same variable.
export const PORT = process.env.PORT || "8800";
export const BASE = `http://localhost:${PORT}`;
// The oldest MongoDB release built for Ubuntu 22.04; api/ uses MongoDB driver 3.7.
const MONGO_VERSION = "6.0.19";

// Random secrets for this process only. Tokens signed with them stop working on restart.
export const SECRETS = {
  JWT_SECT: crypto.randomBytes(32).toString("hex"),
  PASS_ENC_SECT: crypto.randomBytes(32).toString("hex"),
};

export async function isPortInUse() {
  try {
    await fetch(`${BASE}/`);
    return true;
  } catch {
    return false;
  }
}

// The first call downloads MongoDB (about 55 MB) to ~/.cache/mongodb-binaries.
export function startMongo() {
  return MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
}

export class ApiServer {
  constructor({ mongoUri, allowedHost = process.env.ALLOWED_HOST || "http://localhost:3000", onOutput = () => {} }) {
    this.env = { ...process.env, ...SECRETS, PORT, MONGO_URL: `${mongoUri}weconect`, ALLOWED_HOST: allowedHost };
    this.onOutput = onOutput;
    this.process = null;
    this.exited = null; // { code, signal } once the process exits
    this.onExit = () => {};
  }

  // Start node index.js and wait until it's connected to MongoDB and answering requests.
  async start() {
    this.exited = null;
    let connected = false;
    const recent = [];
    this.process = spawn(process.execPath, ["index.js"], { cwd: API_DIR, env: this.env });
    const onData = (data) => {
      const text = data.toString();
      recent.push(text);
      if (text.includes("Connected to MongoDB")) connected = true;
      this.onOutput(text);
    };
    this.process.stdout.on("data", onData);
    this.process.stderr.on("data", onData);
    this.process.on("exit", (code, signal) => {
      this.exited = { code, signal };
      this.onExit(this.exited);
    });

    for (let i = 0; i < 100; i++) {
      if (this.exited) throw new Error(`The API exited on start (${JSON.stringify(this.exited)}):\n${recent.slice(-5).join("")}`);
      if (connected) {
        try {
          await fetch(`${BASE}/api/nope`);
          return;
        } catch {
          // not listening yet
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("The API didn't start within 20 seconds");
  }

  stop() {
    if (this.process && !this.exited) {
      this.onExit = () => {};
      this.process.kill();
    }
  }
}
