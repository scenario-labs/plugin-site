// Single source of truth for commit headers and PR titles. CI installs
// commitlint from pnpm-lock.yaml (.github/workflows/pr-name.yml and
// commitlint.yml). The same check locally, with the Node version in .nvmrc:
//
//   pnpm install --frozen-lockfile
//   printf '%s\n' "feat(handbook): my title" | pnpm exec commitlint --verbose

// U+2014 written as a code point so that this file contains no em dash itself.
const EM_DASH = String.fromCharCode(0x2014);

/** @type {import('@commitlint/types').Plugin} */
const houseRules = {
  rules: {
    // House style: no em dashes anywhere, commit messages and PR titles included.
    "no-em-dash": ({ raw }) => [
      !(raw ?? "").includes(EM_DASH),
      "no em dashes in commit messages or PR titles (house style)",
    ],
  },
};

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [houseRules],
  rules: {
    // Allow longer headers than the 100-character default (same as the plug-in repos).
    "header-max-length": [2, "always", 120],
    // Off: long URLs and Co-Authored-By trailers exceed the 100-character default.
    "body-max-line-length": [0, "always", 200],
    "footer-max-line-length": [0, "always", 200],
    // Off: HTML, PDF and MCP start many subjects.
    "subject-case": [0],
    // Warn, never fail: the release-please PR is "chore: release X.Y.Z" with no scope.
    "scope-empty": [1, "never"],
    "scope-enum": [
      2,
      "always",
      [
        "handbook", // src/handbook: the Markdown reader, the builder, its look and script
        "action", // action.yml: the composite action that builds and assembles a plug-in's site
        "cli", // bin/plugin-site.js: commands and options
        "tests", // test harness only; a test for a product area keeps the product scope
        "tools", // tools/: lint and repository checks
        "docs", // README.md and other docs
        "ci", // .github/workflows, rulesets
        "deps", // pins: actions, npm
        "release", // release-please config and manifest, version fields, CHANGELOG plumbing
        "agents", // AGENTS.md, .agents/, .claude/
        "repo", // LICENSE, community files, templates, CODEOWNERS, editor and lint configs
      ],
    ],
    "no-em-dash": [2, "always"],
  },
};
