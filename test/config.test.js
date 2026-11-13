"use strict";
// handbook.config.json: what is required, what is filled in, and what the action restores.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadConfig, docPaths } = require("../src/handbook/config.js");

const SAMPLE = path.join(__dirname, "fixtures", "sample-plugin");

function write(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-site-config-"));
  fs.writeFileSync(path.join(dir, "handbook.config.json"), JSON.stringify(config));
  return dir;
}

test("defaults fill what a plug-in leaves out", () => {
  const { root, config } = loadConfig("handbook.config.json", SAMPLE);
  assert.equal(root, SAMPLE);
  assert.equal(config.media, "docs/media/");
  assert.equal(config.intro.file, "README.md");
  assert.deepEqual(config.figures, { beforeAfter: "before-after/", screens: "screens/" });
  assert.equal(config.fileNames["docs/PRIVACY.md"], "Privacy");
  assert.equal(config.fileNames["CHANGELOG.md"], "Changelog", "the defaults stay beside the plug-in's names");
});

test("a broken config says what is wrong", () => {
  const base = JSON.parse(fs.readFileSync(path.join(SAMPLE, "handbook.config.json"), "utf8"));
  const cases = [
    [{ ...base, repository: "nope" }, /owner\/name/],
    [{ ...base, version: { file: "version.json" } }, /"json" or "pattern"/],
    [{ ...base, chapters: [] }, /at least one chapter/],
    [{ ...base, chapters: [base.chapters[0], base.chapters[0]] }, /appears twice/],
    [{ ...base, gallery: { chapter: "nowhere" } }, /names no chapter/],
    [(({ product, ...rest }) => rest)(base), /"product" is required/]
  ];
  for (const [config, message] of cases) assert.throws(() => loadConfig("handbook.config.json", write(config)), message);
});

test("paths lists what the action restores from a release", () => {
  const { config } = loadConfig("handbook.config.json", SAMPLE);
  assert.deepEqual(docPaths(config, "handbook.config.json"), ["handbook.config.json", "version.json", "README.md", "docs/PRIVACY.md", "CHANGELOG.md", "docs/media"]);
  const cli = spawnSync(process.execPath, [path.join(__dirname, "..", "bin", "plugin-site.js"), "paths"], { cwd: SAMPLE, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.stdout, "handbook.config.json\nversion.json\nREADME.md\ndocs/PRIVACY.md\nCHANGELOG.md\ndocs/media\n");
  // From the repository root, as the action runs it, the same paths under the config's folder.
  const fromRoot = spawnSync(process.execPath, ["bin/plugin-site.js", "paths", "--config", "test/fixtures/sample-plugin/handbook.config.json"], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
  assert.equal(fromRoot.stdout.split("\n")[0], "test/fixtures/sample-plugin/handbook.config.json");
  assert.equal(fromRoot.stdout.split("\n")[5], "test/fixtures/sample-plugin/docs/media");
});
