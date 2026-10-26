// Checks that focus indicators aren't covered by the sticky page header.
// For each field, focuses it and reports whether the header overlaps the area its
// outline or ring would draw in. Usage: node check-focus-clip.mjs <out-dir>
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";
const out = process.argv[2];
await fetch("http://localhost:8810/__control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
const b = await launch({ profile: path.join(out, ".chrome-focus"), port: 9343 });
const results = [];
const check = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
await b.viewport(1440, 900);
await b.goto("http://localhost:3100/login");
await b.fill("textbox", "Username", "alice"); await b.fill("textbox", "Password", "secret1", { index: 0 }); await b.press("Enter");
await b.waitFor("location.pathname === '/'", 8000); await sleep(1200);
const measure = (selector, holder) => b.evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  el.focus();
  const box = (${JSON.stringify(holder)} ? el.closest(${JSON.stringify(holder || "x")}) : el);
  const cs = getComputedStyle(box);
  const ring = cs.outlineStyle !== 'none' ? Math.max(0, parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset)) : 0;
  const shadow = (cs.boxShadow.match(/0px 0px 0px (\\d+)px/) && !cs.boxShadow.includes('inset')) ? parseFloat(cs.boxShadow.match(/0px 0px 0px (\\d+)px/)[1]) : 0;
  const outside = Math.max(ring, shadow);
  const top = box.getBoundingClientRect().top - outside;
  const header = document.querySelector('.page-header')?.getBoundingClientRect();
  return { outside, ringTop: Math.round(top), headerBottom: header ? Math.round(header.bottom) : null };
})()`);
for (const [label, route, selector, holder] of [
  ["composer on Home", "/", ".composer textarea", ".composer"],
  ["search page field", "/search", ".search-page input[type=search]", null],
  ["messages search field", "/messages", ".conversation-list input[type=search]", null],
  ["People tabs", "/followers", ".tabs__tab", null],
]) {
  await b.go(route, 1200);
  await b.evaluate("scrollTo(0, 0); true");
  const m = await measure(selector, holder);
  check(`${label}: focus indicator isn't under the header`, m.headerBottom === null || m.ringTop >= m.headerBottom, JSON.stringify(m));
}
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(0);
