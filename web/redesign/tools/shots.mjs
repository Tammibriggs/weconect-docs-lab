// Sign in and screenshot routes at given widths.
// Usage: node shots.mjs <out-dir> [--user=alice] [--full] <name>@<width>:<route> ...
//   e.g. node shots.mjs /tmp/out home@390:/ profile@1440:/profile/6adc828b8254b290f811b79f
import fs from "node:fs";
import path from "node:path";
import { launch } from "./cdp.mjs";

const [out, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")).map(([k, v]) => [k, v ?? true]));
const specs = rest.filter((a) => !a.startsWith("--")).map((s) => { const [, name, width, route] = s.match(/^(.+)@(\d+):(.*)$/); return { name, width: Number(width), route }; });
const PASSWORDS = { alice: "secret1", bob: "secret2", carol: "secret3" };
const user = flags.user || "alice";
const height = (w) => (w < 640 ? 844 : w < 1024 ? 1000 : 900);

fs.mkdirSync(out, { recursive: true });
if (!flags["no-reset"]) await fetch("http://localhost:8810/__control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
const b = await launch({ profile: path.join(out, ".chrome-shots"), port: 9336 });
await b.viewport(1440, 900);
await b.goto("http://localhost:3100/login");
await b.evaluate("document.querySelector('input[name=username]').focus(); true");
await b.type(user);
await b.evaluate("document.querySelector('input[name=password]').focus(); true");
await b.type(PASSWORDS[user]);
await b.press("Enter");
await b.waitFor("location.pathname === '/'", 8000);
for (const { name, width, route } of specs) {
  await b.viewport(width, height(width));
  await b.go(route, 1500);
  await b.evaluate("document.activeElement?.blur(); scrollTo(0, 0); true");
  await b.shot(path.join(out, `${name}-${width}.png`), { full: Boolean(flags.full) });
  console.log("shot", `${name}-${width}.png`, JSON.stringify(await b.overflow()));
}
const problems = b.problems();
if (problems.length) console.log("problems:", problems);
await b.close();
process.exit(0);
