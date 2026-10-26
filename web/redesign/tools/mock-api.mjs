// Mock weConect API for testing the frontend. All state is in memory, seeded from two captures of the
// real API (fixtures/captures/, copied from tests/captures/v1 on 2026-10-24). They're frozen here because
// the IDs below come from them, and refreshing tests/captures/v1 gives every user and post a new ID.
// Usage (from the repo root): node web/redesign/tools/mock-api.mjs
//
// Listens on 8810 and allows http://localhost:3100. It copies the real API's quirks so the
// frontend is tested against them: 401 without a token, 403 for bad or expired tokens *and*
// for conflicts, a 500 HTML page for a malformed token, plain-string unfollow bodies, the
// timeline's order (your posts, then each followed user's), the conversation-reuse bug, and
// the unlike crash (200, then the server is down for a moment).
//
// Test controls (no auth): POST /__control with any of
//   { expireAll: true }                       every token issued so far counts as expired
//   { failNext: { method, path, status } }    the next matching /api request fails
//   { latencyMs: 300 }                        delay every /api response
//   { online: ["<userId>"] }                  mark users online (fake sockets)
//   { emit: { from, to, text } }              store a message from `from` and push it to `to`
//   { crashForMs: 2000 }                      drop every connection and stop listening
//   { reset: true }                           back to the seed data
// GET /__stats returns socket and request counts. GET /__files/<name> serves the fixtures.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const filesDir = path.join(here, "fixtures");
const { Server } = createRequire(path.join(repo, "api/index.js"))("socket.io");

const PORT = 8810;
const ORIGIN = "http://localhost:3100";
const FILES = `http://localhost:${PORT}/__files`;
const load = (name) => JSON.parse(fs.readFileSync(path.join(filesDir, "captures", name), "utf8")).response.body;

const ALICE = "6adc828b8254b290f811b79d";
const BOB = "6adc828b8254b290f811b79f";
const CAROL = "6adc828b8254b290f811b7a1";
const LONG = "6adc828e8254b290f811b7a9";

let db;
function seed() {
  const users = load("search_all.json").data.map(({ password, ...u }) => ({ ...u, profilePicture: {}, coverPicture: {} }));
  users.push({ followers: [], followings: [], isAdmin: false, _id: LONG, username: "christopher_alexander_montgome",
    createdAt: "2026-10-24T10:03:59.000Z", updatedAt: "2026-10-24T10:03:59.000Z", __v: 0, profilePicture: {}, coverPicture: {} });
  const byId = (id) => users.find((u) => u._id === id);
  Object.assign(byId(ALICE), { followers: [CAROL, BOB], followings: [BOB, LONG] });
  Object.assign(byId(BOB), { followers: [ALICE], followings: [ALICE], bio: "Coffee, code and long walks.",
    profilePicture: { url: `${FILES}/avatar-bob.jpg`, filename: "avatar-bob.jpg" },
    coverPicture: { url: `${FILES}/cover-bob.jpg`, filename: "cover-bob.jpg" } });
  Object.assign(byId(CAROL), { followings: [ALICE], bio: "Photographer. Mostly mountains.",
    profilePicture: { url: `${FILES}/avatar-carol.jpg`, filename: "avatar-carol.jpg" } });
  Object.assign(byId(LONG), { followers: [ALICE] });

  const post = (id, userId, desc, createdAt, img) => ({ likes: [], comments: [], _id: id, userId, desc, createdAt, updatedAt: createdAt, __v: 0, ...(img ? { img } : {}) });
  const posts = load("timeline.json").data.map((p) => ({ ...p }));
  posts.push(
    post("6adc829b8254b290f811b7e1", BOB, "Made it to the top before the rain. Worth every step.", "2026-10-24T10:05:30.000Z",
      { url: `${FILES}/landscape.jpg`, filename: "landscape.jpg" }),
    post("6adc829b8254b290f811b7e3", LONG, "مرحبا بالجميع! هذا منشور تجريبي لاختبار النص من اليمين إلى اليسار.", "2026-10-25T08:00:00.000Z"),
    post("6adc829b8254b290f811b7e5", CAROL, "New print is up in the studio.", "2026-10-24T11:00:00.000Z",
      { url: `${FILES}/portrait.jpg`, filename: "portrait.jpg" }),
  );

  const conversation = { _id: "6adc82a08254b290f811b801", members: [ALICE, BOB], createdAt: "2026-10-24T12:00:00.000Z", updatedAt: "2026-10-24T12:00:00.000Z", __v: 0 };
  const msg = (n, sender, text, createdAt) => ({ _id: `6adc82a08254b290f811b81${n}`, conversationId: conversation._id, sender, text, createdAt, updatedAt: createdAt, __v: 0 });
  const messages = [
    msg(1, BOB, "Hey Alice! Did you see the photo from the hike?", "2026-10-24T12:01:00.000Z"),
    msg(2, BOB, "The view at the top was unreal.", "2026-10-24T12:01:20.000Z"),
    msg(3, ALICE, "Yes! It looks amazing.", "2026-10-24T12:05:00.000Z"),
    msg(4, BOB, "Want to go again next weekend? I have a few ideas for a longer route if the weather holds.", "2026-10-25T09:10:00.000Z"),
  ];
  const passwords = { alice: "secret1", bob: "secret2", carol: "secret3", dave: "secret4", christopher_alexander_montgome: "secret5" };
  db = { users, posts, conversations: [conversation], messages, passwords };
}
seed();

