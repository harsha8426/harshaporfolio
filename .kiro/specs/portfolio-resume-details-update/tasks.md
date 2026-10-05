# Implementation Plan: Portfolio Résumé Details Update

## Overview

Update the dependency-free static portfolio in place using the completed résumé requirements as the source of truth. The work keeps the existing HTML/CSS/JavaScript visual and interaction contracts, adds only narrowly scoped presentation rules, and finishes with repeatable source and browser validation without adding production or development dependencies.

## Tasks

- [x] 1. Establish test-only source governance and static validation support
  - [x]* 1.1 Create the canonical validation manifest and provenance fixtures
    - Add pure JavaScript test helpers containing exact identity/contact values, the role allowlist, all six skill groups, forbidden-claim patterns, employer-keyed résumé responsibilities, and granular `sourceRef` mappings; do not infer missing résumé details or expose the manifest as production content.
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1–2.9, 3.1–3.10, 4.1–4.9, 5.1–5.15, 6.1–6.8, 7.1–7.7, 9.7_

  - [ ]* 1.2 Implement the aggregate static-content and markup validator
    - Add a pure JavaScript checker for `index.html`, `test-lab.html`, and `script.js` that reports all missing canonical values, placeholders, forbidden claims, unsupported actions, bad contact semantics, missing skills, incorrect card counts, cross-employer responsibilities, unresolved local links, duplicate IDs, and nested anchors in one run.
    - Keep validation test-only and dependency-free, and provide a single-run Node entry point rather than a watcher or production build step.
    - _Requirements: 2.10, 8.1–8.5, 8.9–8.11, 9.1–9.7, 9.12_

  - [ ]* 1.3 Write deterministic unit tests for validator violation categories
    - Cover a valid fixture plus focused mutations for exact profile/employment/education values, placeholders, forbidden content, contact URI/display mismatches, static LinkedIn semantics, skill omissions, duplicate cards/IDs, nested links, and unresolved navigation targets.
    - _Requirements: 8.3, 8.9, 9.2–9.6, 9.12_

- [x] 2. Replace main portfolio content with résumé-backed details
  - [x] 2.1 Update identity, profile, contact, and supported actions in `index.html`
    - Apply the canonical full name, `QA Automation Engineer/SDET`, both exact experience statements, Visakhapatnam, email display/`mailto:`, and phone display/`tel:` everywhere applicable; render `@harsha1919` as accessible non-clickable text.
    - Remove placeholders, unsupported LinkedIn/GitHub or project actions, metrics, availability/proficiency claims, and AI/MCP/steering/prompt-generation/leadership claims; replace the AI-themed sample with a résumé-backed Playwright/TypeScript example while preserving section IDs, local calls to action, contact form behavior, classes, and visual identity.
    - _Requirements: 1.1–1.5, 2.1–2.9, 3.1–3.8, 3.10, 5.14, 5.15, 8.1–8.3, 8.6, 8.8, 8.9, 8.11_

  - [x] 2.2 Render all six résumé-backed skill groups in `index.html`
    - Reuse the existing skill-card, tag, tilt, and reveal contracts while rendering every exact label from Requirements 4.1–4.6, including separate `Enterprise Graph` and `IEG` labels.
    - Remove unsupported skills, proficiency percentages, progress bars, and AI-themed category claims without changing the site’s card treatment or responsive grid identity.
    - _Requirements: 4.1–4.9, 8.6, 8.7_

  - [x] 2.3 Consolidate and correct employment history in `index.html`
    - Produce exactly one Infor card with the canonical title, employer, location, period, all six responsibility groups, and every additional résumé-supplied Infor responsibility retained once under the correct employer.
    - Produce one HCL card titled `Associate—SCM Administration` with the exact employer, location, period, and only résumé-supplied HCL responsibilities; remove duplicate/misattributed details, `SCCM Administrator`, unsupported metrics, URLs, AI/MCP, and leadership wording while retaining timeline classes and layout behavior.
    - _Requirements: 1.6, 1.7, 5.1–5.15, 6.1–6.8, 8.6, 8.7_

  - [x] 2.4 Replace education with the single canonical record in `index.html`
    - Keep one existing-style education card for `B.Tech EEE`, `Vignan's Institute of Information Technology`, `01/2016–12/2020`, and `CGPA 7.8`; remove Intermediate, S.S.C, and any other unsupported record or percentage implication.
    - _Requirements: 7.1–7.7, 8.6, 8.7_

  - [ ]* 2.5 Write the property test for required skill grouping
    - **Property 6: Skill grouping preserves the required manifest**
    - Generate permutations and regroupings and require every exact skill to remain in its assigned group while unsupported personal skills are rejected.
    - **Validates: Requirements 4.8, 4.9, 9.6**

  - [ ]* 2.6 Write the property test for Infor consolidation
    - **Property 7: Infor consolidation is unique and lossless**
    - Generate duplicate-card multisets and verify one output card contains the distinct résumé-backed detail set exactly once.
    - **Validates: Requirements 1.6, 5.1, 5.12, 5.13**

  - [ ]* 2.7 Write focused unit tests for main portfolio content
    - Assert exact profile/contact fields, actionable email/phone semantics, static LinkedIn behavior, six complete skill groups, two correctly attributed employment cards, one canonical education card, forbidden-content absence, and the separate `Enterprise Graph`/`IEG` edge case.
    - _Requirements: 2.1–2.9, 3.1–3.10, 4.1–4.9, 5.1–5.15, 6.1–6.8, 7.1–7.7_

