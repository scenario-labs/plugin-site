#!/usr/bin/env node
"use strict";
// plugin-site: the shared site tooling of the Scenario plug-ins.
//
//   plugin-site handbook [--config handbook.config.json] [--out <dir>] [--no-pdf] [--quiet]
//   plugin-site paths [--config handbook.config.json]
//
// Run from the plug-in repository (or pass --config with its path). `paths`
// prints, one per line, the repository paths the handbook is built from.

const path = require("node:path");

function paths(argv) {
  const at = argv.indexOf("--config");
  const configPath = at >= 0 ? argv[at + 1] : "handbook.config.json";
  const { loadConfig, docPaths } = require("../src/handbook/config.js");
  const { root, config } = loadConfig(configPath);
  const relative = path.relative(root, path.resolve(configPath));
  process.stdout.write(docPaths(config, relative).join("\n") + "\n");
  return 0;
}

const COMMANDS = { handbook: () => require("../src/handbook/build.js").main, paths: () => paths };

const [command, ...rest] = process.argv.slice(2);
if (!COMMANDS[command]) {
  process.stderr.write(`usage: plugin-site handbook [--config handbook.config.json] [--out <dir>] [--no-pdf] [--quiet]\n       plugin-site paths [--config handbook.config.json]\n`);
  process.exit(2);
}
try {
  process.exit(COMMANDS[command]()(rest));
} catch (error) {
  process.stderr.write(`plugin-site ${command}: ${error.message}\n`);
  process.exit(1);
}
