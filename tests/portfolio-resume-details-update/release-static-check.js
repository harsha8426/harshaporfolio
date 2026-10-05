'use strict';

/**
 * Aggregate static-content, provenance, and markup inspection for
 * portfolio-resume-details-update (Task 8 release validation).
 *
 * Dependency-free, single-run, test-only. Aggregates every violation instead
 * of stopping at the first one.
 *
 * Usage: node tests/portfolio-resume-details-update/release-static-check.js
 */

const fs = require('node:fs');
const path = require('node:path');

const { canonicalManifest, provenanceFixtures } = require('./helpers/canonical-manifest');
const H = require('./helpers/html-inspect');

const rootFlagIndex = process.argv.indexOf('--root');
const ROOT = rootFlagIndex === -1
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(process.argv[rootFlagIndex + 1]);
const FILES = {
  indexHtml: 'index.html',
  testLabHtml: 'test-lab.html',
  scriptJs: 'script.js'
};

const violations = [];
const notes = [];

function violation(code, file, location, message) {
  violations.push({ code, file, location, message });
}

function note(message) {
  notes.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const sources = {
  indexHtml: read(FILES.indexHtml),
  testLabHtml: read(FILES.testLabHtml),
  scriptJs: read(FILES.scriptJs)
};

const indexDoc = H.parseHtml(sources.indexHtml, FILES.indexHtml);
const labDoc = H.parseHtml(sources.testLabHtml, FILES.testLabHtml);
const indexText = H.documentText(indexDoc);
const labText = H.documentText(labDoc);

const { canonicalValues, contact, identity, profile, skillGroups, allowedRoleLabels,
  forbiddenClaimPatterns, employment, employerResponsibilities, education,
  expectedCounts, sourceRefs } = canonicalManifest;

const infor = employment[0];
const hcl = employment[1];

/* ------------------------------------------------------------------ *
 * 1. Required canonical values
 * ------------------------------------------------------------------ */

const indexRequiredValues = [
  ['identity.fullName', identity.fullName],
  ['identity.location', identity.location],
  ['contact.emailDisplay', contact.emailDisplay],
  ['contact.phoneDisplay', contact.phoneDisplay],
  ['contact.linkedInHandle', contact.linkedInHandle],
  ['profile.role', profile.role],
  ['profile.totalExperience', profile.totalExperience],
  ['profile.qaExperience', profile.qaExperience],
  ['employment.infor-current.title', infor.title],
  ['employment.infor-current.employer', infor.employer],
  ['employment.infor-current.location', infor.location],
  ['employment.infor-current.period', infor.period],
  ['employment.hcl-prior.title', hcl.title],
  ['employment.hcl-prior.employer', hcl.employer],
  ['employment.hcl-prior.location', hcl.location],
  ['employment.hcl-prior.period', hcl.period],
  ['education.0.qualification', education[0].qualification],
  ['education.0.institution', education[0].institution],
  ['education.0.period', education[0].period],
  ['education.0.resultLabel', education[0].resultLabel],
  ['education.0.result', education[0].result]
];

for (const [key, value] of indexRequiredValues) {
  if (!indexText.includes(value)) {
    violation(
      'MISSING_REQUIRED_VALUE',
      FILES.indexHtml,
      key,
      `Canonical value "${value}" is absent (${sourceRefs.canonicalValues[key] || 'manifest'})`
    );
  }
}

for (const [key, value] of [
  ['contact.emailHref', contact.emailHref],
  ['contact.phoneHref', contact.phoneHref]
]) {
  if (!sources.indexHtml.includes(value)) {
    violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, key,
      `Contact URI "${value}" is absent (${sourceRefs.canonicalValues[key]})`);
  }
}

// test-lab.html carries owner identity and the owner role fixture as text. Its
// footer exposes the email as an icon-only action, so Requirement 2.3 (displayed
// email) does not apply there; Requirements 2.4/2.10 govern the action instead.
const labRequiredValues = [
  ['identity.fullName', identity.fullName],
  ['profile.role', profile.role]
];

for (const [key, value] of labRequiredValues) {
  if (!labText.includes(value)) {
    violation('MISSING_REQUIRED_VALUE', FILES.testLabHtml, key,
      `Owner-related canonical value "${value}" is absent (${sourceRefs.canonicalValues[key] || 'Requirements 8.5'})`);
  }
}

