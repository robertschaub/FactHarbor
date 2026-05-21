# V2 Slice W6-E Query-Balanced Source Material Selection Review Package

**Status:** Steer-Co review package
**Date:** 2026-05-21
**Author:** Captain Deputy
**Package type:** bounded implementation review package
**Prerequisites:** W6-D3 containment repair result `433c84da`

## Purpose

Improve retrieval balance before W6-C without weakening W6 or relaxing W7.

W6-D proved that fetching three page summaries through the existing approved
Wikimedia path is product-route reachable and contained, but the selected
records still left W6-C at `refine_retrieval`. The observed fan-in shape was
still same-provider and structurally clustered by the earliest candidate order.

W6-E should rebalance the existing W3-B page-summary selection across distinct
provider-attempt/query groups before taking additional candidates from the same
group. This is a structural diversity repair inside the existing provider and
endpoint path, not provider expansion.

## Proposed Implementation Shape

Implement one bounded structural selection change in the existing W3-B Source
Material page-summary owner:

- keep the hard cap `SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN = 3`;
- keep the existing approved Wikimedia search and page-summary endpoints;
- keep sequential fetches and no retries;
- keep provider/locator/page-key dedupe;
- derive each locator's structural group from its matching W3-A preview record's
  `providerAttemptOrdinal`;
- do not add `providerAttemptOrdinal` to the locator type; join from locator
  `candidatePreviewId` to `previewDecision.previewRecords`;
- select at most one eligible locator from each distinct provider-attempt group
  in first pass, preserving original preview/candidate order inside each group;
- iterate distinct provider-attempt groups by ascending `providerAttemptOrdinal`
  so output does not depend on incoming locator-array order;
- if fewer than three groups have eligible locators, fill remaining slots from
  the remaining eligible locators in original order;
- preserve deterministic structural behavior only; do not inspect or rank
  titles, snippets, summaries, or source text semantically.

Expected behavior with three accepted query/provider attempts:

- current W6-D often selects `1_1`, `1_2`, `1_3`;
- W6-E should prefer `1_1`, `2_1`, `3_1` when those locators are eligible;
- fallback remains `1_1`, `1_2`, ... only when later groups have no eligible
  locators.

## Accepted Inputs

W6-E may read only existing runtime-owned W3-A/W3-B structures:

- `EvidenceLifecycleSourceCandidatePreviewDecision.previewRecords`;
- `SourceMaterialPageSummaryFetchLocator[]`;
- W3-A structural fields: `candidatePreviewId`, `providerAttemptOrdinal`,
  `candidateOrdinal`, `materializationStatus`;
- W3-B structural fields: `candidatePreviewId`, `eligibility`, `locatorRef`,
  `pageKeyHash`, `providerId`.

W6-E must not use:

- title/excerpt/description text;
- page summary text;
- EvidenceItem text;
- prompt text;
- provider raw payload;
- public result data;
- semantic or language-dependent rules.

## Output And Artifact Shape

No new route or artifact sink is required.

W6-E may add bounded structural diagnostics to the existing W3-B decision only
if needed for reviewability. Preferred minimal path: focused tests prove the
selection order without adding runtime fields. If diagnostics are added, they
must be hidden/admin-only, text-free, and limited to counts/ordinals/reasons.

## V2 SCORECARD IMPACT

W6-E directly targets report-quality value: it attempts to improve source
coverage breadth before sufficiency assessment while preserving the existing
quality bar. It is a better next move than W6 prompt weakening because W6-C has
already accepted the schema and explicitly requested retrieval refinement.

## V2 RETIREMENT LEDGER IMPACT

If W6-E passes locally and in a later canary, downgrade W6-D same-first-group
selection to superseded behavior. If W6-E still leaves W6-C at
`refine_retrieval`, retire same-provider Wikimedia-only refinement as
insufficient and open a separately reviewed provider/source diversity package.

## V2 CONSOLIDATION GATE

Pass. W6-E amends an existing source-selection mechanism rather than adding a
new hidden route, new provider, or new stage. It reduces the need for repeated
same-path canaries by making the existing three-record cap more representative.

Latest debt-sensor status before this package: `advisory_warn` on 2026-05-21,
with known V2 source/test/boundary/docs footprint warnings.

## Verifier Plan

Implementation verifier set:

- focused W3-B source-material page-summary owner tests covering:
  - one-per-provider-attempt/group first-pass selection;
  - fallback fill when fewer than three groups are eligible;
  - dedupe still wins over grouping;
  - output is independent of incoming locator-array order for distinct groups;
  - no text/semantic fields are used by the selector;
- focused downstream runtime owner chain tests touched by W3-B/W4/W5 fan-in;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- `npm run validate:v2-gates`;
- `node scripts/validate-v2-gate-register.mjs --self-test`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `git diff --check`;
- `git status --short --untracked-files=all`.

## Optional Canary Proposal

After implementation commit, runtime refresh, and route preflight, one later
product-route canary may be worth spending if the recorded live-job budget is
not below `2` and Steer-Co confirms the expected signal is worth the slot.

Canary pass/stop classification should distinguish:

- containment pass/fail;
- W3-B selected provider-attempt group count;
- default-admin leak-key scan over all captured W3/W4/W5/W8 artifacts;
- W5 EvidenceItem count and schema diagnostics;
- W6-C recommendation movement.

If W6-C remains `refine_retrieval` after W6-E with at least two structurally
distinct provider-attempt groups, stop same-provider refinement and prepare a
provider/source diversity package.

## Approval Boundaries

This package would authorize implementation only after review approval.

It does not authorize:

- live job by itself;
- second provider or provider expansion;
- W2 endpoint migration;
- W3-C source-material widening beyond the existing page-summary path;
- full page/source/html fetch;
- parser execution;
- cache/SR/storage;
- prompt/model/config/schema/UCM/gateway changes;
- W6 prompt weakening;
- W7 gate relaxation;
- report/verdict/warning/confidence publication;
- public/API/UI/report/export/compatibility behavior;
- ACS/direct URL support;
- V1 work or V1 cleanup.

## Review

| Reviewer | Result | Notes |
|---|---|---|
| Claude Opus 4.6 senior architect/security via `scripts/agents/invoke-claude.cjs` | `APPROVE` | Confirmed W6-E is the correct next bounded package after W6-D3, keeps grouping structural-only, preserves provider cap `3`, avoids provider/prompt/schema/public/V1 expansion, and has adequate verifiers. Applied non-blocking reviewer amendments: derive group by joining locator `candidatePreviewId` to W3-A preview records rather than widening locator type; make provider-attempt group iteration order explicit; add verifier coverage for locator-array order independence; and require the later canary to repeat the default-admin leak-key scan. |

## Stop / Escalation Triggers

Stop and reconvene Steer-Co if implementation requires:

- semantic text ranking or hardcoded topic/keyword rules;
- changing query planning prompts/models/configs;
- provider expansion or endpoint migration;
- increasing the fetch cap above `3`;
- adding a new hidden route/sink;
- exposing text in default admin/public/log/error surfaces;
- weakening W6 or relaxing W7;
- any failed verifier with unclear root cause.
