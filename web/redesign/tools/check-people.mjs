// Checks profiles, edit profile, your lists and search. Usage: node check-people.mjs <out-dir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const here = path.dirname(fileURLToPath(import.meta.url));
const APP = "http://localhost:3100";
const MOCK = "http://localhost:8810";
const ALICE = "6adc828b8254b290f811b79d";
const BOB = "6adc828b8254b290f811b79f";
const CAROL = "6adc828b8254b290f811b7a1";
fs.mkdirSync(out, { recursive: true });
const control = (body) => fetch(`${MOCK}/__control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
await control({ reset: true });

const b = await launch({ profile: path.join(out, ".chrome-people"), port: 9339 });
const results = [];
const check = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const text = () => b.evaluate("document.body.innerText");
const axe = async (label) => { const v = await b.axe(); check(`axe: ${label}`, v.length === 0, v.map((x) => `${x.id}(${x.nodes}) ${x.sample.join(" | ")}`).join("; ")); };

async function signIn(username, password) {
  await b.goto(`${APP}/login`);
  await b.fill("textbox", "Username", username);
  await b.fill("textbox", "Password", password, { index: 0 });
  await b.press("Enter");
  await b.waitFor("location.pathname === '/'", 8000);
  await sleep(1500);
}

await b.viewport(1440, 900);
await signIn("alice", "secret1");

// Lists
await b.go("/followers", 1500);
check("follower avatars load (the API's `image` field)", await b.evaluate("[...document.querySelectorAll('.connections .avatar img')].some((i) => i.src.includes('avatar-carol') && i.complete && i.naturalWidth > 0)"));
check("the Followers tab is current", (await b.evaluate("document.querySelector('.tabs [aria-current=page]')?.textContent")).startsWith("Followers"));
await axe("/followers at 1440px");
await b.click("link", /^Following/);
await sleep(800);
check("the Following tab switches the route", (await b.evaluate("location.pathname")) === "/following");

// Profiles
await b.go(`/profile/${BOB}`, 1500);
check("someone else's counts aren't links", (await b.evaluate("document.querySelectorAll('.profile-header__stats a').length")) === 0);
check("plural counts read correctly", (await text()).includes("1 follower") && !(await text()).includes("1 followers"));
await axe("bob's profile at 1440px");
await b.go(`/profile/${ALICE}`, 1500);
check("your counts link to your lists", (await b.evaluate("document.querySelectorAll('.profile-header__stats a').length")) === 2);
const notFoundMark = b.mark();
await b.go("/profile/nope", 1200);
check("an invalid profile ID shows 'doesn't exist' without asking the API", (await text()).includes("This account doesn't exist") && !b.apiCalls(notFoundMark).some((c) => c.includes("users/nope")));
await b.go("/profile/000000000000000000000000", 1500);
check("an unknown profile shows 'doesn't exist'", (await text()).includes("This account doesn't exist"));

// Follow
await b.go(`/profile/${CAROL}`, 1500);
const followMark = b.mark();
await b.click("button", "Follow carol");
await sleep(1500);
const followCalls = b.apiCalls(followMark).map((c) => c.replace(/[a-f\d]{24}/g, ":id"));
check("following someone sends one PUT", followCalls.filter((c) => c.startsWith("PUT")).length === 1, followCalls.join(", "));
check("the button and the count update", (await b.find("button", "Unfollow carol")).length === 1 && (await text()).includes("1 follower"));
console.log("      requests after following:", followCalls.join(", "));

// Search
await b.go("/search", 1000);
const searchMark = b.mark();
for (const ch of "alice") { await b.type(ch); await sleep(60); }
await sleep(900);
const searches = b.apiCalls(searchMark).filter((c) => c.startsWith("GET users/search"));
check("typing quickly sends one search", searches.length === 1, searches.join(", "));
check("the term is in the URL", (await b.evaluate("location.search")) === "?q=alice");
check("you're left out of your own results", (await text()).includes("No one matches"));
const encMark = b.mark();
await b.fill("searchbox", "Search people", "a&b");
await sleep(900);
check("terms are URL-encoded", b.apiCalls(encMark).some((c) => c.includes("search=a%26b")), b.apiCalls(encMark).join(", "));
await b.fill("searchbox", "Search people", "o");
await sleep(900);
check("results show how you're connected", (await text()).includes("You follow each other") || (await text()).includes("Follows you"));
await axe("/search?q=o at 1440px");
await b.shot(path.join(out, "search-1440.png"));

// Edit profile (as bob, who has a picture and a cover)
await b.click("button", "Sign out", { exact: true });
await sleep(800);
await signIn("bob", "secret2");
await b.go(`/profile/${BOB}`, 1500);
await b.click("button", "Edit profile", { exact: true });
await sleep(500);
check("the dialog opens with focus on Username", (await b.evaluate("document.activeElement.labels?.[0]?.textContent")) === "Username");
await axe("edit profile dialog");
await b.shot(path.join(out, "edit-profile-1440.png"));
await b.press("Escape");
await sleep(400);
check("Escape closes it and focus returns to Edit profile", (await b.evaluate("document.activeElement.textContent")) === "Edit profile");
await b.click("button", "Edit profile", { exact: true });
await sleep(400);
await b.fill("textbox", "Username", "alice");
await b.click("button", "Save", { exact: true });
await sleep(1000);
check("a taken username shows a field error and the dialog stays open", (await text()).includes("That username is taken") && (await b.evaluate("document.querySelector('dialog[open]') !== null")));
await b.fill("textbox", "Username", "bob");
const { root } = await b.send("DOM.getDocument", { depth: -1 });
const { nodeIds } = await b.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "dialog input[type=file]" });
await b.send("DOM.setFileInputFiles", { files: [path.join(here, "fixtures/portrait.jpg")], nodeId: nodeIds[1] });
await sleep(300);
await control({ failNext: { method: "PUT", path: "users", status: 500, body: { status: "error", error: {} } } });
await b.click("button", "Save", { exact: true });
await sleep(1200);
check("a failed save keeps the dialog open and deletes nothing", (await b.evaluate("document.querySelector('dialog[open]') !== null")) && (await b.evaluate("(window.__fakeImages?.deleted ?? []).length")) === 0);
await control({ latencyMs: 700 });
await b.fill("textbox", "Bio", "Coffee, code and longer walks.");
await b.click("button", "Save", { exact: true });
await sleep(300);
check("while saving, the dialog stays open", await b.evaluate("document.querySelector('dialog[open]') !== null"));
await sleep(1800);
await control({ latencyMs: 0 });
check("after saving, it closes with a toast", (await b.evaluate("document.querySelector('dialog[open]') === null")) && (await text()).includes("Profile saved"));
check("the new bio shows", (await text()).includes("Coffee, code and longer walks."));
check("the old picture is deleted only after the save", JSON.stringify(await b.evaluate("window.__fakeImages?.deleted")) === '["avatar-bob.jpg"]', JSON.stringify(await b.evaluate("window.__fakeImages?.deleted")));

await b.viewport(390, 844);
await b.go(`/profile/${BOB}`, 1500);
await axe("bob's own profile at 390px");
await b.shot(path.join(out, "profile-390.png"));
const small = (await b.tapTargets()).filter((t) => t.el !== "Skip to content");
check("tap targets on a profile at 390px", small.length === 0, JSON.stringify(small));
const problems = b.problems();
check("no console problems", problems.length === 0, problems.join(" | "));
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(0);
