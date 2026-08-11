import { existsSync, readFileSync } from "node:fs";

const files = ["README.md", "docs/runbooks/link-worker.md"];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const href of text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const target = href[1];
    if (!/^[a-z]+:\/\//i.test(target) && !existsSync(new URL(target, `file://${process.cwd()}/${file}`).pathname)) {
      throw new Error(`${file} links to missing ${target}`);
    }
  }
}
console.log("OK: local runbook links resolve");
