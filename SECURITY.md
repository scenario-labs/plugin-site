# Security Policy

## Reporting a vulnerability

Do not report security vulnerabilities through public GitHub issues or pull
requests. Public reports can expose others before a fix is available, and
copies may remain accessible after deletion.

Report privately through any of these channels:

- [Open a private vulnerability report](https://github.com/scenario-labs/plugin-site/security/advisories/new)
  from this repository's Security tab.
- Email [support@scenario.com](mailto:support@scenario.com) with "security" in the subject.
- Use in-app support at [app.scenario.com](https://app.scenario.com).

Include the plugin-site version (tag or commit), the plug-in whose site is
affected, reproduction steps and the impact you observe.

## Scope

This repository builds the Scenario plug-ins' sites. It reads a plug-in's
Markdown docs, writes HTML, and in a plug-in's Pages workflow downloads that
plug-in's release package and checks its checksum and build attestation.
Relevant reports include:

- HTML or script injection from a doc's content into a published page.
- A release package published without its checksum and attestation verified.
- Anything that lets the action write outside its output folder or run code
  from a pull request with the plug-in's Pages permissions.
- This repository's CI and release supply chain.

Vulnerabilities in a plug-in itself go to that plug-in's repository, and
platform ones (`app.scenario.com`, `api.cloud.scenario.com`) to the private
channels above.

## Supported versions

Security fixes target the [latest release](https://github.com/scenario-labs/plugin-site/releases).
Older releases have no support branch.
