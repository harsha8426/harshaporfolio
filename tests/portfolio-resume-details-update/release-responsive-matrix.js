'use strict';

/**
 * Responsive device-matrix browser check for portfolio-resume-details-update
 * (Task 7.1).
 *
 * Complements release-browser-smoke.js: that script proves the résumé content
 * and interaction contracts at the two spec-required viewports, this one proves
 * the layout itself holds across the realistic device range. Both drive the
 * same shared CDP harness (helpers/cdp-browser.js), so no project dependency is
 * added and production behavior is untouched.
 *
 * Per page per viewport it asserts:
 *   1. no horizontal overflow, re-measured with body overflow-x forced visible
 *   2. no text clipped or escaping its container content box
 *   3. tap targets at or above 44x44 CSS px for primary controls
 *   4. rendered font size at or above 12px for résumé content
 *   5. mobile drawer opens fully on-screen, is reachable, and closes on select
 *   6. documented grid breakpoints (single column at and below 768px)
 *   7. no element collisions in hero/timeline/skills/education/contact
 *   8. zero new console or page errors (known placeholder assets excluded)
 *
 * Usage: node tests/portfolio-resume-details-update/release-responsive-matrix.js
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { launchBrowser } = require('./helpers/cdp-browser');
const { buildProbe } = require('./helpers/responsive-probe');
const { buildNavProbe } = require('./helpers/responsive-nav-probe');

const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Realistic device range. The two `required: true` entries are the viewports
 * the spec mandates (Requirements 9.8); the rest bracket the real breakpoints
 * at 480px, 768px, and 1024px from both sides.
 */
const VIEWPORTS = [
  { name: '320x568  narrow phone', width: 320, height: 568, mobile: true },
  { name: '360x640  common Android', width: 360, height: 640, mobile: true },
  { name: '375x667  iPhone SE 2/3', width: 375, height: 667, mobile: true },
  { name: '390x844  spec mobile', width: 390, height: 844, mobile: true, required: true },
  { name: '414x896  large phone', width: 414, height: 896, mobile: true },
  { name: '430x932  iPhone 15 Pro Max', width: 430, height: 932, mobile: true },
  { name: '768x1024 iPad portrait (breakpoint)', width: 768, height: 1024, mobile: true },
  { name: '820x1180 just above 768', width: 820, height: 1180, mobile: true },
  { name: '1024x768 breakpoint boundary', width: 1024, height: 768, mobile: false },
  { name: '1280x720 spec desktop', width: 1280, height: 720, mobile: false, required: true }
];

/** Short landscape phone: a real risk for the hero's `min-height: 100vh`. */
const LANDSCAPE = { name: '844x390  landscape phone', width: 844, height: 390, mobile: true };

const PAGES = ['index.html', 'test-lab.html'];

