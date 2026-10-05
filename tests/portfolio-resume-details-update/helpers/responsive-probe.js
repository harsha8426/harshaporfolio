'use strict';

/**
 * Builds the in-page responsive audit expression evaluated inside the browser.
 *
 * Severity contract:
 *   blocking  - a genuine responsive defect; fails the run.
 *   advisory  - reported for review, does not fail the run (intentional
 *               fixture controls, decorative micro-labels, monospace code).
 *
 * Intentional-by-design exclusions (documented, not silently ignored):
 *   - `.skill-card-glow` is a 200%/left:-50% decorative radial inside an
 *     `overflow: hidden` card, so it can never widen the document.
 *   - The off-canvas `.nav-links` drawer is `position: fixed; right: -100%`
 *     when closed. Fixed subtrees are outside the document scroll region.
 *   - `.cursor-glow` and `#particleCanvas` are fixed, pointer-events: none
 *     decorations.
 *   - Anything inside an ancestor that is itself a scroll/clip container
 *     (`.code-body`, `.lab-script`, `.lab-pre`) owns its own scrollbar.
 */

/**
 * 44x44 CSS px is the touch-target guideline (WCAG 2.5.5 Target Size
 * Enhanced / platform HIG). It is enforced as blocking on the touch layout,
 * i.e. at and below the 768px mobile-nav breakpoint.
 */
const TAP_TARGET_TOUCH = 44;

/**
 * 24x24 CSS px is WCAG 2.5.8 Target Size (Minimum), level AA. It is enforced
 * as blocking at every width, including the pointer-driven desktop navbar,
 * where anything smaller than 44 is reported as advisory instead.
 */
const TAP_TARGET_POINTER = 24;

const TOUCH_LAYOUT_MAX_WIDTH = 768;
const MIN_FONT_PX = 12;
const EDGE_TOLERANCE = 1;

/** Interactive controls that must meet the tap-target floor on the portfolio. */
const PRIMARY_TAP_SELECTORS = [
  '.nav-toggle',
  '.nav-links .nav-link',
  '.nav-logo',
  '.hero-cta .btn',
  '.contact-links a.contact-link-item',
  '.contact-form input',
  '.contact-form textarea',
  '.contact-form .btn-submit',
  '.footer-nav a',
  '.footer-social a'
];

/** Résumé-bearing text that must stay legible and inside its container. */
const CONTENT_SELECTORS = [
  '.hero-title-name',
  '.hero-role',
  '.hero-description',
  '.about-intro',
  '.info-item span',
  '.skill-card h3',
  '.skill-tag',
  '.timeline-card h3',
  '.timeline-employer',
  '.timeline-location',
  '.timeline-date',
  '.timeline-responsibility-heading',
  '.timeline-responsibility-list li',
  '.edu-content h3',
  '.edu-content h4',
  '.edu-date',
  '.score-label',
  '.score-value',
  '.contact-label',
  '.contact-value',
  '.footer-bottom p'
];

/**
 * Decorative content that must stay inside its clip container but is exempt
 * from the 12px legibility floor (micro-labels on the rotating tech orbit).
 * Listed so the `.about-visual { overflow-x: clip }` correction is guarded:
 * if that rule ever starts cutting an orbit chip, this check fails.
 */
const CONTAINMENT_ONLY_SELECTORS = [
  '.orbit-item span',
  '.orbit-center'
];

/** Long labels called out as the highest wrapping risk. */
const LONG_LABELS = [
  'Playwright APIRequestContext',
  'Infor Data Fabric ETL Tool',
  'source-to-target validation',
  'Execution, Delivery & Reporting',
  'Formats & Metadata Validation',
  "Vignan's Institute of Information Technology",
  'niddanaharshavardhan@gmail.com',
  'Test management & Infor platforms',
  'Formats, metadata & encoding'
];

/** Sibling sets that must never visually collide. */
const COLLISION_GROUPS = [
  ['hero', '.hero > .hero-content, .hero > .hero-visual'],
  ['hero', '.hero-content > *'],
  ['hero', '.hero-cta > .btn'],
  ['navbar', '.nav-container > *'],
  ['about', '.about-grid > *'],
  ['about', '.about-info-grid > .info-item'],
  ['skills', '.skills-grid > .skill-card'],
  ['skills', '.skill-tags > .skill-tag'],
  ['timeline', '.timeline > .timeline-item'],
  ['timeline', '.timeline-card > *'],
  ['timeline', '.timeline-responsibility-groups > .timeline-responsibility-group'],
  ['timeline', '.timeline-responsibility-list > li'],
  ['education', '.education-grid > .edu-card'],
  ['education', '.edu-content > *'],
  ['contact', '.contact-grid > *'],
  ['contact', '.contact-links > .contact-link-item'],
  ['contact', '.contact-form > *'],
  ['contact', '.contact-link-item > div:not(.contact-icon) > *'],
  ['footer', '.footer-content > *']
];

