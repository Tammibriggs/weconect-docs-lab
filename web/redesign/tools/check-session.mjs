// Checks the sign-in pages and the session. Usage: node check-session.mjs <out-dir>
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const APP = "http://localhost:3100";
const MOCK = "http://localhost:8810";
const ALICE = "6adc828b8254b290f811b79d";
const BOB = "6adc828b8254b290f811b79f";
fs.mkdirSync(out, { recursive: true });
const control = (body) => fetch(`${MOCK}/__control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
await control({ reset: true });

const b = await launch({ profile: path.join(out, ".chrome") });
const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const token = () => b.evaluate("localStorage.getItem('weconect.token')");
const where = () => b.evaluate("location.pathname");
const text = () => b.evaluate("document.body.innerText");

async function signIn(username, password) {
  await b.fill("textbox", "Username", username);
  await b.fill("textbox", "Password", password, { index: 0 });
  await b.press("Enter");
  await sleep(1800);
}

for (const [w, h] of [[390, 844], [1440, 900]]) {
  await b.viewport(w, h);
  await b.goto(`${APP}/login`);
  await b.shot(path.join(out, `login-${w}.png`));
  const axe = await b.axe();
  check(`axe on /login at ${w}px`, axe.length === 0, axe.map((v) => `${v.id}(${v.nodes})`).join(", "));
}
await b.goto(`${APP}/signup`);
const axeSignup = await b.axe();
check("axe on /signup at 1440px", axeSignup.length === 0, axeSignup.map((v) => `${v.id}(${v.nodes})`).join(", "));
await b.goto(`${APP}/login`);
const tabs = await b.tabTrace(5);
check("Tab order on /login has visible focus", tabs.filter((t) => t.tag !== "body").every((t) => t.ring), tabs.map((t) => `${t.tag}:${t.name}`).join(" → "));

await b.click("button", "Sign in", { exact: true });
const invalid = await b.evaluate("[...document.querySelectorAll('[aria-invalid=true]')].map((e) => e.name)");
check("empty sign-in marks both fields and focuses Username", invalid.length === 2 && (await b.evaluate("document.activeElement.name")) === "username");
await signIn("alice", "wrong");
check("wrong password shows one generic message", (await text()).includes("That username and password don't match"));

const mark = b.mark();
await signIn("alice", "secret1");
check("sign-in lands on Home", (await where()) === "/");
check("token stored", Boolean(await token()));
check("no GET /users right after sign-in (cache seeded)", !b.apiCalls(mark).includes("GET users"));
const reloadMark = b.mark();
await b.reload(2500);
check("reload keeps you signed in", (await where()) === "/");
check("no exceptions after reload", b.problems(reloadMark).filter((p) => p.startsWith("exception")).length === 0, b.problems(reloadMark).join(" | "));

await control({ failNext: { method: "GET", path: "posts/timeline/all", status: 403, body: { status: "error", message: "you already follow this user" } } });
await b.reload(2500);
check("a 403 conflict doesn't sign you out", (await where()) === "/" && Boolean(await token()));

await control({ expireAll: true });
await b.reload(2500);
check("expired token goes to sign-in with a notice", (await where()) === "/login" && (await text()).includes("Your session expired"));
check("expired token removed", (await token()) === null);

for (const [label, value] of [["not-a-jwt", "not-a-jwt"], ["expired JWT", `x.${Buffer.from(JSON.stringify({ id: "a", exp: 1 })).toString("base64url")}.y`]]) {
  await b.evaluate(`localStorage.setItem('weconect.token', ${JSON.stringify(value)}); true`);
  const m = b.mark();
  await b.reload(2000);
  check(`planted ${label}: sign-in page, 0 API calls`, (await where()) === "/login" && b.apiCalls(m).length === 0);
}

await signIn("alice", "secret1");
await b.go(`/profile/${ALICE}`, 1500);
await b.click("button", "Sign out", { exact: true });
await sleep(800);
check("Sign out goes to sign-in with a notice and removes the token", (await where()) === "/login" && (await text()).includes("You've signed out") && (await token()) === null);
const bobMark = b.mark();
await signIn("bob", "secret2");
const ids = b.requestUserIds(bobMark);
check("after switching to bob, every request uses bob's token", ids.length > 0 && ids.every((id) => id === BOB), `${ids.length} requests`);

await b.evaluate("localStorage.removeItem('weconect.token'); dispatchEvent(new StorageEvent('storage', { key: 'weconect.token', newValue: null })); true");
await sleep(1200);
check("signing out in another tab signs this tab out", (await where()) === "/login" && (await text()).includes("You signed out in another tab"));

await b.goto(`${APP}/signup`);
await b.fill("textbox", "Username", "ab");
await b.click("button", "Create account", { exact: true });
check("short username error", (await text()).includes("Use 3 to 20 characters"));
await b.fill("textbox", "Username", "dave");
await b.fill("textbox", "Password", "secret9", { index: 0 });
await b.fill("textbox", "Confirm password", "secret9");
await b.click("button", "Create account", { exact: true });
await sleep(1200);
check("taken username shows a field error", (await text()).includes("That username is taken"));
await b.fill("textbox", "Username", "erin_new");
await b.click("button", "Create account", { exact: true });
await sleep(2500);
check("sign-up signs you in with a welcome", (await where()) === "/" && (await text()).includes("Welcome to weConect, erin_new!"));

const problems = b.problems();
check("console has no errors or warnings", problems.length === 0, problems.join(" | "));
await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(results, null, 2));
