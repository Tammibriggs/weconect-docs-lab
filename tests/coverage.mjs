// Check that everything the spec documents for a response appears in at least
// one capture: every status, and every field of every JSON response.
// validate.mjs checks the other direction: that every captured status and content
// type is documented, and that every body matches its schema. A field the schema
// doesn't list still passes both checks. Something documented but never captured
// is either untested or doesn't happen, such as a 500 the API stopped returning,
// or a field a shared schema lists for responses that never include it.
//
//   npm run test:coverage                        checks tests/captures/v1
//   npm run test:coverage -- tests/runs/<run>    checks another run

import path from "node:path";
import { ROOT, spec, captureDir, readCaptures, specPath } from "./spec.mjs";

const DIR = captureDir(process.argv[2]);

const resolve = (node) => {
  while (node && node.$ref) node = node.$ref.slice(2).split("/").reduce((o, k) => o[k], spec);
  return node;
};

// The field paths a schema documents, such as "data.bio" or "data[].img.url"
function documentedFields(schema, prefix = "", out = new Set()) {
  schema = resolve(schema);
  if (!schema || typeof schema !== "object") return out;
  for (const key of ["allOf", "oneOf", "anyOf"]) (schema[key] || []).forEach((s) => documentedFields(s, prefix, out));
  if (schema.items) documentedFields(schema.items, `${prefix}[]`, out);
  for (const [name, sub] of Object.entries(schema.properties || {})) {
    const field = prefix ? `${prefix}.${name}` : name;
    out.add(field);
    documentedFields(sub, field, out);
  }
  return out;
}

// The field paths a captured body has, in the same form
function capturedFields(value, prefix = "", out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => capturedFields(v, `${prefix}[]`, out));
  else if (value && typeof value === "object") {
    for (const [name, v] of Object.entries(value)) {
      const field = prefix ? `${prefix}.${name}` : name;
      out.add(field);
      capturedFields(v, field, out);
    }
  }
  return out;
}

// "GET /api/users 401" → every field any capture of it had
const seen = new Map();
for (const cap of readCaptures(DIR)) {
  if (cap.response.error) continue;
  const route = specPath(cap.request.path);
  if (!route) continue;
  const key = `${cap.request.method} ${route} ${cap.response.status}`;
  if (!seen.has(key)) seen.set(key, new Set());
  capturedFields(cap.response.body, "", seen.get(key));
}

const totals = { statuses: 0, fields: 0 };
const missing = [];
for (const [route, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!op.responses) continue; // a path-level key such as parameters
    for (const [status, response] of Object.entries(op.responses)) {
      const key = `${method.toUpperCase()} ${route} ${status}`;
      totals.statuses++;
      if (!seen.has(key)) { missing.push(`${key}  (${op.summary})`); continue; }
      const schema = resolve(response).content?.["application/json"]?.schema;
      for (const field of documentedFields(schema)) {
        totals.fields++;
        if (!seen.get(key).has(field)) missing.push(`${key}  (${op.summary}): field ${field}`);
      }
    }
  }
}

const missingFields = missing.filter((m) => m.includes(": field ")).length;
for (const line of missing) console.log(`MISSING ${line}`);
console.log(`\n${totals.statuses - (missing.length - missingFields)} of ${totals.statuses} documented responses and ` +
  `${totals.fields - missingFields} of ${totals.fields} documented fields appear in a capture (${path.relative(ROOT, DIR)})`);
process.exit(missing.length ? 1 : 0);
