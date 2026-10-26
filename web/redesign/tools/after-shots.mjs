// Takes the "after" screenshots: the same 14 views as web/redesign/before/, with the same names.
// Usage: node after-shots.mjs <out-dir>
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const APP = "http://localhost:3100";
const BOB = "6adc828b8254b290f811b79f";
fs.mkdirSync(out, { recursive: true });
await fetch("http://localhost:8810/__control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
const b = await launch({ profile: path.join(out, "..", ".chrome-after"), port: 9342 });
const shot = async (name) => { await b.evaluate("document.activeElement?.blur(); true"); await sleep(400); await b.shot(path.join(out, `${name}.png`)); console.log("shot", name); };
const PHONE = [390, 844], TABLET = [900, 1100], DESK = [1440, 900];

await b.viewport(...PHONE);
await b.goto(`${APP}/login`);
await shot("01-login-phone");
await b.viewport(...DESK);
await b.goto(`${APP}/login`);
await shot("06-login-desktop");

await b.fill("textbox", "Username", "alice");
await b.fill("textbox", "Password", "secret1", { index: 0 });
await b.press("Enter");
await b.waitFor("location.pathname === '/'", 8000);
await sleep(2000);

await shot("10-home-desktop");
await b.viewport(...TABLET); await b.go("/", 1500); await shot("10-home-tablet900");
await b.viewport(...PHONE); await b.go("/", 1500); await shot("10-home-phone");
await b.viewport(...DESK); await b.go(`/profile/${BOB}`, 1500); await shot("13-profile-other-desktop");
await b.viewport(...PHONE); await b.go(`/profile/${BOB}`, 1500); await shot("13-profile-other-phone");
await b.go("/following", 1500); await shot("21-following-route-phone");
await b.go("/messages", 1500); await shot("24-messaging-empty-phone");
await b.go(`/messages/${BOB}`, 2000); await shot("27-chat-phone");

await b.viewport(...DESK);
await b.go("/compose", 1500); await shot("40-share-modal-desktop");
await b.go("/", 1500);
await b.click("button", "More options", { index: 1 });
await b.press("Enter");
await sleep(600);
await b.shot(path.join(out, "43-delete-modal-desktop.png")); console.log("shot 43-delete-modal-desktop");
await b.press("Escape");
await sleep(400);
await b.go("/profile/6adc828b8254b290f811b79d", 1500);
await b.click("button", "Edit profile", { exact: true });
await sleep(1200);
await b.shot(path.join(out, "44-edit-profile-desktop.png")); console.log("shot 44-edit-profile-desktop");
await b.press("Escape");
await sleep(400);
await b.go(`/messages/${BOB}`, 2000); await shot("45-messaging-route-desktop");
await b.close();
process.exit(0);
