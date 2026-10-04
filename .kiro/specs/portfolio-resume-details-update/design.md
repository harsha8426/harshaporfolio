# Design Document: Portfolio Résumé Details Update

## Overview

This feature updates the existing portfolio in place so that every personal and professional statement is supported by the completed résumé requirements. The implementation remains a dependency-free static website composed of `index.html`, `test-lab.html`, `styles.css`, and `script.js`. It does not introduce a framework, runtime data service, build step, or visual redesign.

The design uses static, semantic HTML as the primary content source. CSS continues to provide the current dark gradient visual system, cards, timeline, responsive layout, and animations. JavaScript continues to provide progressive interactions, but résumé-adjacent labels are restricted to an explicit allowlist and all page-specific initializers become safe no-ops when their target elements are absent. Validation has two layers: deterministic source inspection and browser smoke checks at the required desktop and mobile viewports.

## Goals

- Replace placeholders and résumé-conflicting personal content with canonical résumé values.
- Keep displayed email and phone values exactly aligned with their `mailto:` and `tel:` actions.
- Display `@harsha1919` as non-navigating content because no complete LinkedIn URL is supplied.
- Remove generic or unsupported personal profile actions, metrics, availability, proficiency, AI, and MCP claims.
- Consolidate current Infor content into one complete employer-attributed timeline card.
- Correct the HCL role and keep each employer's responsibilities in the proper card.
- Present one résumé-backed education card and six complete résumé-backed skill groups.
- Preserve local navigation, Test Lab selector contracts and interactions, visual language, and animation behavior.
- Keep expanded experience content readable at `1280 × 720` and `390 × 844`.
- Provide objective static, markup, responsive, interaction, and console validation.

## Non-Goals

- Rewriting the site in a framework or adding runtime/development dependencies.
- Adding profile URLs, project URLs, metrics, achievements, employers, responsibilities, education, skills, or claims not supported by the requirements.
- Turning the site into a résumé parser or runtime content-management system.
- Redesigning navigation, section order, colors, typography, particle effects, card treatments, or Test Lab behavior.
- Changing generic Test Lab fixtures that are not presented as facts about the portfolio owner.

## Architectural Principles

### 1. Static-first content

All visitor-facing résumé content remains in HTML so it is readable without JavaScript and discoverable by accessibility tools. JavaScript must not become the primary renderer for identity, contact, skills, experience, or education.

### 2. Canonical-value governance

Implementation and validation share one conceptual canonical manifest. It is a design and test oracle rather than a required runtime object. Static HTML may repeat a value only where the existing presentation needs it, and each repeated occurrence must equal the manifest value.

### 3. Provenance before presentation

Every retained personal/professional statement must have a traceability record to the résumé requirements. Existing text is not presumed valid merely because it is already on the site. Additional Infor or HCL responsibility prose must be transcribed from the authoritative résumé source and must not be inferred from the old cards.

### 4. Progressive enhancement

Animations and interactions enhance complete static markup. An absent page-specific element must cause its initializer to return without error. This is especially important because one shared `script.js` executes on both pages.

### 5. Validation without production dependencies

Static checks use file text and pure JavaScript validation logic. Browser checks may use an automation runner supplied by the validation environment, but no library is shipped to or required by the deployed site.

## System Architecture

```text
Completed résumé requirements
          |
          v
Canonical content + provenance manifest (design/test oracle)
          |
          +----------------------+----------------------+------------------+
          |                      |                      |                  |
          v                      v                      v                  v
      index.html            test-lab.html           script.js          styles.css
  semantic résumé view     fixture-safe updates   guarded behavior    preserved theme
          |                      |                      |                  |
          +----------------------+----------------------+------------------+
                                         |
                         +---------------+---------------+
                         |                               |
                         v                               v
                 Static content check             Browser smoke check
              exact values/provenance/           desktop/mobile/render/
              links/claims/IDs/nesting           navigation/interactions/console
```

There is no network or persistence path for résumé content. The only external resources remain the existing font and icon stylesheets; loss of those resources must not remove textual identity or contact information.

## Canonical Content Model

The following JavaScript-shaped model defines the implementation and validation contract. It is illustrative and need not be added to production code as a runtime object.

