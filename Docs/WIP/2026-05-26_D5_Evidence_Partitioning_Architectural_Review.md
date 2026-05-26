# D5 Evidence Partitioning — Architectural Review

**Status:** Proposal / pre-decision. Frames a question, does not answer it.
**Owner:** open
**Trigger:** flagged independently by two adversarial reviewers (Gemini API and Gemini CLI) during the 2026-05-26 model-routing review.
**Code reference:** `apps/web/src/lib/analyzer/verdict-stage.ts:444-470`

---

## 1. What D5 partitioning does today

In Stage 4 (verdict debate), evidence items are split by **source type** before the advocate and challenger roles see them:

- **Institutional partition** → advocate
  Source types in `INSTITUTIONAL_SOURCE_TYPES`: `peer_reviewed_study`, `fact_check_report`, `government_report`, `legal_document`, `organization_report`.

- **General partition** → challenger
  Source types in `GENERAL_SOURCE_TYPES`: `news_primary`, `news_secondary`, `expert_statement`, `other`.

- **Reconciler** sees the **full** evidence pool.
- **Self-consistency** sees the **advocate's** partition (the institutional one).
- **Validation** sees the full pool.

A **fallback** at `verdict-stage.ts:451-456` collapses the partition when either side has fewer than two items: both roles get the full pool instead. An info-severity warning (`evidence_partition_stats`) is emitted with `partitioningActive: true|false`.

Documented intent (see comments around the partitioning block): provide *structural independence* between advocate and challenger to mitigate single-model bias (C1/C16 from Stammbach/Ash political-bias analysis), modelled on the Climinator structurally-independent advocate pattern.

## 2. The concerns

Two independent adversarial reviews flagged structural problems with D5 as currently configured, **both independent of any model-tier discussion**.

### 2.1. The partition itself is biased, not just the assignment

Institutional sources (peer-review, government reports, fact-checks) carry **structurally higher evidentiary weight** in any reasonable epistemic framework. Assigning the institutional partition exclusively to the advocate and the general partition exclusively to the challenger means:

- The advocate is reasoning from sources the verdict will treat as authoritative.
- The challenger is reasoning from sources the verdict will treat as less authoritative.
- The "adversarial" framing collapses: the challenger isn't disagreeing on merits — it's disagreeing from a structurally weaker evidence base.

Quoting one of the reviews: *"the partition provides the bias … no model — Opus or otherwise — can reconcile effectively if the challenger is effectively lobotomized by a weak evidence pool."*

### 2.2. The fallback collapse erases the architectural premise

The fallback condition (`partitionActive = institutional.length >= 2 && general.length >= 2`) fires on short inputs, which are common — single-claim self-test jobs, news headlines, short article excerpts. When it fires:

- Advocate and challenger see the **same** pool.
- Reconciler's information advantage (full pool > either partition) disappears.
- The cross-provider differentiation (advocate=anthropic, challenger=openai) is still present, but the structural-evidence-independence rationale isn't.
- The pipeline keeps running, and the `evidence_partition_stats` warning notes `partitioningActive: false` — but downstream code (range reporting, confidence calibration, etc.) doesn't change behaviour based on whether partitioning actually fired.

The architecture's safety net works at a structural level (no crash), but the design intent only holds *when* partitioning actually fires. We do not currently know how often it does.

### 2.3. Cross-partition reconciliation depends on a non-degraded reconciler

Today, reconciler runs at `standard` on anthropic. Both reviews flagged that this is the only role with full visibility under partitioning. If partitioning works as intended, reconciler is the **only** role positioned to weigh the two evidence bases against each other — a much harder cognitive task than weighing one fairly-balanced pool. The current default treats reconciler as a peer of advocate/challenger in tier, but the architecture asks more of it than of either.

This is not a routing decision in itself, but it interacts with the D5 question: if D5 stays as-is, reconciler probably should not be at the same tier as advocate/challenger.

## 3. Options

### Option A — Keep D5 as-is, defer to telemetry

Do nothing structurally. Wait for Counters A/B/C (now wired post 2026-05-26 telemetry commit) and additionally instrument:
- Rate of `evidence_partition_stats` with `partitioningActive: true` vs `false`.
- Per-job comparison of advocate vs challenger truth% on jobs where partitioning fired vs jobs where it didn't.

If partitioning fires rarely (e.g. <20% of production traffic), the structural concerns are moot in practice — the design intent rarely activates. Decision moves to the reconciler-tier conversation alone.

**Pro:** zero code change. Risk-free. Preserves current behaviour while we measure.
**Con:** doesn't address the structural concern if partitioning *does* fire often.

### Option B — Symmetric partitioning by claim-direction

Replace source-type partitioning with **direction-based** partitioning:
- Advocate sees evidence labelled `claimDirection: "supports"` (plus neutral).
- Challenger sees evidence labelled `claimDirection: "contradicts"` (plus neutral).
- Reconciler still sees full pool.

This preserves the "two roles see different views" pattern but removes the institutional-vs-general epistemic asymmetry — each side now has the *strongest possible argument* for its position, not the *worst evidence for its position*.

