// A small Chrome DevTools Protocol driver for auditing the weConect copy. No dependencies:
// it starts headless Chrome and talks to it over WebSocket (built into Node 22+).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const here = path.dirname(fileURLToPath(import.meta.url));
const AXE = path.resolve(here, "../../node_modules/axe-core/axe.min.js");

const KEYS = {
  Enter: { code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Tab: { code: "Tab", windowsVirtualKeyCode: 9 },
  Escape: { code: "Escape", windowsVirtualKeyCode: 27 },
  Backspace: { code: "Backspace", windowsVirtualKeyCode: 8 },
  ArrowDown: { code: "ArrowDown", windowsVirtualKeyCode: 40 },
  ArrowUp: { code: "ArrowUp", windowsVirtualKeyCode: 38 },
};

export async function launch({ port = 9333, profile, blockFirebase = true } = {}) {
  // A Chrome left over from a crashed run would keep the port; stop it first.
  spawnSync("pkill", ["-f", `remote-debugging-port=${port} --user-data-dir=${profile}`]);
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
  const chrome = spawn("google-chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
  const stop = () => { try { chrome.kill(); } catch {} };
  process.on("exit", stop);
  process.on("uncaughtException", (err) => { console.error(err); stop(); process.exit(1); });
  process.on("unhandledRejection", (err) => { console.error(err); stop(); process.exit(1); });

  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); }
    catch { await sleep(100); }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const events = [];
  const waiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
      for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const nextEvent = (method, timeout = 10000) => new Promise((resolve, reject) => {
    const w = { method, resolve };
    waiters.push(w);
    setTimeout(() => { if (waiters.includes(w)) { waiters.splice(waiters.indexOf(w), 1); reject(new Error(`timeout waiting for ${method}`)); } }, timeout);
  });

  for (const domain of ["Page", "Runtime", "Network", "Log", "DOM", "Accessibility"]) await send(`${domain}.enable`);
  // The copy carries the real Firebase config: never let a test reach real storage.
  if (blockFirebase) await send("Network.setBlockedURLs", { urls: ["*firebasestorage.googleapis.com*", "*firebaseio.com*", "*appspot.com*"] });

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const header = (e, name) => e.params.request.headers[name] ?? e.params.request.headers[name.toLowerCase()];

  const b = {
    send, evaluate, events, nextEvent,
    mark: () => events.length,
    async close() { ws.close(); stop(); await sleep(200); },
    async viewport(width, height, mobile = width < 640) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
      await evaluate("dispatchEvent(new Event('resize')); true").catch(() => {});
      await sleep(400);
    },
    // Waits for the DOM and for React to render, not for the load event: a slow font host
    // would otherwise hold every navigation up.
    async goto(url, settle = 1500) {
      const ready = nextEvent("Page.domContentEventFired", 30000);
      await send("Page.navigate", { url });
      await ready;
      await b.waitFor("document.getElementById('root')?.children.length > 0", 10000);
      await b.waitForFonts();
      await sleep(settle);
    },
    async reload(settle = 2000) {
      const ready = nextEvent("Page.domContentEventFired", 30000);
      await send("Page.reload", { ignoreCache: false });
      await ready;
      await b.waitFor("document.getElementById('root')?.children.length > 0", 10000);
      await sleep(settle);
    },
    async waitForFonts(timeout = 15000) {
      return b.waitFor("[...document.fonts].some((f) => f.family.replace(/\"/g, '') === 'Hanken Grotesk' && f.status === 'loaded')", timeout);
    },
    // Client-side navigation, so an in-memory session survives.
    async go(route, settle = 1200) {
      await evaluate(`history.pushState({}, '', ${JSON.stringify(route)}); dispatchEvent(new PopStateEvent('popstate')); true`);
      await sleep(settle);
    },
    async waitFor(expr, timeout = 8000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) { try { if (await evaluate(expr)) return true; } catch {} await sleep(100); }
      return false;
    },
    // Accessibility-tree queries by role and name, so tests also prove that names exist.
    async ax() {
      const { nodes } = await send("Accessibility.getFullAXTree");
      return nodes.filter((n) => !n.ignored).map((n) => ({ role: n.role?.value, name: n.name?.value ?? "", backendDOMNodeId: n.backendDOMNodeId,
        props: Object.fromEntries((n.properties || []).map((p) => [p.name, p.value?.value])) }));
    },
    async find(role, name, { exact = false } = {}) {
      const match = (n) => n.role === role && (name === undefined || (name instanceof RegExp ? name.test(n.name)
        : exact ? n.name === name : n.name.toLowerCase().includes(String(name).toLowerCase())));
      const found = [];
      for (const n of (await b.ax()).filter(match)) {
        try { const { quads } = await send("DOM.getContentQuads", { backendNodeId: n.backendDOMNodeId }); if (quads.length) found.push(n); } catch {}
      }
      return found;
    },
    async center(backendNodeId) {
      await send("DOM.scrollIntoViewIfNeeded", { backendNodeId }).catch(() => {});
      const { quads } = await send("DOM.getContentQuads", { backendNodeId });
      const q = quads[0];
      return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
    },
    async clickAt(x, y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    async click(role, name, opts = {}) {
      const nodes = await b.find(role, name, opts);
      const n = nodes[opts.index ?? 0];
      if (!n) throw new Error(`no visible ${role} named ${name}`);
      const { x, y } = await b.center(n.backendDOMNodeId);
      await b.clickAt(x, y);
      await sleep(opts.settle ?? 400);
      return n;
    },
    async press(key, modifiers = 0) {
      const k = KEYS[key] || { code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), text: key };
      const text = modifiers ? undefined : k.text;
      await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode, text, modifiers });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode, modifiers });
      await sleep(80);
    },
    async type(text) { await send("Input.insertText", { text }); await sleep(80); },
    async fill(role, name, text, opts = {}) {
      await b.click(role, name, { ...opts, settle: 100 });
      await b.press("a", 2); // Ctrl+A
      await b.press("Backspace");
      if (text) await b.type(text);
    },
    async shot(file, { full = false } = {}) {
      const params = { format: "png" };
      if (full) {
        const { cssContentSize: c } = await send("Page.getLayoutMetrics");
        Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width: c.width, height: Math.min(c.height, 6000), scale: 1 } });
      }
      const { data } = await send("Page.captureScreenshot", params);
      fs.writeFileSync(file, Buffer.from(data, "base64"));
    },
    async overflow() {
      return evaluate("({ innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 })");
    },
    async landmarks() {
      return evaluate(`({
        h1: [...document.querySelectorAll('h1')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()),
        main: document.querySelectorAll('main').length,
        nav: [...document.querySelectorAll('nav')].filter((e) => e.getClientRects().length).map((e) => e.getAttribute('aria-label') || '(unnamed)'),
        current: [...document.querySelectorAll('[aria-current="page"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim() || e.getAttribute('aria-label')),
        title: document.title,
      })`);
    },
    async axe(tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]) {
      if (!(await evaluate("typeof window.axe !== 'undefined'"))) await evaluate(fs.readFileSync(AXE, "utf8") + "; true");
      return evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(tags)} }, resultTypes: ['violations'] })
        .then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')), help: v.help })))`);
    },
    async focusInfo() {
      return evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return { tag: 'body' };
        const cs = getComputedStyle(el);
        const own = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
        // Some controls show focus on their container instead, marked with data-focus-ring.
        const holder = el.closest('[data-focus-ring]');
        const ring = own || Boolean(holder && getComputedStyle(holder).boxShadow !== 'none');
        const name = el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent.trim().slice(0, 40) || el.getAttribute('placeholder') || '';
        return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', name: name.trim(), ring };
      })()`);
    },
    async tabTrace(n) {
      const out = [];
      for (let i = 0; i < n; i++) { await b.press("Tab"); out.push(await b.focusInfo()); }
      return out;
    },
    async tapTargets(min = 44) {
      return evaluate(`[...document.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])')]
        .filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
        .filter((e) => !(e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p')))
        .map((e) => { const r = e.getBoundingClientRect(); return { el: (e.getAttribute('aria-label') || e.textContent.trim() || e.tagName).slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((x) => x.w < ${min} || x.h < ${min})`);
    },
    apiCalls(since = 0) {
      return events.slice(since).filter((e) => e.method === "Network.requestWillBeSent" && e.params.request.url.includes(":8810/api/") && e.params.request.method !== "OPTIONS")
        .map((e) => `${e.params.request.method} ${e.params.request.url.replace(/^.*:8810\/api\//, "")}`);
    },
    // The user id inside each API request's token, for checking which session sent it.
    requestUserIds(since = 0) {
      return events.slice(since).filter((e) => e.method === "Network.requestWillBeSent" && header(e, "Authorization"))
        .map((e) => JSON.parse(Buffer.from(header(e, "Authorization").split(".")[1], "base64url").toString()).id);
    },
    problems(since = 0) {
      const ignore = /socket\.io|favicon|Failed to load resource: the server responded with a status of [45]\d\d|ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED|net::ERR_CONNECTION_REFUSED|example\.com/;
      return [...new Set(events.slice(since).map((e) => {
        if (e.method === "Runtime.exceptionThrown") return "exception: " + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text).split("\n")[0];
        if (e.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(e.params.type))
          return `console.${e.params.type}: ` + e.params.args.map((a) => a.value ?? a.description ?? "").join(" ").split("\n")[0].slice(0, 220);
        if (e.method === "Log.entryAdded" && e.params.entry.level === "error") return "log: " + e.params.entry.text.slice(0, 200) + " " + (e.params.entry.url || "");
        return null;
      }).filter((x) => x && !ignore.test(x)))];
    },
  };
  return b;
}
