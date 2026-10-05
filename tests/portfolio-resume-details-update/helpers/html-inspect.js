'use strict';

/**
 * Minimal, dependency-free HTML inspection helpers for the
 * portfolio-resume-details-update release validation.
 *
 * Test-only module. Production pages must not load it.
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr'
]);

const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  hearts: '\u2665',
  copy: '\u00a9',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026'
};

function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function normalizeWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function parseAttributes(raw) {
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!(name in attributes)) attributes[name] = decodeEntities(value);
  }
  return attributes;
}

/**
 * Parses a static HTML document into a lightweight element tree.
 *
 * @param {string} source
 * @param {string} file
 */
function parseHtml(source, file) {
  const root = {
    tag: '#root',
    file,
    attributes: {},
    children: [],
    parent: null,
    startIndex: 0,
    endIndex: source.length,
    contentStart: 0,
    contentEnd: source.length
  };

  const stack = [root];
  const tagPattern = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>/g;

  let match;
  while ((match = tagPattern.exec(source)) !== null) {
    const [full, closeTag, openTag, rawAttrs, selfClosing] = match;

    if (closeTag) {
      const tag = closeTag.toLowerCase();
      for (let depth = stack.length - 1; depth > 0; depth -= 1) {
        if (stack[depth].tag === tag) {
          for (let unwind = stack.length - 1; unwind > depth; unwind -= 1) {
            const abandoned = stack.pop();
            abandoned.contentEnd = match.index;
            abandoned.endIndex = match.index;
          }
          const element = stack.pop();
          element.contentEnd = match.index;
          element.endIndex = match.index + full.length;
          break;
        }
      }
      continue;
    }

    if (!openTag) continue;

    const tag = openTag.toLowerCase();
    const element = {
      tag,
      file,
      attributes: parseAttributes(rawAttrs || ''),
      children: [],
      parent: stack[stack.length - 1],
      startIndex: match.index,
      contentStart: match.index + full.length,
      contentEnd: match.index + full.length,
      endIndex: match.index + full.length
    };
    element.parent.children.push(element);

    if (VOID_ELEMENTS.has(tag) || selfClosing === '/') continue;

    if (RAW_TEXT_ELEMENTS.has(tag)) {
      const closePattern = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = source.slice(element.contentStart);
      const closeMatch = closePattern.exec(rest);
      if (closeMatch) {
        element.contentEnd = element.contentStart + closeMatch.index;
        element.endIndex = element.contentEnd + closeMatch[0].length;
        tagPattern.lastIndex = element.endIndex;
      } else {
        element.contentEnd = source.length;
        element.endIndex = source.length;
      }
      continue;
    }

    stack.push(element);
  }

  for (let depth = stack.length - 1; depth > 0; depth -= 1) {
    const element = stack.pop();
    element.contentEnd = source.length;
    element.endIndex = source.length;
  }

  return { root, source, file };
}

function allElements(document) {
  const result = [];
  const walk = (element) => {
    for (const child of element.children) {
      result.push(child);
      walk(child);
    }
  };
  walk(document.root);
  return result;
}

function outerHtml(document, element) {
  return document.source.slice(element.startIndex, element.endIndex);
}

function innerHtml(document, element) {
  return document.source.slice(element.contentStart, element.contentEnd);
}

/**
 * Decoded text content. Element boundaries become whitespace so that content
 * split across inline elements or <br> does not run words together.
 */
function textOf(document, element) {
  const slice = innerHtml(document, element);
  if (RAW_TEXT_ELEMENTS.has(element.tag)) return slice;
  return decodeEntities(slice.replace(/<[^>]*>/g, '\n'));
}

function normalizedTextOf(document, element) {
  return normalizeWhitespace(textOf(document, element));
}

function documentText(document) {
  return normalizeWhitespace(
    decodeEntities(
      document.source
        .replace(/<script[\s\S]*?<\/script>/gi, '\n')
        .replace(/<style[\s\S]*?<\/style>/gi, '\n')
        .replace(/<!--[\s\S]*?-->/g, '\n')
        .replace(/<[^>]*>/g, '\n')
    )
  );
}

function findAll(document, predicate) {
  return allElements(document).filter(predicate);
}

function byTag(document, tag) {
  return findAll(document, (element) => element.tag === tag);
}

function hasClass(element, className) {
  const classes = (element.attributes.class || '').split(/\s+/);
  return classes.includes(className);
}

function byClass(document, className) {
  return findAll(document, (element) => hasClass(element, className));
}

function lineOf(document, index) {
  return document.source.slice(0, index).split('\n').length;
}

function describe(document, element) {
  const id = element.attributes.id ? `#${element.attributes.id}` : '';
  const cls = element.attributes.class ? `.${element.attributes.class.split(/\s+/).join('.')}` : '';
  return `${element.tag}${id}${cls} (line ${lineOf(document, element.startIndex)})`;
}

function isWithin(element, predicate) {
  let current = element.parent;
  while (current && current.tag !== '#root') {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
}

module.exports = {
  VOID_ELEMENTS,
  decodeEntities,
  normalizeWhitespace,
  parseHtml,
  allElements,
  outerHtml,
  innerHtml,
  textOf,
  normalizedTextOf,
  documentText,
  findAll,
  byTag,
  byClass,
  hasClass,
  lineOf,
  describe,
  isWithin
};
