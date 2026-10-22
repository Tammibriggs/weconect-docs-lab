// Run every case in tests/cases.mjs against a local copy of the API and save
// each request and response as evidence for the spec.
//
//   npm run test:capture                         writes to tests/runs/<timestamp>/
//   npm run test:capture -- --out tests/captures/v1   refreshes the committed captures
//
// The API runs against a throwaway in-memory MongoDB with random secrets, so a
// run never touches a real database. The first run downloads MongoDB (~70 MB)
// to ~/.cache/mongodb-binaries.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import { cases } from "./cases.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(ROOT, "api");
const BASE = "http://localhost:8800"; // the port is fixed in api/index.js
const MONGO_VERSION = "6.0.19"; // the oldest release built for Ubuntu 22.04; api/ uses MongoDB driver 3.7

const outArg = process.argv.indexOf("--out");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = path.resolve(ROOT, outArg > -1 ? process.argv[outArg + 1] : path.join("tests", "runs", stamp));

const JWT_SECT = crypto.randomBytes(32).toString("hex");
const PASS_ENC_SECT = crypto.randomBytes(32).toString("hex");
const JWT_PATTERN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

function signJwt(payload, secret) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}`;
  return `${unsigned}.${crypto.createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}

// Hide values that differ per run or look like secrets, and local file paths.
function redact(value) {
  if (typeof value === "string") {
    return value
      .replace(JWT_PATTERN, "<redacted JWT>")
      .split(ROOT).join("<repo>")
      .split(process.env.HOME || "/nonexistent").join("<home>");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) =>
      [k, k === "password" && typeof v === "string" ? "<redacted encrypted password>" : redact(v)]));
  }
  return value;
}

function fill(value, vars) {
  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  }
  if (Array.isArray(value)) return value.map((v) => fill(v, vars));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, vars)]));
  }
  return value;
}

function pick(obj, dotted) {
  return dotted.split(".").reduce((o, key) => (o == null ? undefined : o[key]), obj);
}

// ─── The API process ────────────────────────────────────────────
let api = null;
let apiExit = null;
const log = [];

async function startApi(mongoUri) {
  apiExit = null;
  api = spawn(process.execPath, ["index.js"], {
    cwd: API_DIR,
    env: { ...process.env, MONGO_URL: `${mongoUri}weconect`, JWT_SECT, PASS_ENC_SECT, ALLOWED_HOST: "http://localhost:3000" },
  });
  let connected = false;
  const onData = (d) => {
    const text = d.toString();
    log.push(text);
    if (text.includes("Connected to MongoDB")) connected = true;
  };
  api.stdout.on("data", onData);
  api.stderr.on("data", onData);
  api.on("exit", (code, signal) => { apiExit = { code, signal }; });
  for (let i = 0; i < 100; i++) {
    if (apiExit) throw new Error(`The API exited on start (${JSON.stringify(apiExit)}):\n${log.slice(-5).join("")}`);
    if (connected) {
      try { await fetch(`${BASE}/api/nope`); return; } catch { /* not listening yet */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("The API didn't start within 20 seconds");
}

// ─── One case ───────────────────────────────────────────────────
async function run(c, vars) {
  const headers = { ...(c.headers || {}) };
  if (c.auth) {
    const token = {
      alice: vars.aliceToken, bob: vars.bobToken, carol: vars.carolToken,
      expired: vars.expiredToken, badsig: vars.badSigToken,
    }[c.auth];
    headers.Authorization = typeof c.auth === "object" ? fill(c.auth.raw, vars) : `Bearer ${token}`;
  }
  let body;
  if (c.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = typeof c.body === "string" ? c.body : JSON.stringify(fill(c.body, vars));
  }
  const urlPath = fill(c.path, vars);
  const started = Date.now();
  const capture = {
    name: c.name, group: c.group, note: c.note,
    request: { method: c.method, path: urlPath, headers: redact(headers),
               body: typeof c.body === "string" ? c.body : redact(fill(c.body, vars)) },
  };
  try {
    const res = await fetch(BASE + urlPath, { method: c.method, headers, body });
    const text = await res.text();
    let parsed = text;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    capture.response = {
      status: res.status,
      headers: Object.fromEntries([...res.headers].filter(([k]) =>
        k === "content-type" || k.startsWith("access-control-"))),
      body: redact(parsed),
    };
    for (const [name, field] of Object.entries(c.save || {})) vars[name] = pick(parsed, field);
  } catch (err) {
    capture.response = { error: err.cause?.code || err.message };
  }
  capture.durationMs = Date.now() - started;
  await new Promise((r) => setTimeout(r, 300)); // give a crash time to happen
  if (apiExit) {
    capture.serverExited = apiExit;
    capture.serverLog = redact(log.slice(-3).join("").trim().split("\n").slice(-12).join("\n"));
  }
  return capture;
}

// ─── Main ───────────────────────────────────────────────────────
try { await fetch(`${BASE}/`); console.error(`Port 8800 is already in use. Stop that server first.`); process.exit(1); } catch { /* free */ }

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".json")) fs.rmSync(path.join(OUT, f));

const mongo = await MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
await startApi(mongo.getUri());

const vars = {};
const rows = [];
let restarts = 0;
for (const c of cases) {
  if (apiExit && !c.noRestart) { await startApi(mongo.getUri()); restarts++; }
  if (vars.aliceId && !vars.expiredToken) {
    const now = Math.floor(Date.now() / 1000);
    vars.expiredToken = signJwt({ id: vars.aliceId, iat: now - 7200, exp: now - 3600 }, JWT_SECT);
    vars.badSigToken = signJwt({ id: vars.aliceId, iat: now, exp: now + 3600 }, "a-different-secret");
  }
  const capture = await run(c, vars);
  fs.writeFileSync(path.join(OUT, `${c.name}.json`), JSON.stringify(capture, null, 2) + "\n");
  const status = capture.response.status ?? capture.response.error;
  const ok = status === c.expect;
  rows.push({ c, status, ok, exited: Boolean(capture.serverExited) });
  console.log(`${ok ? "ok  " : "DIFF"} ${String(status).padEnd(12)} ${c.name}${capture.serverExited ? "   (server exited)" : ""}`);
}

if (api && !apiExit) api.kill();
await mongo.stop();
fs.writeFileSync(path.join(OUT, "server.log"), redact(log.join("")));

const diffs = rows.filter((r) => !r.ok);
const report = [
  `# Capture run ${stamp}`, "",
  `${rows.length} cases, ${rows.length - diffs.length} as expected, ${diffs.length} different, ${restarts} server restart(s).`, "",
  "| Case | Group | Expected | Got | Note |", "|---|---|---|---|---|",
  ...rows.map(({ c, status, ok, exited }) =>
    `| ${ok ? "" : "**"}${c.name}${ok ? "" : "**"} | ${c.group} | ${c.expect} | ${status}${exited ? " (server exited)" : ""} | ${c.note || ""} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, "report.md"), report);
console.log(`\n${rows.length} cases, ${diffs.length} different from expected, ${restarts} restart(s). Captures: ${path.relative(ROOT, OUT)}`);