- [x] 3. Align Test Lab content and shared JavaScript behavior
  - [x] 3.1 Make only owner-related corrections in `test-lab.html`
    - Change Harsha’s role and matching sample assertion to `QA Automation Engineer/SDET`, apply the canonical owner name and email action in the footer, update any other owner contact duplicate to its canonical value, and remove unsupported personal LinkedIn/GitHub anchors without guessing URLs.
    - Preserve every existing `data-testid`, element ID, local navigation destination, generic fixture, row/control count, form outcome, dialog behavior, and indeterminate-checkbox contract.
    - _Requirements: 1.4, 2.1, 2.3, 2.4, 2.7–2.10, 8.1–8.3, 8.5, 8.9–8.11_

  - [x] 3.2 Restrict résumé-adjacent labels and guard shared initializers in `script.js`
    - Limit typewriter roles to the two canonical labels, remove résumé-related metric/counter and unsupported claim behavior, and make typewriter, hero-stat, contact-form, and other page-specific initializers safe no-ops when target nodes are absent.
    - Preserve particle, cursor, navigation, reveal, tilt, smooth-scroll, form-feedback, and Test Lab behaviors when their elements exist, introducing no new external calls or page errors.
    - _Requirements: 1.5, 3.4–3.9, 8.1, 8.4, 8.9, 8.10, 9.11_

  - [ ]* 3.3 Write the property test for typewriter role safety
    - **Property 5: Typewriter labels are source-backed**
    - Generate role sequences and verify validity exactly matches membership in the canonical allowlist throughout cycling, deletion, and repetition.
    - **Validates: Requirements 3.9, 8.4**

  - [ ]* 3.4 Write unit tests for shared-script guards and Test Lab contracts
    - Exercise initializers with typewriter, hero stats, and contact form both present and absent; assert no missing-node error and unchanged Test Lab selectors, row count, form result, dialog, and indeterminate-checkbox behavior.
    - _Requirements: 8.5, 8.9, 8.10, 9.10, 9.11_

- [x] 4. Preserve responsive presentation and wire the updated markup
  - [x] 4.1 Add only component-scoped responsive rules to `styles.css`
    - Style semantic responsibility groups and static contact rows using existing variables and breakpoints; allow long labels and timeline metadata to wrap, use two columns only where space permits, collapse by `768px`, and prevent narrow-screen hover translation or horizontal overflow.
    - Retain existing typography, gradients, spacing, card treatments, animations, auto-flow grids, and anchor focus affordances; ensure non-clickable LinkedIn content has no link-like cursor, transform, or focus treatment.
    - _Requirements: 8.6–8.8, 9.8_

  - [x] 4.2 Reconcile HTML, CSS, and JavaScript hooks across both pages
    - Wire the new semantic content to existing classes and guarded initializers, remove only selectors/hooks orphaned by deleted metrics, progress bars, duplicate cards, or social actions, and keep script inclusion, section IDs, local destinations, accessible labels, and remaining interaction contracts intact.
    - Correct any duplicate IDs or invalid anchor nesting introduced or exposed by consolidation without redesigning either page.
    - _Requirements: 8.1, 8.2, 8.6–8.10, 9.12_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Add cross-file property and integration coverage
  - [ ]* 6.1 Write the property test for résumé provenance and attribution
    - **Property 1: Résumé provenance and employer attribution**
    - Generate supported and unsupported statements plus employer mappings, requiring every retained item to have a source record and appear only under its source employer.
    - **Validates: Requirements 1.1, 1.2, 1.6, 1.7, 5.12, 6.5, 6.7, 6.8, 9.7**

  - [ ]* 6.2 Write the property test for canonical convergence
    - **Property 2: Canonical values converge across occurrences**
    - Generate stale duplicates across both HTML sources and résumé-adjacent script content and verify replacement yields one canonical value per governed field.
    - **Validates: Requirements 1.3, 2.1, 2.3–2.6, 2.10, 8.1**

  - [ ]* 6.3 Write the property test for contact normalization
    - **Property 3: Contact display/action normalization**
    - Generate valid and mutated email/phone display-action pairs and reject every pair whose normalized display differs from the exact `mailto:` or `tel:` URI.
    - **Validates: Requirements 2.4, 2.6, 8.2, 9.5**

  - [ ]* 6.4 Write the property test for unsupported-claim exclusion
    - **Property 4: Unsupported personal claims are excluded**
    - Generate combinations of unsupported metrics, status, proficiency, leadership, AI, MCP, steering, prompt-engineering, and test-generation claims and require their removal/reporting.
    - **Validates: Requirements 3.4–3.8, 3.10, 4.9, 5.14, 8.4**

  - [ ]* 6.5 Write the property test for local-navigation integrity
    - **Property 8: Local navigation has referential integrity**
    - Generate local document/fragment links and verify each resolves to an existing file and exactly one target element.
    - **Validates: Requirements 8.9**

  - [ ]* 6.6 Write the property test for omission and placeholder detection
    - **Property 9: Static validation detects omissions and placeholders**
    - Remove generated non-empty subsets of required values/skills or insert contact placeholders, then require complete, non-spurious reporting.
    - **Validates: Requirements 8.3, 9.2, 9.3, 9.6**

  - [ ]* 6.7 Write the property test for forbidden mutations
    - **Property 10: Static validation detects every forbidden mutation**
    - Insert generated combinations of forbidden claims/metrics, stale HCL title, duplicate Infor/education cards, malformed contact actions, and clickable handles and require one report per introduced category.
    - **Validates: Requirements 9.4, 9.5**

  - [ ]* 6.8 Write the property test for structural markup validity
    - **Property 11: Markup identifiers and links remain structurally valid**
    - Generate IDs and anchor structures and accept only documents with unique non-empty IDs and no nested hyperlinks.
    - **Validates: Requirements 9.12**

  - [ ]* 6.9 Write the real-source static integration test
    - Run the aggregate validator against the completed `index.html`, `test-lab.html`, and `script.js`, require zero violations, and print actionable file/location diagnostics plus provenance references on failure.
    - _Requirements: 9.1–9.7, 9.12_

