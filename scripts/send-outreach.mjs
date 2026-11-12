#!/usr/bin/env node
// Sends approved outreach messages through each prospect's own website contact form, with a real browser.
//
// Usage:
//   node scripts/send-outreach.mjs <queue.json>                 dry run: fill every form and screenshot it, submit nothing
//   node scripts/send-outreach.mjs <queue.json> --send          submit only entries marked "approved": true (Josh said go)
//   add --only rivercity,ict-roofing to limit the run to some slugs
//
// Queue file (a list, so it scales to a dozen a day):
//   { "sender": { "firstName": "Josh", "lastName": "...", "email": "...", "phone": "4173732773", "company": "Fluid Frame Marketing" },
//     "entries": [ { "slug": "rivercity", "company": "River City Roofing", "prospect": "prospects/wichita-roofing/rivercity",
//                    "formUrl": "https://...", "frame": "powr.io" (optional: iframe URL part when the form is embedded),
//                    "approved": false, "subject": "optional subject line" } ] }
// The message is the "## Message (paste as is)" block of <prospect>/outreach.md, sent word for word.
//
// Rules (docs/josh-working-rules.md in ff-architect):
//   - Never try to defeat a CAPTCHA. A visible check ("I'm not a robot", hCaptcha, Turnstile) is a hand send, always.
//   - An invisible reCAPTCHA is submitted normally; if the form doesn't confirm, it's a hand send.
//   - Every entry that isn't confirmed sent goes into hand-send.md with the form URL, each field's value and the message.
//   - Screenshots: the filled form before submit, and the page after submit.
// Output: outreach-runs/<YYYY-MM-DD>/<mode>/ with screenshots, log.json, log.md and hand-send.md.
// GoHighLevel logging (demo-sent tag plus a "Demo sent" note) is done from log.json after a --send run.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const queuePath = args.find((a) => !a.startsWith("--"));
if (!queuePath) { console.error("usage: send-outreach.mjs <queue.json> [--send] [--only slug,slug]"); process.exit(2); }
const SEND = args.includes("--send");
const onlyArg = args[args.indexOf("--only") + 1];
const only = args.includes("--only") && onlyArg ? new Set(onlyArg.split(",")) : null;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const sender = queue.sender;
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
const outDir = path.join(root, "outreach-runs", day, SEND ? "send" : "dry-run");
fs.mkdirSync(outDir, { recursive: true });

function readMessage(prospect, heading = "Message") {
  const md = fs.readFileSync(path.join(root, prospect, "outreach.md"), "utf8");
  const m = md.match(new RegExp(`## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\s*$)`));
  if (!m && heading !== "Message") return null;
  if (!m) throw new Error(`no "## Message (paste as is)" block in ${prospect}/outreach.md`);
  return m[1].trim();
}

// Which of our values goes in a field, from its label, name, id, placeholder and aria-label.
function keyFor(desc, type, tag) {
  if (type === "email" || /e-?mail/.test(desc)) return "email";
  if (type === "tel" || /phone|tel\b|mobile|cell/.test(desc)) return "phone";
  if (/zip|postal|address|city|street/.test(desc)) return null; // we don't give an address: flag it
  if (tag === "textarea" || /message|comment|details|question|how can we|describe|project|inquiry|enquiry/.test(desc)) return "message";
  if (/first|fname|given/.test(desc)) return "firstName";
  if (/last|lname|surname|family/.test(desc)) return "lastName";
  if (/company|business|organi[sz]ation/.test(desc)) return "company";
  if (/subject|topic|regarding/.test(desc)) return "subject";
  if (/name/.test(desc)) return "fullName";
  return null;
}

async function findFormScope(page, entry) {
  if (entry.frame) {
    await page.waitForTimeout(4000);
    const el = await page.$(`iframe[src*="${entry.frame}"]`);
    if (el) { await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(3000); }
    const f = page.frames().find((fr) => fr.url().includes(entry.frame));
    if (f) await f.waitForSelector("textarea", { timeout: 15000 }).catch(() => {});
    if (!f) return { error: `embedded form (${entry.frame}) did not load` };
    return { scope: f, frameEl: await f.frameElement() };
  }
  return { scope: page.mainFrame() };
}

