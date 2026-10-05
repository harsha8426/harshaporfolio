'use strict';

/**
 * Negative control for the aggregate static inspection.
 *
 * Copies the real sources into a temp directory, injects one forbidden mutation
 * at a time, and requires the inspection to report the expected violation code.
 * This proves a clean run is meaningful rather than vacuous.
 *
 * Usage: node tests/portfolio-resume-details-update/release-static-negative-control.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECKER = path.join(__dirname, 'release-static-check.js');

const MUTATIONS = [
  {
    name: 'stale email action',
    file: 'index.html',
    apply: (text) => text.replace('mailto:niddanaharshavardhan@gmail.com', 'mailto:harsha@example.com'),
    expect: 'CONTACT_URI_MISMATCH'
  },
  {
    name: 'stale phone action',
    file: 'index.html',
    apply: (text) => text.replace('tel:+919490312456', 'tel:+910000000000'),
    expect: 'CONTACT_URI_MISMATCH'
  },
  {
    name: 'unsupported 6+ years claim',
    file: 'index.html',
    apply: (text) => text.replace('5+ years of total IT experience', '6+ years of total IT experience'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'unsupported 50+ projects claim',
    file: 'index.html',
    apply: (text) => text.replace('<h3>About Me</h3>', '<h3>About Me</h3>')
      .replace('About Me</h2>', 'About Me</h2><p>50+ projects delivered</p>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'unsupported AI claim',
    file: 'index.html',
    apply: (text) => text.replace('<h3>Automation</h3>', '<h3>AI-Powered Testing</h3>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'unsupported MCP claim',
    file: 'index.html',
    apply: (text) => text.replace('<span class="skill-tag">npm</span>', '<span class="skill-tag">MCP</span>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'stale SCCM Administrator title',
    file: 'index.html',
    apply: (text) => text.replace('<h3>Associate—SCM Administration</h3>', '<h3>SCCM Administrator</h3>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'proficiency percentage',
    file: 'index.html',
    apply: (text) => text.replace('<h3>Automation</h3>', '<h3>Automation</h3><span>95%</span>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'availability status',
    file: 'index.html',
    apply: (text) => text.replace('<h3>Get in touch</h3>', '<h3>Get in touch</h3><p>Currently available for work</p>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'contact placeholder token',
    file: 'index.html',
    apply: (text) => text.replace('niddanaharshavardhan@gmail.com</span>', '[email]</span>'),
    expect: 'CONTACT_PLACEHOLDER'
  },
  {
    name: 'missing required skill (IEG)',
    file: 'index.html',
    apply: (text) => text.replace('<span class="skill-tag">IEG</span>', ''),
    expect: 'MISSING_SKILL'
  },
  {
    name: 'unsupported skill tag',
    file: 'index.html',
    apply: (text) => text.replace('<span class="skill-tag">Oracle</span>', '<span class="skill-tag">Selenium</span>'),
    expect: 'UNBACKED_CONTENT'
  },
  {
    name: 'duplicate current Infor card',
    file: 'index.html',
    apply: (text) => {
      const start = text.indexOf('<div class="timeline-item animate-on-scroll" data-employment-id="infor-current"');
      const end = text.indexOf('<div class="timeline-item animate-on-scroll" data-employment-id="hcl-prior"');
      const card = text.slice(start, end);
      return text.slice(0, end) + card + text.slice(end);
    },
    expect: 'DUPLICATE_RESUME_DETAIL'
  },
  {
    name: 'duplicate education card',
    file: 'index.html',
    apply: (text) => {
      const start = text.indexOf('<div class="edu-card animate-on-scroll">');
      const end = text.indexOf('</div>\n            </div>\n        </div>\n    </section>\n\n    <!-- Contact -->');
      const card = text.slice(start, end);
      return text.slice(0, end) + card + text.slice(end);
    },
    expect: 'EDUCATION_CARD_COUNT'
  },
  {
    name: 'unsupported S.S.C education entry',
    file: 'index.html',
    apply: (text) => text.replace('<h3>B.Tech EEE</h3>', '<h3>B.Tech EEE</h3><h3>S.S.C</h3>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'clickable LinkedIn handle',
    file: 'index.html',
    apply: (text) => text.replace(
      '<div class="contact-link-item"><div class="contact-icon" aria-hidden="true"><i class="fab fa-linkedin"></i></div><div><span class="contact-label">LinkedIn</span><span class="contact-value">@harsha1919</span></div></div>',
      '<a href="https://linkedin.com/in/harsha1919" class="contact-link-item"><div class="contact-icon" aria-hidden="true"><i class="fab fa-linkedin"></i></div><div><span class="contact-label">LinkedIn</span><span class="contact-value">@harsha1919</span></div></a>'
    ),
    expect: 'UNSUPPORTED_PROFILE_ACTION'
  },
  {
    name: 'cross-employer attribution',
    file: 'index.html',
    apply: (text) => text.replace(
      '<li data-responsibility-id="application-package-deployment">Created and deployed application packages.</li>',
      '<li data-responsibility-id="application-package-deployment">Created and deployed application packages.</li><li>Built Playwright automation with Zephyr Scale and GitLab CI/CD.</li>'
    ),
    expect: 'EMPLOYER_ATTRIBUTION_MISMATCH'
  },
  {
    name: 'duplicate element id',
    file: 'index.html',
    apply: (text) => text.replace('<section class="section about" id="about">', '<section class="section about" id="contact">'),
    expect: 'MARKUP_DUPLICATE_ID'
  },
  {
    name: 'nested hyperlink',
    file: 'index.html',
    apply: (text) => text.replace(
      '<a href="#contact" class="btn btn-primary"><span>Get In Touch</span>',
      '<a href="#contact" class="btn btn-primary"><a href="#about">nested</a><span>Get In Touch</span>'
    ),
    expect: 'MARKUP_NESTED_LINK'
  },
  {
    name: 'unresolved local fragment',
    file: 'index.html',
    apply: (text) => text.replace('<li><a href="#skills" class="nav-link">Skills</a></li>', '<li><a href="#stack" class="nav-link">Skills</a></li>'),
    expect: 'MARKUP_UNRESOLVED_LINK'
  },
  {
    name: 'unsupported project URL in employment card',
    file: 'index.html',
    apply: (text) => text.replace(
      '<h5 class="timeline-responsibility-heading">Automation</h5>',
      '<h5 class="timeline-responsibility-heading">Automation</h5><a href="https://example.com/project">View project</a>'
    ),
    expect: 'UNSUPPORTED_PROFILE_ACTION'
  },
  {
    name: 'QA Lead fixture regression',
    file: 'test-lab.html',
    apply: (text) => text.replace('<td data-testid="cell-role-1">QA Automation Engineer/SDET</td>', '<td data-testid="cell-role-1">QA Lead</td>'),
    expect: 'UNSUPPORTED_CLAIM'
  },
  {
    name: 'test-lab GitHub profile action',
    file: 'test-lab.html',
    apply: (text) => text.replace(
      '<a href="mailto:niddanaharshavardhan@gmail.com" aria-label="Email"><i class="fas fa-envelope"></i></a>',
      '<a href="mailto:niddanaharshavardhan@gmail.com" aria-label="Email"><i class="fas fa-envelope"></i></a><a href="https://github.com/harsha" aria-label="GitHub"><i class="fab fa-github"></i></a>'
    ),
    expect: 'UNSUPPORTED_PROFILE_ACTION'
  },
  {
    name: 'unsupported typewriter role',
    file: 'script.js',
    apply: (text) => text.replace("'Senior Quality Assurance Analyst'", "'AI-Powered Testing Expert'"),
    expect: 'UNBACKED_CONTENT'
  },
  {
    name: 'removed typewriter guard',
    file: 'script.js',
    apply: (text) => text.replace(/\r?\n\s*if \(!typewriterEl\) return;/, ''),
    expect: 'RUNTIME_GUARD_MISSING'
  },
  {
    name: 'resurrected hero metric counter',
    file: 'script.js',
    apply: (text) => text.replace('// ===== Typewriter =====', 'const stats = document.querySelectorAll(".hero-stats .stat-number");\n// ===== Typewriter ====='),
    expect: 'UNSUPPORTED_CLAIM'
  }
];

const SOURCE_FILES = ['index.html', 'test-lab.html', 'script.js', 'styles.css'];

function runChecker(root) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' });
    return { exitCode: 0, stdout };
  } catch (error) {
    return { exitCode: error.status ?? 1, stdout: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

const results = [];
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'prdu-negctl-'));

for (const mutation of MUTATIONS) {
  const caseDir = fs.mkdtempSync(path.join(workspace, 'case-'));
  for (const file of SOURCE_FILES) {
    fs.copyFileSync(path.join(ROOT, file), path.join(caseDir, file));
  }

  const target = path.join(caseDir, mutation.file);
  const original = fs.readFileSync(target, 'utf8');
  const mutated = mutation.apply(original);

  if (mutated === original) {
    results.push({ ...mutation, status: 'MUTATION_NOT_APPLIED', detail: 'source text did not change' });
    continue;
  }
  fs.writeFileSync(target, mutated, 'utf8');

  const { exitCode, stdout } = runChecker(caseDir);
  const detected = stdout.includes(`[${mutation.expect}]`);
  results.push({
    ...mutation,
    status: detected && exitCode !== 0 ? 'DETECTED' : 'MISSED',
    detail: detected ? '' : stdout.split('\n').filter((line) => line.includes('[')).slice(0, 4).join(' | ') || 'no violations reported'
  });
}

fs.rmSync(workspace, { recursive: true, force: true });

console.log('=== negative control :: aggregate static inspection sensitivity ===\n');
let failed = 0;
for (const result of results) {
  const mark = result.status === 'DETECTED' ? 'ok  ' : 'FAIL';
  if (result.status !== 'DETECTED') failed += 1;
  console.log(`${mark} ${result.expect.padEnd(32)} ${result.name}${result.detail ? `\n       ${result.detail}` : ''}`);
}
console.log('');
if (failed === 0) {
  console.log(`RESULT: PASS - all ${results.length} injected mutations were reported.`);
  process.exitCode = 0;
} else {
  console.log(`RESULT: FAIL - ${failed} of ${results.length} injected mutations were not reported.`);
  process.exitCode = 1;
}
