# W6-C Steer-Co Reconvention Package

**Date:** 2026-05-21
**Workstream:** W6-C Retrieval Quality (Direction A)
**Trigger:** Targeted canary #1 confirms timeout fix is marginal; root cause is
structural (content volume), not timeout configuration.
**Deputy recommendation:** Reconvene after 1 targeted canary instead of planned
2, because the root cause cannot be addressed by further timeout tuning.

## Evidence Summary

### Canary Results

| Canary | Job ID | Timeout | EvidenceItems | Material Dims | Outcome |
|---|---|---|---|---|---|
| Diagnostic (baseline) | `6e0e30ce` | 1500ms | 2 | 4 | `refine_retrieval` |
| Targeted #1 (this) | `24aed060` | 3000ms | 3 | 4 | `refine_retrieval` |

### Source Material Pipeline (job `24aed060`)

```
Wikimedia search:  3/3 success → 9 candidates → 9 previews → 2 page summaries (721 bytes)
OpenAlex search:   1/3 success → 3 candidates → 0 previews → 1 abstract (2027 bytes)
                                                              ─────────────────────────
                                                Total input:  3 source materials (2748 bytes)
                                                              → 3 EvidenceItems
                                                              → refine_retrieval
```

### W6-C Dimension Stability

Both canaries produce identical dimension profiles:

| Dimension | Materiality |
|---|---|
| `source_diversity` | **material** |
| `counter_evidence` | **material** |
| `direct_evidence` | **material** |
| `method_quality` | **material** |
| `temporal_coverage` | minor |

### Key Findings

1. **Timeout fix does not change provider success rates.** OpenAlex: 1/3
   succeeds at both 1500ms and 3000ms. The 2/3 failures consistently hit the
   timeout cap with ~14ms overshoot (abort signal latency).

2. **Wikimedia contributes content, but structurally thin.** The pipeline DOES
   fetch Wikimedia page summaries via `ep_wikimedia_project_page_summary`
   (correcting the earlier hypothesis that Wikimedia was entirely blocked). But
   page summaries are 300-400 byte extract paragraphs — not full article content.

3. **Content volume is the binding constraint.** 2748 bytes across 3 source
   materials is insufficient for the LLM to satisfy 4 rubric dimensions
   (source diversity, counter-evidence, direct evidence, method quality).

4. **The +1 EvidenceItem is LLM variance, not retrieval improvement.** Same
   content volume, same provider success rates, same dimension profile.

## Root Cause Diagnosis

The V2 source acquisition pipeline has three content-volume constraints, two of
which are tunable constants within authorized scope:

### A. W3B Fetch Quota — Tunable, Within Scope

Three coupled constants cap source material volume at 3 records per run:

| Constant | File | Value | Role |
|---|---|---|---|
| `SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN` | `page-summary-fetch-locator.ts:13` | **3** | Caps Wikimedia page summary HTTP fetches |
| `EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS` | `source-material-readiness.ts:16` | **3** | Caps source materials entering evidence corpus |
| `EVIDENCE_CORPUS_BOUNDED_TEXT_FAN_IN_MAX_RECORDS` | `bounded-text-authorization.ts:29` | **3** | Caps bounded text sidecars for extraction |

**Selection logic** (`page-summary-owner.ts:eligibleLocators`): Takes top-1
candidate per provider-attempt first (3 queries → 3 first-picks → cap reached),
then fills remaining slots. With 3 queries and cap=3, only rank-1 candidates are
fetched.

**Merge logic** (`mergedSourceMaterialRecords`): When OpenAlex is present, it
gets slot 1, Wikimedia gets remaining 2 slots → `.slice(0, 3)`.

**Headroom**: `EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES = 4096`. Current
total is 2748 bytes, leaving ~1.3KB of room — enough for 3-4 more page
summaries at 300-400 bytes each.