- [x] 7. Add automated browser smoke coverage
  - [x]* 7.1 Write desktop/mobile browser smoke checks for both pages
    - Using only the validation environment’s supplied browser runner, load `index.html` and `test-lab.html` at `1280 × 720` and `390 × 844`; assert recognizable section/card layout, wrapping without horizontal overflow or clipping, working desktop/mobile local navigation, exact actionable email/phone links, and non-focusable/non-clickable LinkedIn content.
    - Exercise contact-form feedback and all Test Lab outcomes/selectors, collect page and console errors throughout, and fail on any new résumé-update runtime error; do not add a project dependency or alter production behavior for the tests.
    - _Requirements: 8.6–8.10, 9.8–9.12_

- [x] 8. Final checkpoint - Complete required résumé and release validation
  - Verify every retained personal/professional statement and employer responsibility has a source reference to the supplied résumé; if the source is unavailable or a fact cannot be traced, stop and obtain clarification rather than infer content.
  - Run the aggregate static-content and markup check, or an equivalent repeatable inspection if optional test tooling was skipped, across `index.html`, `test-lab.html`, and `script.js`; require exact canonical values and contact URIs, full skill coverage, valid markup/navigation, and zero placeholders, unsupported claims/actions, duplicate canonical records, or cross-employer attributions.
  - Run the required browser smoke check on both pages at `1280 × 720` and `390 × 844`; confirm exact actionable email/phone links, static LinkedIn semantics, preserved layout/navigation/Test Lab behavior, and zero new console errors.
  - Ensure every implemented test passes before release.
  - _Requirements: 1.1–1.7, 2.1–2.10, 3.1–3.10, 4.1–4.9, 5.1–5.15, 6.1–6.8, 7.1–7.7, 8.1–8.11, 9.1–9.12_

## Notes

- Tasks marked with `*` are optional test/tooling work and may be skipped for a faster MVP only when Task 8's equivalent mandatory provenance, static, markup, and browser checks are still completed; all unmarked implementation and release-validation tasks are required.
- Each property test is isolated in its own task-specific test module, runs at least 100 generated iterations, uses the exact design traceability tag, and avoids browser launches, network access, and file writes inside randomized iterations; other same-wave test tasks likewise use separate files.
- The résumé source and granular requirement references govern every retained personal/professional statement; unsupported or unattributed text is removed rather than inferred.
- Keep the deployed site dependency-free: use built-in JavaScript/Node capabilities for source checks and a browser runner supplied by the validation environment.
- Checkpoints provide incremental validation without adding deployment, manual acceptance, documentation, or redesign work.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "3.2"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.4"] },
    { "id": 2, "tasks": ["1.3", "2.3", "3.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["2.7", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"] },
    { "id": 6, "tasks": ["6.9", "7.1"] }
  ]
}
```
