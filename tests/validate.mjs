// Check a folder of captures against the spec: every captured status must be
// documented for its operation, and every JSON body must match its schema.
//
//   npm run test:validate                        checks tests/captures/v1
//   npm run test:validate -- tests/runs/<run>    checks another run
//
// Captures for paths the spec doesn't cover (out of scope, or not an API route)
// are listed separately, not failed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = path.join(ROOT, "openapi", "weconect-v1.yaml");
const DIR = path.resolve(ROOT, process.argv[2] || path.join("tests", "captures", "v1"));

const spec = YAML.parse(fs.readFileSync(SPEC, "utf8"));

// Inline local $refs ("#/components/...") so each schema stands alone.
function deref(node, stack = []) {
  if (Array.isArray(node)) return node.map((n) => deref(n, stack));
  if (!node || typeof node !== "object") return node;
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
    if (stack.includes(node.$ref)) throw new Error(`Circular $ref: ${node.$ref}`);
    const target = node.$ref.slice(2).split("/").reduce((o, k) => o[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
    return deref(target, [...stack, node.$ref]);
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deref(v, stack)]));
}

// Static paths are tried before templated ones, so /api/posts/timeline/all wins over /api/posts/{id}.
const routes = Object.keys(spec.paths)
  .map((p) => ({ p, re: new RegExp(`^${p.replace(/\{[^}]+\}/g, "[^/]+")}$`), params: (p.match(/\{/g) || []).length }))
  .sort((a, b) => a.params - b.params);

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const results = { pass: [], fail: [], skipped: [] };
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();

for (const file of files) {
  const cap = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  const label = `${cap.request.method} ${cap.request.path} → ${cap.response.status ?? cap.response.error}  [${cap.name}]`;
  if (cap.response.error) { results.skipped.push(`${label}: no response`); continue; }

  const pathname = cap.request.path.split("?")[0];
  const route = routes.find((r) => r.re.test(pathname));
  const op = route && spec.paths[route.p][cap.request.method.toLowerCase()];
  if (!op) { results.skipped.push(`${label}: not in the spec`); continue; }

  const status = String(cap.response.status);
  const response = op.responses[status] || op.responses[`${status[0]}XX`] || op.responses.default;
  if (!response) { results.fail.push(`${label}: status ${status} isn't documented for ${cap.request.method} ${route.p}`); continue; }

  const resolved = deref(response);
  const contentType = (cap.response.headers["content-type"] || "").split(";")[0].trim();
  const media = resolved.content && (resolved.content[contentType] || resolved.content["*/*"]);
  if (!media) {
    if (!resolved.content && (cap.response.body === "" || cap.response.body == null)) { results.pass.push(label); continue; }
    results.fail.push(`${label}: content type "${contentType}" isn't documented for ${status}`);
    continue;
  }
  if (!media.schema) { results.pass.push(label); continue; }

  const validate = ajv.compile(media.schema);
  if (validate(cap.response.body)) {
    results.pass.push(label);
  } else {
    const errors = validate.errors.slice(0, 4).map((e) => `${e.instancePath || "(body)"} ${e.message}`).join("; ");
    results.fail.push(`${label}: ${errors}`);
  }
}

for (const line of results.fail) console.log(`FAIL ${line}`);
for (const line of results.skipped) console.log(`skip ${line}`);
console.log(`\n${results.pass.length} passed, ${results.fail.length} failed, ${results.skipped.length} skipped (${path.relative(ROOT, DIR)})`);
process.exit(results.fail.length ? 1 : 0);