**Aggregate cap is a hard rejection, not truncation:** When aggregate content
exceeds 4096 bytes, `bounded-text-authorization.ts` returns
`blocked_pre_bounded_corpus_text_oversized` — a structural pipeline failure, not
a graceful truncation. This means raising the trio to 6 is safe (projected
~4KB, within cap), but raising to 9 risks exceeding 4096 bytes for some claims
and would require raising `AGGREGATE_MAX_BYTES` alongside the trio.

**This is the same shape of lever as the timeout constant** — a numeric budget,
not an architectural gate. Raising the trio (e.g., to 6) would:
- Fetch up to 6 unique Wikimedia page summaries (from the 9 candidates already
  available)
- Add ~1.2-1.6KB more Wikimedia content
- Bring total content from ~2.7KB toward the 4KB aggregate cap
- Diversify source material (more Wikipedia articles = more source types for the
  LLM to assess)
- Stay within the 4096-byte aggregate cap for this claim profile

### B. Wikimedia: Summary-Only Content (Structural, Not Immediately Tuneable)

The W3B stage fetches Wikimedia *page summaries* (REST API
`/core/v1/wikipedia/{lang}/page/{title}/summary`), which return the lead
paragraph — typically 200-500 bytes. Full Wikipedia article content is not
fetched. The W2 `candidate_to_source_material_gate_closed` gate reflects the
staged cutover design: full content dereference is a future capability.

**Impact:** Even with quota raised, each Wikimedia page summary is 200-500
bytes. 6 summaries would yield ~1.5-3KB total — better, but still summary-level.

### C. OpenAlex: Timeout-Constrained

OpenAlex provides abstract text directly in search responses. 2/3 queries
timeout at 3000ms (same rate as at 1500ms). The ~14ms overshoot pattern
(3014ms/3008ms vs 3000ms cap) is consistent with abort signal latency rather
than server response times slightly above the cap — the abort fires at exactly
the cap, and the signal processing adds ~14ms. Raising the timeout further is
unlikely to improve the success rate.

**Impact:** 1 abstract of 2027 bytes. Even with all 3 queries succeeding, the
maximum would be ~6KB of abstract text — still summary-level content.

### Combined Effect

The pipeline retrieves **relevant candidates from relevant providers** but
materializes only **summary-level text** from both, capped at 3 records by
tunable constants. The LLM correctly identifies that 2.7KB of summary content
across 3 sources cannot satisfy dimensions requiring primary research, diverse
source types, counter-evidence, or methodological depth.

## Steer-Co Decision Request

### Transparency Notes

1. **Early reconvention:** The plan called for up to 2 targeted canaries before
   reconvening. I'm proposing to reconvene after 1 because the root cause
   (content volume, not timeout) makes a second timeout-focused canary
   non-informative. 15 of 20 job slots remain.

2. **Budget waste:** 3 of 5 jobs were non-informative (2 wrong pipeline variant,
   1 stale server build). Procedural errors have been root-caused and corrected.
   All 3 wasted no LLM tokens (V2 precutover runs are zero-cost for LLM calls;
   cost is provider network time only).

3. **+1 EvidenceItem should not be dismissed:** The improvement from 2→3
   EvidenceItems is real but attributable to LLM extraction variance from the
   same content, not retrieval improvement.

### Decision Axes

The Steer-Co should determine direction on one or more of:

**Axis 0 — W3B fetch quota increase (within scope, lowest risk):**
- **A0a: Raise trio to 6** — Fetch up to 6 Wikimedia page summaries + 1
  OpenAlex abstract. Projected increase: ~1.2-1.6KB more content (2.7KB →
  ~4KB, near the 4096-byte aggregate cap). Same shape as the timeout constant
  change — no architectural work, no prompt/schema/config changes.
- **A0b: Raise trio to 9** — Fetch all available Wikimedia candidates. Would
  exceed the 4096-byte aggregate cap for some claims, triggering structural
  pipeline rejection (`blocked_pre_bounded_corpus_text_oversized`). Requires
  raising `AGGREGATE_MAX_BYTES` alongside the trio. Medium risk.
