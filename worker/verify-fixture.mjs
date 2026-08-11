#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const fixture = new URL("./manifest.fixture.json", import.meta.url);
const integrity = new URL("./manifest.integrity.ts", import.meta.url);
const bytes = process.argv.includes("--stdin") ? readFileSync(0) : readFileSync(fixture);
const expected = createHash("sha256").update(bytes).digest("hex");
const source = readFileSync(integrity, "utf8");
const declared = source.match(/EMBEDDED_MANIFEST_SHA256 = "([a-f0-9]{64})"/)?.[1];
if (declared !== expected) throw new Error(`fixture digest mismatch: expected ${declared}, received ${expected}`);
JSON.parse(bytes.toString("utf8"));
console.log(`OK: exact compiler envelope SHA-256 ${expected}`);