```javascript
const canonicalPortfolio = Object.freeze({
  identity: {
    fullName: 'Niddana Harsha Vardhan',
    location: 'Visakhapatnam'
  },
  contact: {
    emailDisplay: 'niddanaharshavardhan@gmail.com',
    emailHref: 'mailto:niddanaharshavardhan@gmail.com',
    phoneDisplay: '+91 9490312456',
    phoneHref: 'tel:+919490312456',
    linkedInHandle: '@harsha1919',
    linkedInUrl: null,
    githubUrl: null
  },
  profile: {
    role: 'QA Automation Engineer/SDET',
    totalExperience: '5+ years of total IT experience',
    qaExperience: '4+ years of software QA experience',
    typewriterRoles: [
      'QA Automation Engineer/SDET',
      'Senior Quality Assurance Analyst'
    ]
  },
  skills: {
    automation: [
      'Playwright', 'TypeScript', 'JavaScript', 'Node.js', 'npm',
      'Page Object Model (POM)', 'data-driven testing',
      'Playwright APIRequestContext'
    ],
    qualityAssurance: [
      'functional testing', 'smoke testing', 'regression testing',
      'integration testing', 'system testing', 'negative testing',
      'boundary testing', 'data validation', 'schema validation'
    ],
    dataAndEtl: [
      'Apache Hop', 'Infor Data Fabric ETL Tool', 'Data Lake', 'Compass',
      'PostgreSQL', 'SQL', 'DB2', 'DB2/400', 'Oracle',
      'source-to-target validation'
    ],
    executionDeliveryReporting: [
      'GitLab CI/CD', 'Playwright sharding', 'Chromium', 'blob reports',
      'HTML reports', 'JUnit reports', 'AWS S3'
    ],
    toolsAndPlatforms: [
      'Jira', 'Zephyr Scale', 'Infor OS', 'Data Fabric', 'Data Catalog',
      'Enterprise Graph', 'IEG', 'Mingle', 'ION API Gateway'
    ],
    formatsAndMetadata: [
      'JSON', 'NDJSON', 'XML', 'XSD', 'CSV', 'DSV', 'ZIP',
      'schema metadata', 'encoding validation'
    ]
  },
  experience: [
    {
      id: 'infor-current',
      current: true,
      title: 'Senior Quality Assurance Analyst',
      employer: 'Infor India Pvt. Ltd.',
      location: 'Hyderabad',
      period: 'November 2021–Present',
      responsibilityGroups: [
        'automation',
        'quality-assurance',
        'etl-and-data-validation',
        'execution-delivery-and-reporting',
        'test-management-and-infor-platforms',
        'formats-metadata-and-encoding'
      ]
    },
    {
      id: 'hcl-prior',
      current: false,
      title: 'Associate—SCM Administration',
      employer: 'HCL Technologies',
      location: 'Chennai',
      period: 'December 2020–November 2021'
    }
  ],
  education: [{
    qualification: 'B.Tech EEE',
    institution: "Vignan's Institute of Information Technology",
    period: '01/2016–12/2020',
    resultLabel: 'CGPA',
    result: '7.8'
  }]
});
```

### Provenance record

Every personal/professional statement is represented during implementation review by a record with these fields:

```javascript
{
  statement: 'Visible statement or exact label',
  file: 'index.html',
  selector: '#experience .timeline-item[data-employer="infor"]',
  sourceRef: 'Requirements 5.6',
  employer: 'Infor India Pvt. Ltd.' // null for non-employment content
}
```

`sourceRef` identifies the exact acceptance criterion or résumé line supporting the statement. A statement without a source reference is removed rather than rewritten speculatively. Employer responsibilities additionally require an `employer` value so validation can detect cross-attribution.

## File and Component Design

| File | Existing responsibility | Designed change boundary |
|---|---|---|
| `index.html` | Main portfolio content and local navigation | Replace governed content; consolidate cards; preserve section IDs, card classes, form, and navigation destinations |
| `test-lab.html` | Stable browser-control fixture and secondary navigation | Correct owner-related fixture/footer text only; preserve selectors, control count, generic fixtures, and interaction semantics |
| `script.js` | Shared effects, navigation, typewriter, counters, form behavior, and Test Lab setup | Restrict typewriter labels, remove unsupported résumé counters, and guard page-specific initializers; preserve unrelated behavior |
| `styles.css` | Visual system, responsive layout, animations, portfolio cards, and Test Lab styles | Add only targeted long-content and static-handle rules; reuse existing variables, breakpoints, classes, and card treatments |

### Main portfolio document (`index.html`)

#### Metadata and identity

