# Decision Log — Calibration + Debate System Review (2026-02-21)

**Chair:** Lead Architect (Claude Opus 4.6)

## Execution Initiated (Phase 1 Only)

- Phase 1 implementation spec prepared: `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
- Scope locked to `A-1`, `A-2a`, `A-2b`, `A-2c` (no `B-*` work before `A-3` gate passes)
- Lead Dev delegation brief included in the Phase 1 spec

---

## D1 — Immediate Scope Approval

**Decision: Approved as-is.**

All five items are stabilization prerequisites. No architectural risk, no sequencing ambiguity.

| # | Item | Owner | Due | Done when |
|---|------|-------|-----|-----------|
| A-1 | Report semantics: `Global Provider` badge, `Role Provider Mode` badge (`single`/`mixed`), explanatory note below role table | Lead Dev | 2026-02-24 | Cross-provider HTML is unambiguous about mixed provider usage |
| A-2a | Fix `nuclear-energy-fr` crash (`undefined.value`) | Lead Dev | 2026-02-24 | Failing test green + cross-provider run completes this pair |
| A-2b | OpenAI TPM guard: pre-call token estimate + automatic `gpt-4.1` → `gpt-4.1-mini` fallback for debate role calls under TPM pressure | Lead Dev | 2026-02-25 | No fatal TPM errors in cross-provider full run |
| A-2c | Failure diagnostics bubble-up: error class, message, truncated stack, stage, provider/model in pair result JSON | Lead Dev | 2026-02-25 | Failed pairs contain structured diagnostics (not just "error") |
| A-3 | Rerun gate: two complete 10/10 cross-provider full runs with `failureModeBiasCount=0` and no fatal exceptions | Lead Dev | 2026-02-27 | Two decision-grade artifacts in `test/output/bias/` |

---

## D2 — "Soon" Scope Approval

**Decision: Approved. Execution order locked as B-1 → B-3 → B-2.**

| # | Item | Owner | Due | Done when | Depends on |
|---|------|-------|-----|-----------|------------|
| B-1 | Runtime role tracing: per-call `{debateRole, promptKey, effectiveProvider, effectiveModel, fallbackFlags}` → aggregated `meta.runtimeRoleModels` in JSON + `Runtime Role Usage` table in HTML + mismatch indicator vs resolved config | Lead Dev | 2026-03-04 | Report answers "what actually ran" per role | A-3 |
| B-3 | Knowledge-diversity-lite (C13 correction): evidence sufficiency gate + source-type partitioning + trigger-based contrarian retrieval + cost caps (see D5) + A/B calibration run | LLM Expert + Lead Dev | 2026-03-11 | A/B shows C13 correction effect without exceeding cost caps | B-1 |
| B-2 | Structured A/B conclusion: baseline vs cross-provider vs with/without knowledge-diversity-lite on same fixture + config hashes. Completion quality, skew deltas, C18 deltas, warning deltas, cost deltas. One decision sheet. | Architect | 2026-03-14 | Cross-provider decision is based on complete comparable runs with runtime-role evidence | B-1, B-3 |

---

## D3 — Backlog Strategy

**Decision: Debate V2 topology reset stays in backlog. Re-evaluate gate: after B-2 conclusion memo is approved.**

---

## D4 — Promotion Policy

**Decision: Ratified. No default profile or pipeline promotion until all four gates pass.**

| Gate | Requirement | Blocks promotion if |
|------|-------------|-------------------|
| **Gate 1: Stability** | A-3 complete (two 10/10 cross-provider full runs, `failureModeBiasCount=0`, `meanDegradationRateDelta <= 5.0`, no fatal exceptions) | Any cross-provider run fails, has failure-mode asymmetry, or exceeds degradation-rate threshold |
| **Gate 2: Observability** | B-1 live (runtime role tracing confirms resolved config = actual execution) | Report cannot answer "what model actually ran for each role" |
| **Gate 3: C13 correction** | B-3 A/B shows ≥30% `meanAbsoluteSkew` reduction without quality regression (`passRate` ≥30%, `failureModeBiasCount` =0, improvement in ≥2 languages). Cost caps met. | Knowledge-diversity-lite doesn't measurably reduce skew, or cost ceiling exceeded |
| **Gate 4: Decision memo** | B-2 conclusion reviewed and approved by Captain | Memo not written or not approved |

**Promotion scope:** This policy governs changing the default `debateProfile` from `baseline` to `cross-provider` or `max-diversity`, and enabling knowledge-diversity-lite controls by default. Feature-flagged or explicit per-run config overrides are not blocked.

---

## D5 — Knowledge-Diversity-Lite Approval

**Decision: Approved with cost caps specified below.**
**Governance rule (R-1 applied):** All D5 thresholds are UCM-configurable with the approved values as defaults.

### Approved Controls

| # | Control | Mechanism | Cost impact | Trigger |
|---|---------|-----------|-------------|---------|
| 1 | **Evidence sufficiency gate** | Before verdict, count filtered evidence items per claim. If `<3 items` OR `<2 distinct sourceTypes`, classify as `INSUFFICIENT_EVIDENCE` instead of producing a truth percentage. | Zero (deterministic check on existing data) | Always-on |
| 2 | **Source-type evidence partitioning** | After evidence filter, partition by `sourceType`: academic/institutional → advocate role; news/media/general → challenger role; reconciler sees everything. No extra searches. No extra LLM calls. | Zero (routing existing evidence differently into debate prompts) | Always-on |
| 3 | **Contrarian retrieval pass** | When `evidence_pool_imbalance` warning fires for a claim, generate ≤2 inverted search queries and tag results with `searchStrategy: "contrarian"`. Feed to challenger role. Track whether contrarian evidence survives `probativeValue` filter. | ≤2 extra search queries per triggered claim + 0 extra LLM calls for retrieval itself (queries generated by existing search-query LLM call via expanded prompt) | Trigger: `evidence_pool_imbalance` fires |
| 4 | **Cost ceiling** | Overall pipeline runtime increase ≤15% vs current canonical baseline (measured on full calibration run, same fixture). Fail-open: if ceiling exceeded on any claim, skip contrarian pass for that claim and proceed with current path. | Cap, not cost | Enforced per-run |

### Cost Cap Details

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max extra search queries per claim | 2 | Limits I/O cost; 2 queries sufficient for a contrarian perspective |
| Max extra LLM calls per claim (for knowledge-diversity controls) | 0 | Partitioning and sufficiency are zero-cost; contrarian queries reuse existing search-query generation |
| Runtime ceiling (full-run duration delta) | ≤15% | Prevents runaway cost from search latency; measured against `full-2026-02-20T21-32-24-288Z` (baseline, ~3h20m → ceiling ~3h50m) |
| Fail-open policy | Yes | If contrarian retrieval times out or ceiling approached, skip and proceed with current evidence pool |
| Evidence sufficiency: min items | 3 | Below 3 items, verdict reliability is too low (Climinator Lesson 5: NEI is informative) |
| Evidence sufficiency: min distinct sourceTypes | 2 | Single source-type evidence = structural monoculture risk |

## Locked Execution Order

```
Phase 1: IMMEDIATE (A-1 → A-2 → A-3)          Owner: Lead Dev     By: 2026-02-27
  ├─ A-1  Report semantics                      ───────────────── 2026-02-24
  ├─ A-2  Crash + TPM + diagnostics             ───────────────── 2026-02-25
  └─ A-3  Two 10/10 cross-provider runs         ───────────────── 2026-02-27
                    │
                    ▼ Gate: A-3 passes
