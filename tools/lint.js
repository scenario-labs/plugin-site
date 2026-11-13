#!/usr/bin/env node
"use strict";
// Repository checks, as the plug-in repositories run them: no em dashes, no
// machine paths, no email address but support@scenario.com, JSON that parses,
// JavaScript that compiles, and every action pinned to a full commit SHA with
// its version in a comment.
//
//   pnpm lint    (node tools/lint.js)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const EM_DASH = String.fromCharCode(0x2014);
const SKIP = new Set([".git", "node_modules", "build", "dist", ".agent_out"]);
const TEXT = /\.(js|mjs|json|md|yml|yaml|txt|svg|html|css)$|^(LICENSE|\.editorconfig|\.gitignore|\.lycheeignore|\.nvmrc|CODEOWNERS)$/;
// Files that are not this repository's prose: lockfiles, and the skills
// shared by every Scenario repository (changed upstream, skills-lock.json).
const NOT_OURS = [/^pnpm-lock\.yaml$/, /^\.agents\/skills\//];

function files(dir = ROOT) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...files(full));
    else if (TEXT.test(entry.name)) out.push(full);
  }
  return out;
}

function main() {
  const problems = [];
  for (const file of files()) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (NOT_OURS.some((re) => re.test(rel))) continue;
    const text = fs.readFileSync(file, "utf8");
    text.split("\n").forEach((line, n) => {
      const at = `${rel}:${n + 1}`;
      if (line.includes(EM_DASH)) problems.push(`${at}: em dash`);
      if (/\/Users\/[a-z]|\/home\/[a-z]|\/private\/tmp\/|[A-Z]:\\Users\\/.test(line)) problems.push(`${at}: machine path`);
      for (const m of line.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
        const email = m[0].toLowerCase();
        if (!["support@scenario.com", "noreply@anthropic.com", "noreply@openai.com"].includes(email) && !email.endsWith("@noreply.github.com")) problems.push(`${at}: email address ${m[0]}`);
      }
      if (/^\.github\/workflows\/.*\.ya?ml$/.test(rel) || rel === "action.yml") {
        const use = /^\s*(?:-\s*)?uses:\s*([^\s#]+)(.*)$/.exec(line);
        if (use && !use[1].startsWith("./")) {
          if (!/@[0-9a-f]{40}$/.test(use[1])) problems.push(`${at}: ${use[1]} is not pinned to a full commit SHA`);
          else if (!/#\s*v\d/.test(use[2])) problems.push(`${at}: ${use[1]} has no version comment`);
        }
      }
    });
    if (rel.endsWith(".json")) {
      try {
        JSON.parse(text);
      } catch (error) {
        problems.push(`${rel}: JSON does not parse (${error.message})`);
      }
    }
    if (/\.(js|mjs)$/.test(rel)) {
      const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      if (r.status !== 0) problems.push(`${rel}: ${r.stderr.trim().split("\n").slice(-1)[0]}`);
    }
  }
  for (const p of problems) process.stderr.write(`${p}\n`);
  process.stdout.write(`lint: ${problems.length} problem(s)\n`);
  return problems.length ? 1 : 0;
}

process.exit(main());