- Use the full canonical name in the document title, hero, footer, and any other identity-related text.
- Keep the `NHV` logo mark as a decorative brand abbreviation; it does not replace the full identity where a person's name is presented.
- Use `QA Automation Engineer/SDET` wherever the metadata or professional summary identifies the portfolio role.

#### Hero and professional summary

- Replace the hero description with a compact statement containing all three exact profile facts: `QA Automation Engineer/SDET`, `5+ years of total IT experience`, and `4+ years of software QA experience`.
- Remove the unsupported availability badge and revise contact invitation prose so it does not assert an unsupported availability status.
- Remove the entire unsupported metrics block rather than substituting new inferred counts. This removes `6+`, `50+`, and tool/project counters together and avoids presenting derived counts as résumé achievements.
- Keep both existing calls to action and their local destinations.
- Replace the AI-based code-window example with a small generic Playwright/TypeScript example using résumé-backed automation or `APIRequestContext` terminology. The sample must not claim a real project URL, result, metric, or AI capability.

#### About content and orbit

- Use only résumé-backed profile, automation, QA, ETL, database, and platform language.
- Remove AI, MCP, steering-file, prompt-engineering, AI-test-generation, leadership, and unsupported availability language.
- Keep the orbit visual and replace unsupported orbit labels with résumé-backed labels such as `TypeScript`, `Data Fabric`, or `APIRequestContext`.
- Display the location exactly as `Visakhapatnam`.
- Retain a language item only if it has direct résumé provenance; otherwise remove it under the same source-governance rule.

#### Skills

Render six `.skill-card` elements using the six groups in the canonical model. Each required label appears in its assigned group with exact résumé terminology. In particular, retain both `Enterprise Graph` and `IEG` as independent labels and do not invent an expansion for `IEG`.

Skill progress bars and `data-width` proficiency values are removed because they imply unsupported percentages. Card glow, tilt, icons, tags, grid behavior, and entrance animation remain. Icons are decorative and must not reintroduce unsupported claims; for example, the former AI card is replaced by a résumé-backed category and neutral icon.

#### Experience timeline

The timeline contains exactly two employment cards:

1. One current Infor card with the exact title, employer, location, and period from the canonical model.
2. One HCL card with the exact title, employer, location, and period from the canonical model.

The two existing current-role cards are consolidated into the single `infor-current` card. Its responsibilities are semantic lists grouped under concise subheadings:

- Automation: Playwright, TypeScript, JavaScript, Node.js, npm, Page Object Model (POM), data-driven testing, and Playwright APIRequestContext.
- QA coverage: functional, smoke, regression, integration, system, negative, boundary, data, and schema validation.
- ETL/data validation: Apache Hop, Infor Data Fabric ETL Tool, Data Lake, Compass, PostgreSQL, SQL, DB2, DB2/400, Oracle, and source-to-target validation.
- Execution/reporting: GitLab CI/CD, Playwright sharding, Chromium, blob reports, HTML reports, JUnit reports, and AWS S3.
- Test management/platforms: Jira, Zephyr Scale, Infor OS, Data Fabric, Data Catalog, Enterprise Graph, IEG, Mingle, and ION API Gateway.
- Formats/metadata: JSON, NDJSON, XML, XSD, CSV, DSV, ZIP, schema metadata, and encoding validation.

Every additional résumé-supplied Infor responsibility is transcribed once into the applicable group. No generic summary may replace a distinct responsibility. No duplicated source detail may appear in two groups.

The HCL card receives only the HCL responsibilities supplied by the résumé. Existing text is retained only after source verification. Infor responsibilities cannot be used to fill the HCL card, and HCL responsibilities cannot be moved into Infor. The `SCM` abbreviation is kept exactly as supplied.

Timeline tags are optional summaries. If retained, every tag must use a résumé-backed label and must not replace the complete responsibility lists. Project buttons, project URLs, metrics, AI/MCP tags, and unsupported leadership wording are omitted.

#### Education

Render exactly one `.edu-card` containing:

- `B.Tech EEE`
- `Vignan's Institute of Information Technology`
- `01/2016–12/2020`
- `CGPA` and `7.8`

Remove the Intermediate and S.S.C cards. The remaining card keeps the existing card/icon/score visual treatment, but it must not label the CGPA as a percentage or present an unsupported proficiency claim.

#### Contact and footer

The contact section uses semantic controls with exact values:

