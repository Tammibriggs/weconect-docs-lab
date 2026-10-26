// Checks the API keys page against the real API, not the mock: creating, using and
// deleting a key, plus accessibility, focus and layout.
// Needs the API from `npm run dev` (in the repo root) and the app on port 3100:
//   PORT=8820 ALLOWED_HOST=http://localhost:3100 npm run dev
//   PORT=3100 BROWSER=none REACT_APP_SEVER_BASE_URL=http://localhost:8820/api/ \
//     REACT_APP_SOCKET_URL=http://localhost:8820 REACT_APP_IMAGE_STORAGE=fake npm start   (in web/)
// Usage: node check-api-keys.mjs <out-dir>
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const APP = "http://localhost:3100";
const API = "http://localhost:8820/api";
const b = await launch({ profile: path.join(out, ".chrome-api-keys"), port: 9340 });
const results = [];
const check = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const where = () => b.evaluate("location.pathname");
const text = (selector) => b.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? null`);
const callApi = async (method, route, key, body) => {
  const res = await fetch(API + route, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
};

// Start clean: delete keys an earlier, interrupted run left behind
const { data: session } = await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "alice", password: "secret1" }) })).json();
const session_ = { Authorization: `Bearer ${session.accessToken}` };
for (const k of (await (await fetch(`${API}/keys`, { headers: session_ })).json()).data) {
  if (k.name !== "npm run dev") await fetch(`${API}/keys/${k.id}`, { method: "DELETE", headers: session_ });
}

// Sign in as alice (created by npm run dev, with one key named "npm run dev")
await b.viewport(1440, 900);
await b.goto(`${APP}/login`);
await b.evaluate("document.querySelector('input[name=username]').focus(); true"); await b.type("alice");
await b.evaluate("document.querySelector('input[name=password]').focus(); true"); await b.type("secret1");
await b.press("Enter"); await sleep(2500);

// Getting there
await b.goto(`${APP}/profile`); await sleep(500);
await b.click("link", "API keys", { exact: true }); await sleep(1500);
check("your profile links to the API keys page", (await where()) === "/settings/api-keys", await where());
check("the page has one h1, API keys", (await b.evaluate("[...document.querySelectorAll('h1')].map(h => h.textContent).join('|')")) === "API keys");
check("the title follows the page", (await b.evaluate("document.title")) === "API keys · weConect");
await b.waitFor("document.querySelector('.api-key')");
check("existing keys are listed", (await b.evaluate("document.querySelectorAll('.api-key').length")) === 1);
check("a key shows its last four characters, access and use", /^wck_….{4}$/.test(await text(".api-key__hint")) &&
  (await text(".api-key__detail")).includes("Read and write") && (await text(".api-key__detail")).includes("Never used"), await text(".api-key__detail"));
await b.shot(path.join(out, "api-keys-desktop.png"), { full: true });
const axe1 = await b.axe();
check("no axe WCAG 2.1 AA failures (list and form)", axe1.length === 0, axe1.map((v) => v.id).join(", "));

// Validation
await b.click("button", "Create key", { exact: true }); await sleep(400);
check("an empty name shows an error", (await text(".field__error")) === "Enter a name for the key.");
check("and focus moves to the name field", (await b.evaluate("document.activeElement.labels?.[0]?.textContent")) === "Name");
check("the field is marked invalid", (await b.evaluate("document.activeElement.getAttribute('aria-invalid')")) === "true");

// Creating a read-only key
await b.type("Test script");
check("Read only is chosen by default", (await b.evaluate("document.querySelector('input[name=access]:checked')?.value")) === "read");
await b.click("button", "Create key", { exact: true }); await sleep(1200);
check("the new key panel appears", (await text("#new-key")) === "Copy your new key");
check("focus moves to its heading", (await b.evaluate("document.activeElement.id")) === "new-key");
const key = await b.evaluate("document.querySelector('#new-key-value')?.value");
check("the full key is shown once", /^wck_[\w-]{20,}$/.test(key || ""));
await b.shot(path.join(out, "api-keys-new-desktop.png"), { full: true });
const axe2 = await b.axe();
check("no axe failures with the new key panel", axe2.length === 0, axe2.map((v) => v.id).join(", "));
await b.click("button", "Copy", { exact: true }); await sleep(400);
const copied = (await b.evaluate("document.querySelector('.api-keys__secret button')?.textContent")) === "Copied";
const selected = await b.evaluate("document.activeElement.id === 'new-key-value' && document.activeElement.selectionEnd > 0");
check("Copy copies the key, or selects it when the clipboard is blocked", copied || selected, copied ? "copied" : "selected");

// Using the key from outside the browser, as a developer would
check("the key reads through the public API", (await callApi("GET", "/users", key)) === 200);
check("a read-only key can't write", (await callApi("POST", "/posts", key, { desc: "Not allowed" })) === 403);

await b.click("button", "Done", { exact: true }); await sleep(800);
check("Done brings the form back", await b.evaluate("!!document.querySelector('.api-keys__form') && !document.querySelector('#new-key')"));
check("the new key is listed first", (await text(".api-key__name")) === "Test script");
check("with its access", (await text(".api-key__detail")).includes("Read only"));
await b.reload(); await b.waitFor("document.querySelector('.api-key')");
check("after use, it shows when it was last used", (await text(".api-key__detail")).includes("Last used just now"), await text(".api-key__detail"));
check("the key itself isn't shown again", !(await b.evaluate("document.body.textContent")).includes(key));

// Deleting it
await b.click("button", "Delete key “Test script”", { exact: true }); await sleep(600);
check("delete asks first", (await b.evaluate("document.querySelector('dialog[open] h2')?.textContent")) === "Delete this key?");
check("focus starts on Cancel", (await b.evaluate("document.activeElement.textContent")) === "Cancel");
await b.click("button", "Delete key", { exact: true }); await sleep(1200);
check("the dialog closes", await b.evaluate("!document.querySelector('dialog[open]')"));
check("a toast confirms it", ((await b.evaluate("document.querySelector('.toasts')?.textContent")) || "").includes("Deleted “Test script”"));
check("the key leaves the list", (await b.evaluate("[...document.querySelectorAll('.api-key__name')].map(n => n.textContent).join('|')")) === "npm run dev");
check("and stops working at once", (await callApi("GET", "/users", key)) === 401);

// Phones
await b.viewport(390, 844);
await b.goto(`${APP}/settings/api-keys`); await b.waitFor("document.querySelector('.api-key')");
check("no sideways scrolling on a phone", (await b.overflow()).overflow === false, JSON.stringify(await b.overflow()));
// A radio button inside a <label> is tapped through its label, so measure the label instead
const small = (await b.tapTargets(44)).filter((t) => t.el !== "INPUT");
const radioLabels = await b.evaluate("[...document.querySelectorAll('label > input[type=radio]')].map((i) => Math.round(i.parentElement.getBoundingClientRect().height))");
check("tap targets are at least 44px on a phone", small.length === 0 && radioLabels.every((h) => h >= 44), JSON.stringify({ small, radioLabels }).slice(0, 200));
await b.shot(path.join(out, "api-keys-phone.png"), { full: true });
await b.goto(`${APP}/profile`); await sleep(800);
check("the profile link is there on a phone too", Boolean(await b.find("link", "API keys", { exact: true })));
await b.shot(path.join(out, "profile-phone.png"));

const problems = b.problems();
check("no console problems", problems.length === 0, problems.join(" | "));
await b.close();
const passed = results.filter(Boolean).length;
console.log(`\n${passed} of ${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