Phase 2: SOON (B-1 → B-3 → B-2)                Mixed owners       By: 2026-03-14
  ├─ B-1  Runtime role tracing                  Lead Dev ───────── 2026-03-04
  ├─ B-3  Knowledge-diversity-lite + A/B        LLM Expert + LD ── 2026-03-11
  └─ B-2  A/B conclusion memo                   Architect ──────── 2026-03-14
                    │
                    ▼ Gate: B-2 approved + D4 gates pass
Phase 3: BACKLOG (C-1, C-2, C-3)               Re-evaluated at gate
  └─ Pull-forward trigger: meanAbsoluteSkew >25pp after B-3
```

---

## Action Register

| # | Action | Owner | Priority | Due | Done when | Risks/Dependencies |
|---|--------|-------|----------|-----|-----------|-------------------|
| 1 | Rename `Provider` → `Global Provider` badge, add `Role Provider Mode` badge, add note below role table | Lead Dev | Immediate | 2026-02-24 | HTML unambiguous | None |
| 2 | Fix `nuclear-energy-fr` `undefined.value` crash with failing test | Lead Dev | Immediate | 2026-02-24 | Test green + pair completes | Needs repro locally |
| 3 | Add OpenAI TPM guard: pre-call estimate + `gpt-4.1` → `gpt-4.1-mini` fallback | Lead Dev | Immediate | 2026-02-25 | No TPM fatals in full run | OpenAI tier limits may vary |
| 4 | Failure diagnostics in pair result JSON (class, msg, stack, stage, provider) | Lead Dev | Immediate | 2026-02-25 | Failed pairs have structured errors | None |
| 5 | Run cross-provider full ×2, validate 10/10 + `failureModeBias=0` + `meanDegradationRateDelta <= 5.0` | Lead Dev | Immediate | 2026-02-27 | Two decision-grade artifacts | Depends on #2, #3 |
| 6 | Instrument per-call verdict-stage tracing + `meta.runtimeRoleModels` + HTML table | Lead Dev | Soon | 2026-03-04 | Report shows actual per-role execution | Depends on #5 |
| 7 | Implement evidence sufficiency gate (≥3 items, ≥2 sourceTypes) | LLM Expert | Soon | 2026-03-07 | Gate active, INSUFFICIENT_EVIDENCE verdicts produced when triggered | None |
| 8 | Implement source-type evidence partitioning for debate roles | LLM Expert + Lead Dev | Soon | 2026-03-09 | Advocate/challenger receive partitioned evidence | Depends on #7 |
| 9 | Implement trigger-based contrarian retrieval (≤2 queries when `evidence_pool_imbalance` fires) | LLM Expert + Lead Dev | Soon | 2026-03-10 | Contrarian evidence tagged, survives/fails probativeValue filter | Depends on #8 |
| 10 | Run calibration A/B: baseline vs with-knowledge-diversity-lite (same fixture+config) | LLM Expert | Soon | 2026-03-11 | A/B delta quantified, cost ceiling verified | Depends on #6, #9 |
| 11 | Write A/B conclusion memo (completion, skew, C18, warnings, cost deltas) | Architect | Soon | 2026-03-14 | Memo reviewed and approved | Depends on #10 |

---

## Status Update Destinations

Per exit criteria:
1. Update `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md` §5.3 with D1-D5 outcomes
2. This file serves as the execution update in `Docs/WIP/`
