"use strict";
// The handbook builder, on the sample plug-in in test/fixtures: every doc
// section it names, every link and picture resolved, the public-content
// rules kept. The PDF step needs Chrome and is left to a manual build.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { build } = require("../src/handbook/build.js");

const SAMPLE = path.join(__dirname, "fixtures", "sample-plugin");
const CONFIG = path.join(SAMPLE, "handbook.config.json");
const EM_DASH = new RegExp(String.fromCharCode(0x2014));

function buildSample(extra = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-"));
  const r = build({ config: CONFIG, out, pdf: false, ...extra });
  return { r, out, html: r.problems.length ? "" : fs.readFileSync(path.join(out, "index.html"), "utf8") };
}

test("the handbook builds from the plug-in's docs with every link and picture resolved", () => {
  const { r, out, html } = buildSample();
  assert.deepEqual(r.problems, []);
  assert.equal(r.version, "1.2.3", "the version comes from the configured file");
  const config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  for (const c of config.chapters) assert.ok(html.includes(`<h2 id="${c.id}">`), `chapter ${c.id}`);
  assert.match(html, /<title>Scenario for Sample Handbook<\/title>/);
  assert.match(html, /<span class="product">for Sample<\/span>/);
  assert.match(html, /Every Scenario model inside Sample, priced before you click\./, "the lede is the README's first plain paragraph");
  assert.ok(!fs.existsSync(path.join(out, "CNAME")), "no CNAME");
  assert.ok(!html.includes(".pdf"), "no PDF link without the PDF");
  for (const m of html.matchAll(/<img src="(media\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(out, m[1])), m[1]);
  assert.match(html, /<table>[\s\S]*?<img src="media\/screens\/panel\.png"[\s\S]*?<\/table>/, "screenshots in a table stay in it");
  assert.match(html, /style="max-width:120px"/, "a picture keeps the width its doc gives");
  assert.match(html, /<p class="fig-note">One key light\. <a href="#privacy">Privacy<\/a><\/p>/, "a <sub> line is the picture's caption");
  assert.match(html, /class="gallery screen-only"/, "the before and after gallery");
  assert.match(html, /class="flow"/, "the flow diagram");
  assert.match(html, /<li><a href="#troubleshooting">Troubleshooting<\/a><ol><li><a href="#sign-in">Sign-in<\/a><\/li><li><a href="#prices">Prices<\/a><\/li><\/ol>/, "a chapter's h3s are its sub-entries in the contents");
  assert.ok(!html.includes("plugin-site handbook"), "no build command for readers");
  assert.match(html, /class="claim claim-live">Verified live/);
  assert.match(html, /<a href="#install">Install<\/a> to start/, "a chapter id is a link target");
  assert.ok(!EM_DASH.test(html));
  const single = fs.readFileSync(path.join(out, `scenario-sample-handbook-${r.version}.html`), "utf8");
  assert.ok(!/<img src="(?!data:)/.test(single), "the single file embeds its pictures");
  assert.ok(!/href="(?!#|https:|mailto:)/.test(single), "and links nothing relative");
  assert.match(html, /<a class="button" href="\/download\/latest">Download<\/a>/, "a site-absolute link stays in the web page");
  assert.match(single, /href="https:\/\/sample\.scenario\.com\/download\/latest"/, "and opens on the site from the single file");
  assert.match(html, /<script defer src="\/page\.js"><\/script>/, "the web page loads the site's analytics");
  assert.ok(!single.includes("/page.js"), "the single file does not");
});

test("the public-content rules stop the build", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-bad-"));
  fs.cpSync(SAMPLE, root, { recursive: true });
  const readme = path.join(root, "README.md");
  // Built at run time so this file passes the repository lint itself.
  const email = ["someone", "example.com"].join("@");
  const home = ["", "Users", "someone", "notes"].join("/");
  fs.appendFileSync(readme, `\n## More\n\nWrite to ${email} ${String.fromCharCode(0x2014)} or read ${home}. A bare MCP too. [Gone](docs/GONE.md)\n`);
  const config = JSON.parse(fs.readFileSync(path.join(root, "handbook.config.json"), "utf8"));
  config.chapters.push({ id: "more", title: "More", parts: [{ file: "README.md", section: "More" }] });
  fs.writeFileSync(path.join(root, "handbook.config.json"), JSON.stringify(config));
  const r = build({ config: path.join(root, "handbook.config.json"), out: path.join(root, "out"), pdf: false });
  const all = r.problems.join("\n");
  assert.match(all, /em dash/);
  assert.match(all, /machine path/);
  assert.match(all, /email address someone@example\.com/);
  assert.match(all, /bare "MCP"/);
  assert.match(all, /link to a missing file docs\/GONE\.md/);
});

test("the handbook links to the given ref and checks those links in the given tree", () => {
  // HANDBOOK_GITHUB_REF names the ref the links open; the action builds a
  // release's docs and names the release's commit in HANDBOOK_TREE, where each
  // linked file must be, and HANDBOOK_COMMIT its short id.
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: SAMPLE, encoding: "utf8" }).stdout.trim();
  const run = (ref, tree) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-ref-"));
    const code = `const r = require(${JSON.stringify(path.join(__dirname, "..", "src", "handbook", "build.js"))}).build({ config: ${JSON.stringify(CONFIG)}, out: ${JSON.stringify(out)}, pdf: false }); process.stdout.write(JSON.stringify(r));`;
    const p = spawnSync(process.execPath, ["-e", code], { encoding: "utf8", env: { ...process.env, HANDBOOK_GITHUB_REF: ref, HANDBOOK_TREE: tree || "", HANDBOOK_COMMIT: "abc1234" } });
    assert.equal(p.status, 0, p.stderr);
    const r = JSON.parse(p.stdout);
    const html = r.problems.length ? "" : fs.readFileSync(path.join(out, "index.html"), "utf8");
    return { r, html };
  };
  const ok = run("sample-plugin-v9.9.9");
  assert.deepEqual(ok.r.problems, []);
  assert.ok(ok.html.includes("https://github.com/scenario-labs/sample-plugin/blob/sample-plugin-v9.9.9/LICENSE"), "links open the given ref");
  assert.match(ok.html, /<code>abc1234<\/code>/);
  if (head) {
    // Git's empty tree holds none of the linked files.
    const empty = run("sample-plugin-v9.9.9", "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
    assert.ok(empty.r.problems.some((p) => / in 4b825dc642cb6eb9a060e54bf8d69288fbee4904$/.test(p)), empty.r.problems.join("\n"));
  }
});