function buildProbe(config) {
  const touchLayout = config.width <= TOUCH_LAYOUT_MAX_WIDTH;
  const options = {
    touchLayout,
    tapFloor: touchLayout ? TAP_TARGET_TOUCH : TAP_TARGET_POINTER,
    tapIdeal: TAP_TARGET_TOUCH,
    minFontPx: MIN_FONT_PX,
    tolerance: EDGE_TOLERANCE,
    primaryTapSelectors: PRIMARY_TAP_SELECTORS,
    contentSelectors: CONTENT_SELECTORS,
    containmentOnlySelectors: CONTAINMENT_ONLY_SELECTORS,
    longLabels: LONG_LABELS,
    collisionGroups: COLLISION_GROUPS,
    ...config
  };

  return `(async () => {
  const OPT = ${JSON.stringify(options)};
  const TOL = OPT.tolerance;
  const results = [];
  const add = (severity, name, pass, detail) => results.push({
    severity, name, pass: !!pass, detail: detail == null ? '' : String(detail)
  });
  const blocking = (name, pass, detail) => add('blocking', name, pass, detail);
  const advisory = (name, pass, detail) => add('advisory', name, pass, detail);
  const round = (n) => Math.round(n * 10) / 10;
  const squash = (s) => String(s).replace(/\\s+/g, ' ').trim();
  const text = (el) => (el ? squash(el.textContent) : '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const describe = (el) => {
    if (!el) return 'none';
    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + squash(el.className).split(' ').join('.')
      : '';
    const label = text(el).slice(0, 44);
    return tag + id + cls + (label ? ' "' + label + '"' : '');
  };

  const isRendered = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };

  const inFixedSubtree = (el) => {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') return true;
    }
    return false;
  };

  // An ancestor that clips or scrolls owns the overflow of its subtree on that
  // axis, so the subtree cannot widen the document. Resolved per axis, because
  // 'overflow-x: clip' may legally pair with 'overflow-y: visible'.
  const axisClipper = (el, axis) => {
    const property = axis === 'x' ? 'overflowX' : 'overflowY';
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      if (getComputedStyle(node)[property] !== 'visible') return node;
    }
    return null;
  };
  const clippingAncestor = (el) => axisClipper(el, 'x') || axisClipper(el, 'y');

  const contentBox = (el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: box.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
      right: box.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth),
      top: box.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
      bottom: box.bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth)
    };
  };

  const paddingBox = (el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: box.left + parseFloat(style.borderLeftWidth),
      right: box.right - parseFloat(style.borderRightWidth),
      top: box.top + parseFloat(style.borderTopWidth),
      bottom: box.bottom - parseFloat(style.borderBottomWidth)
    };
  };

  /* ---------------------------------------------------------------- *
   * 0. Settle the page into its steady layout.
   *    .animate-on-scroll starts at opacity:0 / translateY(40px); the real
   *    IntersectionObserver reveals it on scroll. Scroll the whole page so
   *    the observer fires, then force any straggler so every measurement is
   *    taken against the final, untransformed layout.
   * ---------------------------------------------------------------- */
  const pageHeight = document.documentElement.scrollHeight;
  for (let y = 0; y <= pageHeight; y += Math.max(200, window.innerHeight / 2)) {
    window.scrollTo(0, y);
    await sleep(40);
  }
  window.scrollTo(0, 0);
  await sleep(250);
  const stragglers = [...document.querySelectorAll('.animate-on-scroll:not(.visible)')];
  for (const el of stragglers) el.classList.add('visible');
  await sleep(250);
  advisory('reveal animation reached steady state',
    true, 'forced ' + stragglers.length + ' straggler(s) after scripted scroll');

  const layoutWidth = document.documentElement.clientWidth;
  const metrics = { layoutWidth, innerWidth: window.innerWidth };

  /* ---------------------------------------------------------------- *
   * 1. Horizontal overflow - measured twice.
   *    body has overflow-x: hidden, which can mask a real overflow, so the
   *    authoritative measurement is taken with it forced back to visible.
   * ---------------------------------------------------------------- */
  const clampedScrollWidth = document.documentElement.scrollWidth;
  const previousOverflowX = document.body.style.overflowX;
  document.body.style.overflowX = 'visible';
  void document.body.offsetWidth; // force reflow
  await sleep(60);
  const unclampedScrollWidth = document.documentElement.scrollWidth;
  const unclampedBodyScrollWidth = document.body.scrollWidth;

  // Attribute any unclamped overflow to concrete elements before restoring.
  // Every element past the right edge is recorded with the reason it either
  // can or cannot widen the document, so intentional decoration is separated
  // from a real defect instead of being silently skipped.
  const overflowOffenders = [];
  const byDesignOverhang = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!isRendered(el)) continue;
    const box = el.getBoundingClientRect();
    const overhang = Math.max(box.right - layoutWidth, -box.left);
    if (overhang <= TOL) continue;

    const entry = describe(el).split(' "')[0]
      + ' +' + round(overhang) + 'px [l=' + round(box.left) + ' r=' + round(box.right) + ']';

    if (inFixedSubtree(el)) {
      // position: fixed subtrees are outside the document scroll region
      // (off-canvas nav drawer, cursor glow, particle canvas).
      byDesignOverhang.push(entry + ' reason=fixed');
      continue;
    }
    const clipper = axisClipper(el, 'x');
    if (clipper) {
      // The ancestor owns this overflow (decorative .skill-card-glow inside an
      // overflow:hidden card, code/pre blocks with their own scrollbar).
      byDesignOverhang.push(entry + ' reason=clipped-by-' + describe(clipper).split(' "')[0]);
      continue;
    }
    overflowOffenders.push({ element: entry, overhangPx: round(overhang) });
  }
  document.body.style.overflowX = previousOverflowX;
  void document.body.offsetWidth;

  metrics.clampedScrollWidth = clampedScrollWidth;
  metrics.unclampedScrollWidth = unclampedScrollWidth;
  metrics.unclampedBodyScrollWidth = unclampedBodyScrollWidth;

  blocking('no horizontal overflow (overflow-x: hidden in place)',
    clampedScrollWidth <= layoutWidth + TOL,
    'scrollWidth=' + clampedScrollWidth + ' clientWidth=' + layoutWidth);

  blocking('no horizontal overflow (overflow-x forced visible)',
    unclampedScrollWidth <= layoutWidth + TOL && unclampedBodyScrollWidth <= layoutWidth + TOL,
    'docScrollWidth=' + unclampedScrollWidth + ' bodyScrollWidth=' + unclampedBodyScrollWidth
      + ' clientWidth=' + layoutWidth);

  blocking('no element extends past the layout viewport',
    overflowOffenders.length === 0,
    overflowOffenders.slice(0, 6).map((o) => o.element).join(' | '));

  advisory('overhang attributed to intentional decoration only',
    true, byDesignOverhang.length === 0 ? 'none' : byDesignOverhang.slice(0, 8).join(' | '));

  /* ---------------------------------------------------------------- *
   * 2. Text containment and clipping.
   * ---------------------------------------------------------------- */
  const clippedText = [];
  const escapedText = [];

  // Reports the axis on which an element is actually cut off. Only 'hidden'
  // and 'clip' cut content; 'auto'/'scroll' expose it through a scrollbar.
  const clippedAxes = (el) => {
    const box = el.getBoundingClientRect();
    const axes = [];
    for (const axis of ['x', 'y']) {
      const clipper = axisClipper(el, axis);
      if (!clipper) continue;
      const mode = getComputedStyle(clipper)[axis === 'x' ? 'overflowX' : 'overflowY'];
      if (mode !== 'hidden' && mode !== 'clip') continue;
      const clip = paddingBox(clipper);
      const out = axis === 'x'
        ? box.right > clip.right + TOL || box.left < clip.left - TOL
        : box.bottom > clip.bottom + TOL || box.top < clip.top - TOL;
      if (out) axes.push({ axis, clipper });
    }
    return axes;
  };

  const measureContainment = (selectors, checkViewport) => {
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!isRendered(el)) continue;
        const box = el.getBoundingClientRect();

        if (checkViewport && (box.right > layoutWidth + TOL || box.left < -TOL)) {
          escapedText.push(describe(el) + ' [viewport l=' + round(box.left) + ' r=' + round(box.right) + ']');
        }

        for (const { axis, clipper } of clippedAxes(el)) {
          clippedText.push(describe(el) + ' clipped on ' + axis
            + ' by ' + describe(clipper).split(' "')[0]);
        }

        // Outside the nearest card's content box.
        const card = el.closest('.skill-card, .timeline-card, .edu-card, .contact-link-item, .info-item, .code-window');
        if (card && card !== el) {
          const content = contentBox(card);
          if (box.right > content.right + TOL || box.left < content.left - TOL) {
            escapedText.push(describe(el) + ' outside ' + describe(card).split(' "')[0] + ' content box');
          }
        }
      }
    }
  };

  measureContainment(OPT.contentSelectors, true);
  // Decorative orbit chips legitimately overhang the orbit box vertically, so
  // only their clip-container containment is asserted, not viewport bounds.
  measureContainment(OPT.containmentOnlySelectors, false);

  blocking('no text clipped by an overflow container', clippedText.length === 0,
    clippedText.slice(0, 6).join(' | '));
  blocking('no text outside its container content box', escapedText.length === 0,
    escapedText.slice(0, 6).join(' | '));

  // Cards must not swallow wrapped content. scrollWidth/scrollHeight is not
  // usable here: .skill-card-glow is a deliberate 200% x 200% decoration at
  // top/left -50% inside an overflow:hidden card, which alone inflates
  // scrollWidth to 1.5x. Measure the union of in-flow content instead.
  const swallowed = [];
  for (const card of document.querySelectorAll('.skill-card, .edu-card, .timeline-card')) {
    if (!isRendered(card)) continue;
    const clip = paddingBox(card);
    let maxRight = -Infinity;
    let maxBottom = -Infinity;
    let minLeft = Infinity;
    let minTop = Infinity;
    let counted = 0;
    for (const child of card.querySelectorAll('*')) {
      if (!isRendered(child)) continue;
      const position = getComputedStyle(child).position;
      if (position === 'absolute' || position === 'fixed') continue; // decoration
      // Skip anything inside a nested scroll/clip container of its own.
      if (clippingAncestor(child) !== card) continue;
      const box = child.getBoundingClientRect();
      maxRight = Math.max(maxRight, box.right);
      maxBottom = Math.max(maxBottom, box.bottom);
      minLeft = Math.min(minLeft, box.left);
      minTop = Math.min(minTop, box.top);
      counted += 1;
    }
    if (counted === 0) continue;
    const parts = [];
    if (maxRight > clip.right + TOL) parts.push('right +' + round(maxRight - clip.right));
    if (maxBottom > clip.bottom + TOL) parts.push('bottom +' + round(maxBottom - clip.bottom));
    if (minLeft < clip.left - TOL) parts.push('left -' + round(clip.left - minLeft));
    if (minTop < clip.top - TOL) parts.push('top -' + round(clip.top - minTop));
    if (parts.length > 0) {
      swallowed.push(describe(card).split(' "')[0] + ' content ' + parts.join(', ') + 'px past padding box');
    }
  }
  blocking('cards do not clip wrapped content', swallowed.length === 0, swallowed.slice(0, 6).join(' | '));

  // The specific long labels the resume introduced must render and fit.
  // Compared case-insensitively: several headings are uppercased by CSS
  // text-transform, which innerText reflects.
  const missingLabels = [];
  const unfitLabels = [];
  const bodyText = squash(document.body.innerText).toLowerCase();
  for (const labelText of OPT.longLabels) {
    if (!bodyText.includes(labelText.toLowerCase())) { missingLabels.push(labelText); continue; }
    const host = [...document.querySelectorAll('.skill-tag, .timeline-responsibility-heading, .edu-content h4, .contact-value, .skill-card h3')]
      .find((el) => text(el).toLowerCase() === labelText.toLowerCase());
    if (!host || !isRendered(host)) continue;
    const box = host.getBoundingClientRect();
    const clipper = axisClipper(host, 'x');
    const bound = clipper ? paddingBox(clipper) : { left: 0, right: layoutWidth };
    if (box.right > Math.min(bound.right, layoutWidth) + TOL || box.left < Math.max(bound.left, 0) - TOL) {
      unfitLabels.push(labelText + ' [l=' + round(box.left) + ' r=' + round(box.right) + ']');
    }
  }
  if (OPT.expectLongLabels) {
    blocking('all long labels render on this page', missingLabels.length === 0, missingLabels.join(' | '));
  }
  blocking('long labels wrap inside their container', unfitLabels.length === 0, unfitLabels.join(' | '));

  /* ---------------------------------------------------------------- *
   * 3. Tap targets.
   * ---------------------------------------------------------------- */
  const measureTapTargets = (selectors, floor) => {
    const seen = new Set();
    const small = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (seen.has(el) || !isRendered(el)) continue;
        if (el.type === 'hidden' || el.disabled) continue;
        seen.add(el);
        const box = el.getBoundingClientRect();
        if (box.width < floor - 0.5 || box.height < floor - 0.5) {
          small.push({
            key: describe(el),
            element: describe(el).split(' "')[0] + ' ' + round(box.width) + 'x' + round(box.height)
          });
        }
      }
    }
    return small;
  };

  const ALL_CONTROLS = ['a[href]', 'button', 'input', 'select', 'textarea', 'summary', '[role="button"]'];

  // Blocking floor: 44px on the touch layout, WCAG 2.5.8 AA 24px on the
  // pointer layout where the inline desktop navbar applies.
  const primaryUnderFloor = measureTapTargets(OPT.primaryTapSelectors, OPT.tapFloor);
  blocking('primary controls meet the ' + OPT.tapFloor + 'px tap target floor'
    + (OPT.touchLayout ? ' (touch layout)' : ' (pointer layout, WCAG 2.5.8 AA)'),
    primaryUnderFloor.length === 0,
    primaryUnderFloor.map((t) => t.element).join(' | '));

  if (!OPT.touchLayout) {
    const primaryUnderIdeal = measureTapTargets(OPT.primaryTapSelectors, OPT.tapIdeal);
    advisory('pointer-layout controls below the ' + OPT.tapIdeal + 'px touch ideal',
      primaryUnderIdeal.length === 0,
      primaryUnderIdeal.map((t) => t.element).join(' | '));
  }

  const otherSmall = measureTapTargets(ALL_CONTROLS, OPT.tapIdeal)
    .filter((t) => !OPT.primaryTapSelectors.some((selector) => {
      return [...document.querySelectorAll(selector)].some((el) => describe(el) === t.key);
    }));
  advisory('secondary/fixture controls at or above ' + OPT.tapIdeal + 'px',
    otherSmall.length === 0,
    otherSmall.slice(0, 14).map((t) => t.element).join(' | '));

  /* ---------------------------------------------------------------- *
   * 4. Legibility.
   * ---------------------------------------------------------------- */
  const tooSmall = [];
  for (const selector of OPT.contentSelectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (!isRendered(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < OPT.minFontPx - 0.05) {
        tooSmall.push(describe(el).split(' "')[0] + ' ' + round(size) + 'px');
      }
    }
  }
  const uniqueTooSmall = [...new Set(tooSmall)];
  blocking('resume content text renders at >= ' + OPT.minFontPx + 'px',
    uniqueTooSmall.length === 0, uniqueTooSmall.slice(0, 10).join(' | '));

  const decorativeSmall = [...new Set(
    [...document.querySelectorAll('.orbit-item span, .code-body, .lab-script, .lab-pre, .lab-table td, .lab-table th, .code-title, .nav-link, .footer-nav a')]
      .filter(isRendered)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < OPT.minFontPx - 0.05)
      .map((el) => describe(el).split(' "')[0] + ' ' + round(parseFloat(getComputedStyle(el).fontSize)) + 'px')
  )];
  advisory('decorative/monospace text at or above ' + OPT.minFontPx + 'px',
    decorativeSmall.length === 0, decorativeSmall.slice(0, 10).join(' | '));

  /* ---------------------------------------------------------------- *
   * 5. Element collisions.
   * ---------------------------------------------------------------- */
  const overlapping = [];
  for (const [section, selector] of OPT.collisionGroups) {
    const nodes = [...document.querySelectorAll(selector)].filter((el) => {
      if (!isRendered(el)) return false;
      const style = getComputedStyle(el);
      // Absolute/fixed decorations (timeline-line, timeline-dot, section-line,
      // form-line, floating labels, glows) intentionally sit over siblings.
      return style.position !== 'absolute' && style.position !== 'fixed';
    });
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
        const a = nodes[i].getBoundingClientRect();
        const b = nodes[j].getBoundingClientRect();
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 1 && overlapY > 1) {
          overlapping.push(section + ': ' + describe(nodes[i]).split(' "')[0]
            + ' x ' + describe(nodes[j]).split(' "')[0]
            + ' (' + round(overlapX) + 'x' + round(overlapY) + 'px)');
        }
      }
    }
  }
  blocking('no element collisions in measured sections', overlapping.length === 0,
    [...new Set(overlapping)].slice(0, 8).join(' | '));

  return { results, metrics };
})()`;
}

module.exports = {
  TAP_TARGET_TOUCH,
  TAP_TARGET_POINTER,
  TOUCH_LAYOUT_MAX_WIDTH,
  MIN_FONT_PX,
  EDGE_TOLERANCE,
  PRIMARY_TAP_SELECTORS,
  CONTENT_SELECTORS,
  CONTAINMENT_ONLY_SELECTORS,
  LONG_LABELS,
  COLLISION_GROUPS,
  buildProbe
};
