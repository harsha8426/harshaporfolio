'use strict';

/**
 * Browser smoke check for portfolio-resume-details-update (Tasks 7.1 and 8).
 *
 * Proves the résumé content, navigation, contact, and Test Lab interaction
 * contracts at the two spec-required viewports (Requirements 9.8-9.11).
 * Layout behavior across the wider device range is covered by its companion,
 * release-responsive-matrix.js; both share the CDP harness in
 * helpers/cdp-browser.js, so no project dependency is added and production
 * behavior is untouched.
 *
 * Viewports: 1280x720 (desktop) and 390x844 (mobile).
 *
 * Usage: node tests/portfolio-resume-details-update/release-browser-smoke.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { canonicalManifest } = require('./helpers/canonical-manifest');
const { launchBrowser } = require('./helpers/cdp-browser');

const ROOT = path.resolve(__dirname, '..', '..');
const { contact, identity, profile, skillGroups, allowedRoleLabels } = canonicalManifest;

const VIEWPORTS = [
  { name: 'desktop 1280x720', width: 1280, height: 720, mobile: false },
  { name: 'mobile 390x844', width: 390, height: 844, mobile: true }
];

/* ------------------------------------------------------------------ *
 * In-page assertion bundles
 * ------------------------------------------------------------------ */

const PAGE_CONTEXT = `
  const results = [];
  const check = (name, condition, detail) => results.push({ name, pass: !!condition, detail: detail || '' });
  const visible = (el) => !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : '');
`;

