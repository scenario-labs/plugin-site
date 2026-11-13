# Contributing to plugin-site

Thanks for helping. This guide covers what a pull request needs; the commands,
rules and code map live in [AGENTS.md](AGENTS.md), which humans and coding
agents both follow.

## Before you start

- For anything larger than a small fix, open a change request first
  ([issue chooser](https://github.com/scenario-labs/plugin-site/issues/new/choose))
  so the approach can be agreed before you write it.
- Every Scenario plug-in's site runs this code. A change to the configuration,
  the command line or the action's inputs must keep the existing plug-ins
  working, or say which ones must change.

## Set up

- Node.js, the version in `.nvmrc`. The builder needs no install; `pnpm install`
  adds commitlint for the commit checks.
- A plug-in checkout to try a change on its real docs.

## Run the checks

`node --test test/*.test.js` and `node tools/lint.js`, then build a real
plug-in's handbook with the change and look at it in a browser.

## Commits and pull requests

- Branch from `main`. Pull requests are squash-merged: the PR title becomes the
  commit header and the changelog line, so it follows Conventional Commits with
  a scope from `commitlint.config.mjs`, for example
  `fix(handbook): keep a picture's width from its img tag`.
- Keep one concern per pull request and fill the template briefly: the checks
  you ran, any action needed after merge and any known gap. Tick only what you
  ran.
- Do not edit versions or `CHANGELOG.md`: release-please does.
- Show a visible change with before/after screenshots of the handbook,
  attached to the pull request rather than committed.

## Coding agents

Agents follow AGENTS.md. Name the harness in the pull request and keep accurate
co-author trailers on commits and in the squash message. A human reviews the
complete diff before merge.

## Licensing

The repository is under the [MIT License](LICENSE). By contributing, you agree
that your contributions are licensed under the same terms. Code adopted from
elsewhere keeps its compatible license and attribution.
