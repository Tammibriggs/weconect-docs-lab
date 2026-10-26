// Audit every signed-in page of the weConect copy at 7 widths: overflow, landmarks, axe,
// keyboard focus, tap targets, API calls and console problems.
// Usage: node audit.mjs <out-dir> [--ui=old|new] [--shots] [--axe-widths=390,1440]
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const [out, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const UI = args.ui || "new";
const APP = "http://localhost:3100";
const MOCK = "http://localhost:8810";
const ALICE = "6adc828b8254b290f811b79d";
const BOB = "6adc828b8254b290f811b79f";
const WIDTHS = [320, 390, 700, 900, 1024, 1280, 1440];
const AXE_WIDTHS = (args["axe-widths"] || "390,1440").split(",").map(Number);
const SHOT_WIDTHS = [390, 900, 1440];
const height = (w) => (w < 640 ? 844 : w < 1024 ? 1000 : 900);

const ROUTES = UI === "old"
  ? [["home", "/"], ["profile-own", `/profile/?id=${ALICE}`], ["profile-other", `/profile/?id=${BOB}`], ["followers", "/followers"], ["following", "/following"], ["messaging", "/messaging"]]
  : [["home", "/"], ["profile-own", `/profile/${ALICE}`], ["profile-other", `/profile/${BOB}`], ["followers", "/followers"], ["following", "/following"],
     ["messages", "/messages"], ["chat", `/messages/${BOB}`], ["search", "/search"], ["compose", "/compose"], ["not-found", "/nope"]];

fs.mkdirSync(out, { recursive: true });
await fetch(`${MOCK}/__control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
const b = await launch({ profile: path.join(out, ".chrome") });
const report = { ui: UI, pages: [], signedOut: [], keyboard: {}, tapTargets: [], signInCalls: [], problems: [] };

async function signIn(username = "alice", password = "secret1") {
  await b.goto(`${APP}/login`);
  await b.evaluate("document.querySelector('input[name=username]').focus(); true");
  await b.type(username);
  await b.evaluate("document.querySelector('input[name=password]').focus(); true");
  await b.type(password);
  const mark = b.mark();
  await b.press("Enter");
  await b.waitFor("location.pathname === '/'", 8000);
  await sleep(2500);
  return b.apiCalls(mark);
}

for (const [name, route] of [["login", "/login"], ["signup", "/signup"]]) {
  for (const w of [390, 1440]) {
    await b.viewport(w, height(w));
    await b.goto(`${APP}${route}`);
    const entry = { name, width: w, ...(await b.overflow()), ...(await b.landmarks()) };
    entry.controlFonts = await b.evaluate("[...new Set([...document.querySelectorAll('input, button')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/\"/g, '')))]");
    if (AXE_WIDTHS.includes(w)) entry.axe = await b.axe();
    if (args.shots) await b.shot(path.join(out, `${name}-${w}.png`));
    report.signedOut.push(entry);
  }
}
await b.viewport(1440, 900);
await b.goto(`${APP}/login`);
report.keyboard.login = await b.tabTrace(5);

await b.viewport(1440, 900);
report.signInCalls = await signIn();
for (const w of WIDTHS) {
  await b.viewport(w, height(w));
  for (const [name, route] of ROUTES) {
    await b.go(route, 1300);
    await b.evaluate("scrollTo(0, 0); true");
    const entry = { name, width: w, ...(await b.overflow()), ...(await b.landmarks()) };
    if (AXE_WIDTHS.includes(w)) entry.axe = await b.axe();
    if (args.shots && SHOT_WIDTHS.includes(w)) await b.shot(path.join(out, `${name}-${w}.png`));
    report.pages.push(entry);
  }
}
await b.viewport(390, 844);
await b.go("/");
report.tapTargets = await b.tapTargets();
await b.viewport(1440, 900);
await b.go("/");
await b.evaluate("document.activeElement?.blur(); scrollTo(0, 0); true");
report.keyboard.home = await b.tabTrace(14);
report.problems = b.problems();
await b.close();

const all = [...report.signedOut, ...report.pages];
const rules = {};
for (const p of all.filter((x) => x.axe)) for (const v of p.axe) {
  rules[v.id] ??= { impact: v.impact, pages: 0, nodes: 0, sample: v.sample };
  rules[v.id].pages++;
  rules[v.id].nodes += v.nodes;
}
const byImpact = {};
for (const r of Object.values(rules)) byImpact[r.impact] = (byImpact[r.impact] || 0) + 1;
const focus = [...report.keyboard.login, ...report.keyboard.home].filter((f) => f.tag !== "body");
report.summary = {
  overflowPages: all.filter((p) => p.overflow).map((p) => `${p.name}@${p.width} (${p.scrollWidth}px)`),
  landmarkIssues: report.pages.filter((p) => p.h1.length !== 1 || p.main !== 1
    // A chat on a phone hides the tab bar on purpose; it has a Back button instead.
    || (p.nav.filter((n) => n === "Primary").length !== 1 && !(p.name === "chat" && p.width < 640))).map((p) => `${p.name}@${p.width}: h1=${p.h1.length} main=${p.main} nav=${p.nav.length}`),
  noCurrentNavItem: report.pages.filter((p) => !["not-found"].includes(p.name) && p.current.length === 0).map((p) => `${p.name}@${p.width}`),
  axeRules: Object.keys(rules).length,
  axeRulesByImpact: byImpact,
  axeNodesTotal: Object.values(rules).reduce((n, r) => n + r.nodes, 0),
  axeTop: Object.entries(rules).sort((a, b) => b[1].nodes - a[1].nodes).slice(0, 12).map(([id, r]) => `${id} [${r.impact}] ${r.nodes} nodes on ${r.pages} checks: ${r.sample.join(" | ")}`),
  focusWithoutRing: focus.filter((f) => !f.ring).length,
  focusSteps: focus.length,
  tapTargetsUnder44: report.tapTargets,
  signInCalls: report.signInCalls.length,
  problems: report.problems,
};
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