if (!sources.testLabHtml.includes(contact.emailHref)) {
  violation('MISSING_REQUIRED_VALUE', FILES.testLabHtml, 'contact.emailHref',
    `Contact URI "${contact.emailHref}" is absent (Requirements 2.4, 2.10)`);
}

// Owner fixture row: Harsha must carry the canonical role, and the row/selector
// contracts must be untouched.
const roleCell = H.findAll(labDoc, (element) => element.attributes['data-testid'] === 'cell-role-1');
if (roleCell.length !== 1 || H.normalizedTextOf(labDoc, roleCell[0]) !== profile.role) {
  violation('CANONICAL_MISMATCH', FILES.testLabHtml, '[data-testid="cell-role-1"]',
    `Owner fixture role must be exactly "${profile.role}" (Requirements 8.5)`);
}
const nameCell = H.findAll(labDoc, (element) => element.attributes['data-testid'] === 'cell-name-1');
if (nameCell.length !== 1 || H.normalizedTextOf(labDoc, nameCell[0]) !== 'Harsha') {
  violation('CANONICAL_MISMATCH', FILES.testLabHtml, '[data-testid="cell-name-1"]',
    'Owner fixture name cell must remain "Harsha" (Requirements 8.10)');
}

// Icon-only contact actions must keep an accessible label (Requirements 8.8).
for (const [fileKey, doc] of [[FILES.indexHtml, indexDoc], [FILES.testLabHtml, labDoc]]) {
  for (const anchor of H.byTag(doc, 'a')) {
    const href = (anchor.attributes.href || '').trim();
    if (!/^(?:mailto:|tel:)/i.test(href)) continue;
    const label = H.normalizedTextOf(doc, anchor);
    if (label === '' && !anchor.attributes['aria-label'] && !anchor.attributes.title) {
      violation('MISSING_REQUIRED_VALUE', fileKey, H.describe(doc, anchor),
        'Icon-only contact action has no accessible label (Requirements 8.8)');
    }
  }
}

/* ------------------------------------------------------------------ *
 * 2. Placeholder tokens in personal contact areas
 * ------------------------------------------------------------------ */

const PLACEHOLDER_PATTERN = /\[(?:[a-z]+[_-])*(?:email|phone|phone_number|number|linkedin|linkedin_url|github|github_url|url|handle|name|location)\]/gi;

for (const [key, source] of [[FILES.indexHtml, sources.indexHtml], [FILES.testLabHtml, sources.testLabHtml], [FILES.scriptJs, sources.scriptJs]]) {
  for (const match of source.matchAll(PLACEHOLDER_PATTERN)) {
    violation('CONTACT_PLACEHOLDER', key, `line ${source.slice(0, match.index).split('\n').length}`,
      `Unresolved placeholder token "${match[0]}" (Requirements 8.3, 9.3)`);
  }
}

