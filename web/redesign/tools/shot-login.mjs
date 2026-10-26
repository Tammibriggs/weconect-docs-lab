// Screenshot the signed-out pages. Usage: node shot-login.mjs <out-dir>
import path from "node:path";
import { launch } from "./cdp.mjs";
const out = process.argv[2];
const b = await launch({ profile: path.join(out, ".chrome-login"), port: 9344 });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  await b.viewport(w, h);
  await b.goto("http://localhost:3100/login");
  await b.shot(path.join(out, `login-${w}.png`));
}
await b.close();
process.exit(0);
