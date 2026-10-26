// Run the API locally for trying it out, for example from Postman or web/.
//
//   npm run dev              start with sample users, posts, a follow, and an API key
//   npm run dev -- --empty   start with an empty database
//
// The database lives in memory and the secrets are random, so nothing touches
// your real MongoDB, and everything is gone when you stop the server (Ctrl+C).
// If the API crashes (unliking a post does), it restarts with the data intact.

import { ApiServer, BASE, isPortInUse, startMongo } from "./api-server.mjs";

const SAMPLE_USERS = [
  { username: "alice", password: "secret1" },
  { username: "bob", password: "secret2" },
];

async function call(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} returned ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// Create the sample data through the API itself, the way a client would.
async function seed() {
  const users = {};
  for (const { username, password } of SAMPLE_USERS) {
    await call("POST", "/api/auth/register", { username, password, password1: password });
    const { data } = await call("POST", "/api/auth/login", { username, password });
    users[username] = { id: data._id, token: data.accessToken };
  }
  const { alice, bob } = users;
  await call("POST", "/api/posts", { userId: alice.id, desc: "Hello from Alice" }, alice.token);
  await call("POST", "/api/posts", { userId: bob.id, desc: "Hello from Bob" }, bob.token);
  await call("PUT", "/api/users/follow", { userId: bob.id }, alice.token);
  // An API key for the public endpoints, created the way the app's API keys page does
  const { data: key } = await call("POST", "/api/keys", { name: "npm run dev", scopes: ["read", "write"] }, alice.token);
  users.alice.apiKey = key.key;
  return users;
}

if (await isPortInUse()) {
  console.error(`${BASE} is already in use. Stop that server first, or use another port: PORT=8810 npm run dev`);
  process.exit(1);
}

console.log("Starting MongoDB in memory...");
const mongo = await startMongo();
const server = new ApiServer({
  mongoUri: mongo.getUri(),
  onOutput: (text) => process.stdout.write(text.replace(/^(?=.)/gm, "[api] ")),
});

let stopping = false;
server.onExit = async ({ code, signal }) => {
  if (stopping) return;
  console.log(`\nThe API exited (code ${code}, signal ${signal}). Restarting; the data is kept.`);
  try {
    await server.start();
    console.log(`The API is back at ${BASE}.`);
  } catch (err) {
    console.error(err.message);
  }
};

await server.start();

const lines = [`\nThe API is running at ${BASE}`];
if (!process.argv.includes("--empty")) {
  const users = await seed();
  lines.push(
    "",
    "Sample data: alice and bob each have a post, and alice follows bob.",
    ...SAMPLE_USERS.map(({ username, password }) => `  ${username.padEnd(6)} password ${password}`),
    "",
    "alice's API key (read and write), for the public endpoints, for example in Postman:",
    `  ${users.alice.apiKey}`,
    "alice's access token, for the internal endpoints such as /api/keys. Valid until you stop this server:",
    `  ${users.alice.token}`,
  );
}
lines.push(
  "",
  "To use the frontend, put these lines in web/.env.local, then run npm start in web/:",
  `  REACT_APP_SEVER_BASE_URL=${BASE}/api/`,
  `  REACT_APP_SOCKET_URL=${BASE}`,
  "",
  "Press Ctrl+C to stop. The data is deleted when you stop.",
);
console.log(lines.join("\n"));

async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.stop();
  await mongo.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
