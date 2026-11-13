<!--
The PR title becomes the squash commit header: type(scope): summary.
Use an imperative summary, no trailing period, and at most 120 characters.
Scopes: handbook, action, cli, tests, tools, docs, ci, deps, release, agents,
repo (see commitlint.config.mjs).
Example: fix(handbook): keep a picture's width from its img tag

Keep one concern per PR and the description short. Tick only checks you did;
leave the rest unticked without comment. Never claim review, results or
authorization that has not happened.
-->

## What does this PR change?

<!--
One to three sentences: the problem and what changes. Name any action needed
after merge (for example a plug-in bumping its pin) and any known gap.
Closes #n for complete issue scope; Refs #n otherwise, saying what remains.
Show a visible change to the handbook with screenshots, before/after.
-->

## Validation

- [ ] `pnpm test` (or `node --test test/*.test.js`) and `pnpm lint` pass.
- [ ] The handbook of at least one real plug-in was built with this change (`plugin-site handbook` in its checkout) and looked at in a browser; the plug-in and the result are listed below.
- [ ] Changes to `action.yml`: a plug-in's Pages workflow ran with this commit pinned, or the change is covered by the tests.

Commands and results:

<!-- One line per command run and its result. Keep the line above: it stops
GitHub merging this list into the checklist. -->

## Public content

- [ ] No credentials, tokens, signed URL query strings, or private account, team, project, job or asset IDs are included.
- [ ] No personal paths, machine details, agent session IDs or spend anecdotes are included.

## Rules

- [ ] No unrelated manual version or changelog edits; documentation matches the resulting behavior.

## Authorship and licensing

- [ ] Human review of the complete diff is recorded before merge.
- [ ] Adopted third-party code or assets keep their compatible licenses and attribution; original contributions are licensed under MIT, the repository license.

<!-- If an agent contributed, name the harness and keep accurate co-author
trailers on commits and in the final squash message. -->
