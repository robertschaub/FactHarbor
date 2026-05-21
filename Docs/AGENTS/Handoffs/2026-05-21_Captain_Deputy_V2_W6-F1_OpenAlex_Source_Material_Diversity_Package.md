# 2026-05-21 - Captain Deputy - V2 W6-F1 OpenAlex Source Material Diversity Package

## Context

W6-E proved query-balanced same-provider Wikimedia selection but W6-C still recommended `refine_retrieval`. W6-F set the OpenAlex-first provider/source diversity direction. W6-F1 is the next implementation package to test source-type diversity without weakening sufficiency quality or relaxing W7.

## Work Completed

Prepared and amended:

- `Docs/WIP/2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md`

Updated:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Review Outcome

Claude Opus 4.6 reviewed the package and returned `APPROVE_WITH_AMENDMENTS`.

Required amendments were applied:

- W6-F1 explicitly authorizes the minimal two-endpoint budget/authority hash widening needed because the current W2 network factory validates all endpoints against a single endpoint hash.
- W6-F1 now defines a merge preference rule: if OpenAlex produces an eligible Source Material record, include exactly one OpenAlex record before filling remaining slots with Wikimedia records, with total records still capped at `3`.
- W6-F1 now requires any no-key live-use approval to explicitly acknowledge the asymmetry between OpenAlex documentation marking `api_key` as required and the observed local no-key HTTP `200` probe.

## Authorized Local Implementation Scope

W6-F1 may implement one bounded OpenAlex Works path:

- provider id `openalex`;
- endpoint id `ep_openalex_works_search`;
- `GET https://api.openalex.org/works`;
- fixed selected fields;
- optional secret-preserving `api_key` handling;
- OpenAlex candidate preview/source-material projection;
- bounded structural `abstract_inverted_index` reconstruction;
- closed source-material kind union of `wikimedia_page_summary_extract_text` and `openalex_work_abstract_text`;
- minimal downstream W4/W5/W6 contract widening needed for that union.

No live job is authorized by this package.

## Warnings

- Remaining live-job budget is `1`.
- Do not spend the remaining live-job slot until W6-F1 is committed/verifier-clean and credential/no-key posture is explicit.
- Stop if implementation requires generic provider framework work, Semantic Scholar, V1 provider reuse, public behavior, parser/cache/SR/storage, report/verdict/warning/confidence behavior, W6 prompt weakening, W7 relaxation, cap above `3`, or deterministic semantic ranking.

## Debt Sensor

Latest `npm run debt:sensors`: `advisory_warn` at 2026-05-21T04:54:33.279Z.

This package accepts a bounded missing-capability mechanism increase with a canary-based quarantine trigger.

## Next Step

Proceed with W6-F1 local implementation inside the approved envelope, then run the required verifier set. Do not run a live canary until the package is committed, runtime is refreshed, route/leak preflight passes, and credential/no-key posture is approved.