| Contact | Visible value | Element semantics | Action |
|---|---|---|---|
| Email | `niddanaharshavardhan@gmail.com` | `<a>` with visible `Email` label | `mailto:niddanaharshavardhan@gmail.com` |
| Phone | `+91 9490312456` | `<a>` with visible `Phone` label | `tel:+919490312456` |
| LinkedIn | `@harsha1919` | Non-focusable, non-clickable text container with visible `LinkedIn` label | None |
| Location | `Visakhapatnam` | Non-clickable text container with visible `Location` label | None |

The LinkedIn row reuses `.contact-link-item` styling but is not an anchor and has no `href`, click listener, `role="link"`, or `target`. Decorative icons use `aria-hidden="true"`; visible labels and values provide the accessible name.

Footer social controls retain the canonical email action if desired. LinkedIn and generic GitHub anchors are removed because no complete personal URLs exist. The LinkedIn handle remains available in the contact section, so removing a duplicate footer icon does not hide the supplied identity.

The contact form and its simulated submission behavior are unchanged; it is not converted into a network-backed form.

### Test Lab document (`test-lab.html`)

The Test Lab remains a generic UI test fixture. Changes are deliberately narrow:

- Keep `Harsha` in `cell-name-1` and change `cell-role-1` from `QA Lead` to `QA Automation Engineer/SDET`.
- Update the displayed sample Playwright assertion for that row if it mentions the role, while preserving the sample's structure.
- Replace the footer email placeholder with the canonical email display/action.
- Remove unsupported LinkedIn and generic GitHub footer anchors; do not add a guessed profile URL.
- Use the full canonical name in owner-identity footer text.
- Preserve every existing `data-testid`, element ID, local navigation destination, generic form value, row count, dialog behavior, form-submission outcome, and indeterminate-checkbox behavior.

Generic values such as sample users, sample technologies, the Playwright documentation link, placeholder media, and demonstration controls are not treated as owner claims unless they explicitly identify Harsha.

### Shared behavior (`script.js`)

#### Typewriter interface

The typewriter cycles only through the canonical `typewriterRoles` allowlist. Initialization is page-safe:

```javascript
function initTypewriter() {
  const element = document.getElementById('typewriter');
  if (!element) return;

  const roles = [
    'QA Automation Engineer/SDET',
    'Senior Quality Assurance Analyst'
  ];

  // Existing character, pause, and deletion timing continues here.
}
```

No typewriter label may be inferred from a skill. In particular, `AI-Powered Testing Expert`, `MCP & Steering File Creator`, and unsupported expertise/proficiency labels are removed.

#### Counter and optional-element safety

The hero metrics markup and résumé-related counter behavior are removed together. General initializers that target elements present on only one page use a guard:

```javascript
function withElement(id, initialize) {
  const element = document.getElementById(id);
  if (element) initialize(element);
}

withElement('contactForm', initializeContactForm);
withElement('typewriter', initializeTypewriter);
```

This contract prevents the shared script from dereferencing missing `#typewriter`, `.hero-stats`, or `#contactForm` elements on `test-lab.html`. Existing particle, cursor, navigation, reveal, tilt, smooth-scroll, form-feedback, and Test Lab indeterminate-checkbox behavior remains unchanged apart from equivalent null safety.

### Presentation and responsive rules (`styles.css`)

The current custom properties, typography, gradients, borders, spacing rhythm, hover effects, and breakpoints remain authoritative. New selectors are additive and component-scoped.

For the expanded Infor content:

- Use a semantic responsibility list rather than one oversized paragraph.
- Apply `min-width: 0` to grid children and `overflow-wrap: anywhere` to long technology labels.
- Use a two-column responsibility-group grid only where space permits; collapse it to one column at or before the existing `768px` breakpoint.
- Keep list indentation inside the card and use the existing muted text color and line-height.
- Allow employer/location and date metadata to wrap without horizontal scrolling.
- Disable or reduce horizontal hover translation on narrow viewports so the card never leaves the viewport.

Representative structure:

```css
.timeline-responsibility-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.timeline-responsibility-group,
.timeline-responsibility-group li {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .timeline-responsibility-groups { grid-template-columns: 1fr; }
  .timeline-card:hover { transform: none; }
}
```

For non-clickable contact rows, hover styling must not imply navigation. Cursor, focus, and transform rules distinguish anchors from static rows while preserving the same card appearance. Removing cards must not require grid-specific `nth-child` overrides; the existing auto-flow behavior should place the remaining skill and education cards naturally.

