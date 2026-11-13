# plugin-site

The site tooling the Scenario plug-ins share. Each plug-in keeps its docs and a
`handbook.config.json`; this repository turns them into its handbook and
publishes its site.

- **The handbook builder**: a plug-in's Markdown docs become one page with a
  contents column, search, a light and a dark theme and enlargeable pictures;
  a single HTML file that works offline; and an A4 PDF. It checks every link
  and picture, and refuses em dashes, machine paths and any address but
  support@scenario.com.
- **The site action**: builds the plug-in's site from its newest published
  release, so the site never describes what people cannot download yet, and
  serves the release package under `download/` once its checksum and build
  provenance verify.

The content stays in each plug-in's repository: change the docs there, not
here.

## Use it in a plug-in

The plug-in's Pages workflow checks itself out, runs the action and publishes
the result:

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      attestations: read
    steps:
      - uses: actions/checkout@<sha> # vX
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@<sha> # vX
        with:
          node-version: "24"
      - id: site
        uses: scenario-labs/plugin-site@<sha> # v0.1.0
        with:
          download: scenario-maya-{version}.zip
      - uses: actions/upload-pages-artifact@<sha> # vX
        with:
          path: ${{ steps.site.outputs.path }}
  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment: github-pages
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/deploy-pages@<sha> # vX
```

Action inputs:

| Input | Default | Meaning |
| --- | --- | --- |
| `config` | `handbook.config.json` | The plug-in's configuration, from the repository root |
| `handbook-path` | `""` | Where the handbook goes in the site: the root, or a folder such as `handbook` |
| `static` | `""` | A folder copied to the site root first, such as a hand-made landing page |
| `download` | `""` | The release asset served under `download/`, `{version}` replaced; empty for none |
| `token` | `github.token` | Reads the plug-in's releases and attestations |

Outputs: `path` (the assembled site), `version` and `tag` (empty before the
first release, when the site is built from `main`'s docs with no download).

## Build a handbook locally

From the plug-in's checkout, with Node 22 or later:

```sh
npx github:scenario-labs/plugin-site#v0.1.0 handbook --no-pdf --out build/handbook
```

`--config <path>` points at another configuration, `--quiet` prints only
problems, and without `--no-pdf` the builder also prints the PDF through
Google Chrome (`CHROME_PATH`, or the default install location; `CHROME_FLAGS` adds flags such as `--no-sandbox`).
`HANDBOOK_GITHUB_REF` sets the ref the handbook's repository links open
(default `main`); the action also sets `HANDBOOK_TREE` and `HANDBOOK_COMMIT`
to the release's commit.

## Configuration

`handbook.config.json`, at the plug-in's repository root. Required:

| Key | Meaning |
| --- | --- |
| `product` | The product name, for example `Scenario for Maya` |
| `brand` | The words after the Scenario logo in the top bar, for example `for Maya` |
| `repository` | `owner/name` on GitHub; the handbook's repository links open there |
| `files` | The prefix of the downloadable files: `<files>-handbook-<version>.html` and `.pdf` |
| `description` | The page's meta description; `{version}` is replaced |
| `version` | Where the version is read: `{"file": "plugin/manifest.json", "json": "version"}` (a dotted path) or `{"file": "...", "pattern": "regex with one group"}` |
| `chapters` | The handbook's chapters, in order (below) |

The handbook is for the people who use the plug-in, so its chapters follow
theirs, as in the Photoshop and Blender handbooks: what it does, install,
quick start, find your way around, one chapter per feature, costs, jobs,
files and folders, what leaves the machine, troubleshooting, known limits,
changelog, licence. Architecture, tests, diagrams of the code and the design
spec stay in the repository for contributors. A chapter's `###` headings are
its entries in the contents column, shown while it is read.

A chapter is `{"id", "title", "parts"}`, with `"newPage": true` to start it on
a new page in the PDF. Each part takes from one doc:

- `{"file": "README.md", "section": "Install"}`: one h2 section, its content only;
- `{"file": "docs/PRIVACY.md"}`: the whole doc, its h1 dropped, its h2s as subsections, `"skip": [...]` leaving some out;
- `{"file": "...", "only": "Troubleshooting"}`: one section kept with its heading.

`"generated": "downloads"` makes a chapter of the download links, and
`"generated": "licence"` adds the licence notes after its parts. `"alias"`
(`[["docs/GUIDE.md", "old-anchor"]]`) sends old anchors to the chapter.

Optional, with their defaults:

| Key | Default | Meaning |
| --- | --- | --- |
| `media` | `docs/media` | The pictures folder; pictures elsewhere are linked, not copied |
| `intro` | `{"file": "README.md"}` | The doc whose intro gives the hero: its first plain paragraph, its `hero.*` picture, its first block quote; `"guide"` adds another doc's first paragraph |
| `cta` | `[["Install", "#install"]]` | The hero's buttons, `[text, href]`, the first one filled |
| `nav` | Install, Changelog | Top bar links, `[text, href]`; GitHub and App Login are always there |
| `cover` | `[]` | Extra lines on the PDF cover, `[label, value]` |
| `notes` | a line on screenshots | Paragraphs under the hero (inline Markdown) |
| `downloads` | `[]` | Lines of the downloads chapter (inline Markdown, `{version}` replaced) |
| `fileNames` | README, Changelog, LICENSE | The names shown for links whose text is a bare file name |
| `figures` | `{"beforeAfter": "before-after/", "screens": "screens/"}` | Path parts that mark before-and-after pictures and screenshots |
| `gallery` | none | `{"chapter", "show", "eyebrow"}`: a grid of the before-and-after pictures of `chapter`, shown in `show` |
| `flow` | none | A "how it works" diagram under the hero: `{"from", "models", "to", "note"}`, each column `{"label", "items": [[text, href]]}` |
| `checks` | `{"prefixed": []}` | Terms that must carry a prefix, such as `[["MCP", "Scenario"]]` |
| `trademarks` | `""` | The trademark line in the footer |
| `theme` | none | `{"accent", "accentDark"}`: the plug-in's colour |
| `site` | `""` | The site's address, such as `https://maya.scenario.com`: needed for site-absolute links (`/download/latest`) in `cta` and `nav`, which the single file and the PDF open there |
| `analytics` | `""` | A site-absolute script the web page loads, such as `/page.js`, where the plug-in's Vercel proxy serves Web Analytics; not in the single file or the PDF |

Docs may use the Markdown subset the plug-ins write (headings, lists, tables,
code, block quotes, emphasis, links, pictures) and the layout HTML READMEs
add: `<p align>` and `<div>` wrappers, `<a href>`, `<img width>` and `<sub>`
captions. Code blocks show as code.
[test/fixtures/sample-plugin](test/fixtures/sample-plugin) is a complete
example.

## Versions

Releases are tagged `vX.Y.Z` ([CHANGELOG.md](CHANGELOG.md)). Pin a release by
its commit SHA, as the plug-ins pin every action, with the tag in a comment.

## License

[MIT](LICENSE). The Scenario logo is a trademark of Scenario and is not
covered by the license.
