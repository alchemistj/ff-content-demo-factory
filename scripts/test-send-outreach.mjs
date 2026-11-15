#!/usr/bin/env node
// End-to-end test of scripts/send-outreach.mjs against local test forms only (no real business is contacted).
// Checks: a plain form is filled, submitted and logged to the ledger; a second run skips it (one per business, ever);
// a "no solicitations" site is skipped; a business on the do-not-contact list is skipped; a visible CAPTCHA is a hand send.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-send-test-"));
const received = [];

const form = (extra = "") => `<!doctype html><html><body><h1>Contact us</h1>${extra}
<form method="post" action="/thanks">
<label for="n">Name *</label><input id="n" name="name" required>
<label for="e">Email *</label><input id="e" name="email" type="email" required>
<label for="p">Phone</label><input id="p" name="phone" type="tel">
<label for="m">Message *</label><textarea id="m" name="message" required></textarea>
<input name="hp_trap" style="position:absolute;left:-9999px" tabindex="-1">
<button type="submit">Send</button></form></body></html>`;

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ path: req.url, body: Object.fromEntries(new URLSearchParams(body)) });
      res.end("<html><body><h1>Thank you! Your message has been sent.</h1></body></html>");
    });
    return;
  }
  const pages = {
    "/ok": form(),
    "/nosolicit": form("<p>No solicitations, please. We are not accepting vendor pitches.</p>"),
    "/dnc": form(),
    // A local frame whose URL looks like Cloudflare Turnstile, so nothing leaves this machine.
    "/captcha": form('<iframe src="/turnstile-widget" width="300" height="80"></iframe>'),
    "/turnstile-widget": "<p>challenge</p>",
  };
  res.setHeader("content-type", "text/html");
  res.end(pages[req.url.split("?")[0]] ?? "not found");
});
await new Promise((r) => server.listen(0, "0.0.0.0", r));
const port = server.address().port;
// Each test "business" gets its own loopback address, because the ledger matches by domain.
const base = (n) => `http://127.0.0.${n}:${port}`;

// A throwaway prospect with an approved message.
const prospect = path.join(tmp, "prospect");
fs.mkdirSync(prospect, { recursive: true });
fs.writeFileSync(path.join(prospect, "outreach.md"), "## Message (paste as is)\n\nHey team, this is a test message from the Fluid Frame sender test.\n\nJosh\nFluid Frame Marketing\n");
const prospectRel = path.relative(root, prospect);
const sender = { firstName: "Josh", lastName: "Lenz", fullName: "Josh Lenz", email: "josh@fluidframemarketing.com", phone: "4173732773", company: "Fluid Frame Marketing" };
const entry = (slug, p, company, n) => ({ slug, company, prospect: prospectRel, formUrl: `${base(n)}${p}`, approved: true });
const queue = path.join(tmp, "queue-test.json");
const ledger = path.join(tmp, "ledger.json");
const dnc = path.join(tmp, "dnc.json");
fs.writeFileSync(ledger, "[]");
fs.writeFileSync(dnc, JSON.stringify([{ company: "Stop Plumbing", domain: "stop.example" }]));
fs.writeFileSync(queue, JSON.stringify({ sender, entries: [
  entry("ok", "/ok", "Test Plumbing", 1),
  entry("nosolicit", "/nosolicit", "No Pitch Plumbing", 2),
  entry("dnc", "/dnc", "Stop Plumbing", 3),
  entry("captcha", "/captcha", "Captcha Plumbing", 4),
] }));

// Async on purpose: a blocking spawn would freeze this process's own test server and deadlock.
const run = () => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(root, "scripts/send-outreach.mjs"), queue, "--send", "--ledger", ledger, "--dnc", dnc], { cwd: root });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  child.on("close", () => resolve({ stdout, stderr }));
});
const fails = [];
const check = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}: ${msg}`); if (!cond) fails.push(msg); };

const first = await run();
const out1 = first.stdout + first.stderr;
check(/ok: sent/.test(out1), "plain form is submitted and confirmed");
check(received.length === 1 && received[0].body.email === sender.email && /Fluid Frame/.test(received[0].body.message), "the form got Josh's real email and the message");
check(received[0] && !received[0].body.hp_trap, "the spam trap field was left empty");
check(/nosolicit: skipped .*solicitations/.test(out1), "a site that says no solicitations is skipped");
check(/dnc: skipped .*do-not-contact/.test(out1), "a business on the do-not-contact list is skipped");
check(/captcha: hand send .*CAPTCHA/.test(out1), "a visible CAPTCHA is a hand send, never automated");
const led = JSON.parse(fs.readFileSync(ledger, "utf8"));
check(led.length === 1 && led[0].company === "Test Plumbing" && led[0].time && led[0].message && led[0].shots.length, "the send is logged with business, URL, time, message and screenshots");

// The ledger blocks every later entry on the same domain, so a rerun proves "one per business, ever".
const second = await run();
check(/ok: skipped .*one submission per business/.test(second.stdout), "a second run never contacts the same business again");
check(received.length === 1, "no second submission reached the form");

server.close();
fs.rmSync(path.join(root, "outreach-runs"), { recursive: true, force: true, maxRetries: 2 });
console.log(fails.length ? `\n${fails.length} failed` : "\nAll sender checks passed");
process.exit(fails.length ? 1 : 0);