## Interfaces and Contracts

### Canonical content interface

```javascript
/**
 * @typedef {Object} ValidationManifest
 * @property {Record<string, string>} canonicalValues
 * @property {Record<string, readonly string[]>} skillGroups
 * @property {readonly string[]} allowedRoleLabels
 * @property {readonly string[]} forbiddenClaimPatterns
 * @property {readonly {text: string, employer: string, sourceRef: string}[]} responsibilities
 */
```

The validation manifest is immutable for a validation run. Exact punctuation and spacing are significant for names, employers, dates, handles, and contact URIs. Case-sensitive matching is used for required display labels; forbidden-claim scanning is case-insensitive and tolerant of punctuation/whitespace variants.

### Static validation interface

```javascript
/**
 * @param {{indexHtml: string, testLabHtml: string, scriptJs: string}} sources
 * @param {ValidationManifest} manifest
 * @returns {{ok: boolean, violations: Array<{
 *   code: string,
 *   file: string,
 *   location: string,
 *   message: string
 * }>}}
 */
function validatePortfolio(sources, manifest) {}
```

Validation aggregates all violations instead of stopping on the first one. Stable violation codes allow a reviewer to distinguish missing canonical values, stale claims, bad contact semantics, misplaced responsibilities, duplicate cards, missing skills, placeholders, duplicate IDs, nested links, and unresolved local destinations.

### DOM contracts

| Area | Preserved contract | New invariant |
|---|---|---|
| Main navigation | `#navbar`, `#navLinks`, `#navToggle`, existing destination IDs | Every local destination resolves |
| Hero typewriter | `#typewriter` when present | Every role belongs to the résumé-backed allowlist |
| Skill cards | `.skills-grid`, `.skill-card`, `.skill-tag`, `data-tilt` | Six groups contain all required skills; no proficiency bar |
| Timeline | `.timeline`, `.timeline-item`, `.timeline-card`, current badge | Exactly one Infor card and one HCL card; responsibilities are correctly partitioned |
| Education | `.education-grid`, `.edu-card` | Exactly one canonical record |
| Contact | `.contact-links`, `.contact-link-item`, visible labels | Exact URI/display pairs; LinkedIn is static content |
| Test Lab | All existing IDs, `data-testid` values, and control types | Only résumé-related fixture text/owner footer controls change |

## Data Flow

1. Build an inventory of every personal/professional statement in `index.html`, owner-related fixture/footer content in `test-lab.html`, and résumé-adjacent strings in `script.js`.
2. Map each retained inventory item to the canonical manifest and a source reference.
3. Remove any item with no source mapping; do not replace it with an inferred claim.
4. Render canonical identity, profile, contacts, skills, experience, and education into existing semantic sections.
5. Consolidate Infor details by source identity, not by sentence position, so each distinct detail survives exactly once.
6. Partition responsibilities by employer before rendering timeline cards.
7. Apply narrowly scoped CSS for expanded lists and static contact controls.
8. Restrict shared JavaScript to résumé-backed labels and guard optional elements.
9. Run the complete static check; resolve all findings.
10. Run browser checks on both pages at both required viewports and capture interaction/console results.

## Error Handling

### Content and traceability errors

- Missing source mapping: report `UNBACKED_CONTENT` and remove the statement from the implementation candidate.
- Conflicting duplicate value: report `CANONICAL_MISMATCH` with every file/location where the stale value occurs.
- Missing required résumé value: report `MISSING_REQUIRED_VALUE` without inventing fallback content.
- Cross-employer responsibility: report `EMPLOYER_ATTRIBUTION_MISMATCH` and identify both expected and rendered employers.
- Duplicate distinct-key detail: report `DUPLICATE_RESUME_DETAIL`; consolidation keeps one source-backed rendering.

### Contact errors

- A displayed email or phone with a noncanonical action is a blocking `CONTACT_URI_MISMATCH`.
- A personal LinkedIn/GitHub anchor without a complete source URL is a blocking `UNSUPPORTED_PROFILE_ACTION`.
- A linked `@harsha1919`, including an anchor with an empty/hash URL, is invalid; the handle must remain text.
- Any personal-contact placeholder is a blocking `CONTACT_PLACEHOLDER`.

### Runtime errors

- Missing optional DOM nodes cause the associated initializer to return and leave the static page usable.
- An unavailable animation API may disable that enhancement, but must not hide static content or break navigation.
- No content change introduces fetch calls, form submissions, or external failure paths.