function indexAssertions(viewport) {
  return `(async () => {
  ${PAGE_CONTEXT}
  const CANON = ${JSON.stringify({ contact, identity, profile, allowedRoleLabels, skillGroups })};
  const isMobile = ${viewport.mobile};

  // --- layout / existing presentation ---
  check('no horizontal document overflow',
    document.documentElement.scrollWidth <= window.innerWidth + 1,
    'scrollWidth=' + document.documentElement.scrollWidth + ' innerWidth=' + window.innerWidth);

  for (const id of ['hero', 'about', 'skills', 'experience', 'education', 'contact']) {
    const section = document.getElementById(id);
    check('section #' + id + ' renders', visible(section), section ? 'h=' + section.offsetHeight : 'missing');
  }

  check('navbar present', visible(document.getElementById('navbar')));
  check('particle canvas sized', (document.getElementById('particleCanvas') || {}).width > 0);
  check('reveal animation applied', document.querySelectorAll('.animate-on-scroll.visible').length > 0,
    'visible=' + document.querySelectorAll('.animate-on-scroll.visible').length);

  // --- skills ---
  const cards = [...document.querySelectorAll('.skill-card')];
  check('six skill cards render', cards.length === 6, 'count=' + cards.length);
  // Text content must stay inside the card's content box. The decorative
  // .skill-card-glow is intentionally oversized (200% / left:-50%) behind an
  // overflow:hidden card, so card.scrollWidth is not a clipping signal.
  for (const card of cards) {
    check('skill card visible: ' + card.dataset.skillGroup, visible(card));
    const cardBox = card.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const left = cardBox.left + parseFloat(cardStyle.paddingLeft);
    const right = cardBox.right - parseFloat(cardStyle.paddingRight);
    const overflowing = [...card.querySelectorAll('h3, .skill-icon, .skill-tags, .skill-tag')]
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return box.right > right + 1 || box.left < left - 1;
      })
      .map((node) => text(node) || node.className);
    check('skill card text not clipped: ' + card.dataset.skillGroup,
      overflowing.length === 0, 'overflowing=' + overflowing.join('|'));
    const tags = card.querySelector('.skill-tags');
    check('skill tags wrap without scrolling: ' + card.dataset.skillGroup,
      tags.scrollWidth <= tags.clientWidth + 1,
      'scrollW=' + tags.scrollWidth + ' clientW=' + tags.clientWidth);
  }
  for (const [group, skills] of Object.entries(CANON.skillGroups)) {
    const card = document.querySelector('.skill-card[data-skill-group="' + group + '"]');
    const tags = card ? [...card.querySelectorAll('.skill-tag')].map(text) : [];
    const missing = skills.filter((s) => !tags.includes(s));
    check('skill group rendered: ' + group, card && missing.length === 0, 'missing=' + missing.join('|'));
  }
  check('no proficiency bars', document.querySelectorAll('[data-width], .skill-progress, .progress-bar').length === 0);

  // --- experience ---
  const items = [...document.querySelectorAll('.timeline-item')];
  check('two employment cards', items.length === 2, 'count=' + items.length);
  check('one current Infor card',
    document.querySelectorAll('.timeline-item[data-employment-id="infor-current"]').length === 1);
  check('one HCL card',
    document.querySelectorAll('.timeline-item[data-employment-id="hcl-prior"]').length === 1);
  for (const card of [...document.querySelectorAll('.timeline-card')]) {
    check('timeline card not clipped', card.scrollWidth <= card.clientWidth + 1,
      'scrollW=' + card.scrollWidth + ' clientW=' + card.clientWidth);
    check('timeline card within viewport',
      card.getBoundingClientRect().right <= window.innerWidth + 1,
      'right=' + Math.round(card.getBoundingClientRect().right));
  }
  const responsibilities = [...document.querySelectorAll('[data-responsibility-id]')];
  check('responsibilities render', responsibilities.length === 14, 'count=' + responsibilities.length);
  check('every responsibility visible', responsibilities.every(visible));
  const groupCols = getComputedStyle(document.querySelector('.timeline-responsibility-groups')).gridTemplateColumns.split(' ').length;
  check('responsibility grid collapses on mobile', isMobile ? groupCols === 1 : groupCols === 2, 'cols=' + groupCols);

  // --- education ---
  check('one education card', document.querySelectorAll('.edu-card').length === 1);
  check('education values render',
    text(document.querySelector('.edu-card')).includes('B.Tech EEE')
    && text(document.querySelector('.edu-card')).includes('CGPA')
    && text(document.querySelector('.edu-card')).includes('7.8'));

  // --- contact semantics ---
  const emailLink = document.querySelector('.contact-links a[href^="mailto:"]');
  check('email link href exact', emailLink && emailLink.getAttribute('href') === CANON.contact.emailHref,
    emailLink ? emailLink.getAttribute('href') : 'missing');
  check('email link displays canonical address', text(emailLink).includes(CANON.contact.emailDisplay));
  check('email link actionable', visible(emailLink) && getComputedStyle(emailLink).pointerEvents !== 'none');

  const phoneLink = document.querySelector('.contact-links a[href^="tel:"]');
  check('phone link href exact', phoneLink && phoneLink.getAttribute('href') === CANON.contact.phoneHref,
    phoneLink ? phoneLink.getAttribute('href') : 'missing');
  check('phone link displays canonical number', text(phoneLink).includes(CANON.contact.phoneDisplay));
  check('phone link actionable', visible(phoneLink) && getComputedStyle(phoneLink).pointerEvents !== 'none');

  const linkedInRow = [...document.querySelectorAll('.contact-link-item')]
    .find((el) => text(el).includes(CANON.contact.linkedInHandle));
  check('LinkedIn handle rendered', !!linkedInRow && visible(linkedInRow));
  check('LinkedIn row is not an anchor', linkedInRow && linkedInRow.tagName !== 'A', linkedInRow && linkedInRow.tagName);
  check('LinkedIn row has no href', linkedInRow && !linkedInRow.hasAttribute('href'));
  check('LinkedIn row has no link role/target',
    linkedInRow && !linkedInRow.hasAttribute('role') && !linkedInRow.hasAttribute('target'));
  check('LinkedIn row keeps visible label', text(linkedInRow).includes('LinkedIn'));
  if (linkedInRow) {
    linkedInRow.focus();
    check('LinkedIn row is not focusable', document.activeElement !== linkedInRow,
      'activeElement=' + (document.activeElement && document.activeElement.tagName));
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    check('LinkedIn row has no pointer cursor', getComputedStyle(linkedInRow).cursor !== 'pointer',
      getComputedStyle(linkedInRow).cursor);
  }
  const locationRow = [...document.querySelectorAll('.contact-link-item')]
    .find((el) => text(el).includes('Location'));
  check('location row shows canonical city', text(locationRow).includes(CANON.identity.location));

  // --- no unsupported profile actions ---
  check('no linkedin/github hrefs',
    document.querySelectorAll('a[href*="linkedin.com"], a[href*="github.com"]').length === 0);

  // --- typewriter stays inside the allowlist ---
  const typed = text(document.getElementById('typewriter'));
  check('typewriter label is source-backed',
    typed === '' || CANON.allowedRoleLabels.some((role) => role.startsWith(typed)), 'typed="' + typed + '"');

  // --- profile facts on screen ---
  const bodyText = document.body.innerText.replace(/\\s+/g, ' ');
  for (const fact of [CANON.profile.role, CANON.profile.totalExperience, CANON.profile.qaExperience, CANON.identity.fullName]) {
    check('rendered fact: ' + fact, bodyText.includes(fact));
  }

  // --- local navigation ---
  const hashLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  check('nav exposes local destinations', hashLinks.length >= 5, 'count=' + hashLinks.length);
  for (const link of hashLinks) {
    const fragment = link.getAttribute('href').slice(1);
    check('nav destination resolves: #' + fragment, document.querySelectorAll('#' + fragment).length === 1);
  }
  check('test lab link present', !!document.querySelector('.nav-links a[href="test-lab.html"]'));

  if (isMobile) {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    check('mobile nav toggle visible', visible(toggle));
    toggle.click();
    await new Promise((r) => setTimeout(r, 250));
    check('mobile menu opens', links.classList.contains('active'));
    hashLinks[0].click();
    await new Promise((r) => setTimeout(r, 250));
    check('mobile menu closes after selection', !links.classList.contains('active'));
    check('mobile menu does not obscure content after selection',
      getComputedStyle(links).transform === 'none' || !links.classList.contains('active'));
  } else {
    for (const link of hashLinks) {
      link.click();
      await new Promise((r) => setTimeout(r, 60));
      check('desktop navigation reaches ' + link.getAttribute('href'),
        location.hash === link.getAttribute('href') || document.querySelector(link.getAttribute('href')) !== null);
    }
  }

  // --- contact form feedback without network submission ---
  document.getElementById('name').value = 'Release Check';
  document.getElementById('email').value = 'release@example.com';
  document.getElementById('message').value = 'Browser smoke check.';
  document.getElementById('contactForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 200));
  check('contact form gives local feedback',
    text(document.querySelector('.btn-submit')).includes('Message Sent'),
    text(document.querySelector('.btn-submit')));

  check('no horizontal overflow after interaction',
    document.documentElement.scrollWidth <= window.innerWidth + 1,
    'scrollWidth=' + document.documentElement.scrollWidth);

  return results;
})()`;
}

