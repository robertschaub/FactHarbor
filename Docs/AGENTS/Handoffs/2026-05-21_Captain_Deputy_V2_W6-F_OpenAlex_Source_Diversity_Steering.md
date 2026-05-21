# 2026-05-21 - Captain Deputy - V2 W6-F OpenAlex Source Diversity Steering

## Context

W6-E canary job `6a09d149d5d046cb95d0cdd67e02c095` proved query-balanced same-provider Wikimedia selection across three provider-attempt groups, with W5 accepting `3` EvidenceItems and containment holding. W6-C still returned `reportStopRecommendation = refine_retrieval`, so same-provider refinement is exhausted as the active next path.

Current live-job tranche ledger records `currentRemaining = 1`.

## Work Completed

Prepared the W6-F steering package:

- `Docs/WIP/2026-05-21_V2_Slice_W6-F_OpenAlex_Provider_Source_Diversity_Steering_Package.md`

The package records Steer-Co direction to prepare W6-F1 as an OpenAlex-first provider/source diversity implementation package before W6-C. It authorizes no code and no live job by itself.

Status pointers were updated:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Steer-Co Outcome

Consent direction: proceed to a W6-F1 OpenAlex bounded academic Source Material diversity package.

Claude Opus 4.6 reviewed the direction and supported OpenAlex first. Rationale: V2 already has a disabled `openalex` provider seam, OpenAlex gives academic/source-type diversity, and it avoids clean-room pressure from the existing V1 Semantic Scholar provider implementation.

The Gemini-style independent lane was unavailable because the session had reached the subagent/thread limit. The decision is intentionally bounded to a review/package direction and remains reversible before implementation.

## Key Decisions

- Do not continue same-provider Wikimedia refinement after W6-E.
- Do not weaken W6 sufficiency prompts or relax W7 readiness gates.
- Prepare W6-F1 as one bounded OpenAlex path, not a generic provider framework.
- Keep Semantic Scholar deferred; any future Semantic Scholar package must be clean-room and must not reuse/clone V1 provider code.
- Do not spend the remaining live-job slot until OpenAlex credential/no-key posture is settled.

## W6-F1 Package Direction

The next package should define:

- provider id `openalex`;
- endpoint id `ep_openalex_works_search`;
- endpoint `GET https://api.openalex.org/works`;
- bounded `search`, `per_page`, `select`, and optional `api_key` handling;
- hidden/admin-only candidate previews and at most one OpenAlex bounded Source Material record;
- total Source Material cap remains `3`;
- OpenAlex `abstract_inverted_index` handled only as a bounded structured JSON transform;
- default admin artifacts remain hash/length/provenance-only;
- no public behavior, parser, cache/SR/storage, report/verdict/warning/confidence behavior, ACS/direct URL, V1 work, or V1 cleanup.

## V2 Scorecard Impact

W6-F targets direct report-quality progress by addressing the concrete retrieval-diversity blocker that remains after W6-D/W6-E. It advances evidence acquisition and evidence quality without lowering sufficiency quality.

## V2 Retirement Ledger Impact

Relevant existing rows:

- `V2-RL-005`: W2 transport diagnostics must not grow further without retirement.
- `V2-RL-008`: W3-B remains keep but begins transition from Wikimedia-specific Source Material toward a bounded multi-provider Source Material owner.

W6-F1 should add a new row for OpenAlex bounded academic Source Material diversity with a canary-based quarantine trigger.

## Debt Sensor

Latest debt sensor status: `advisory_warn`.

Salient context: V2 source/test/docs footprint and boundary guard size remain above advisory thresholds. W6-F is a justified missing-capability package only because W6-E left W6-C at `refine_retrieval`; W6-F1 must include a removal/quarantine trigger.

## Warnings

- W6-F does not authorize implementation by itself.
- No live job is authorized by W6-F.
- The remaining live-job slot must not be spent before OpenAlex credential/no-key posture is explicit.
- Stop if W6-F1 requires a generic provider framework, V1 provider reuse, W6 prompt weakening, W7 gate relaxation, source text in public/default-admin/log/error surfaces, or total Source Material cap above `3`.

## Next Step

Prepare W6-F1 OpenAlex bounded academic Source Material diversity package, then review/implement inside that package if approved by Captain Deputy/Steer-Co and verifier boundaries remain clear.
