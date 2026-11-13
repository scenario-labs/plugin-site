"use strict";
// Reads and checks a plug-in's handbook.config.json, and fills the defaults.
// README.md ("Configuration") documents every key.

const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = {
  media: "docs/media",
  intro: { file: "README.md", guide: "" },
  cta: [["Install", "#install"]],
  nav: [["Install", "#install"], ["Changelog", "#changelog"]],
  cover: [],
  notes: ["Screenshots may show earlier layouts, and the prices in them are examples, not quotes. Select a screenshot to enlarge it."],
  downloads: [],
  fileNames: { "README.md": "README", "CHANGELOG.md": "Changelog", LICENSE: "LICENSE" },
  figures: { beforeAfter: "before-after/", screens: "screens/" },
  checks: { prefixed: [] },
  trademarks: "",
  flow: null,
  gallery: null,
  theme: null,
  site: "",
  analytics: ""
};

const REQUIRED = ["product", "brand", "repository", "files", "description", "version", "chapters"];

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function loadConfig(configPath = "handbook.config.json", cwd = process.cwd()) {
  const file = path.resolve(cwd, configPath);
  if (!fs.existsSync(file)) fail(file, "not found");
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, `not JSON (${error.message})`);
  }
  for (const key of REQUIRED) if (raw[key] == null) fail(file, `"${key}" is required`);
  if (!/^[\w.-]+\/[\w.-]+$/.test(raw.repository)) fail(file, '"repository" must be owner/name');
  if (!/^[a-z0-9-]+$/.test(raw.files)) fail(file, '"files" must be lower-case letters, digits and hyphens');
  if (!raw.version.file || !(raw.version.json || raw.version.pattern)) fail(file, '"version" needs "file" and "json" or "pattern"');
  if (!Array.isArray(raw.chapters) || !raw.chapters.length) fail(file, '"chapters" must list at least one chapter');
  const ids = new Set();
  for (const c of raw.chapters) {
    if (!c.id || !c.title) fail(file, `a chapter needs "id" and "title": ${JSON.stringify(c)}`);
    if (ids.has(c.id)) fail(file, `chapter id "${c.id}" appears twice`);
    ids.add(c.id);
    if (!c.parts && !c.generated) fail(file, `chapter "${c.id}" needs "parts" or "generated"`);
    if (c.generated && !["downloads", "licence"].includes(c.generated)) fail(file, `chapter "${c.id}": unknown generated part "${c.generated}"`);
  }
  if (raw.analytics && !/^\/[\w./-]+\.js$/.test(raw.analytics)) fail(file, '"analytics" must be a site-absolute script path such as /page.js');
  if (raw.site && !/^https:\/\/[\w.-]+$/.test(raw.site)) fail(file, '"site" must be an https:// address with no path');
  if (raw.gallery && !ids.has(raw.gallery.chapter)) fail(file, `"gallery.chapter" names no chapter: ${raw.gallery.chapter}`);
  if (raw.gallery && raw.gallery.show && !ids.has(raw.gallery.show)) fail(file, `"gallery.show" names no chapter: ${raw.gallery.show}`);
  const config = {
    ...DEFAULTS,
    ...raw,
    intro: { ...DEFAULTS.intro, ...(raw.intro || {}) },
    fileNames: { ...DEFAULTS.fileNames, ...(raw.fileNames || {}) },
    figures: { ...DEFAULTS.figures, ...(raw.figures || {}) },
    checks: { ...DEFAULTS.checks, ...(raw.checks || {}) }
  };
  config.media = `${config.media.replace(/\/+$/, "")}/`;
  return { root: path.dirname(file), config };
}

// The repository paths a handbook is built from: the config, the version
// file, every doc it reads and the pictures folder. The action restores them
// from a release's commit so the site describes what people can download.
function docPaths(config, configFile) {
  const docs = [config.intro.file, config.intro.guide, ...config.chapters.flatMap((c) => (c.parts || []).map((p) => p.file))].filter(Boolean);
  return [...new Set([configFile, config.version.file, ...docs, config.media.replace(/\/$/, "")])];
}

module.exports = { loadConfig, docPaths, DEFAULTS };
