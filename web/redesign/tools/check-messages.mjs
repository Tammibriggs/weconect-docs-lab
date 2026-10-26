// Checks messages: layout, the socket, live messages, sending, and the v1 conversation limit.
// Usage: node check-messages.mjs <out-dir>
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2];
const APP = "http://localhost:3100";
const MOCK = "http://localhost:8810";
const ALICE = "6adc828b8254b290f811b79d";
const BOB = "6adc828b8254b290f811b79f";
const CAROL = "6adc828b8254b290f811b7a1";
const DAVE = "6adc828e8254b290f811b7a5";
fs.mkdirSync(out, { recursive: true });
const control = (body) => fetch(`${MOCK}/__control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const stats = async () => (await fetch(`${MOCK}/__stats`)).json();
await control({ reset: true });

const b = await launch({ profile: path.join(out, ".chrome-messages"), port: 9341 });
const results = [];
const check = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const text = () => b.evaluate("document.body.innerText");
const bubbles = () => b.evaluate("[...document.querySelectorAll('.chat__bubble')].map((e) => e.textContent)");
const axe = async (label) => { const v = await b.axe(); check(`axe: ${label}`, v.length === 0, v.map((x) => `${x.id}(${x.nodes}) ${x.sample.join(" | ")}`).join("; ")); };

async function signIn(username, password) {
  await b.goto(`${APP}/login`);
  await b.fill("textbox", "Username", username);
  await b.fill("textbox", "Password", password, { index: 0 });
  await b.press("Enter");
  await b.waitFor("location.pathname === '/'", 8000);
  await sleep(1500);
}

await b.viewport(390, 844);
await signIn("alice", "secret1");

// Phones: list, then the chat on its own
await b.go("/messages", 1500);
check("phone: the list shows with the tab bar", (await b.evaluate("!!document.querySelector('.conversation-row') && getComputedStyle(document.querySelector('.nav')).display !== 'none'")));
await axe("message list at 390px");
await b.click("link", /^bob/);
await sleep(1500);
check("phone: the chat opens on its own, without the tab bar", (await b.evaluate("location.pathname")) === `/messages/${BOB}` && (await b.evaluate("getComputedStyle(document.querySelector('.nav')).display")) === "none");
check("the chat's name is the page heading", (await b.landmarks()).h1.join() === "bob", (await b.landmarks()).h1.join());
check("the title names the chat", (await b.evaluate("document.title")) === "Chat with bob · weConect");
await axe("chat at 390px");
await b.shot(path.join(out, "chat-390.png"));
await b.click("button", "Back to messages");
await sleep(800);
check("Back returns to the list", (await b.evaluate("location.pathname")) === "/messages");

// One socket for the whole session
await b.viewport(1440, 900);
for (const route of ["/", `/profile/${BOB}`, "/messages", "/search", "/followers", "/", `/messages/${BOB}`, "/compose", "/", "/messages"]) await b.go(route, 400);
await sleep(1500);
check("one socket after 10 page changes", (await stats()).sockets === 1, `sockets=${(await stats()).sockets}`);
const before = (await stats()).addUserCalls;
await control({ crashForMs: 1500 });
await sleep(6000);
check("after the API restarts, the socket registers again", (await stats()).addUserCalls > before, `addUser ${before} → ${(await stats()).addUserCalls}`);

// A live message while you're elsewhere, then in the chat
await b.go("/", 1000);
await control({ emit: { from: BOB, to: ALICE, text: "Are you around?" } });
await sleep(1000);
check("a message elsewhere adds an unread badge", (await b.evaluate("document.querySelector('.nav__badge')?.textContent")) === "1");
const messageLinks = (await b.find("link", /^Messages/)).map((n) => n.name);
check("the badge is announced with the Messages link", messageLinks.some((name) => /^Messages,?\s*1 unread$/.test(name)), JSON.stringify(messageLinks));
await b.go(`/messages/${BOB}`, 1500);
check("the message shows once in the chat", (await bubbles()).filter((t) => t === "Are you around?").length === 1);
check("opening the chat clears the badge", (await b.evaluate("document.querySelector('.nav__badge')")) === null);
await control({ emit: { from: BOB, to: ALICE, text: "Ping" } });
await sleep(1000);
check("a message in the open chat appears once, with no badge", (await bubbles()).filter((t) => t === "Ping").length === 1 && (await b.evaluate("document.querySelector('.nav__badge')")) === null);

// Sending
await b.click("textbox", "Message", { exact: true });
await b.type("First line");
await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8, text: "\r" });
await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8 });
await b.type("second line");
check("Shift+Enter starts a new line", (await b.evaluate("document.querySelector('.message-composer textarea').value")) === "First line\nsecond line");
const sendMark = b.mark();
await b.press("Enter");
await sleep(1200);
check("Enter sends the message", b.apiCalls(sendMark).some((c) => c === "POST messages") && (await bubbles()).includes("First line\nsecond line"));
check("the box empties after sending", (await b.evaluate("document.querySelector('.message-composer textarea').value")) === "");
await control({ failNext: { method: "POST", path: "messages", status: 500 } });
await b.type("This one fails");
await b.press("Enter");
await sleep(1000);
check("a failed send keeps the text and says so", (await b.evaluate("document.querySelector('.message-composer textarea').value")) === "This one fails" && (await text()).includes("Couldn't send your message"));
await axe("chat at 1440px");
await b.shot(path.join(out, "chat-1440.png"));

// The v1 limit: alice can't start a second conversation
const blockedMark = b.mark();
await b.go(`/messages/${CAROL}`, 1500);
check("a second conversation shows the v1 limit instead of a composer", (await text()).includes("You can only have one conversation for now") && (await b.evaluate("document.querySelector('.message-composer')")) === null);
check("and nothing is sent to the API", !b.apiCalls(blockedMark).some((c) => c.startsWith("POST")));

// Someone with no conversations can start one
await b.click("button", "Sign out", { exact: true });
await sleep(800);
await signIn("carol", "secret3");
await b.go(`/messages/${DAVE}`, 1500);
check("an empty chat says hi", (await text()).includes("Say hi to dave"));
await b.click("textbox", "Message", { exact: true });
await b.type("Hi Dave!");
const startMark = b.mark();
await b.press("Enter");
await sleep(2000);
check("the first message creates the conversation, then sends", b.apiCalls(startMark).includes("POST conversations") && b.apiCalls(startMark).includes("POST messages"));
check("the conversation and message appear", (await bubbles()).includes("Hi Dave!") && (await b.evaluate("document.querySelectorAll('.conversation-row').length")) === 1);

const problems = b.problems();
check("no console problems", problems.length === 0, problems.join(" | "));
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(0);