**Pro:** addresses the rigged-debate critique directly. Adversarial in a meaningful sense. Reconciler's job becomes weighting two well-supported arguments, which is what the architecture was always pretending to ask.
**Con:** more invasive change. Loses the original "Climinator structural independence" framing (C1/C16 mitigation). Requires verifying that claim-direction labels are reliable enough to base architecture on — and direction validation FP rate is one of the things we're currently measuring (Counter B). So this option is gated on Counter B data anyway.

### Option C — Drop D5 partitioning, rely on cross-provider role differentiation alone

Remove the partition. All roles see the full evidence pool. Advocate/challenger structural independence comes solely from being on different providers (anthropic vs openai) and from the differing prompts (VERDICT_ADVOCATE vs VERDICT_CHALLENGER). Reconciler is no longer privileged with respect to evidence visibility.

**Pro:** simplest. Eliminates the rigged-debate critique entirely. Eliminates the fallback-collapse edge case. Reduces code surface (`evidencePartitioningEnabled`, `INSTITUTIONAL_SOURCE_TYPES`, `GENERAL_SOURCE_TYPES`, the fallback warning, and downstream-aware code can be removed).
**Con:** loses the original C1/C16 motivation. The single-model-bias concern is real and was the original reason D5 was introduced — and the existing `verdict-stage.ts:312-316` comments cite Climinator's structurally-independent advocate pattern explicitly. Removing D5 reverts to provider-only independence, which may or may not be sufficient depending on how much the partitioning was actually contributing.

### Option D — Hybrid: drop institutional/general partition, add claim-direction partition for high-evidence jobs only

A combination of B and C: for short / low-evidence jobs (where fallback would fire anyway), use the full pool. For high-evidence jobs (≥6 directional items per side), partition by claim direction. Avoids the fallback-collapse edge case (full pool *is* the small-evidence behaviour) while preserving genuinely adversarial structure when evidence is plentiful enough to support it.

**Pro:** addresses both concerns in one design. The "is partitioning even active?" question becomes a function of evidence volume, which is easy to measure.
**Con:** more complex than B or C. Introduces a second tier-decision (volume threshold) that itself needs tuning.

## 4. What data we need before deciding

Before choosing between A/B/C/D, the following should be quantified from production traffic. Several are already coming from the 2026-05-26 telemetry commit (`ec0a9655`); the rest require additional instrumentation.

| Metric | Status | Decides |
|---|---|---|
| Rate of `partitioningActive: true` vs `false` in `evidence_partition_stats` warning | Already emitted; needs aggregation query | Whether D5 actually fires often enough to matter (A vs B/C/D) |
| Counter B (direction-validation FP rate, downgrade rate, overturn rate) | Wired post commit `ec0a9655` | Whether direction labels are reliable enough to base partitioning on (option B/D) |
| Advocate vs challenger truth% delta when partitioning is active vs inactive | Not yet wired | Whether the partition is actually producing distinguishable verdicts |
| Reconciler vs advocate truth% delta | Not yet wired | Whether reconciler is actually doing the cross-partition weighting work |
| Per-job evidence volume distribution (institutional count, general count, supports count, contradicts count) | Could be derived from existing metrics | Whether option D's volume threshold is realistic |

## 5. Out of scope for this doc

- Model tier changes for any role. Specifically:
  - Reconciler → premium. Mentioned in §2.3 as an *interaction*; the tier decision belongs to the parked model-routing conversation, not here.
  - Validation → standard. Also parked.
- Removing the grounding alias map. Separate follow-up (gated on confirming zero long-ID emissions in production after the 2026-05-26 evidence-ID schema unification).
- D5's role in non-CB pipelines. The legacy/V2 pipelines were dropped; this doc is scoped to ClaimAssessmentBoundary only.

## 6. Recommended next step

**Do not change D5 yet.** Instead:

1. Add the missing instrumentation in §4 (partition-active rate; advocate-vs-challenger truth% delta; per-job evidence-volume distribution). Small telemetry commit, mirror the pattern used in the 2026-05-26 Counter A/B/C work.
2. Let production traffic accumulate ~50–100 jobs.
3. Reconvene with measured numbers. The choice between A/B/C/D becomes much narrower with data: e.g. if partitioning fires <20%, default to A and revisit only if reconciler-tier changes; if partitioning fires >70% with measurable verdict deltas, A becomes untenable and the choice narrows to B vs D.

In parallel, this doc is open for architect / steering review. Comments welcome inline.

## 7. Open questions

- What is the *original* benchmark data that justified D5's introduction? If the C1/C16 motivation was supported by an A/B test, the same test should be re-run against the proposed alternatives. If it was hypothesis-driven and unmeasured, that's important to know.
- Does the `evidencePartitioningEnabled` UCM flag get used in any production profile, or is it effectively always-on? If always-on, the migration story is simpler (flip the default; old default still reachable via UCM override).
- The Stammbach/Ash analysis referenced at `verdict-stage.ts:312-316` — is the source paper accessible? Reviewing its specific recommendation on D5's structural form (institutional/general split vs other partitions) would inform option selection.