async function describeFields(scope) {
  return scope.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none"; };
    const forms = [...document.querySelectorAll("form")].filter((f) => f.querySelector("textarea") && vis(f));
    const form = forms[0] || document.body;
    const fields = [...form.querySelectorAll("input, textarea, select")].filter((el) => {
      const t = (el.getAttribute("type") || "").toLowerCase();
      // Skip spam traps (honeypots): off-screen, see-through, untabbable or hidden from screen readers. Filling one marks the message as spam.
      const r = el.getBoundingClientRect();
      const trap = r.right < 0 || r.left > document.documentElement.scrollWidth || el.tabIndex < 0 || el.closest('[aria-hidden="true"]')
        || parseFloat(getComputedStyle(el).opacity) < 0.1 || /honeypot|hp_|_hp|gotcha|bot.?field|leave.?(this|blank)/i.test(`${el.name} ${el.id} ${el.className}`);
      return !["hidden", "submit", "button", "image", "reset", "file"].includes(t) && vis(el) && !trap;
    });
    return {
      formIndex: forms.length ? [...document.querySelectorAll("form")].indexOf(form) : -1,
      fields: fields.map((el, i) => {
        el.setAttribute("data-ff-field", String(i));
        const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        const wrap = el.closest("label");
        const group = el.closest("fieldset")?.querySelector("legend")?.textContent || "";
        const label = (id?.textContent || wrap?.textContent || "").trim();
        return {
          i, tag: el.tagName.toLowerCase(), type: (el.getAttribute("type") || "").toLowerCase(),
          label, group: group.trim(), maxLength: el.maxLength > 0 ? el.maxLength : null, required: el.required || el.getAttribute("aria-required") === "true" || /\*/.test(label),
          desc: [label, el.name, el.id, el.placeholder, el.getAttribute("aria-label"), group].filter(Boolean).join(" ").toLowerCase(),
        };
      }),
    };
  });
}

async function captchaKind(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 30 && r.height > 30; };
    const frames = [...document.querySelectorAll("iframe")].map((f) => ({ src: f.src || "", vis: vis(f) }));
    if (frames.some((f) => /hcaptcha|challenges\.cloudflare|turnstile/.test(f.src) && f.vis)) return "visible";
    if (frames.some((f) => /recaptcha\/(api2|enterprise)\/anchor/.test(f.src) && /size=normal|size=compact/.test(f.src) && f.vis)) return "visible";
    if ([...document.querySelectorAll(".g-recaptcha")].some((el) => el.getAttribute("data-size") !== "invisible" && vis(el))) return "visible";
    if (frames.some((f) => /recaptcha/.test(f.src)) || document.querySelector('script[src*="recaptcha"]')) return "invisible";
    return "none";
  });
}

const results = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

