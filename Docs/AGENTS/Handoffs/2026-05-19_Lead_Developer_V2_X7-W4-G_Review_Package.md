# Lead Developer Handoff - V2 X7-W4-G Bounded Corpus Text Authorization Review Package

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Model:** Codex (GPT-5.5)
**Status:** Review package prepared; no implementation or live job authorized
**Package:** `Docs/WIP/2026-05-19_V2_Slice_X7-W4-G_Bounded_Corpus_Text_Authorization_Review_Package.md`
**Parent live result:** `PASS_X7_W4_F_PRODUCT_ROUTE_OBSERVABILITY_CANARY`
**Remaining live-job budget:** `3`

## Task

Prepare a W4-G review package after W4-F passed, with the recommended next step as first positive bounded corpus-text authorization from the existing W3-B Wikimedia page-summary Source Material text.

## Output

Prepared the W4-G Steering Board review package only. The package proposes a two-parent contract:

- W3-B runtime-owned Source Material remains the only text parent.
- W4-F/W4-C/W4-D/W4-E same-ledger runtime state remains the corpus closure parent.

The proposed W4-G positive path creates exactly one hidden/admin-only EvidenceCorpus text-bearing record, preserves the W3-B `4096` byte cap, requires hash/ref/length/endpoint/kind/language equality between W3-B and W4-D/W4-C lineage, and keeps extraction input, EvidenceItems, parser, report/verdict/warning/confidence, public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, W3-C widening, ACS/direct URL, and V1 work closed.

## Key Design Recommendation

Do not source W4-G text from the W4-F artifact route output. W4-F is reachability and closure evidence. W4-G should use producer-owned W3-B Source Material for the bounded text and use W4-F/W4-D/W4-E only to prove same-ledger corpus closure and extraction denial.

No new safe locator-materialization contract is needed for W4-G because W3-A/W3-B already materialized and dereferenced the safe locator. W4-G needs lineage equality and bounded text authorization. Any new locator contract belongs to W3-C or provider-widening work.

## Canary Recommendation

The package recommends one later W4-G canary after implementation review, because this would be the first product-route text-bearing EvidenceCorpus crossing. The canary would use the exact Captain-defined input `Using hydrogen for cars is more efficient than using electricity`, consume one of the remaining `3` live jobs, and leave `2`.

No canary is authorized by this package.

## Warnings

W4-G is review-only. Do not implement until Steering Board accepts a source package. Do not run a live job. W4-G must not authorize extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, W3-C source-material widening, full page/source/html fetch, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup.

## Learnings

The clean next increment after W4-F is not more denial. It is a bounded positive text crossing with extraction still closed. The risk is manageable if the contract treats W3-B text as the only authorized text source and treats W4-F as closure evidence, not as executable input.
