'use strict';

/**
 * Page-specific responsive probes: the mobile nav drawer, the documented grid
 * breakpoints, and the short-viewport hero.
 *
 * Kept separate from the geometry audit in responsive-probe.js because these
 * checks mutate interaction state (opening the drawer, following a link) and
 * must run after the read-only measurements.
 */

const MOBILE_NAV_BREAKPOINT = 768;
const WIDE_BREAKPOINT = 1024;

/**
 * Expected grid track counts keyed by selector.
 * Each entry maps a layout width to the number of columns the stylesheet
 * declares at that width.
 */
const GRID_EXPECTATIONS = {
  'index.html': [
    ['.timeline-responsibility-groups', (w) => (w <= MOBILE_NAV_BREAKPOINT ? 1 : 2)],
    ['.skills-grid', (w) => (w <= MOBILE_NAV_BREAKPOINT ? 1 : w <= WIDE_BREAKPOINT ? 2 : 3)],
    ['.education-grid', (w) => (w <= MOBILE_NAV_BREAKPOINT ? 1 : w <= WIDE_BREAKPOINT ? 2 : 3)],
    ['.about-grid', (w) => (w <= WIDE_BREAKPOINT ? 1 : 2)],
    ['.about-info-grid', (w) => (w <= MOBILE_NAV_BREAKPOINT ? 1 : 2)],
    ['.contact-grid', (w) => (w <= WIDE_BREAKPOINT ? 1 : 2)],
    ['.hero', (w) => (w <= WIDE_BREAKPOINT ? 1 : 2)]
  ],
  'test-lab.html': [
    ['.lab-grid', (w) => (w <= MOBILE_NAV_BREAKPOINT ? 1 : null)]
  ]
};

function gridPlan(page, width) {
  return (GRID_EXPECTATIONS[page] || [])
    .map(([selector, expected]) => ({ selector, expected: expected(width) }))
    .filter((entry) => entry.expected !== null);
}

/**
 * @param {object} config
 * @param {string} config.page            'index.html' | 'test-lab.html'
 * @param {number} config.width           emulated layout width
 * @param {number} config.height          emulated layout height
 * @param {boolean} config.followNavLink  true when a nav link stays on the page
 */