### Layout errors

Horizontal document overflow, clipped responsibility text, overlapping metadata, or off-screen contact values at a required viewport are blocking browser-smoke failures. The response is a component-scoped wrapping/spacing correction, not global shrinking or removal of résumé content.

## Validation Strategy

### Static content checks

Run deterministic inspection against `index.html`, `test-lab.html`, and `script.js`. The check must aggregate and report:

- Every missing applicable canonical identity, contact, profile, experience, education, or fixture value.
- Any personal-contact placeholder token.
- Any `6+ years`, `50+ projects`, unsupported AI/MCP/steering/prompt-generation/leadership/availability claim, proficiency percentage, `SCCM Administrator`, unsupported education entry, or unsupported project action/metric.
- A current Infor card count other than one or an education card count other than one.
- Any missing required skill or renamed `Enterprise Graph`/`IEG` label.
- Any responsibility absent from its source employer, duplicated after consolidation, or placed under another employer.
- Any noncanonical `mailto:`/`tel:` value, clickable LinkedIn handle, or generic personal GitHub action.
- Any unresolved local navigation target, duplicate ID, or nested hyperlink.

Source traceability is reviewed alongside the static result using the provenance records. Generic Test Lab fixture content is excluded unless it explicitly presents Harsha or another portfolio-owner fact.

### Unit and example tests

Use focused deterministic tests for:

- Exact profile sentence, employer fields, periods, education fields, card counts, and six skill-group memberships.
- Non-clickable `@harsha1919` markup and accessible labels.
- The `QA Automation Engineer/SDET` Test Lab fixture correction with unchanged `data-testid` values and row count.
- Optional-element guards when the typewriter, hero stats, or contact form is absent.
- The known edge case that both `Enterprise Graph` and `IEG` remain present as separate exact labels.

These tests cover concrete expected output; they do not need randomized duplication.

### Property-based tests

Property tests exercise pure manifest, normalization, consolidation, and static-validator logic with generated in-memory fixtures. Each property runs at least 100 iterations. Tests carry a traceability tag in this exact form:

```javascript
// Feature: portfolio-resume-details-update, Property 1: Résumé provenance and employer attribution
```

Generators vary duplicate counts, stale canonical values, responsibility ordering, employer mappings, role-array sizes, missing skill subsets, placeholder positions, forbidden-claim combinations, local links, IDs, and anchor structure. They do not launch browsers or perform network/file writes during randomized iterations.

### Browser smoke checks

Load `index.html` and `test-lab.html` at `1280 × 720` and `390 × 844` and verify:

- Existing theme, section order, cards, animation reveals, particle background, and navigation remain recognizable.
- The consolidated Infor lists wrap without horizontal page scrolling, clipping, or overlap.
- Skill cards and the single education card reflow using existing breakpoints.
- Desktop and mobile navigation reaches all local destinations; the mobile menu opens, closes, and does not obscure content after selection.
- Email and phone controls expose exact hrefs and are actionable; LinkedIn is not focusable or clickable.
- Contact-form feedback still works without network submission.
- Test Lab controls, dialog, form status, indeterminate checkbox, row count, and existing `data-testid` selectors retain their outcomes.
- No new console or uncaught page errors occur while loading, navigating, animating, submitting the local form, or exercising Test Lab controls.

The browser runner is test-only infrastructure and does not become a production dependency.

## Property Reflection

The prework identified several overlapping statements. They are consolidated as follows before defining properties:

- Source authority, supported-content-only, source traceability, and employer/project attribution form one provenance property.
- Identity/contact duplicate consistency and canonical replacement form one canonical convergence property.
- Exact contact values and URI semantics remain a separate normalization property because display and action formats intentionally differ.
- All unsupported personal claim families form one provenance-based exclusion property; typewriter role membership remains separate because it is an allowlist invariant.
- Skill preservation and unsupported-skill removal form one set-coverage property.
- Infor duplicate-card removal and detail retention form one lossless-consolidation property.
- Validator omission detection combines canonical values, placeholders, and required skills; forbidden-condition detection remains separate because it verifies a different mutation family.
- Local navigation integrity and markup structural integrity remain separate because valid destinations do not imply valid element nesting or unique IDs.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Résumé provenance and employer attribution

For all retained personal/professional statements, project details, and employer responsibilities, there is a supporting résumé source record, and every employer-attributed item is rendered only under the employer named by that source record.

