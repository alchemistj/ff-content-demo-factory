#!/usr/bin/env node
// Demo gate: the automatic bar a words package must clear before it is built (weekend 87→93 pass, 2026-11-14).
// Runs, for each folder given (or every prospect folder with a words.json when given --all / --changed):
//   1. check-words-package.mjs — structure and hard rules. Length fails follow FF Architect's rule:
//      up to 15% short is logged (WARN), below that is a FAIL. Any other FAIL fails the gate.
//   2. lint-sameness.mjs — no repeated sentences/headings, no stock labels, one story per customer.
//   3. check-sources.mjs — quotes word for word, phones, numbers and claim words traced to the folder's sources.
// Prints a short-page log line for every page under its minimum.
// Usage: node scripts/gate.mjs <folder> [<folder> ...]
//        node scripts/gate.mjs --all
//        node scripts/gate.mjs --changed <base-ref>   (folders whose files changed since base)
import { spawnSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let args = process.argv.slice(2);
// --allow-logged: a page already listed in a committed short-page log (outreach/*short-pages*.md) is a WARN,
// not a FAIL. "Logged, not padded" is FF Architect's rule; the word-minimum decision sits with Josh.
const allowLogged = args.includes("--allow-logged");
args = args.filter((a) => a !== "--allow-logged");
const logged = new Set();
if (allowLogged)
  for (const f of readdirSync(path.join(root, "outreach")).filter((n) => /short-pages.*\.md$/.test(n)))
    for (const line of readFileSync(path.join(root, "outreach", f), "utf8").split("\n")) {
      const m = line.match(/^\|\s*([a-z0-9-]+)\s*\|\s*(\/[^|\s]*)\s*\|/);
      if (m) logged.add(`${m[1]} ${m[2]}`);
    }
let folders = [];
if (args[0] === "--all") {
  for (const group of readdirSync(path.join(root, "prospects")))
    for (const slug of readdirSync(path.join(root, "prospects", group), { withFileTypes: true }))
      if (slug.isDirectory() && existsSync(path.join(root, "prospects", group, slug.name, "words.json")))
        folders.push(path.join("prospects", group, slug.name));
} else if (args[0] === "--changed") {
  const base = args[1] ?? "origin/main";
  const changed = execSync(`git diff --name-only ${base}...HEAD -- prospects`, { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  folders = [...new Set(changed.map((f) => f.split("/").slice(0, 3).join("/")))].filter((f) =>
    existsSync(path.join(root, f, "words.json")),
  );
} else folders = args;

if (!folders.length) {
  console.log("gate: no demo folders to check");
  process.exit(0);
}

const run = (script, folder) => {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", script), folder], { cwd: root, encoding: "utf8" });
  return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
};

let failed = 0;
for (const folder of folders) {
  const problems = [];
  const shortPages = [];

  const words = run("check-words-package.mjs", folder);
  for (const line of words.out.split("\n")) {
    if (!line.startsWith("FAIL ")) continue;
    const m = line.match(/FAIL\s+(\S+): about (\d+) words of copy, too thin \(minimum (\d+)\)/);
    if (m) {
      const [, route, count, min] = m;
      const floor = Math.floor(Number(min) * 0.85);
      const within = Number(count) >= floor;
      shortPages.push(`${route} ${count}/${min}${within ? " (within 15%)" : ` (BELOW the ${floor} floor)`}`);
      const isLogged = logged.has(`${path.basename(folder)} ${route}`);
      if (!within && !isLogged) problems.push(`length: ${route} has ${count} words, below the ${floor} floor`);
      if (!within && isLogged) shortPages.push(`${route} is in the committed short-page log (allowed, pending Josh)`);
    } else problems.push(`words: ${line.replace(/^FAIL\s+/, "")}`);
  }

  const same = run("lint-sameness.mjs", folder);
  if (same.code !== 0)
    for (const line of same.out.split("\n")) if (line && !/^(PASS|FAIL):/.test(line)) problems.push(`sameness: ${line}`);

  const src = run("check-sources.mjs", folder);
  if (src.code !== 0) for (const line of src.out.split("\n")) if (line.startsWith("FAIL ")) problems.push(`sources: ${line.slice(6)}`);

  const status = problems.length ? "FAIL" : "PASS";
  if (problems.length) failed++;
  console.log(`${status}  ${folder}`);
  for (const p of problems) console.log(`      ${p}`);
  for (const s of shortPages) console.log(`      short-page log: ${s}`);
}
console.log(`gate: ${folders.length - failed}/${folders.length} passed`);
process.exit(failed ? 1 : 0);
