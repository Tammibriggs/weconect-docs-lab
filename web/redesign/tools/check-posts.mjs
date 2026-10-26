// Checks the feed, posts and composer. Usage: node check-posts.mjs <out-dir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const here = path.dirname(fileURLToPath(import.meta.url));
const APP = "http://localhost:3100";
const MOCK = "http://localhost:8810";
fs.mkdirSync(out, { recursive: true });
const control = (body) => fetch(`${MOCK}/__control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
await control({ reset: true });

const b = await launch({ profile: path.join(out, ".chrome-posts"), port: 9338 });
const results = [];
const check = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const texts = () => b.evaluate("[...document.querySelectorAll('.post-card')].map((c) => c.querySelector('.post-card__text')?.textContent ?? '(photo)')");
const deleted = () => b.evaluate("window.__fakeImages?.deleted ?? []");

await b.viewport(1440, 900);
await b.goto(`${APP}/login`);
await b.fill("textbox", "Username", "alice");
await b.fill("textbox", "Password", "secret1", { index: 0 });
const signInMark = b.mark();
await b.press("Enter");
await b.waitFor("document.querySelectorAll('.post-card').length > 3", 8000);
await sleep(1500);
const calls = b.apiCalls(signInMark).map((c) => c.replace(/[a-f\d]{24}/g, ":id"));
check("no per-post requests (/single)", !calls.some((c) => c.includes("/single")), calls.join(", "));
check("one author lookup per other author (bob, christopher)", calls.filter((c) => c === "GET users/:id/user").length === 2);
check("sign-in to Home at 1440px takes 6 calls with this data (login, timeline, 2 authors, the aside's 2 lists)", calls.length <= 6, `${calls.length}`);

const order = await b.evaluate("[...document.querySelectorAll('.post-card time')].map((t) => t.dateTime)");
check("feed is newest first", order.every((d, i) => i === 0 || new Date(order[i - 1]) >= new Date(d)));
check("a photo that can't load shows a message", (await b.evaluate("document.body.innerText")).includes("This photo couldn't load"));

// Like and unlike
const likeMark = b.mark();
await b.click("button", "Like", { exact: true, index: 1 });
await sleep(800);
const likeCalls = b.apiCalls(likeMark);
check("a like sends one PUT and no GETs", likeCalls.length === 1 && likeCalls[0].startsWith("PUT"), likeCalls.join(", "));
check("the like button is pressed", (await b.evaluate("document.querySelectorAll('.like-btn')[1].getAttribute('aria-pressed')")) === "true");
const unlikeMark = b.mark();
await b.click("button", "Like", { exact: true, index: 1 });
await sleep(300);
await b.go("/profile/6adc828b8254b290f811b79f", 4500);
check("unlike while the API restarts doesn't sign you out", (await b.evaluate("location.pathname")) !== "/login");
const retried = b.apiCalls(unlikeMark).filter((c) => c.startsWith("GET posts/")).length;
check("reads are retried during the restart", retried >= 1, `${retried} GETs for posts`);
check("profile loads after the restart", await b.waitFor("document.querySelectorAll('.post-card').length > 0", 8000));

// Delete a text-only post and a post with a photo
await b.go("/", 1500);
const before = (await texts()).length;
await b.click("button", "More options", { index: 1 });
check("the menu opens with focus on its first item", (await b.evaluate("document.activeElement.textContent")) === "Delete post");
await b.press("Escape");
check("Escape closes the menu and returns focus", (await b.evaluate("document.activeElement.getAttribute('aria-label')")) === "More options");
await b.press("Enter");
await sleep(200);
await b.press("Enter");
await sleep(500);
check("Delete opens a confirmation with focus on Cancel", (await b.evaluate("document.activeElement.textContent")) === "Cancel");
const axeDialog = await b.axe();
check("axe with the dialog open", axeDialog.length === 0, axeDialog.map((v) => v.id).join(", "));
await b.shot(path.join(out, "delete-dialog-1440.png"));
const delMark = b.mark();
await b.click("button", "Delete", { exact: true });
await sleep(1200);
check("deleting sends one DELETE", b.apiCalls(delMark).filter((c) => c.startsWith("DELETE")).length === 1);
check("the post is gone and a toast confirms it", (await texts()).length === before - 1 && (await b.evaluate("document.body.innerText")).includes("Post deleted"));
check("focus moved to the page heading", (await b.evaluate("document.activeElement.tagName")) === "H1");
const photoMenu = await b.evaluate("[...document.querySelectorAll('[aria-label=\"More options\"]')].findIndex((btn) => btn.closest('.post-card').querySelector('.post-card__text')?.textContent === 'A photo')");
await b.click("button", "More options", { index: photoMenu });
await b.press("Enter");
await sleep(400);
await b.click("button", "Delete", { exact: true });
await sleep(1200);
check("deleting a post with a photo deletes the stored photo too", (await deleted()).includes("photo.jpg"), JSON.stringify(await deleted()));
check("deleting a text-only post deleted no photo", (await deleted()).length === 1);

// Composer
check("Post is disabled while the composer is empty", (await b.evaluate("document.querySelector('.composer button[type=submit]').disabled")) === true);
await b.click("textbox", "Write a post");
await b.type("Testing the new composer");
await control({ failNext: { method: "POST", path: "posts", status: 500 } });
await b.press("Enter", 2); // Ctrl+Enter
await sleep(1000);
check("a failed post keeps the text and says so", (await b.evaluate("document.querySelector('.composer textarea').value")) === "Testing the new composer"
  && (await b.evaluate("document.body.innerText")).includes("Couldn't share your post"));
await b.click("button", "Post", { exact: true });
await sleep(1200);
check("posting puts the post at the top and clears the composer", (await texts())[0] === "Testing the new composer"
  && (await b.evaluate("document.querySelector('.composer textarea').value")) === "");

// Photo upload through the fake storage
const { root } = await b.send("DOM.getDocument", { depth: -1 });
const { nodeId } = await b.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".composer input[type=file]" });
await b.send("DOM.setFileInputFiles", { files: [path.join(here, "fixtures/portrait.jpg")], nodeId });
await sleep(600);
check("choosing a photo shows a preview with a remove button", (await b.find("button", "Remove photo")).length === 1);
await b.click("button", "Post", { exact: true });
await sleep(2000);
check("a photo-only post appears with its photo", await b.evaluate("!!document.querySelector('.post-card:first-child .post-card__image img, .post-list li:first-child .post-card__image img')"));
await b.shot(path.join(out, "home-after-1440.png"));

await b.viewport(390, 844);
await b.go("/", 1500);
const axePhone = await b.axe();
check("axe on Home at 390px", axePhone.length === 0, axePhone.map((v) => `${v.id}(${v.nodes})`).join(", "));
const small = (await b.tapTargets()).filter((t) => t.el !== "Skip to content");
check("tap targets on Home at 390px are at least 44px", small.length === 0, JSON.stringify(small));
const problems = b.problems();
check("no console problems", problems.length === 0, problems.join(" | "));
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(0);
