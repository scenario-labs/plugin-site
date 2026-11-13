"use strict";
// A small Markdown reader for the subset the repository docs use: ATX
// headings, paragraphs, nested ordered and unordered lists, fenced code,
// block quotes, pipe tables, emphasis, inline code, links, images and inline
// <img> tags. It returns a block tree; the handbook builder renders it.
// Anything outside the subset is kept as escaped text, never as raw HTML.
// The few HTML tags READMEs use for layout are read as their Markdown
// meaning first (normalizeHtml): wrappers dropped, <a> as a link, <sub> as
// an italic caption, <h1> to <h6> as headings.

const LIST_ITEM = /^( {0,3})([-*+]|\d{1,3}[.)])( +|$)/;
const FENCE = /^( {0,3})(```+|~~~+)\s*([\w-]*)\s*$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HTML_HEADING = /^<h([1-6])\b[^>]*>(.*?)<\/h\1>$/i;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function indentOf(line) {
  const m = /^ */.exec(line);
  return m[0].length;
}

function startsBlock(line) {
  return HEADING.test(line) || FENCE.test(line) || /^ {0,3}>/.test(line) || LIST_ITEM.test(line) || /^\s*\|/.test(line);
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "`") inCode = !inCode;
    if (c === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (c === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function parseBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m;
    if ((m = FENCE.exec(line))) {
      const fence = m[2];
      const pad = m[1].length;
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        body.push(lines[i].slice(Math.min(pad, indentOf(lines[i]))));
        i++;
      }
      i++;
      out.push({ type: "code", lang: m[3] || "", text: body.join("\n") });
      continue;
    }
    if ((m = HEADING.exec(line))) {
      out.push({ type: "heading", level: m[1].length, text: m[2] });
      i++;
      continue;
    }
    if (/^ {0,3}>/.test(line)) {
      const body = [];
      while (i < lines.length && lines[i].trim() && /^ {0,3}>/.test(lines[i])) {
        body.push(lines[i].replace(/^ {0,3}> ?/, ""));
        i++;
      }
      out.push({ type: "quote", children: parseBlocks(body) });
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push({ type: "table", head, rows });
      continue;
    }
    if ((m = LIST_ITEM.exec(line))) {
      const ordered = /\d/.test(m[2]);
      const base = m[1].length;
      const start = ordered ? parseInt(m[2], 10) : 1;
      const items = [];
      while (i < lines.length) {
        const im = LIST_ITEM.exec(lines[i]);
        if (!im || im[1].length !== base || /\d/.test(im[2]) !== ordered) break;
        const content = im[1].length + im[2].length + Math.max(1, Math.min(im[3].length, 4));
        const body = [lines[i].slice(content)];
        i++;
        let sawBlank = false;
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim()) {
            body.push("");
            sawBlank = true;
            i++;
            continue;
          }
          if (indentOf(l) >= content) {
            body.push(l.slice(content));
            i++;
            continue;
          }
          // A lazy continuation line of the item's paragraph.
          if (!sawBlank && !startsBlock(l)) {
            body.push(l.trim());
            i++;
            continue;
          }
          break;
        }
        while (body.length && !body[body.length - 1].trim()) body.pop();
        items.push(parseBlocks(body));
      }
      out.push({ type: "list", ordered, start, items });
      continue;
    }
    if ((m = HTML_HEADING.exec(line.trim()))) {
      out.push({ type: "heading", level: Number(m[1]), text: normalizeHtml(m[2]) });
      i++;
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i]))) {
      para.push(lines[i].trim());
      i++;
    }
    const text = normalizeHtml(para.join("\n"));
    if (text.trim()) out.push({ type: "para", text });
  }
  return out;
}

// Layout HTML as Markdown: <p> and <div> wrappers go, <br> is a space,
// <a href> is a link, and <sub> becomes an italic line (a picture's caption
// when it follows one). <img> tags stay for the renderer.
function normalizeHtml(text) {
  return String(text)
    .replace(/<\/?(?:p|div|center|span)\b[^>]*>/gi, "")
    .replace(/<br\b[^>]*>/gi, " ")
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${label.trim()}](${href})`)
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, (_, t) => `*${t.trim()}*`)
    .split("\n")
    .map((l) => l.trim())
    .filter((l, k, all) => l || (k > 0 && k < all.length - 1))
    .join("\n")
    .trim();
}

function parse(source) {
  return parseBlocks(source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n"));
}

// GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens.
function slug(text) {
  return plain(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

// The visible text of an inline Markdown string.
function plain(text) {
  return String(text)
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { parse, slug, plain, normalizeHtml };
