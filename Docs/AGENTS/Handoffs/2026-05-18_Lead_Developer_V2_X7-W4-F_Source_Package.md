# Lead Developer Handoff: V2 X7-W4-F Product-Route Observability Canary Package

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** Review package prepared; implementation and live jobs blocked
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-F_Product_Route_Observability_Canary_Package.md`
**Baseline commit:** `2ba80404`

## Summary

Prepared the W4-F review package after W4-D and W4-E were accepted as verifier-clean local implementation slices.

The package recommends W4-F as a product-route observability bridge, not a positive source-text authorization step.
It proposes a later implementation that records one bounded hidden/admin-only W4-C/W4-D/W4-E chain artifact after the existing W3-B Source Material and W4-A readiness path.

The package may allow exactly one later product-route canary only after Steering acceptance, implementation commit, clean verifiers, runtime refresh, and route preflight.
The proposed canary uses the known W3-B-successful Captain-defined input `Using hydrogen for cars is more efficient than using electricity` and would count against the 4-job tranche.

## Recommended W4-F Shape

- Add one combined hidden/admin-only W4-C/W4-D/W4-E observability artifact.
- Wire only product-route reachability after W3-B and W4-A.
- Keep the public result envelope `4.0.0-cb-precutover` / `blocked_precutover`.
- Require W2 nonzero candidates/bytes, W3-B Source Material completion, W4-C admission, W4-D shell-only corpus, and W4-E shell-only extraction denial on the same ledger for pass.
- Stop after one canary if any hidden chain step is absent, if public V2 changes, or if hidden markers leak.

## Files Changed

- `Docs/WIP/2026-05-18_V2_Slice_X7-W4-F_Product_Route_Observability_Canary_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Verifiers

Passed before package commit:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
```

No live job is authorized by this package.

## Warnings

- W4-F is review-only at this point.
- Do not implement W4-F until Steering Board accepts the package.
- Do not run the proposed canary until implementation is approved, committed, verifier-clean, and runtime-refreshed.
- W4-F must not add source text authorization, extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, or V1 cleanup.

## Learnings

W4-D/W4-E local proof is not enough by itself because reviewers still need product-route evidence that W3-B through W4-E can execute in the real hidden route without public leakage.
The lowest-risk next step is a single observability chain artifact and one tightly scoped future canary, not source-text authorization.

## Next Recommended Step

Have Steering Board / Architect / Security review the W4-F package.
If accepted, implement only the package envelope, run the required local verifiers and route preflight, then run exactly one canary if explicitly authorized by the accepted package.
