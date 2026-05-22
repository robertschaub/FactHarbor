# V2 Slice HJ47 - One-Hop Source Material Locator Expansion

**Status:** locally implemented and verifier-clean; one HJ47 live job pending committed runtime refresh
**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ45 bounded XLSX Source Material and HJ46 downloadable query intent

## Why This Slice Exists

HJ45 proved the XLSX materializer is locally verifier-clean, but live source
material produced zero XLSX records. HJ46 tried a prompt-only query-intent
repair; the live job reached the official statistics landing page but still
emitted no downloadable/file-format query, created zero XLSX Source Material
records, and stopped at W5 with no extractable evidence.

Steer-Co and Claude Opus both returned `MODIFY`: HJ47 is justified only as
bounded one-hop same-host HTML locator expansion, not semantic archive/detail
selection and not crawler growth.

## Scope

Amend the existing Serper linked-page/XLSX Source Material seam:

- from an already fetched safe same-host HTML/text page;
- only when direct XLSX discovery on that page returns zero records;
- discover same-host HTTPS HTML links structurally in document order;
- fetch at most two expansion HTML pages per landing page and at most four
  expansion HTML pages per run;
- do not expand from an expanded page;
- run existing HJ45 same-host XLSX discovery on the expanded page, then stop;
- preserve existing fallback to linked-page text or search-preview Source
  Material when expansion yields no XLSX.

Closed:

- source/domain/institution/topic hardcoding;
- deterministic semantic link ranking by anchor text, title, surrounding text,
  or source knowledge;
- broad crawler behavior or recursive expansion;
- direct URL or ACS support;
- provider expansion;
- prompt/model/config/schema changes;
- public behavior;
- cache/SR/storage behavior;
- V1 work.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ45/HJ46 live evidence.

Chosen path: amend the existing Serper/XLSX seam with one-hop same-host HTML
locator expansion. This is lower net complexity than adding a provider, a broad
parser framework, direct URL support, or another prompt-only repair after HJ46
failed to produce downloadable intent.

Rejected paths:

- semantic "archive/detail/download" link selection;
- source-specific locator rules;
- recursive crawling;
- feeding expansion metadata into prompts;
- downstream report or W5 relaxation before source-native material exists.

Net complexity: one bounded helper and one existing-seam extension. No new
route, artifact family, provider, public surface, or downstream stage.

Removal/merge trigger: before public cutover, consolidate HJ45/HJ47 into the
general Source Material locator policy or remove it if live evidence shows it
does not materially improve source-native data recovery.

## V2 Scorecard Impact

Positive: targets direct source-native evidence for a report-quality defect
observed in multiple complete internal Alpha reports.

No scorecard claim: HJ47 is a source-material reachability repair. Report
quality still needs live evidence and report review after the repair.

## V2 Retirement Ledger Impact

No new hidden route or denial layer. Existing HighJump source-material
mechanisms gain a consolidation/removal trigger before public cutover.

## V2 Consolidation Gate

Allowed because it:

- advances report-quality value directly;
- amends an existing mechanism instead of adding a parallel system;
- has hard depth and count caps;
- has a clear one-live-job stop condition.

## Verification Plan

Before live job:

- focused XLSX helper tests;
- focused Serper Source Material tests;
- focused downstream Source Material/W4/W5 handoff tests;
- boundary guard;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- clean git status, runtime refresh, Web/API/proxy version match.

Local verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts` - pass, 3 files / 19 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts` - pass, 4 files / 29 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` - pass, 1 file / 96 tests.
- `npm run validate:v2-gates` - pass.
- `npm run debt:sensors` - `advisory_warn`; salient warnings remain V2/test/boundary-guard/docs footprint and existing consolidation-marker review items.
- `npm -w apps/web run build` - pass; prompts/config reseed unchanged.

Live validation:

- exactly one HJ47 job for the Captain-defined input
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- record whether one-hop expansion fetched pages;
- record whether Source Material includes
  `provider_search_result_xlsx_text_bounded` / `ep_serper_linked_xlsx_fetch`;
- record whether W5 receives XLSX-derived source-content packets;
- preserve public/default containment checks.

## Stop Conditions

Stop and reconvene Steer-Co if:

- HJ47 requires semantic link ranking or source-specific rules;
- the live job still produces zero XLSX records after one-hop expansion;
- XLSX material appears but W5 still returns `no_extractable_evidence`;
- hidden text leaks to public/default admin/log/error surfaces;
- runtime commit cannot be matched to committed source;
- any proposed next step would require provider expansion, public behavior,
  cache/SR/storage, direct URL/ACS, recursive crawling, or V1 work.
