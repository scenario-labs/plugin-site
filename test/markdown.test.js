"use strict";
// The Markdown reader: the subset plug-in docs use, and the layout HTML READMEs add.

const test = require("node:test");
const assert = require("node:assert/strict");
const md = require("../src/handbook/markdown.js");

test("the reader handles the subset the docs use", () => {
  const t = md.parse("# T\n\n1. **One**\n\n   <img src=\"a.png\" alt=\"A\">\n\n2. Two\n   lazy\n\n| A | B |\n|---|---|\n| `x\\|y` | z |\n\n> **Note.** text\n>\n> ```sh\n> run\n> ```\n");
  assert.equal(t[0].type, "heading");
  assert.equal(t[1].type, "list");
  assert.equal(t[1].items.length, 2);
  assert.equal(t[1].items[0].length, 2);
  assert.equal(t[1].items[1][0].text, "Two\nlazy");
  assert.equal(t[2].type, "table");
  assert.deepEqual(t[2].rows[0], ["`x|y`", "z"]);
  assert.equal(t[3].type, "quote");
  assert.equal(t[3].children[1].type, "code");
  assert.equal(md.slug("Selection edits: Inside selection or Bolder"), "selection-edits-inside-selection-or-bolder");
});

test("layout HTML reads as its Markdown meaning", () => {
  const t = md.parse('<p align="center"><img src="a.gif" width="560" alt="A"></p>\n<p align="center"><sub>One light. <a href="docs/x.mp4">MP4</a></sub></p>\n\n<h1 align="center">Title</h1>\n\n<br clear="right">\n');
  assert.equal(t.length, 2, "the <br> paragraph is dropped");
  assert.equal(t[0].text, '<img src="a.gif" width="560" alt="A">\n*One light. [MP4](docs/x.mp4)*');
  assert.deepEqual(t[1], { type: "heading", level: 1, text: "Title" });
});
