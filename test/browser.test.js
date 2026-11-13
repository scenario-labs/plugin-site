"use strict";
// The built handbook in a real browser (Playwright's Chromium): search, the
// light and dark switch, the contents column, the lightbox, and the PDF.
// Needs `pnpm install` and `pnpm exec playwright install chromium`; the PDF
// test also needs Poppler's pdftotext. CI runs it in the browser job.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { build } = require("../src/handbook/build.js");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  chromium = null;
}
const CONFIG = path.join(__dirname, "fixtures", "sample-plugin", "handbook.config.json");
const TYPES = { ".html": "text/html", ".png": "image/png", ".js": "text/javascript" };
const skip = chromium ? false : "playwright is not installed (pnpm install)";

// The sample's handbook, served the way Pages serves a site.
function serve(dir) {
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    if (!file.startsWith(dir) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("the handbook page works in a browser", { skip }, async (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-browser-"));
  const r = build({ config: CONFIG, out, pdf: false });
  assert.deepEqual(r.problems, []);
  const server = await serve(out);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // The page's own requests only: fonts and analytics are left out.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.route("**/page.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.goto(url);

  await t.test("search finds a section and opens it", async () => {
    await page.keyboard.press("/");
    await page.keyboard.type("stored");
    const first = page.locator("#q-results li").first();
    await first.waitFor();
    assert.match(await first.innerText(), /What is stored/);
    assert.match(await page.locator("#q-status").innerText(), /section/);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#what-is-stored");
    assert.equal(await page.locator("#q-panel").isHidden(), true);
  });

  await t.test("the contents column marks the section in view", async () => {
    await page.locator("#changelog").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById("changelog").scrollIntoView());
    await page.waitForFunction(() => document.querySelector('.toc-list a.active')?.getAttribute("href") === "#changelog");
  });

  await t.test("the theme switch flips and is remembered", async () => {
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.click("#theme");
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.ok(after === "light" || after === "dark");
    assert.notEqual(after, before);
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), after);
  });

  await t.test("a picture enlarges and closes", async () => {
    const zoom = page.locator("[data-zoom]").nth(1);
    await zoom.scrollIntoViewIfNeeded();
    await zoom.click();
    const box = page.locator("#lightbox");
    await page.waitForFunction(() => document.getElementById("lightbox").open);
    assert.match(await box.locator("img").getAttribute("src"), /media\//);
    await box.locator("img").click();
    await page.waitForFunction(() => !document.getElementById("lightbox").open);
  });

  assert.deepEqual(errors, [], "no script error on the page");
});

const pdftotext = spawnSync("pdftotext", ["-v"]).error ? "pdftotext (Poppler) is not installed" : false;

test("the PDF prints with numbered contents", { skip: skip || pdftotext }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-pdf-"));
  const previous = process.env.CHROME_PATH;
  process.env.CHROME_PATH = chromium.executablePath();
  try {
    const r = build({ config: CONFIG, out, pdf: true });
    assert.deepEqual(r.problems, []);
    assert.ok(fs.existsSync(path.join(out, "scenario-sample-handbook-1.2.3.pdf")));
    assert.ok(r.pages >= 3, `${r.pages} pages`);
    const text = spawnSync("pdftotext", ["-layout", r.pdf, "-"], { encoding: "utf8" }).stdout;
    assert.match(text, /Contents/);
    assert.match(text, /01\s+Install\s+\.*\s*\d+/, "the contents name each chapter's page");
    assert.match(text, /Scenario for Sample handbook/, "the page footer names the product");
  } finally {
    if (previous === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = previous;
  }
});
