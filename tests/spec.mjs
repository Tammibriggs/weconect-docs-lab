// Shared by validate.mjs and coverage.mjs: the full spec, the captures in a
// folder, and the spec path that documents a request path.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const spec = YAML.parse(fs.readFileSync(path.join(ROOT, "openapi", "weconect-v1.yaml"), "utf8"));

// The capture folder named on the command line, or the committed captures.
export const captureDir = (arg) => path.resolve(ROOT, arg || path.join("tests", "captures", "v1"));

// Every capture in a folder, in file name order.
export const readCaptures = (dir) =>
  fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

// Static paths are tried before templated ones, so /api/posts/timeline/all wins over /api/posts/{id}.
const routes = Object.keys(spec.paths)
  .map((p) => ({ p, re: new RegExp(`^${p.replace(/\{[^}]+\}/g, "[^/]+")}$`), params: (p.match(/\{/g) || []).length }))
  .sort((a, b) => a.params - b.params);

// The spec path for a request path such as "/api/users/search?search=bob", or undefined.
export const specPath = (requestPath) => routes.find((r) => r.re.test(requestPath.split("?")[0]))?.p;
