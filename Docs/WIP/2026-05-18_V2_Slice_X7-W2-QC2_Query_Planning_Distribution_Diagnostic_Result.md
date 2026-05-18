# V2 Slice X7-W2-QC2 Query Planning Distribution Diagnostic Result

**Date:** 2026-05-18
**Status:** complete
**Owner:** Lead Developer / Captain Deputy
**Implementation commit:** `046acef8928390d6173057129b435a83feffc2d4`
**Source package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC2_Query_Planning_Distribution_Diagnostic_Source_Package.md`

## 1. Purpose

X7-W2-LS1 failed partly because W2 blocks when accepted Query Planning emits more than 2 query entries. QC2 measured Query Planning cardinality without using the product route and without invoking Source Acquisition, W2, provider-network execution, parser/content handling, cache/SR/storage, EvidenceCorpus, report, verdict, warning, confidence, public output, ACS/direct URL, or V1 code.

## 2. Harness

Implemented and committed:

- `scripts/v2/diagnostics/query-planning-distribution.ts`
- `apps/web/test/unit/scripts/query-planning-distribution-boundary.test.ts`

The harness runs one Captain-defined direct-text input at a time, executes Claim Understanding plus Query Planning only, and stops at `STOP_AFTER_QUERY_PLANNING_INSPECTION`.

The boundary test enforces an exact import allowlist and blocks references to Source Acquisition, candidate-provider network, content/parser owners, V1 analyzer modules, product/public route entry points, cache/SR/storage, report, verdict, warning, and confidence paths. The test masks exact Captain-defined input literals before broad blocked-owner scans so approved input wording cannot weaken the structural fence.

## 3. Verification Before Diagnostic Run

```powershell
npm -w apps/web run test -- test/unit/scripts/query-planning-distribution-boundary.test.ts
npx tsx ../../scripts/v2/diagnostics/query-planning-distribution.ts --list-inputs
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

Result: pass. The implementation was committed before the model diagnostic so the recorded commit maps to the harness actually used.

## 4. Diagnostic Inputs And Results

All inputs are exact Captain-defined inputs.

| Input key | Claim Understanding status | Selected AtomicClaims | Query Planning status | Query entries | W2 cap 2 compatible | CU tokens / ms | QP tokens / ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| `swiss_asylum_population` | accepted | 1 | accepted | 2 | yes | 3347 / 3447 | 2897 / 5003 |
| `bolsonaro_fair_trial` | accepted | 2 | accepted | 5 | no | 3540 / 4238 | 3404 / 6876 |
| `hydrogen_cars_efficiency` | accepted | 1 | accepted | 3 | no | 3218 / 3358 | 2885 / 5177 |

Shared provenance:

- Commit: `046acef8928390d6173057129b435a83feffc2d4`
- Model policy snapshot hash: `a561f8da035703eb3d0d74d36e596bc5046ff6395959af1a9c646f9dc3c0e653`
- Claim Understanding prompt content hash: `8621b011ed1fabf694cc1fd67650562efff57ce6c02cd6ecdb5ff7bcffb2bd12`
- Claim Understanding config snapshot hash: `c04b0eae839e190feba3452ff954ef98382cde1104e339ab7132d9747fb9e0f9`
- Query Planning config snapshot hash: `f93669f51d5b820346bcd1f1fd1a5ff18a39a7779403d949c89fcf1a33f88c92`
- Model: `claude-haiku-4-5-20251001`

## 5. Interpretation

The compatible-canary path is not a good next default. It would select around the W2 cap instead of fixing a real mismatch between accepted Query Planning output and W2's current `2` query-entry limit.

The evidence supports a reviewed W2 cap-alignment source package. The low-complexity direction is to align W2's accepted query-entry cap with the existing Query Planning accepted-output maximum, while preserving all current W2 containment:

- one provider;
- hidden/admin-only artifact;
- no source material;
- no content dereference;
- no parser/cache/SR/storage;
- no EvidenceCorpus/evidence/report/verdict/warning/confidence behavior;
- no public output;
- no ACS/direct URL;
- no V1 reuse/work/cleanup.

## 6. Residual Risk

The diagnostic used three Captain-defined inputs, not a broad benchmark. That is enough to reject "find one compatible canary" as the next default, but it does not prove the final production query budget. A W2 cap-alignment package should therefore keep strict provider/candidate/byte/time limits and use a narrow live smoke before broader expansion.

## 7. Next Recommended Package

Prepare `X7-W2-QC3` as a reviewed W2 cap-alignment source package. It should be narrower than a provider expansion package and should only change the W2 query-entry acceptance posture plus focused tests/guards needed to prove:

- accepted Query Planning outputs up to the existing Query Planning maximum are admitted;
- W2 still fails closed above that maximum;
- provider attempts remain bounded;
- no raw query/provider payload leaks;
- no downstream source material/content/parser/evidence/report/public behavior is unlocked.