- **A0c: Skip** — The quota increase adds more summary-level content but cannot
  add primary research, academic full-text, or fundamentally new source types.
  May not move any material dimension to `minor`.

**Axis 1 — Content depth vs. content breadth (higher scope):**
- **A1a: Deeper content per provider** — Enable full Wikipedia article content
  (beyond page summaries). Requires W3B content dereference gate work +
  truncation/chunking strategy. Architectural.
- **A1b: More providers** — Add Semantic Scholar, CrossRef, or other academic
  APIs. Requires provider expansion (Captain gate).
- **A1c: Both** — Sequenced.

**Axis 2 — OpenAlex timeout strategy:**
- **A2a: Accept 1/3 success rate** — Current state. ~2KB per successful query.
  The timeout overshoot pattern is consistent with abort signal latency, so
  raising the cap further is unlikely to improve success rate.
- **A2c: Retry failed queries** — Not currently implemented. Would extend
  pipeline duration but potentially double successful queries.
- **A2d: Parallel queries** — Send queries simultaneously instead of
  sequentially. Would reduce total duration impact of retries.

**Axis 3 — Sufficiency bar for internal alpha:**
- **A3a: Keep current bar** — The sufficiency assessment is correctly identifying
  thin content. Fix retrieval to meet the bar.
- **A3b: Lower bar for internal alpha** — Accept fewer evidence items for
  internal testing. Risks masking real quality issues.
- **A3c: Dimension-specific adjustment** — Accept `minor` for method_quality
  or source_diversity while requiring `material` coverage for direct_evidence
  and counter_evidence.

**Axis 4 — Scope of next work:**
- **A4a: Stay in W6-C scope** — Run a canary with raised fetch quota (Axis 0)
  using remaining budget. If it moves any material dimension, iterate. If not,
  the within-scope lever space is exhausted.
- **A4b: Escalate to Captain** — Full content dereference (A1a) and provider
  expansion (A1b) exceed the original W6-C scope.

### Deputy Assessment

The timeout fix was the first within-scope lever tested. It's confirmed marginal.

**Immediate next lever: W3B fetch quota (Axis 0).** This is the same shape of
change as the timeout constant — a numeric budget in source code, no
architectural work, no prompt/schema/config/approval changes needed. It directly
attacks the binding constraint (content volume) by fetching more of the 9
available Wikimedia candidates. It may not be sufficient on its own (summary
content is still summary content), but it's the lowest-risk experiment remaining
within authorized scope and would cost 1 job slot.

**If Axis 0 is insufficient:** The remaining levers (full content dereference,
provider expansion) require architectural work or Captain gates. The Steer-Co
should decide whether to authorize A0 as a quick canary before escalating, or
escalate directly to the Captain for expanded scope.

## Authority Boundaries

**Within authorized scope (no Captain gate):**
- Timeout tuning (done — marginal)
- W3B fetch quota / fan-in record cap tuning (Axis 0 — proposed next)
- Query strategy changes
- Candidate selection/filtering logic
- Observation and diagnostic projection

**Requires Captain gate:**
- Provider expansion (new API integrations)
- Full Wikimedia content dereference (architectural, beyond page summaries)
- Prompt text edits
- Schema changes
- UCM/config changes

## Budget Status

| Category | Count |
|---|---|
| Used (informative) | 2 |
| Used (wasted) | 3 |
| Remaining | 15 |
| Total authorized | 20 |

## Attached Evidence

- [Diagnostic canary result](2026-05-21_V2_W6-C_Diagnostic_Canary_Result.md)
- [Targeted canary #1 result](2026-05-21_V2_W6-C_Targeted_Canary_1_Result.md)
- Artifact captures in `Docs/WIP/v2fixed_el-*.json` (7 ledger snapshots)