function buildNavProbe(config) {
  const options = {
    mobileNav: config.width <= MOBILE_NAV_BREAKPOINT,
    grids: gridPlan(config.page, config.width),
    isHeroPage: config.page === 'index.html',
    shortViewport: config.height <= 500,
    ...config
  };

  return `(async () => {
  const OPT = ${JSON.stringify(options)};
  const results = [];
  const add = (severity, name, pass, detail) => results.push({
    severity, name, pass: !!pass, detail: detail == null ? '' : String(detail)
  });
  const blocking = (name, pass, detail) => add('blocking', name, pass, detail);
  const advisory = (name, pass, detail) => add('advisory', name, pass, detail);
  const round = (n) => Math.round(n * 10) / 10;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const squash = (s) => String(s).replace(/\\s+/g, ' ').trim();
  const isRendered = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };

  const layoutWidth = document.documentElement.clientWidth;
  const layoutHeight = document.documentElement.clientHeight;

  /* ---------------------------------------------------------------- *
   * Declared grid breakpoints.
   * ---------------------------------------------------------------- */
  for (const { selector, expected } of OPT.grids) {
    const el = document.querySelector(selector);
    if (!el) { advisory('grid absent on this page: ' + selector, true, ''); continue; }
    const tracks = getComputedStyle(el).gridTemplateColumns.trim();
    const count = tracks === 'none' ? 1 : tracks.split(/\\s+/).length;
    blocking('grid columns at ' + layoutWidth + 'px: ' + selector + ' = ' + expected,
      count === expected, 'computed=' + count + ' tracks="' + tracks + '"');
  }

  /* ---------------------------------------------------------------- *
   * Short-viewport hero (min-height: 100vh must grow, never clip).
   * ---------------------------------------------------------------- */
  if (OPT.isHeroPage) {
    const hero = document.querySelector('.hero');
    if (hero) {
      blocking('hero does not clip its content',
        hero.scrollHeight <= hero.clientHeight + 1,
        'scrollHeight=' + hero.scrollHeight + ' clientHeight=' + hero.clientHeight
          + ' viewportHeight=' + layoutHeight);
      const last = hero.querySelector('.hero-cta');
      const heroBox = hero.getBoundingClientRect();
      if (last) {
        const lastBox = last.getBoundingClientRect();
        blocking('hero call-to-action stays inside the hero box',
          lastBox.bottom <= heroBox.bottom + 1,
          'ctaBottom=' + round(lastBox.bottom) + ' heroBottom=' + round(heroBox.bottom));
      }
      const indicator = hero.querySelector('.scroll-indicator');
      if (indicator && isRendered(indicator)) {
        const indicatorBox = indicator.getBoundingClientRect();
        const collides = [...hero.querySelectorAll('.hero-content > *, .hero-visual > *')]
          .filter(isRendered)
          .map((el) => {
            const box = el.getBoundingClientRect();
            return {
              el,
              x: Math.min(box.right, indicatorBox.right) - Math.max(box.left, indicatorBox.left),
              y: Math.min(box.bottom, indicatorBox.bottom) - Math.max(box.top, indicatorBox.top)
            };
          })
          .filter((hit) => hit.x > 1 && hit.y > 1);
        blocking('scroll indicator does not overlap hero content',
          collides.length === 0,
          collides.map((hit) => squash(hit.el.className).split(' ')[0]
            + ' overlap ' + round(hit.x) + 'x' + round(hit.y) + 'px').join(' | '));
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Navigation.
   * ---------------------------------------------------------------- */
  const toggle = document.getElementById('navToggle');
  const drawer = document.getElementById('navLinks');
  const navItems = drawer ? [...drawer.querySelectorAll('a')] : [];

  if (!OPT.mobileNav) {
    blocking('desktop nav toggle hidden', !isRendered(toggle),
      toggle ? getComputedStyle(toggle).display : 'missing');
    blocking('desktop nav links rendered inline', navItems.every(isRendered),
      'rendered=' + navItems.filter(isRendered).length + '/' + navItems.length);
    const outside = navItems.filter((el) => {
      const box = el.getBoundingClientRect();
      return box.right > layoutWidth + 1 || box.left < -1;
    });
    blocking('desktop nav links inside the viewport', outside.length === 0,
      outside.map((el) => squash(el.textContent)).join(' | '));
  } else {
    blocking('mobile nav toggle is rendered', isRendered(toggle),
      toggle ? getComputedStyle(toggle).display : 'missing');

    // Closed state: the drawer is deliberately parked off-canvas.
    const closedBox = drawer.getBoundingClientRect();
    blocking('closed drawer is parked off-canvas by design',
      closedBox.left >= layoutWidth - 1,
      'left=' + round(closedBox.left) + ' layoutWidth=' + layoutWidth);
    blocking('closed drawer is position: fixed (outside document flow)',
      getComputedStyle(drawer).position === 'fixed',
      getComputedStyle(drawer).position);

    toggle.click();
    await sleep(600); // drawer transition is 0.4s
    blocking('drawer opens on toggle', drawer.classList.contains('active'), drawer.className);

    const openBox = drawer.getBoundingClientRect();
    blocking('open drawer is fully on-screen horizontally',
      openBox.left >= -1 && openBox.right <= layoutWidth + 1,
      'left=' + round(openBox.left) + ' right=' + round(openBox.right) + ' layoutWidth=' + layoutWidth);
    blocking('open drawer is fully on-screen vertically',
      openBox.top >= -1 && openBox.height >= Math.min(layoutHeight, 320) - 1,
      'top=' + round(openBox.top) + ' height=' + round(openBox.height) + ' layoutHeight=' + layoutHeight);
    blocking('open drawer does not force horizontal overflow',
      document.documentElement.scrollWidth <= layoutWidth + 1,
      'scrollWidth=' + document.documentElement.scrollWidth);

    const unreachable = [];
    const unfocusable = [];
    for (const item of navItems) {
      if (!isRendered(item)) { unreachable.push(squash(item.textContent) + ' (not rendered)'); continue; }
      const box = item.getBoundingClientRect();
      if (box.right > layoutWidth + 1 || box.left < -1 || box.bottom > layoutHeight + 1 || box.top < -1) {
        unreachable.push(squash(item.textContent) + ' (off-screen l=' + round(box.left) + ' t=' + round(box.top) + ')');
        continue;
      }
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (!hit || (hit !== item && !item.contains(hit))) {
        unreachable.push(squash(item.textContent) + ' (covered by ' + (hit ? hit.className || hit.tagName : 'nothing') + ')');
      }
      item.focus();
      if (document.activeElement !== item) unfocusable.push(squash(item.textContent));
      item.blur();
    }
    blocking('every drawer link is hit-testable', unreachable.length === 0, unreachable.join(' | '));
    blocking('every drawer link is keyboard focusable', unfocusable.length === 0, unfocusable.join(' | '));

    const smallItems = navItems.filter(isRendered).filter((item) => {
      const box = item.getBoundingClientRect();
      return box.width < 43.5 || box.height < 43.5;
    });
    blocking('drawer links meet the 44px tap target floor', smallItems.length === 0,
      smallItems.map((item) => {
        const box = item.getBoundingClientRect();
        return squash(item.textContent) + ' ' + round(box.width) + 'x' + round(box.height);
      }).join(' | '));

    // Close via link selection where the destination keeps us on this page,
    // otherwise via the toggle (test-lab nav links navigate to index.html).
    if (OPT.followNavLink) {
      const localLink = navItems.find((item) => (item.getAttribute('href') || '').startsWith('#'));
      localLink.click();
      await sleep(700);
      blocking('drawer closes after selecting a link',
        !drawer.classList.contains('active'), drawer.className);
      blocking('toggle resets after selecting a link',
        !toggle.classList.contains('active'), toggle.className);
      const afterBox = drawer.getBoundingClientRect();
      blocking('drawer returns off-canvas after selection',
        afterBox.left >= layoutWidth - 1,
        'left=' + round(afterBox.left) + ' layoutWidth=' + layoutWidth);
      blocking('selected destination exists',
        !!document.querySelector(localLink.getAttribute('href')),
        localLink.getAttribute('href'));
    } else {
      toggle.click();
      await sleep(600);
      blocking('drawer closes on toggle', !drawer.classList.contains('active'), drawer.className);
      const afterBox = drawer.getBoundingClientRect();
      blocking('drawer returns off-canvas after close',
        afterBox.left >= layoutWidth - 1,
        'left=' + round(afterBox.left) + ' layoutWidth=' + layoutWidth);
    }

    blocking('no horizontal overflow after nav interaction',
      document.documentElement.scrollWidth <= layoutWidth + 1,
      'scrollWidth=' + document.documentElement.scrollWidth);
  }

  return { results };
})()`;
}

module.exports = {
  MOBILE_NAV_BREAKPOINT,
  WIDE_BREAKPOINT,
  GRID_EXPECTATIONS,
  gridPlan,
  buildNavProbe
};