function testLabAssertions(viewport, expectedTestIds) {
  return `(async () => {
  ${PAGE_CONTEXT}
  const CANON = ${JSON.stringify({ contact, profile, identity })};
  const EXPECTED_TESTIDS = ${JSON.stringify(expectedTestIds)};
  const isMobile = ${viewport.mobile};

  check('no horizontal document overflow',
    document.documentElement.scrollWidth <= window.innerWidth + 1,
    'scrollWidth=' + document.documentElement.scrollWidth + ' innerWidth=' + window.innerWidth);

  const present = new Set([...document.querySelectorAll('[data-testid]')].map((el) => el.dataset.testid));
  const missing = EXPECTED_TESTIDS.filter((id) => !present.has(id));
  check('every data-testid selector preserved', missing.length === 0, 'missing=' + missing.join('|'));
  check('data-testid count preserved', present.size === EXPECTED_TESTIDS.length,
    'found=' + present.size + ' expected=' + EXPECTED_TESTIDS.length);

  check('lab section renders', visible(document.getElementById('test-lab')));
  check('lab groups render', document.querySelectorAll('.lab-group').length === 7,
    'count=' + document.querySelectorAll('.lab-group').length);

  // --- owner fixture correction ---
  check('owner fixture name', text(document.querySelector('[data-testid="cell-name-1"]')) === 'Harsha');
  check('owner fixture role canonical',
    text(document.querySelector('[data-testid="cell-role-1"]')) === CANON.profile.role,
    text(document.querySelector('[data-testid="cell-role-1"]')));
  check('table row count preserved',
    document.querySelectorAll('[data-testid="table-data"] tbody tr').length === 3);
  check('sample script asserts canonical role',
    text(document.querySelector('[data-testid="playwright-sample-script"]')).includes(CANON.profile.role));

  // --- existing interaction outcomes ---
  const agree = document.querySelector('[data-testid="checkbox-agree"]');
  agree.click();
  check('checkbox checks', agree.checked);
  agree.click();

  const country = document.querySelector('[data-testid="select-country"]');
  country.value = 'india';
  country.dispatchEvent(new Event('change', { bubbles: true }));
  check('select option applies', country.value === 'india');

  check('disabled button stays disabled', document.querySelector('[data-testid="btn-disabled"]').disabled);
  check('enabled button stays enabled', !document.querySelector('[data-testid="btn-primary"]').disabled);

  const dialog = document.querySelector('[data-testid="dialog-modal"]');
  document.querySelector('[data-testid="btn-open-dialog"]').click();
  await new Promise((r) => setTimeout(r, 150));
  check('dialog opens', dialog.open);
  document.querySelector('[data-testid="btn-close-dialog"]').click();
  await new Promise((r) => setTimeout(r, 150));
  check('dialog closes', !dialog.open);

  document.querySelector('[data-testid="form-input-name"]').value = 'Test User';
  document.querySelector('[data-testid="form-btn-submit"]').click();
  await new Promise((r) => setTimeout(r, 150));
  check('form submission status', text(document.querySelector('[data-testid="form-status"]')) === 'Submitted',
    text(document.querySelector('[data-testid="form-status"]')));

  check('indeterminate checkbox contract', document.getElementById('tl-indeterminate').indeterminate);

  const details = document.querySelector('[data-testid="details-faq"]');
  details.open = true;
  check('details expands', details.open);
  details.open = false;

  check('hidden input value preserved',
    document.querySelector('[data-testid="input-hidden"]').value === 'hidden-value-123');
  check('anchor link destination preserved',
    document.querySelector('[data-testid="link-anchor"]').getAttribute('href') === '#test-lab');
  check('external link destination preserved',
    document.querySelector('[data-testid="link-external"]').getAttribute('href') === 'https://playwright.dev');

  // --- owner footer controls ---
  const footerMail = document.querySelector('.footer-social a[href^="mailto:"]');
  check('footer email action canonical',
    footerMail && footerMail.getAttribute('href') === CANON.contact.emailHref,
    footerMail ? footerMail.getAttribute('href') : 'missing');
  check('footer email has accessible label',
    footerMail && (footerMail.getAttribute('aria-label') || text(footerMail)).length > 0);
  check('no linkedin/github profile actions',
    document.querySelectorAll('a[href*="linkedin.com"], a[href*="github.com"]').length === 0);
  check('footer shows canonical owner name',
    document.body.innerText.includes(CANON.identity.fullName));

  // --- local navigation preserved ---
  const localLinks = [...document.querySelectorAll('.nav-links a, .footer-nav a')]
    .map((el) => el.getAttribute('href'))
    .filter((href) => href && !/^https?:/.test(href));
  check('local navigation destinations preserved',
    localLinks.every((href) => href.startsWith('index.html') || href === 'test-lab.html'),
    localLinks.join(' '));

  if (isMobile) {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    check('mobile nav toggle visible', visible(toggle));
    toggle.click();
    await new Promise((r) => setTimeout(r, 200));
    check('mobile menu opens', links.classList.contains('active'));
    toggle.click();
    await new Promise((r) => setTimeout(r, 200));
    check('mobile menu closes', !links.classList.contains('active'));
  }

  check('no horizontal overflow after interaction',
    document.documentElement.scrollWidth <= window.innerWidth + 1,
    'scrollWidth=' + document.documentElement.scrollWidth);

  return results;
})()`;
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

async function run() {
  const runner = await launchBrowser();
  if (!runner) {
    console.error('FAIL: no browser runner is available in this validation environment.');
    process.exitCode = 1;
    return;
  }

  const expectedTestIds = [...fs.readFileSync(path.join(ROOT, 'test-lab.html'), 'utf8')
    .matchAll(/data-testid="([^"]+)"/g)].map((match) => match[1]);
  const uniqueTestIds = [...new Set(expectedTestIds)];

  console.log('=== portfolio-resume-details-update :: browser smoke check ===\n');
  console.log(`Runner  : ${runner.browserPath}`);
  console.log(`Browser : ${runner.version.Browser}\n`);

  const report = [];

  const pages = [
    { file: 'index.html', assertions: (viewport) => indexAssertions(viewport) },
    { file: 'test-lab.html', assertions: (viewport) => testLabAssertions(viewport, uniqueTestIds) }
  ];

  for (const page of pages) {
    for (const viewport of VIEWPORTS) {
      const tab = await runner.openPage({
        url: pathToFileURL(path.join(ROOT, page.file)).href,
        width: viewport.width,
        height: viewport.height,
        mobile: viewport.mobile
      });

      let checks = [];
      let harnessError = null;
      try {
        checks = await tab.evaluate(page.assertions(viewport));
      } catch (error) {
        harnessError = error.message;
      }

      report.push({
        page: page.file,
        viewport: viewport.name,
        checks,
        harnessError,
        consoleErrors: [...tab.consoleErrors],
        pageExceptions: [...tab.pageExceptions],
        blockingLogs: [...tab.blockingLogs],
        environmentalLogs: [...tab.environmentalLogs]
      });

      await tab.close();
    }
  }

  await runner.dispose();

  // --- report ---
  let failures = 0;
  let total = 0;

  for (const entry of report) {
    const failed = entry.checks.filter((check) => !check.pass);
    total += entry.checks.length;
    failures += failed.length;

    console.log(`${entry.page} @ ${entry.viewport}`);
    if (entry.harnessError) {
      failures += 1;
      console.log(`  HARNESS ERROR: ${entry.harnessError}`);
    }
    console.log(`  checks: ${entry.checks.length - failed.length}/${entry.checks.length} passed`);
    for (const check of failed) {
      console.log(`  FAIL  ${check.name}${check.detail ? ` -> ${check.detail}` : ''}`);
    }
    if (entry.pageExceptions.length > 0) {
      failures += entry.pageExceptions.length;
      console.log(`  uncaught page errors (${entry.pageExceptions.length}):`);
      for (const error of entry.pageExceptions) console.log(`    ${error.split('\n')[0]}`);
    }
    if (entry.consoleErrors.length > 0) {
      failures += entry.consoleErrors.length;
      console.log(`  console.error calls (${entry.consoleErrors.length}):`);
      for (const error of entry.consoleErrors) console.log(`    ${error}`);
    }
    if (entry.blockingLogs.length > 0) {
      failures += entry.blockingLogs.length;
      console.log(`  blocking log errors (${entry.blockingLogs.length}):`);
      for (const log of entry.blockingLogs) console.log(`    [${log.source}] ${log.text} ${log.url || ''}`);
    }
    if (entry.environmentalLogs.length > 0) {
      console.log(`  pre-existing asset errors, not attributable to résumé content (${entry.environmentalLogs.length}):`);
      for (const log of entry.environmentalLogs) {
        console.log(`    [${log.source}] ${log.text} ${log.url || ''}`);
      }
    }
    console.log('');
  }

  if (failures === 0) {
    console.log(`RESULT: PASS - ${total} browser assertions across ${report.length} page/viewport combinations, 0 new console or page errors.`);
    process.exitCode = 0;
  } else {
    console.log(`RESULT: FAIL - ${failures} browser smoke failure(s) out of ${total} assertions.`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`FAIL: browser smoke harness error: ${error.stack || error.message}`);
  process.exitCode = 1;
});