**Validates: Requirements 1.1, 1.2, 1.6, 1.7, 5.12, 6.5, 6.7, 6.8, 9.7**

### Property 2: Canonical values converge across occurrences

For any governed identity, contact, or résumé field and for all of its related occurrences in `index.html`, `test-lab.html`, or résumé-adjacent script content, replacing stale input values produces occurrences equal to the field's single canonical value.

**Validates: Requirements 1.3, 2.1, 2.3, 2.4, 2.5, 2.6, 2.10, 8.1**

### Property 3: Contact display/action normalization

For any actionable owner email or phone entry, normalizing its displayed value produces the same address or digits encoded by its exact `mailto:` or `tel:` URI, and any mutation that breaks that relation is invalid.

**Validates: Requirements 2.4, 2.6, 8.2, 9.5**

### Property 4: Unsupported personal claims are excluded

For all personal/professional content nodes, résumé-adjacent counters, and skill/proficiency representations, any metric, status, expertise, leadership, AI, MCP, steering-file, prompt-engineering, or test-generation claim without résumé provenance is absent from valid output and reported when present.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7, 3.8, 3.10, 4.9, 5.14, 8.4**

### Property 5: Typewriter labels are source-backed

For any sequence of typewriter role labels, the sequence is valid if and only if every label belongs to the résumé-backed role allowlist; cycling, deletion, and repetition never introduce a value outside that allowlist.

**Validates: Requirements 3.9, 8.4**

### Property 6: Skill grouping preserves the required manifest

For any permutation or regrouping of the required résumé skill manifest, the rendered skill section is valid only when every required skill occurs in its assigned group with its required label and every rendered personal skill has résumé support.

**Validates: Requirements 4.8, 4.9, 9.6**

### Property 7: Infor consolidation is unique and lossless

For any multiset of résumé-backed current Infor details distributed across duplicate input cards, consolidation produces exactly one current Infor card whose detail set equals the distinct source-backed input set and in which each distinct detail appears once.

**Validates: Requirements 1.6, 5.1, 5.12, 5.13**

### Property 8: Local navigation has referential integrity

For any local navigation href in either HTML document, resolving the file path and optional fragment yields an existing local document and, when a fragment is present, exactly one target element in that document.

**Validates: Requirements 8.9**

### Property 9: Static validation detects omissions and placeholders

For any otherwise valid generated portfolio fixture and any non-empty subset of required canonical values or skills removed, or any set of personal-contact placeholders inserted, the static checker reports every introduced omission or placeholder and does not report unchanged required items as missing.

**Validates: Requirements 8.3, 9.2, 9.3, 9.6**

### Property 10: Static validation detects every forbidden mutation

For any non-empty combination of forbidden claim, unsupported metric, stale HCL title, duplicate Infor card, unsupported education card, malformed contact action, or clickable handle mutations inserted into a valid fixture, the static checker reports each introduced violation category.

**Validates: Requirements 9.4, 9.5**

### Property 11: Markup identifiers and links remain structurally valid

For all output HTML documents, every non-empty element ID is unique within its document and no hyperlink element is nested within another hyperlink element.

**Validates: Requirements 9.12**

## Requirements Traceability

| Requirement group | Primary design coverage | Primary validation |
|---|---|---|
| 1. Résumé governance | Architectural Principles, Provenance Record, Data Flow | Provenance review; Properties 1, 2, and 7 |
| 2. Identity/contact | Canonical Content Model, Contact and Footer, DOM Contracts | Exact source checks; contact examples; Properties 2 and 3 |
| 3. Professional profile | Hero and Professional Summary, About, Shared Behavior | Forbidden-content checks; typewriter tests; Properties 4 and 5 |
| 4. Technical skills | Canonical skill model, Skills component | Group membership checks; Properties 6 and 9 |
| 5. Infor experience | Experience Timeline, responsive rules | Card/detail checks; Properties 1, 4, and 7 |
| 6. HCL experience | Experience Timeline, provenance partition | Exact field checks; Property 1 |
| 7. Education | Education component | Exact fields, unsupported-entry absence, card count |
| 8. Cross-file/presentation | File design, Test Lab, Shared Behavior, CSS | Static consistency plus browser smoke; Properties 2, 3, 5, 8, and 9 |
| 9. Validation | Validation interfaces and strategy | Static, property, markup, and browser checks; Properties 1–11 |
