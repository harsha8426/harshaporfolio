'use strict';

/**
 * Single-run release validation entry point for portfolio-resume-details-update.
 *
 * Runs, in order:
 *   1. aggregate static content + markup + provenance inspection
 *   2. negative control proving the inspection detects forbidden mutations
 *   3. browser smoke check at 1280x720 and 390x844 on both pages
 *   4. responsive device matrix across 10 viewports + landscape on both pages
 *
 * Dependency-free. Usage: node tests/portfolio-resume-details-update/run-release-validation.js
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const STEPS = [
  ['Static content, markup, and provenance', 'release-static-check.js'],
  ['Negative control (inspection sensitivity)', 'release-static-negative-control.js'],
  ['Browser smoke (1280x720 + 390x844)', 'release-browser-smoke.js'],
  ['Responsive device matrix (320px - 1280px + landscape)', 'release-responsive-matrix.js']
];

const results = [];

for (const [label, script] of STEPS) {
  console.log(`\n${'='.repeat(72)}\n>> ${label}\n${'='.repeat(72)}`);
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
  results.push({ label, code: result.status ?? 1 });
}

console.log(`\n${'='.repeat(72)}\n>> Release validation summary\n${'='.repeat(72)}`);
let failed = 0;
for (const result of results) {
  if (result.code !== 0) failed += 1;
  console.log(`  ${result.code === 0 ? 'PASS' : 'FAIL'}  ${result.label}`);
}

if (failed === 0) {
  console.log('\nRELEASE VALIDATION: PASS');
  process.exitCode = 0;
} else {
  console.log(`\nRELEASE VALIDATION: FAIL (${failed} of ${results.length} stages failed)`);
  process.exitCode = 1;
}
