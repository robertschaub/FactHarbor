# V2 Slice W6-D Retrieval Refinement Canary Result

**Status:** `STOP_X7_W6_D_DEFAULT_ADMIN_BOUNDED_TEXT_SIDECAR_ARRAY_LEAK`
**Date:** 2026-05-21
**Implementation commits:** W6-D1 `1abfacf9`, W6-D2 `67161341`
**Execution package:** `Docs/WIP/2026-05-21_V2_Slice_W6-D_Product_Route_Canary_Package.md`
**Runtime commit:** `0940cae9e4350d392dea405c473835c10597cac8`
**Job:** `cc1700dd7ae544d4877482f93d399474`
**Containment repair commit:** `8dcbb982`

## Classification

The W6-D product-route canary must not be recorded as a pass.

The job reached the intended hidden V2 chain and proved W6-D page-summary fan-in
was product-route reachable, but the default-admin W4-G bounded-text artifact
route exposed bounded source text through the plural `boundedTextSidecars[]`
projection. The singular sidecar projection remained redacted; the array added
by W6-D1 had not been redacted by the existing default projection helper.

This is a containment stop:

- classification: `STOP_X7_W6_D_DEFAULT_ADMIN_BOUNDED_TEXT_SIDECAR_ARRAY_LEAK`;
- one live-job slot is consumed;
- no second W6-D canary is authorized by this result;
- any repair rerun must use a separate reviewed package and must not be treated
  as a victory-lap canary.

## Hidden Chain Evidence

Same-ledger id:

- `cc1700dd7ae544d4877482f93d399474:precutover-observability`

Captured artifacts were stored locally under:

- `test-output/live/w6d-canary-cc1700dd7ae544d4877482f93d399474/`

Observed hidden-chain state:

- W2 candidate provider network: `candidate_provider_network_completed`.
- W3-A source candidate preview: `source_candidate_preview_materialized`.
- W3-B Source Material: `source_material_page_summary_completed`.
- W3-B record count: `3`.
- W3-B attempted fetch count: `3`.
- W3-B fetch diagnostic count: `3`.
- W4-A corpus admission readiness: `source_material_structurally_admissible_evidence_corpus_gate_closed`.
- W4-G aggregate bounded-text sidecar path was present.
- W4-H extraction-input packet count: `1`.
- W4-H aggregate packet bytes: `1941`, within the `4096` cap.
- W4-H provider id: `wikimedia_core`.
- W5 bounded EvidenceItem extraction: `hidden_evidence_item_extraction_completed`.
- W5 extraction result: `accepted`.
- W5 EvidenceItem count: `3`.
- W5 schema diagnostics: `null`.
- W6-C sufficiency: `sufficiency_assessment_completed`.
- W6-C result: `accepted`.
- W6-C schema diagnostics: `null`.
- W6-C report stop recommendation: `refine_retrieval`.
- W8-B status: `internal_alpha_report_result_blocked`.
- W8-B first incomplete stage: `boundary_verdict_candidate`.

W6-D therefore improved the evidence fan-in path from one Source Material record
to three, but it did not yet move W6-C away from `refine_retrieval`.

## Public Containment

Public V2 remained intentionally blocked:

- `_schemaVersion`: `4.0.0-cb-precutover`.
- `publicCutoverStatus`: `blocked_precutover`.
- public issue: `report_damaged`.
- public verdict/truth/confidence: not published.

The stop is limited to a default-admin hidden artifact projection. Public V2 did
not publish report/verdict/truth/confidence data.

## Default-Admin Containment Failure

The W4-G bounded-text default route violated the W4-G/W6-D redaction contract:

- `boundedTextAuthorization.boundedTextSidecar` was redacted.
- `boundedTextAuthorization.boundedTextSidecars[]` still included text.

The repair in `8dcbb982` amends the existing redaction helper to redact both
singular and plural sidecar projections and extends the route test to prove that
neither projection returns `text` by default.

Repair verifiers:

- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts`
- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

The first `next build` attempt failed in a corrupted generated
`apps/web/.next/dev/types/routes.d.ts` file. Debt-guard classified that as
generated-state corruption, not source regression. Removing only generated
`apps/web/.next` and rebuilding resolved it.

## Live-Job Budget

The active live-job tranche recorded `4` remaining before this W6-D canary.
This canary consumed `1`.

Remaining recorded budget after this result: `3`.

## Next Step

Do not rerun W6-D from this result package.

Recommended next action is a narrow W6-D containment repair rerun package:

- use repaired runtime containing `8dcbb982`;
- run the same W6-D route preflight with explicit default-admin leak checks for
  W4-G singular and plural sidecar projections;
- spend at most one live job if Steer-Co authorizes the rerun;
- classify the rerun on both containment and W6-C movement.

If containment passes but W6-C remains `refine_retrieval`, the next package
should target query/source diversity rather than W6 prompt weakening.
