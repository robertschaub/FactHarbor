# Handoff: V2 X7-S Product-Internal Query Planning Execution Package

**Date:** 2026-05-17
**Role:** Lead Developer / Captain Deputy
**Model:** Codex (GPT-5.5)
**Status:** Reviewer-approved docs/source package; source implementation not yet started in this handoff

## Summary

Prepared and reviewed `Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md` after X7-R proved accepted Claim Understanding, X7-J intake readiness, and X7-O Query Planning pre-execution observation with `sourceLanguageSignal: present`.

X7-S authorizes only product-internal hidden Query Planning execution under a separate default-closed activation gate. It adds no public behavior and keeps public V2 output damaged/precutover. It does not authorize live jobs, source/search/fetch/parser/SR/cache IO, EvidenceCorpus/EvidenceItems, report/verdict/warning/confidence behavior, ACS/direct URL, V1 reuse, or V1 cleanup.

## Review Result

- LLM/semantic reviewer: `APPROVE`.
- Code/package reviewer: `APPROVE`.
- Security/runtime reviewer: first returned `MODIFY` for the admin route contract, then `APPROVE` after Section 7.2 was added.

Key amendment from Security/runtime:

- internal artifact route must require configured `FH_ADMIN_KEY`;
- production missing-key and wrong-key requests must return `401`;
- every response path, including `400/401/404`, must set `Cache-Control: no-store`;
- route must accept exactly one `ledgerId`;
- missing, blank, duplicate, malformed, overlong, listing, and enumeration-shaped requests must be rejected;
- error bodies must be bounded and generic with no ledger echo;
- no listing endpoint or public route/UI/report/export/compatibility import path may reach the sink or route.

## Authorized Implementation Envelope

Allowed production files are listed in the X7-S package and include only:

- V2 execution selection, runner threading, pipeline shell, run context, and orchestrator changes needed to carry the default-closed X7-S activation snapshot;
- Query Planning provider runtime config contract and provider factory;
- bounded process-local Query Planning runtime artifact sink;
- authenticated internal no-store artifact route;
- V2 gate register and validator updates.

Allowed tests are the focused X7-S unit tests, boundary guards, route tests, existing Query Planning runtime/input/prompt/model/inspection tests, query-plan handoff tests, gate-register self-test, build, index, and diff hygiene.

## Required Guardrails For Next Agent

- Keep activation separate from Claim Understanding and default closed.
- Env flag alone is not execution authority.
- Provider SDK imports are allowed only in the X7-S factory and only for `ai/generateText` plus `@ai-sdk/anthropic/anthropic`.
- Do not edit prompt text, UCM/default JSON, schema fixtures beyond route/artifact tests, model policy values, or public result projections.
- Do not add source/search/fetch/parser/SR/cache/storage behavior.
- Do not run live jobs; X7-T requires a later reviewed package.
- Do not expose query entries publicly; bounded query entries are admin-sensitive validated model output only.

## Verification

Docs-only verification before this handoff:

- `git diff --check` passed for the isolated package state.
- No source/test/prompt/config/schema changes were made for X7-S in this package step.
- No live jobs were run.

## Next Step

Implement X7-S source strictly inside the approved envelope, then run the verifier set in the package. If implementation needs to leave the envelope or touch blocked behavior, stop for review.