for (const [key, source] of Object.entries(FILES)) {
  const text = sources[key];
  for (const match of text.matchAll(/(?:mailto:|tel:)\s*(?:\[|%5B|$|["'])/gi)) {
    const token = match[0];
    if (/\[|%5B/i.test(token)) {
      violation('CONTACT_PLACEHOLDER', source, `line ${text.slice(0, match.index).split('\n').length}`,
        `Contact URI placeholder "${token}" (Requirements 8.3)`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 3. Forbidden / unsupported claims
 * ------------------------------------------------------------------ */

const claimScanTargets = [
  { file: FILES.indexHtml, raw: sources.indexHtml, text: indexText },
  { file: FILES.testLabHtml, raw: sources.testLabHtml, text: labText },
  { file: FILES.scriptJs, raw: sources.scriptJs, text: sources.scriptJs }
];

for (const target of claimScanTargets) {
  for (const claim of forbiddenClaimPatterns) {
    const rawPattern = new RegExp(claim.pattern.source, claim.pattern.flags.includes('g')
      ? claim.pattern.flags
      : `${claim.pattern.flags}g`);
    const rawHit = rawPattern.exec(target.raw);
    const textHit = new RegExp(claim.pattern.source, claim.pattern.flags).exec(target.text);
    if (rawHit || textHit) {
      const where = rawHit
        ? `line ${target.raw.slice(0, rawHit.index).split('\n').length}`
        : 'rendered text';
      violation('UNSUPPORTED_CLAIM', target.file, where,
        `${claim.description}: matched "${(rawHit || textHit)[0]}" (${claim.sourceRef})`);
    }
  }
}

if (/data-width\s*=/.test(sources.indexHtml) || /skill-progress|progress-bar/.test(sources.indexHtml)) {
  violation('UNSUPPORTED_CLAIM', FILES.indexHtml, 'skills',
    'Skill proficiency bar markup remains (Requirements 4.9, 3.10)');
}

if (/hero-stats|stat-number|data-count/.test(sources.indexHtml) || /hero-stats|stat-number|data-count/.test(sources.scriptJs)) {
  violation('UNSUPPORTED_CLAIM', 'index.html/script.js', 'hero metrics',
    'Unsupported résumé metric counter markup or behavior remains (Requirements 1.5, 3.5, 8.4)');
}

/* ------------------------------------------------------------------ *
 * 4. Contact semantics (display/action pairs, static handle, no profiles)
 * ------------------------------------------------------------------ */

const EMAIL_LIKE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_LIKE = /\+\d[\d\s\u2011-]{6,}\d/g;

for (const [fileKey, doc, raw] of [
  [FILES.indexHtml, indexDoc, sources.indexHtml],
  [FILES.testLabHtml, labDoc, sources.testLabHtml]
]) {
  const anchors = H.byTag(doc, 'a');

  for (const anchor of anchors) {
    const href = (anchor.attributes.href || '').trim();
    const anchorText = H.normalizedTextOf(doc, anchor);

    if (/^mailto:/i.test(href)) {
      if (href !== contact.emailHref) {
        violation('CONTACT_URI_MISMATCH', fileKey, H.describe(doc, anchor),
          `mailto href "${href}" !== canonical "${contact.emailHref}" (Requirements 2.4, 9.5)`);
      }
      const displayed = anchorText.match(EMAIL_LIKE) || [];
      for (const value of displayed) {
        if (value !== contact.emailDisplay) {
          violation('CONTACT_URI_MISMATCH', fileKey, H.describe(doc, anchor),
            `Displayed email "${value}" !== canonical "${contact.emailDisplay}" (Requirements 2.3, 8.2)`);
        }
      }
    }

    if (/^tel:/i.test(href)) {
      if (href !== contact.phoneHref) {
        violation('CONTACT_URI_MISMATCH', fileKey, H.describe(doc, anchor),
          `tel href "${href}" !== canonical "${contact.phoneHref}" (Requirements 2.6, 9.5)`);
      }
      const displayed = anchorText.match(PHONE_LIKE) || [];
      for (const value of displayed) {
        if (value.trim() !== contact.phoneDisplay) {
          violation('CONTACT_URI_MISMATCH', fileKey, H.describe(doc, anchor),
            `Displayed phone "${value.trim()}" !== canonical "${contact.phoneDisplay}" (Requirements 2.5, 8.2)`);
        }
      }
      const normalizedDisplay = (anchorText.match(PHONE_LIKE) || []).map((v) => v.replace(/[^\d+]/g, ''));
      for (const digits of normalizedDisplay) {
        if (`tel:${digits}` !== contact.phoneHref) {
          violation('CONTACT_URI_MISMATCH', fileKey, H.describe(doc, anchor),
            `Normalized phone display "${digits}" does not encode "${contact.phoneHref}" (Requirements 2.6, 8.2)`);
        }
      }
    }

    if (/linkedin\.com|github\.com/i.test(href)) {
      violation('UNSUPPORTED_PROFILE_ACTION', fileKey, H.describe(doc, anchor),
        `Personal profile action "${href}" has no source URL (Requirements 2.8, 2.9, 8.11)`);
    }

    if (anchorText.includes(contact.linkedInHandle)) {
      violation('UNSUPPORTED_PROFILE_ACTION', fileKey, H.describe(doc, anchor),
        `LinkedIn handle "${contact.linkedInHandle}" is inside a hyperlink (Requirements 2.7, 9.5)`);
    }
  }

  // Owner email/phone values must be canonical everywhere they appear.
  for (const value of H.documentText(doc).match(EMAIL_LIKE) || []) {
    if (value !== contact.emailDisplay) {
      violation('CANONICAL_MISMATCH', fileKey, 'rendered text',
        `Non-canonical email "${value}" is displayed (Requirements 2.3, 2.10, 8.1)`);
    }
  }
  for (const value of raw.match(/(?:mailto|tel):[^"'\s>]+/gi) || []) {
    if (/^mailto:/i.test(value) && value !== contact.emailHref) {
      violation('CANONICAL_MISMATCH', fileKey, value,
        `Non-canonical mailto URI (Requirements 2.4, 8.1)`);
    }
    if (/^tel:/i.test(value) && value !== contact.phoneHref) {
      violation('CANONICAL_MISMATCH', fileKey, value,
        `Non-canonical tel URI (Requirements 2.6, 8.1)`);
    }
  }
}

// LinkedIn row must be static content with an accessible label and no link semantics.
const linkedInRows = H.findAll(indexDoc, (element) =>
  H.hasClass(element, 'contact-link-item') &&
  H.normalizedTextOf(indexDoc, element).includes(contact.linkedInHandle));

if (linkedInRows.length !== 1) {
  violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, '.contact-links',
    `Expected exactly 1 LinkedIn contact row, found ${linkedInRows.length} (Requirements 2.7)`);
} else {
  const row = linkedInRows[0];
  if (row.tag === 'a') {
    violation('UNSUPPORTED_PROFILE_ACTION', FILES.indexHtml, H.describe(indexDoc, row),
      'LinkedIn row is an anchor (Requirements 2.7, 2.8)');
  }
  for (const attribute of ['href', 'target', 'role', 'onclick', 'tabindex']) {
    if (attribute in row.attributes) {
      violation('UNSUPPORTED_PROFILE_ACTION', FILES.indexHtml, H.describe(indexDoc, row),
        `LinkedIn row carries link-like attribute "${attribute}" (Requirements 2.7, 2.8)`);
    }
  }
  if (!H.normalizedTextOf(indexDoc, row).includes('LinkedIn')) {
    violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, H.describe(indexDoc, row),
      'LinkedIn row lost its visible accessible label (Requirements 8.8)');
  }
}

for (const [label, expected] of [['Email', contact.emailDisplay], ['Phone', contact.phoneDisplay], ['Location', identity.location]]) {
  const rows = H.findAll(indexDoc, (element) =>
    H.hasClass(element, 'contact-link-item') &&
    H.normalizedTextOf(indexDoc, element).includes(label) &&
    H.normalizedTextOf(indexDoc, element).includes(expected));
  if (rows.length !== 1) {
    violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, `.contact-links ${label}`,
      `Expected exactly 1 "${label}" row showing "${expected}", found ${rows.length} (Requirements 2.3, 2.5, 2.2, 8.8)`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Skills coverage
 * ------------------------------------------------------------------ */

const skillCards = H.byClass(indexDoc, 'skill-card');
if (skillCards.length !== expectedCounts.skillGroups) {
  violation('SKILL_CARD_COUNT', FILES.indexHtml, '.skills-grid',
    `Expected ${expectedCounts.skillGroups} skill cards, found ${skillCards.length} (Requirements 4.1-4.6, 8.7)`);
}

for (const [group, skills] of Object.entries(skillGroups)) {
  const card = skillCards.find((element) => element.attributes['data-skill-group'] === group);
  if (!card) {
    violation('MISSING_SKILL_GROUP', FILES.indexHtml, group,
      `Skill group "${group}" card is absent (${sourceRefs.skillGroups[group][skills[0]]})`);
    continue;
  }
  const tags = H.findAll(indexDoc, (element) =>
    H.hasClass(element, 'skill-tag') && H.isWithin(element, (parent) => parent === card))
    .map((element) => H.normalizedTextOf(indexDoc, element));

  for (const skill of skills) {
    if (!tags.includes(skill)) {
      violation('MISSING_SKILL', FILES.indexHtml, `${group} card`,
        `Required skill label "${skill}" absent from its group (${sourceRefs.skillGroups[group][skill]})`);
    }
  }

  const allowed = new Set(skills);
  for (const tag of tags) {
    if (!allowed.has(tag)) {
      violation('UNBACKED_CONTENT', FILES.indexHtml, `${group} card`,
        `Skill tag "${tag}" is not in the résumé-backed group manifest (Requirements 4.8, 4.9)`);
    }
  }
}

const allSkillTags = H.byClass(indexDoc, 'skill-tag').map((element) => H.normalizedTextOf(indexDoc, element));
for (const label of ['Enterprise Graph', 'IEG']) {
  if (!allSkillTags.includes(label)) {
    violation('MISSING_SKILL', FILES.indexHtml, 'toolsAndPlatforms card',
      `Separate résumé label "${label}" must be preserved (Requirements 4.7)`);
  }
}

/* ------------------------------------------------------------------ *
 * 6. Employment: counts, fields, attribution, duplicate details
 * ------------------------------------------------------------------ */

const timelineItems = H.byClass(indexDoc, 'timeline-item');
if (timelineItems.length !== 2) {
  violation('EMPLOYMENT_CARD_COUNT', FILES.indexHtml, '.timeline',
    `Expected exactly 2 employment cards, found ${timelineItems.length} (Requirements 5.1, 6.1)`);
}

const inforItems = timelineItems.filter((element) => element.attributes['data-employment-id'] === 'infor-current');
const hclItems = timelineItems.filter((element) => element.attributes['data-employment-id'] === 'hcl-prior');

if (inforItems.length !== expectedCounts.currentInforRoles) {
  violation('DUPLICATE_RESUME_DETAIL', FILES.indexHtml, '.timeline',
    `Expected exactly ${expectedCounts.currentInforRoles} current Infor card, found ${inforItems.length} (Requirements 5.1, 9.4)`);
}
if (hclItems.length !== 1) {
  violation('EMPLOYMENT_CARD_COUNT', FILES.indexHtml, '.timeline',
    `Expected exactly 1 HCL card, found ${hclItems.length} (Requirements 6.1)`);
}

const employerTextByName = {};

if (inforItems.length === 1) {
  const text = H.normalizedTextOf(indexDoc, inforItems[0]);
  employerTextByName[infor.employer] = text;
  for (const [field, value] of [['title', infor.title], ['employer', infor.employer], ['location', infor.location], ['period', infor.period]]) {
    if (!text.includes(value)) {
      violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, 'infor-current',
        `Infor ${field} "${value}" is absent from the card (${infor.sourceRefs[field]})`);
    }
  }
  if (!/timeline-badge[^"]*current/.test(H.outerHtml(indexDoc, inforItems[0]))) {
    violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, 'infor-current',
      'Current-role badge is absent (Requirements 5.1, 8.7)');
  }
}

if (hclItems.length === 1) {
  const text = H.normalizedTextOf(indexDoc, hclItems[0]);
  employerTextByName[hcl.employer] = text;
  for (const [field, value] of [['title', hcl.title], ['employer', hcl.employer], ['location', hcl.location], ['period', hcl.period]]) {
    if (!text.includes(value)) {
      violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, 'hcl-prior',
        `HCL ${field} "${value}" is absent from the card (${hcl.sourceRefs[field]})`);
    }
  }
}

// Every manifest responsibility must be rendered once under its own employer.
const responsibilityNodes = H.findAll(indexDoc, (element) => 'data-responsibility-id' in element.attributes);
const responsibilityCounts = new Map();
for (const node of responsibilityNodes) {
  const id = node.attributes['data-responsibility-id'];
  responsibilityCounts.set(id, (responsibilityCounts.get(id) || 0) + 1);
}

for (const [employer, responsibilities] of Object.entries(employerResponsibilities)) {
  const item = employer === infor.employer ? inforItems[0] : hclItems[0];
  for (const responsibility of responsibilities) {
    const count = responsibilityCounts.get(responsibility.id) || 0;
    if (count === 0) {
      violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, `${employer} / ${responsibility.id}`,
        `Résumé responsibility "${responsibility.responsibility}" is not rendered (${responsibility.sourceRef})`);
      continue;
    }
    if (count > 1) {
      violation('DUPLICATE_RESUME_DETAIL', FILES.indexHtml, `${employer} / ${responsibility.id}`,
        `Responsibility rendered ${count} times (${responsibility.sourceRef})`);
    }
    const nodes = responsibilityNodes.filter((element) => element.attributes['data-responsibility-id'] === responsibility.id);
    for (const node of nodes) {
      if (item && !H.isWithin(node, (parent) => parent === item)) {
        violation('EMPLOYER_ATTRIBUTION_MISMATCH', FILES.indexHtml, H.describe(indexDoc, node),
          `Responsibility "${responsibility.id}" expected under ${employer} (${responsibility.sourceRef})`);
      }
    }
    const scopeText = item ? H.normalizedTextOf(indexDoc, item) : '';
    for (const detail of responsibility.details) {
      if (!scopeText.includes(detail)) {
        violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, `${employer} / ${responsibility.id}`,
          `Résumé detail "${detail}" is absent under ${employer} (${responsibility.sourceRef})`);
      }
    }
  }
}

// Cross-employer attribution: another employer's exclusive details must not appear.
const detailOwner = new Map();
for (const [employer, responsibilities] of Object.entries(employerResponsibilities)) {
  for (const responsibility of responsibilities) {
    for (const detail of responsibility.details) {
      detailOwner.set(detail, employer);
    }
  }
}
const HCL_EXCLUSIVE_TERMS = ['application package', 'Windows update', 'patching', 'Active Directory', 'ServiceNow', 'vulnerability'];

for (const [detail, owner] of detailOwner) {
  for (const [employer, text] of Object.entries(employerTextByName)) {
    if (employer !== owner && text.includes(detail)) {
      violation('EMPLOYER_ATTRIBUTION_MISMATCH', FILES.indexHtml, employer,
        `Detail "${detail}" belongs to ${owner} but appears under ${employer} (Requirements 1.6, 6.7, 6.8)`);
    }
  }
}
for (const term of HCL_EXCLUSIVE_TERMS) {
  const inforCardText = employerTextByName[infor.employer] || '';
  if (new RegExp(term, 'i').test(inforCardText)) {
    violation('EMPLOYER_ATTRIBUTION_MISMATCH', FILES.indexHtml, infor.employer,
      `HCL-attributed term "${term}" appears under ${infor.employer} (Requirements 6.8)`);
  }
}

// No project metric or project URL inside employment cards.
for (const item of timelineItems) {
  const html = H.outerHtml(indexDoc, item);
  for (const match of html.matchAll(/href\s*=\s*"(https?:\/\/[^"]+)"/gi)) {
    violation('UNSUPPORTED_PROFILE_ACTION', FILES.indexHtml, H.describe(indexDoc, item),
      `Unsupported project URL "${match[1]}" in an employment card (Requirements 5.15)`);
  }
}

/* ------------------------------------------------------------------ *
 * 7. Education
 * ------------------------------------------------------------------ */

const eduCards = H.byClass(indexDoc, 'edu-card');
if (eduCards.length !== expectedCounts.educationRecords) {
  violation('EDUCATION_CARD_COUNT', FILES.indexHtml, '.education-grid',
    `Expected exactly ${expectedCounts.educationRecords} education card, found ${eduCards.length} (Requirements 7.1, 9.4)`);
}
if (eduCards.length >= 1) {
  const text = H.normalizedTextOf(indexDoc, eduCards[0]);
  for (const [field, value] of Object.entries({
    qualification: education[0].qualification,
    institution: education[0].institution,
    period: education[0].period,
    resultLabel: education[0].resultLabel,
    result: education[0].result
  })) {
    if (!text.includes(value)) {
      violation('MISSING_REQUIRED_VALUE', FILES.indexHtml, 'edu-card',
        `Education ${field} "${value}" is absent (${education[0].sourceRefs[field]})`);
    }
  }
  if (/percentage|%/i.test(text)) {
    violation('UNSUPPORTED_CLAIM', FILES.indexHtml, 'edu-card',
      'Education result is presented as a percentage (Requirements 7.5)');
  }
}

/* ------------------------------------------------------------------ *
 * 8. Markup validity and local navigation
 * ------------------------------------------------------------------ */

const localDocuments = { [FILES.indexHtml]: indexDoc, [FILES.testLabHtml]: labDoc };

for (const [fileKey, doc] of Object.entries(localDocuments)) {
  const seen = new Map();
  for (const element of H.allElements(doc)) {
    const id = element.attributes.id;
    if (id === undefined) continue;
    if (id.trim() === '') {
      violation('MARKUP_INVALID_ID', fileKey, H.describe(doc, element), 'Empty id attribute (Requirements 9.12)');
      continue;
    }
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) {
      violation('MARKUP_DUPLICATE_ID', fileKey, `#${id}`, `Element id "${id}" occurs ${count} times (Requirements 9.12)`);
    }
  }

  for (const anchor of H.byTag(doc, 'a')) {
    if (H.isWithin(anchor, (parent) => parent.tag === 'a')) {
      violation('MARKUP_NESTED_LINK', fileKey, H.describe(doc, anchor), 'Hyperlink nested inside another hyperlink (Requirements 9.12)');
    }
  }

  for (const anchor of H.byTag(doc, 'a')) {
    const href = (anchor.attributes.href || '').trim();
    if (href === '' || href === '#' || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href)) continue;

    const [filePart, fragment] = href.split('#');
    const targetFile = filePart === '' ? fileKey : filePart;
    if (!fs.existsSync(path.join(ROOT, targetFile))) {
      violation('MARKUP_UNRESOLVED_LINK', fileKey, H.describe(doc, anchor),
        `Local destination "${targetFile}" does not exist (Requirements 8.9)`);
      continue;
    }
    if (fragment) {
      const targetDoc = localDocuments[targetFile] || H.parseHtml(read(targetFile), targetFile);
      const matches = H.allElements(targetDoc).filter((element) => element.attributes.id === fragment);
      if (matches.length !== 1) {
        violation('MARKUP_UNRESOLVED_LINK', fileKey, H.describe(doc, anchor),
          `Fragment "#${fragment}" resolves to ${matches.length} elements in ${targetFile} (Requirements 8.9, 9.12)`);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 9. Shared script governance
 * ------------------------------------------------------------------ */

const roleArrayMatch = /TYPEWRITER_ROLES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(sources.scriptJs);
if (!roleArrayMatch) {
  violation('UNBACKED_CONTENT', FILES.scriptJs, 'TYPEWRITER_ROLES',
    'Could not locate the frozen typewriter role allowlist (Requirements 3.9, 8.4)');
} else {
  const roles = [...roleArrayMatch[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);
  for (const role of roles) {
    if (!allowedRoleLabels.includes(role)) {
      violation('UNBACKED_CONTENT', FILES.scriptJs, 'TYPEWRITER_ROLES',
        `Typewriter label "${role}" is outside the résumé-backed allowlist (Requirements 3.9, 8.4)`);
    }
  }
  if (roles.length === 0) {
    violation('MISSING_REQUIRED_VALUE', FILES.scriptJs, 'TYPEWRITER_ROLES',
      'Typewriter allowlist is empty (Requirements 3.9)');
  }
}

const REQUIRED_GUARDS = [
  { id: 'typewriter', pattern: /const typewriterEl = document\.getElementById\('typewriter'\);\s*if \(!typewriterEl\) return;/ },
  { id: 'contactForm', pattern: /const contactForm = document\.getElementById\('contactForm'\);\s*if \(!contactForm\) return;/ },
  { id: 'particleCanvas', pattern: /const canvas = document\.getElementById\('particleCanvas'\);\s*if \(!canvas/ },
  { id: 'cursorGlow', pattern: /const cursorGlow = document\.getElementById\('cursorGlow'\);\s*if \(!cursorGlow\) return;/ },
  { id: 'animate-on-scroll', pattern: /animatedElements\.length === 0\) return;/ },
  { id: 'tl-indeterminate', pattern: /getElementById\('tl-indeterminate'\);\s*if \(checkbox\)/ }
];

for (const guard of REQUIRED_GUARDS) {
  if (!guard.pattern.test(sources.scriptJs)) {
    violation('RUNTIME_GUARD_MISSING', FILES.scriptJs, guard.id,
      `Page-specific initializer for "${guard.id}" is not guarded against a missing node (Requirements 8.10, 9.11)`);
  }
}

for (const external of sources.scriptJs.match(/\b(?:fetch|XMLHttpRequest|importScripts)\s*\(/g) || []) {
  violation('UNSUPPORTED_CLAIM', FILES.scriptJs, external,
    'Shared script introduces an external call (Design: no new external calls)');
}

/* ------------------------------------------------------------------ *
 * 10. Provenance: every retained owner statement maps to a source ref
 * ------------------------------------------------------------------ */

const provenanceIndex = new Map();
for (const fixture of provenanceFixtures) {
  if (!fixture.sourceRef) {
    violation('UNBACKED_CONTENT', 'manifest', fixture.key, 'Provenance fixture has no sourceRef (Requirements 9.7)');
    continue;
  }
  provenanceIndex.set(String(fixture.statement), fixture);
}

const PROVENANCE_TARGETS = [
  { statement: identity.fullName, file: FILES.indexHtml },
  { statement: identity.location, file: FILES.indexHtml },
  { statement: contact.emailDisplay, file: FILES.indexHtml },
  { statement: contact.phoneDisplay, file: FILES.indexHtml },
  { statement: contact.linkedInHandle, file: FILES.indexHtml },
  { statement: profile.role, file: FILES.indexHtml },
  { statement: profile.totalExperience, file: FILES.indexHtml },
  { statement: profile.qaExperience, file: FILES.indexHtml },
  { statement: infor.title, file: FILES.indexHtml },
  { statement: infor.employer, file: FILES.indexHtml },
  { statement: infor.location, file: FILES.indexHtml },
  { statement: infor.period, file: FILES.indexHtml },
  { statement: hcl.title, file: FILES.indexHtml },
  { statement: hcl.employer, file: FILES.indexHtml },
  { statement: hcl.location, file: FILES.indexHtml },
  { statement: hcl.period, file: FILES.indexHtml },
  { statement: education[0].qualification, file: FILES.indexHtml },
  { statement: education[0].institution, file: FILES.indexHtml },
  { statement: education[0].period, file: FILES.indexHtml },
  { statement: education[0].result, file: FILES.indexHtml },
  { statement: profile.role, file: FILES.testLabHtml },
  { statement: identity.fullName, file: FILES.testLabHtml },
  { statement: contact.emailDisplay, file: FILES.testLabHtml }
];

const provenanceReport = [];
for (const target of PROVENANCE_TARGETS) {
  const text = target.file === FILES.indexHtml ? indexText : labText;
  const fixture = provenanceIndex.get(target.statement);
  if (!fixture) {
    violation('UNBACKED_CONTENT', target.file, target.statement,
      'Retained statement has no résumé source record (Requirements 1.2, 9.7)');
    continue;
  }
  if (!text.includes(target.statement)) continue; // reported by the value check
  provenanceReport.push({
    statement: target.statement,
    file: target.file,
    sourceRef: fixture.sourceRef,
    employer: fixture.employer || null
  });
}

// Every rendered skill tag and responsibility detail needs a provenance record.
for (const tag of allSkillTags) {
  if (!provenanceIndex.has(tag)) {
    violation('UNBACKED_CONTENT', FILES.indexHtml, `skill-tag "${tag}"`,
      'Rendered skill has no résumé source record (Requirements 1.2, 4.9, 9.7)');
  }
}

for (const node of responsibilityNodes) {
  const id = node.attributes['data-responsibility-id'];
  const owner = Object.entries(employerResponsibilities)
    .find(([, list]) => list.some((item) => item.id === id));
  if (!owner) {
    violation('UNBACKED_CONTENT', FILES.indexHtml, `data-responsibility-id="${id}"`,
      'Rendered responsibility has no résumé source record (Requirements 1.2, 9.7)');
    continue;
  }
  const record = owner[1].find((item) => item.id === id);
  provenanceReport.push({
    statement: H.normalizedTextOf(indexDoc, node).slice(0, 96),
    file: FILES.indexHtml,
    sourceRef: record.sourceRef,
    employer: owner[0]
  });
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

function group(items, key) {
  return items.reduce((acc, item) => {
    const bucket = item[key] || 'unknown';
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(item);
    return acc;
  }, {});
}

console.log('=== portfolio-resume-details-update :: aggregate static + markup + provenance check ===\n');
console.log(`Files inspected : ${Object.values(FILES).join(', ')}`);
console.log(`Provenance records verified : ${provenanceReport.length}`);
console.log(`Skill labels verified       : ${allSkillTags.length}`);
console.log(`Responsibilities verified   : ${responsibilityNodes.length}`);
console.log(`Element ids / anchors scanned: ${H.allElements(indexDoc).length + H.allElements(labDoc).length} elements\n`);

if (notes.length > 0) {
  console.log('Notes:');
  for (const message of notes) console.log(`  - ${message}`);
  console.log('');
}

if (violations.length === 0) {
  console.log('RESULT: PASS - 0 violations.\n');
  console.log('Provenance map (statement -> source reference):');
  for (const record of provenanceReport) {
    const employer = record.employer ? ` [${record.employer}]` : '';
    console.log(`  ${record.file.padEnd(14)} ${record.sourceRef.padEnd(20)}${employer} ${record.statement}`);
  }
  process.exitCode = 0;
} else {
  console.log(`RESULT: FAIL - ${violations.length} violation(s).\n`);
  const byFile = group(violations, 'file');
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`${file}`);
    for (const item of items) {
      console.log(`  [${item.code}] ${item.location}`);
      console.log(`      ${item.message}`);
    }
    console.log('');
  }
  process.exitCode = 1;
}

module.exports = { violations, provenanceReport };