function combinations() {
  const combos = [];
  for (const page of PAGES) {
    for (const viewport of VIEWPORTS) {
      combos.push({ page, viewport });
    }
  }
  combos.push({ page: 'index.html', viewport: LANDSCAPE });
  return combos;
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

async function run() {
  const runner = await launchBrowser();
  if (!runner) {
    console.error('FAIL: no browser runner is available in this validation environment.');
    process.exitCode = 1;
    return;
  }

  console.log('=== portfolio-resume-details-update :: responsive device matrix ===\n');
  console.log(`Runner  : ${runner.browserPath}`);
  console.log(`Browser : ${runner.version.Browser}`);
  console.log(`Matrix  : ${PAGES.length} pages x ${VIEWPORTS.length} viewports + 1 landscape = ${combinations().length} combinations\n`);

  const report = [];

  for (const { page, viewport } of combinations()) {
    const url = pathToFileURL(path.join(ROOT, page)).href;
    const tab = await runner.openPage({
      url,
      width: viewport.width,
      height: viewport.height,
      mobile: viewport.mobile,
      settleMs: 1200
    });

    let results = [];
    let metrics = {};
    let harnessError = null;

    try {
      const geometry = await tab.evaluate(buildProbe({
        page,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        expectLongLabels: page === 'index.html'
      }));
      results = results.concat(geometry.results);
      metrics = geometry.metrics;

      const nav = await tab.evaluate(buildNavProbe({
        page,
        width: viewport.width,
        height: viewport.height,
        followNavLink: page === 'index.html'
      }));
      results = results.concat(nav.results);
    } catch (error) {
      harnessError = error.message;
    }

    report.push({
      page,
      viewport,
      results,
      metrics,
      harnessError,
      consoleErrors: [...tab.consoleErrors],
      pageExceptions: [...tab.pageExceptions],
      blockingLogs: [...tab.blockingLogs],
      environmentalLogs: [...tab.environmentalLogs]
    });

    await tab.close();
  }

  await runner.dispose();

  /* ---------------------------------------------------------------- *
   * Report
   * ---------------------------------------------------------------- */
  let blockingFailures = 0;
  let advisoryFailures = 0;
  let totalChecks = 0;

  console.log('--- PASS/FAIL matrix ------------------------------------------------------\n');
  console.log(`${pad('page', 15)}${pad('viewport', 34)}${pad('checks', 9)}${pad('overflow', 12)}result`);
  console.log('-'.repeat(84));

  for (const entry of report) {
    const blocking = entry.results.filter((check) => check.severity === 'blocking');
    const advisory = entry.results.filter((check) => check.severity === 'advisory');
    const blockingFailed = blocking.filter((check) => !check.pass);
    const advisoryFailed = advisory.filter((check) => !check.pass);

    const errorCount = entry.pageExceptions.length + entry.consoleErrors.length + entry.blockingLogs.length;
    const failed = blockingFailed.length + errorCount + (entry.harnessError ? 1 : 0);

    blockingFailures += failed;
    advisoryFailures += advisoryFailed.length;
    totalChecks += entry.results.length;

    const overflow = entry.metrics.unclampedScrollWidth != null
      ? `${entry.metrics.unclampedScrollWidth}/${entry.metrics.layoutWidth}`
      : 'n/a';

    console.log(
      pad(entry.page, 15)
      + pad(entry.viewport.name, 34)
      + pad(`${blocking.length - blockingFailed.length}/${blocking.length}`, 9)
      + pad(overflow, 12)
      + (failed === 0 ? 'PASS' : `FAIL (${failed})`)
    );

    entry.summary = { blockingFailed, advisoryFailed, errorCount, failed };
  }

  console.log('');

  const withFailures = report.filter((entry) => entry.summary.failed > 0);
  if (withFailures.length > 0) {
    console.log('--- Blocking defects -----------------------------------------------------\n');
    for (const entry of withFailures) {
      console.log(`${entry.page} @ ${entry.viewport.name}`);
      if (entry.harnessError) console.log(`  HARNESS ERROR: ${entry.harnessError}`);
      for (const check of entry.summary.blockingFailed) {
        console.log(`  FAIL  ${check.name}${check.detail ? `\n          -> ${check.detail}` : ''}`);
      }
      for (const error of entry.pageExceptions) console.log(`  PAGE ERROR  ${error.split('\n')[0]}`);
      for (const error of entry.consoleErrors) console.log(`  CONSOLE ERROR  ${error}`);
      for (const log of entry.blockingLogs) console.log(`  LOG ERROR  [${log.source}] ${log.text} ${log.url || ''}`);
      console.log('');
    }
  }

  const advisoryLines = new Map();
  for (const entry of report) {
    for (const check of entry.summary.advisoryFailed) {
      const key = `${check.name} -> ${check.detail}`;
      if (!advisoryLines.has(key)) advisoryLines.set(key, []);
      advisoryLines.get(key).push(`${entry.page} @ ${entry.viewport.width}px`);
    }
  }
  if (advisoryLines.size > 0) {
    console.log('--- Advisory (reported, non-blocking) ------------------------------------\n');
    for (const [line, where] of advisoryLines) {
      console.log(`  ${line}`);
      console.log(`    seen at: ${where.slice(0, 6).join(', ')}${where.length > 6 ? ` (+${where.length - 6} more)` : ''}`);
    }
    console.log('');
  }

  const environmental = new Set();
  for (const entry of report) {
    for (const log of entry.environmentalLogs) environmental.add(`[${log.source}] ${log.text} ${log.url || ''}`);
  }
  if (environmental.size > 0) {
    console.log('--- Known pre-existing asset errors (excluded by design) -----------------\n');
    for (const line of environmental) console.log(`  ${line}`);
    console.log('');
  }

  console.log('--- Verdict ---------------------------------------------------------------\n');
  if (blockingFailures === 0) {
    console.log(`RESULT: PASS - ${totalChecks} responsive assertions across ${report.length} page/viewport combinations.`);
    console.log(`         0 blocking defects, ${advisoryFailures} advisory note(s), 0 new console or page errors.`);
    process.exitCode = 0;
  } else {
    console.log(`RESULT: FAIL - ${blockingFailures} blocking responsive defect(s) across ${withFailures.length} combination(s), ${totalChecks} assertions run.`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`FAIL: responsive matrix harness error: ${error.stack || error.message}`);
  process.exitCode = 1;
});