// ---- Tokens: JWT-shaped, so the frontend can read `id` and `exp` ----
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const issued = new Set();
let expiredBefore = 0;
function issue(userId) {
  const iat = Math.floor(Date.now() / 1000);
  const token = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ id: userId, iat, exp: iat + 2 * 24 * 3600 })}.mock-signature`;
  issued.add(token);
  return token;
}
const HTML_500 = (msg) => `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>TypeError: ${msg}</pre>\n</body>\n</html>\n`;
function authenticate(req) {
  const header = req.headers.authorization;
  if (!header) return { status: 401, body: { status: "error", message: "You are not authenticated!" } };
  const token = header.split(" ")[1];
  let payload = null;
  try { payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); } catch {}
  if (!payload || typeof payload !== "object") return { status: 500, html: HTML_500("Cannot read properties of null (reading 'exp')") };
  if (!payload.exp) return { status: 403, body: { status: "error", message: "Token is invalid" } };
  if (Date.now() >= payload.exp * 1000 || payload.iat * 1000 <= expiredBefore)
    return { status: 403, body: { status: "error", expired: true, message: "Your session has expired" } };
  if (!issued.has(token)) return { status: 403, body: { status: "error", message: "Token is invalid" } };
  return { userId: payload.id };
}

// ---- Helpers that copy response shapes ----
const user = (id) => db.users.find((u) => u._id === id);
const OBJECT_ID = /^[a-f\d]{24}$/i;
const newId = () => Date.now().toString(16).padStart(12, "0") + Math.floor(Math.random() * 16 ** 12).toString(16).padStart(12, "0");
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const ok = (data) => (data === undefined ? { status: "ok" } : { status: "ok", data });
const castError = (value) => ({ status: "error", error: { stringValue: `"${value}"`, kind: "ObjectId", value, path: "_id", reason: {}, name: "CastError" } });
const duplicate = (username) => ({ driver: true, name: "MongoError", index: 0, code: 11000, keyPattern: { username: 1 }, keyValue: { username } });
function searchShape(u) {
  const { profilePicture, coverPicture, ...rest } = u;
  return { ...rest, ...(profilePicture?.url ? { profilePicture } : {}), ...(coverPicture?.url ? { coverPicture } : {}), password: "<redacted encrypted password>" };
}

let crashAfterResponse = false;
function route(method, p, query, body, me) {
  let m;
  if (method === "POST" && p === "auth/register") {
    const { username, password, password1 } = body;
    if (!username || typeof username !== "string") return [401, { status: "error", message: "Invalid username" }];
    if (!password || password.length < 5) return [401, { status: "error", message: "Password too short. Should be at least 5 characters" }];
    if (password !== password1) return [401, { status: "error", message: "Password does not match" }];
    if (db.users.some((u) => u.username === username)) return [409, { status: "error", message: "Username already exists", error: duplicate(username) }];
    const now = new Date().toISOString();
    db.users.push({ followers: [], followings: [], isAdmin: false, _id: newId(), username, createdAt: now, updatedAt: now, __v: 0, profilePicture: {}, coverPicture: {} });
    db.passwords[username] = password;
    return [200, ok()];
  }
  if (method === "POST" && p === "auth/login") {
    const u = db.users.find((x) => x.username === body.username);
    if (!u) return [404, { status: "error", message: "Invalid Username/Password" }];
    if (db.passwords[u.username] !== body.password) return [400, { status: "error", message: "Invalid Username/Password" }];
    return [200, ok({ ...u, accessToken: issue(u._id) })];
  }
  if (me.status) return me.html ? [me.status, me.html, "text/html; charset=utf-8"] : [me.status, me.body];
  const meId = me.userId;
  const current = user(meId);

  if (method === "GET" && p === "users") return [200, ok(current)];
  if (method === "PUT" && p === "users") {
    if (!body.username) return [403, { status: "error", message: "username is required" }];
    if (body.password || body.followers || body.followings) return [400, { status: "error" }];
    if (db.users.some((u) => u.username === body.username && u._id !== meId)) return [500, { status: "error", error: duplicate(body.username) }];
    Object.assign(current, body, { updatedAt: new Date().toISOString() });
    return [200, ok()];
  }
  if (method === "GET" && p === "users/search") {
    const term = (query.get("search") || "").toLowerCase();
    return [200, ok(db.users.filter((u) => !term || u.username.toLowerCase().includes(term)).map(searchShape))];
  }
  if (method === "GET" && p === "users/followers") {
    if (current.followers.some((id) => !user(id))) return [500, { status: "error", message: "unable to get followers" }];
    return [200, ok(current.followers.map((id) => { const f = user(id); return { id: f._id, username: f.username, image: f.profilePicture, following: f.followers.includes(meId) }; }))];
  }
  if (method === "GET" && p === "users/following") {
    if (current.followings.some((id) => !user(id))) return [500, { status: "error", message: "unable to get following" }];
    return [200, ok(current.followings.map((id) => { const f = user(id); return { id: f._id, username: f.username, image: f.profilePicture }; }))];
  }
  if ((m = p.match(/^users\/([^/]+)\/user$/)) && method === "GET") {
    if (!OBJECT_ID.test(m[1])) return [500, castError(m[1])];
    const u = user(m[1]);
    return u ? [200, ok(u)] : [404, { status: "error", message: "User not found" }];
  }
  if (method === "PUT" && (p === "users/follow" || p === "users/unfollow")) {
    if (!body.userId) return [400, { status: "error", message: "Missing payload property" }];
    const target = OBJECT_ID.test(body.userId) ? user(body.userId) : null;
    if (!target) return [500, { status: "error", error: {} }];
    const following = target.followers.includes(meId);
    if (p === "users/follow") {
      if (following) return [403, { status: "error", message: "you already follow this user" }];
      target.followers.push(meId);
      current.followings.push(target._id);
      return [200, { status: "ok", message: "user has been followed" }];
    }
    if (!following) return [403, "you don't follow this user"];
    target.followers = target.followers.filter((id) => id !== meId);
    current.followings = current.followings.filter((id) => id !== target._id);
    return [200, "user has been unfollowed"];
  }

  if (method === "GET" && p === "posts/timeline/all") {
    const mine = db.posts.filter((x) => x.userId === meId).sort(byNewest);
    const friends = current.followings.map((id) => db.posts.filter((x) => x.userId === id).sort(byNewest));
    return [200, ok(mine.concat(...friends))];
  }
  if ((m = p.match(/^posts\/([^/]+)\/single$/)) && method === "GET") {
    if (!OBJECT_ID.test(m[1])) return [500, castError(m[1])];
    return [200, ok(db.posts.find((x) => x._id === m[1]) || null)];
  }
  if ((m = p.match(/^posts\/([^/]+)\/like$/)) && method === "PUT") {
    const post = OBJECT_ID.test(m[1]) ? db.posts.find((x) => x._id === m[1]) : null;
    if (!post) return [500, { status: "error", error: {} }];
    const liker = body.userId ?? null;
    if (!post.likes.includes(liker)) post.likes.push(liker);
    else { post.likes = post.likes.filter((l) => l !== liker); crashAfterResponse = true; }
    return [200, ok()];
  }
  if (method === "POST" && p === "posts") {
    if (!body.userId) return [403, { status: "error", message: "user id is required" }];
    const now = new Date().toISOString();
    const post = { likes: [], comments: [], ...body, _id: newId(), createdAt: now, updatedAt: now, __v: 0 };
    db.posts.push(post);
    return [200, ok(post)];
  }
  if ((m = p.match(/^posts\/([^/]+)$/)) && method === "DELETE") {
    const post = OBJECT_ID.test(m[1]) ? db.posts.find((x) => x._id === m[1]) : null;
    if (!post) return [500, {}];
    if (post.userId !== meId) return [403, { status: "error", message: "you can delete only your post" }];
    db.posts = db.posts.filter((x) => x !== post);
    return [200, ok()];
  }
  if ((m = p.match(/^posts\/([^/]+)$/)) && method === "GET") return [200, ok(db.posts.filter((x) => x.userId === m[1]).sort(byNewest))];

  if (method === "GET" && p === "conversations") return [200, ok(db.conversations.filter((c) => c.members.includes(meId)))];
  if (method === "POST" && p === "conversations") {
    if (!body.senderId || !body.receiverId) return [403, { status: "error", message: "the senderId and recieverId must be included in the request body" }];
    if (body.senderId !== meId && body.receiverId !== meId) return [403, { status: "error", message: "you must be included in this conversation" }];
    const existing = db.conversations.find((c) => c.members.includes(meId)); // the v1 bug: any conversation you're in
    if (existing) return [200, ok(existing)];
    const now = new Date().toISOString();
    const c = { _id: newId(), members: [body.senderId, body.receiverId], createdAt: now, updatedAt: now, __v: 0 };
    db.conversations.push(c);
    return [200, ok(c)];
  }
  if ((m = p.match(/^messages\/([^/]+)\/message$/)) && method === "GET") return [200, ok(db.messages.find((x) => x.conversationId === m[1]) || null)];
  if ((m = p.match(/^messages\/([^/]+)$/)) && method === "GET") return [200, ok(db.messages.filter((x) => x.conversationId === m[1]))];
  if (method === "POST" && p === "messages") {
    const now = new Date().toISOString();
    const message = { ...body, _id: newId(), createdAt: now, updatedAt: now, __v: 0 };
    db.messages.push(message);
    return [200, ok(message)];
  }
  return [404, `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot ${method} /api/${p}</pre>\n</body>\n</html>\n`, "text/html; charset=utf-8"];
}

// ---- Server, sockets, controls ----
const stats = { requests: {}, addUserCalls: 0 };
let failNext = null;
let latencyMs = 0;
let online = [];
const connections = new Set();

function cors(extra = {}) {
  return { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", ...extra };
}
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, cors({ "Content-Type": type }));
  res.end(type.startsWith("text/html") ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "OPTIONS") { res.writeHead(204, cors()); return res.end(); }
  if (url.pathname.startsWith("/__files/")) {
    const file = path.join(filesDir, path.basename(url.pathname));
    if (!fs.existsSync(file)) { res.writeHead(404, cors()); return res.end(); }
    res.writeHead(200, cors({ "Content-Type": "image/jpeg", "Cache-Control": "max-age=3600" }));
    return fs.createReadStream(file).pipe(res);
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {}
    if (url.pathname === "/__stats") return send(res, 200, { sockets: io.engine.clientsCount, online, ...stats });
    if (url.pathname === "/__control" && req.method === "POST") return control(body, res);
    if (!url.pathname.startsWith("/api/")) return send(res, 404, { status: "error", message: "not found" });

    const p = url.pathname.slice(5);
    const key = `${req.method} ${p.replace(/[a-f\d]{24}/gi, ":id")}`;
    stats.requests[key] = (stats.requests[key] || 0) + 1;
    const reply = () => {
      if (failNext && failNext.method === req.method && p.startsWith(failNext.path.replace(/^\/?(api\/)?/, ""))) {
        const f = failNext;
        failNext = null;
        console.log(req.method, url.pathname, f.status, "(failNext)");
        return send(res, f.status, f.body ?? { status: "error", message: "Injected failure" });
      }
      const [status, out, type] = route(req.method, p, url.searchParams, body, p.startsWith("auth/") ? {} : authenticate(req));
      console.log(req.method, url.pathname + url.search, status);
      send(res, status, out, type);
      if (crashAfterResponse) { crashAfterResponse = false; res.on("finish", () => crash(2000, "unlike")); }
    };
    latencyMs ? setTimeout(reply, latencyMs) : reply();
  });
});
server.on("connection", (s) => { connections.add(s); s.on("close", () => connections.delete(s)); });

const io = new Server(server, { cors: { origin: ORIGIN } });
io.on("connection", (socket) => {
  socket.on("addUser", (userId) => {
    stats.addUserCalls++;
    const u = online.find((x) => x.userId === userId);
    if (u) u.socketId = socket.id; else online.push({ userId, socketId: socket.id });
    io.emit("getUsers", online);
  });
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    const u = online.find((x) => x.userId === receiverId);
    if (u && !u.socketId.startsWith("fake-")) io.to(u.socketId).emit("getMessage", { senderId, text });
  });
  socket.on("disconnect", () => { online = online.filter((x) => x.socketId !== socket.id); io.emit("getUsers", online); });
});

function crash(ms, why) {
  console.log(`crash (${why}): down for ${ms} ms`);
  online = online.filter((x) => x.socketId.startsWith("fake-"));
  // Drop the connections like a crashed process would. (io.disconnectSockets() would be a
  // deliberate disconnect, after which Socket.io clients don't reconnect on their own.)
  server.close(() => setTimeout(() => server.listen(PORT, () => console.log("back up")), ms));
  for (const s of connections) s.destroy();
}

function control(body, res) {
  if (body.reset) { seed(); issued.clear(); expiredBefore = 0; failNext = null; latencyMs = 0; online = []; stats.requests = {}; stats.addUserCalls = 0; }
  if (body.expireAll) expiredBefore = Date.now();
  if (body.failNext) failNext = body.failNext;
  if (typeof body.latencyMs === "number") latencyMs = body.latencyMs;
  if (body.online) {
    for (const id of body.online) if (!online.some((x) => x.userId === id)) online.push({ userId: id, socketId: `fake-${id}` });
    io.emit("getUsers", online);
  }
  if (body.emit) {
    const { from, to, text } = body.emit;
    const c = db.conversations.find((x) => x.members.includes(from) && x.members.includes(to));
    if (c) { const now = new Date().toISOString(); db.messages.push({ _id: newId(), conversationId: c._id, sender: from, text, createdAt: now, updatedAt: now, __v: 0 }); }
    const u = online.find((x) => x.userId === to && !x.socketId.startsWith("fake-"));
    if (u) io.to(u.socketId).emit("getMessage", { senderId: from, text });
  }
  send(res, 200, { ok: true });
  if (body.crashForMs) crash(body.crashForMs, "control");
}

server.listen(PORT, () => console.log(`mock API on http://localhost:${PORT}`));