for (const entry of queue.entries) {
  if (only && !only.has(entry.slug)) continue;
  const r = { slug: entry.slug, company: entry.company, formUrl: entry.formUrl, mode: SEND ? "send" : "dry-run", approved: !!entry.approved, status: "", reason: "", fields: [], shots: [] };
  results.push(r);
  let message;
  let shortMessage = null;
  try { message = readMessage(entry.prospect); shortMessage = readMessage(entry.prospect, "Short message"); } catch (e) { r.status = "not sent"; r.reason = e.message; continue; }
  const values = {
    firstName: sender.firstName, lastName: sender.lastName, fullName: sender.fullName || sender.firstName,
    email: sender.email, phone: sender.phone, company: sender.company, message, shortMessage,
    subject: entry.subject || `A website mockup for ${entry.company}`,
  };
  r.values = values;
  const page = await context.newPage();
  try {
    await page.goto(entry.formUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const { scope, frameEl, error } = await findFormScope(page, entry);
    if (error) throw new Error(error);
    const { fields, formIndex } = await describeFields(scope);
    if (!fields.some((f) => f.tag === "textarea")) throw new Error("no message box found on the form");
    const problems = [];
    for (const f of fields) {
      const key = keyFor(f.desc, f.type, f.tag);
      const el = scope.locator(`[data-ff-field="${f.i}"]`);
      if (f.type === "checkbox" || f.type === "radio" || f.tag === "select") {
        if (f.required) problems.push(`required ${f.tag === "select" ? "dropdown" : f.type} "${f.label || f.desc}" needs a choice`);
        r.fields.push({ label: f.label || f.desc, value: "(left alone)" });
        continue;
      }
      if (!key) {
        if (f.required) problems.push(`required field "${f.label || f.desc}" has no value of ours`);
        r.fields.push({ label: f.label || f.desc, value: "(left blank)" });
        continue;
      }
      // "Name" split into First/Last by a group legend
      let v = values[key];
      if (key === "message" && f.maxLength && v.length > f.maxLength) {
        if (values.shortMessage && values.shortMessage.length <= f.maxLength) { v = values.shortMessage; r.usedShort = true; }
        else { problems.push(`the message box takes ${f.maxLength} characters and the message is ${v.length}; add a "## Short message" block to outreach.md`); }
      }
      if (key === "fullName" && /first/.test(f.label.toLowerCase())) v = values.firstName;
      await el.click({ timeout: 5000 }).catch(() => {});
      await el.fill(v, { timeout: 8000 });
      r.fields.push({ label: f.label || f.group || f.desc, value: key === "message" ? "(the message)" : v });
    }
    let captcha = await captchaKind(page);
    if (frameEl && captcha === "none") captcha = await captchaKind(scope);
    r.captcha = captcha;
    const target = frameEl || (formIndex >= 0 ? page.locator("form").nth(formIndex) : page.locator("body"));
    await target.scrollIntoViewIfNeeded().catch(() => {});
    const filledShot = path.join(outDir, `${entry.slug}-filled.png`);
    await target.screenshot({ path: filledShot }).catch(async () => page.screenshot({ path: filledShot, fullPage: true }));
    r.shots.push(path.relative(root, filledShot));

    if (captcha === "visible") problems.unshift("visible CAPTCHA (never automated)");
    if (problems.length) { r.status = "hand send"; r.reason = problems.join("; "); }
    else if (!SEND) { r.status = "dry run: filled, not submitted"; r.reason = captcha === "invisible" ? "invisible reCAPTCHA: will submit normally, hand send if blocked" : ""; }
    else if (!entry.approved) { r.status = "not sent"; r.reason = "not approved in the queue"; }
    else {
      const before = page.url();
      const submit = scope.locator(`form:has([data-ff-field]) [type=submit], form:has([data-ff-field]) button:not([type=button])`).first();
      await submit.click({ timeout: 8000 });
      await Promise.race([page.waitForNavigation({ timeout: 20000 }).catch(() => {}), page.waitForTimeout(12000)]);
      const text = (await scope.evaluate(() => document.body.innerText).catch(() => "")) + " " + (await page.evaluate(() => document.body.innerText).catch(() => ""));
      const confirmShot = path.join(outDir, `${entry.slug}-after-submit.png`);
      await page.screenshot({ path: confirmShot, fullPage: false });
      r.shots.push(path.relative(root, confirmShot));
      const ok = /thank you|thanks for|message (has been |was )?(sent|received)|we('ll| will) (be in touch|get back)|submission (was )?(received|successful)|successfully/i.test(text);
      const err = /captcha|robot|verification failed|spam|error|required/i.test(text) && !ok;
      if (ok) { r.status = "sent"; }
      else { r.status = "hand send"; r.reason = err ? "the form showed an error or a bot check after submit" : `no confirmation after submit (stayed on ${page.url() === before ? "the same page" : page.url()})`; }
    }
  } catch (e) {
    r.status = "hand send";
    r.reason = `could not fill the form: ${e.message.split("\n")[0]}`;
    const shot = path.join(outDir, `${entry.slug}-error.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    r.shots.push(path.relative(root, shot));
  }
  await page.close();
  console.log(`${entry.slug}: ${r.status}${r.reason ? ` (${r.reason})` : ""}`);
}
await browser.close();

fs.writeFileSync(path.join(outDir, "log.json"), JSON.stringify({ day, mode: SEND ? "send" : "dry-run", results }, null, 2) + "\n");
const lines = [`# Outreach ${SEND ? "send" : "dry run"}, ${day} (Central)`, "", "| Prospect | Result | Why | Screenshots |", "|---|---|---|---|"];
for (const r of results) lines.push(`| ${r.company} | ${r.status} | ${r.reason || ""} | ${r.shots.map((s) => path.basename(s)).join(", ")} |`);
fs.writeFileSync(path.join(outDir, "log.md"), lines.join("\n") + "\n");
const hand = results.filter((r) => r.status === "hand send" || (!SEND && r.captcha === "visible"));
const pack = [`# Hand-send pack, ${day}`, "", "Josh sends these himself. Paste each value into the form, then the message.", ""];
for (const r of hand) {
  pack.push(`## ${r.company}`, "", `Form: ${r.formUrl}`, `Why it's a hand send: ${r.reason}`, "");
  if (r.values) {
    pack.push(`- First name: ${r.values.firstName}`, `- Last name: ${r.values.lastName}`, `- Email: ${r.values.email}`, `- Phone: ${r.values.phone}`, `- Subject (if asked): ${r.values.subject}`, "", "Message:", "", "```", r.usedShort || (r.values.shortMessage && /characters/.test(r.reason)) ? r.values.shortMessage : r.values.message, "```", "");
  }
}
fs.writeFileSync(path.join(outDir, "hand-send.md"), pack.join("\n") + "\n");
console.log(`\nWrote ${path.relative(root, outDir)}/log.md, log.json, hand-send.md`);
