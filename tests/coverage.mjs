// Check that every response the spec documents appears in at least one capture.
// validate.mjs checks the other direction: that every captured response is
// documented. A documented status with no capture is either untested or no
// longer happens, such as a 500 the API stopped returning.
//
//   npm run test:coverage                        checks tests/captures/v1
//   npm run test:coverage -- tests/runs/<run>    checks another run

import path from "node:path";
import { ROOT, spec, captureDir, readCaptures, specPath } from "./spec.mjs";

const DIR = captureDir(process.argv[2]);

// "GET /api/users 401", for each operation and status a capture shows
const seen = new Set();
for (const cap of readCaptures(DIR)) {
  if (cap.response.error) continue;
  const route = specPath(cap.request.path);
  if (route) seen.add(`${cap.request.method} ${route} ${cap.response.status}`);
}

let total = 0;
const missing = [];
for (const [route, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!op.responses) continue; // a path-level key such as parameters
    for (const status of Object.keys(op.responses)) {
      total++;
      const key = `${method.toUpperCase()} ${route} ${status}`;
      if (!seen.has(key)) missing.push(`${key}  (${op.summary})`);
    }
  }
}

for (const line of missing) console.log(`MISSING ${line}`);
console.log(`\n${total - missing.length} of ${total} documented responses appear in a capture, ${missing.length} don't (${path.relative(ROOT, DIR)})`);
process.exit(missing.length ? 1 : 0);
