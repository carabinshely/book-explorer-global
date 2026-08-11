import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("link DX test runner boundary", () => {
  it("keeps the Node-only command test outside Vitest's .test file discovery", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    expect(packageJson.scripts["links:test"]).toContain("links-dx.node-test.mjs");
  });
});
