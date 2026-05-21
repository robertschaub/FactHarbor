# V2 W6-C Retrieval-Quality Steering Result

**Date:** 2026-05-21
**Package:** `Docs/WIP/2026-05-21_V2_W6-C_Retrieval_Quality_Steering_Package.md`

## Steer-Co Result

**Question:** Should we first capture W6-C sufficiency diagnostic dimensions
(Direction A) before choosing a retrieval improvement, or proceed with
inference-based retrieval improvement (Direction B)?

**Committee:** Claude Opus 4.6 Leader + GPT-5.5 adversarial
governance/architecture reviewer (Member A) + Gemini 2.5 Pro implementation
practicality/systems reviewer (Member B).

**Panel note:** Initial session dispatched two Claude Opus subagents (degraded
panel). Captain chose option (b): arrange cross-model review. GPT-5.5 and
Gemini 2.5 Pro were invoked via `invoke-gpt.cjs` and `invoke-gemini.cjs`. Both
responded substantively. Full 3-model-family panel achieved.

**Convened:** yes
**Authority:** Cross-model consent achieved (3 model families: Opus, GPT-5.5,
Gemini). Direction approved. Implementation requires Captain approval for
schema/projection change (pre-approved in principle by Captain).

### Current State

- W6-C has returned `refine_retrieval` on 5 consecutive canaries (W6-C4 through
  W6-F1) despite retrieval diversity increasing from 1 encyclopedic item to 3
  items from 2 providers.
- The `missingEvidenceDimensions` array is parsed and validated by the pipeline
  but then hashed and discarded — the hidden artifact projects only the top-level
  recommendation enum.
- Without knowing which dimensions the LLM flags as `material`, the team cannot
  target retrieval improvement.
- Live-job budget: 4 remaining.
- Debt sensors: `advisory_warn` (stable, not a blocker).

### Decision / Proposal

**Approve Direction A with amendments.** Capture the W6-C sufficiency diagnostic
dimensions before attempting further retrieval improvement.

The implementation should be framed as a **redaction relaxation** of structural
enum data the pipeline already parses and validates, not as a new mechanism. The
`SufficiencyAssessmentDecision` already receives the full
`EvidenceSufficiencyResult`; Direction A projects the `dimension` and
`materiality` enum values from `missingEvidenceDimensions` into the decision
output instead of discarding them after hashing.

### Amendments (Required — consolidated from Leader + cross-model review)

1. **V2 Retirement Ledger row with removal trigger and hard sunset.** The
   diagnostic projection must carry its own ledger row. Retire or require
   renewed Steer-Co approval at the earliest of: first
   `continue_to_boundary_formation`, Steer-Co authorization of `caveat_report`,
   Captain sufficiency-bar escalation after two targeted failures, exhaustion of
   the W6-C diagnostic plan, or a fixed calendar/iteration limit. Do not repeat
   the W6-C3 pattern of shipping a "temporary diagnostic" without ledger
   tracking. *(Leader #1 + GPT-5.5 #2)*

2. **Projection bounded to enum values only, internal diagnostic use only.**
   Project `dimension` (one of 7 allowed values) and `materiality` (`none`,
   `minor`, `material`) per missing-dimension entry. Do not project `rationale`
   text, `sufficiencyStatus`, `materialScarcityCandidate`, or any free-text
   field. The projected enum pairs must not be exposed in public behavior, final
   reports, user-facing outputs, provider scoring, or downstream claim
   adjudication — diagnostic/retrieval-debug steering only. *(Leader #2 +
   GPT-5.5 #3)*

3. **Exit criteria.** Maximum 2 post-diagnostic canaries before Steer-Co
   reconvenes to decide between further retrieval improvement and the
   `caveat_report` path. If 2 targeted retrieval canaries still return
   `refine_retrieval`, the team must consider whether the sufficiency bar itself
   is appropriate for internal alpha — that question escalates to the Captain.
   *(Leader #3)*

4. **Captain approval framing.** The implementation package must acknowledge that
   widening the `redaction.sufficiencyResultPayloadReturned` contract (currently
   a type literal `false`) to allow structural enum projection sets a precedent
   for provenance redaction changes across other W-gates. The Captain approval
   should be scoped to this specific enum projection, not a general redaction
   loosening. The Captain request must include exact field shape, allowed enum
   values, and sample output. *(Leader #4 + GPT-5.5 #1)*

5. **Negative-scope tests.** Implementation must include tests verifying the
   projection contains only `dimension ∈ {source_diversity, direct_evidence,
   counter_evidence, temporal_coverage, method_quality, source_access, other}`
   and `materiality ∈ {none, minor, material}`, and excludes rationale text,
   source text, quotes, `sufficiencyStatus`, `materialScarcityCandidate`,
   free-text, and provider identifiers. *(GPT-5.5 #4, new)*

6. **Canary budget accounting.** Reserve from 4 remaining slots: 1 diagnostic
   validation, up to 2 targeted retrieval, 1 contingency/escalation. If the
   diagnostic canary fails due to schema issues, Steer-Co reconvenes before
   further spend. *(GPT-5.5 #5, new)*

### Consent Check

- **Leader (Claude Opus 4.6):** consent with 4 amendments.
- **Member A (GPT-5.5, governance/architecture):** modify → consent with 5
  additional containment amendments (all compatible). Key contributions: hard
  sunset clause, negative-scope tests, canary budget accounting, precedent
  creep analysis, self-recommendation bias review (dismissed — Direction A
  withstands scrutiny).
- **Member B (Gemini 2.5 Pro, systems/practicality):** consent with no
  additional amendments. Key contributions: confirmed implementation feasibility
  (straightforward schema + mapping change), validated cost-effectiveness (one
  canary slot for high-fidelity diagnostic data), confirmed Direction B is
  "hope-based" and Direction C ignores the evidence, independent
  self-recommendation bias review (dismissed — "engineering equivalent of
  turning on the lights in a dark room").
- **Unresolved dissent:** none.
- **Cross-model diversity:** 3 of 3 model families (Opus, GPT-5.5, Gemini).

### Debt-Guard / Complexity Control

- Direction A is a redaction relaxation, not a new mechanism. The existing W6-C
  decision type gains 1–2 projected enum fields from data it already parses.
- Net mechanism change: unchanged (no new artifact, route, sink, or runtime
  path).
- Net field count increase: small (dimension + materiality arrays in existing
  decision type).
- Debt sensor status: `advisory_warn` (unchanged by this direction).
- V2 Retirement Ledger: one new row for the diagnostic projection with explicit
  removal trigger (amendment 1).
- Complexity budget owner: Lead Developer, with Captain Deputy monitoring.

### Dissent / Uncertainty

1. **Self-recommendation bias (resolved).** The Captain Deputy both identified
   the evidence gap and recommended Direction A. Both GPT-5.5 and Gemini 2.5
   Pro independently examined this pattern and dismissed it: GPT-5.5 found "the
   recommendation is not obviously self-serving" and weighted B and C lower;
   Gemini called it "the engineering equivalent of turning on the lights in a
   dark room." Neither independent model family would weight Direction B or C
   higher.

2. **Architectural scope initially underestimated (resolved).** Original Opus
   Member A flagged the type-literal widening precedent — resolved by amendment
   4. GPT-5.5 reinforced this with precedent-creep and expansion-pressure
   concerns, addressed by the scoped Captain approval framing.

3. **Governance containment (resolved by GPT-5.5 amendments).** GPT-5.5 raised
   concerns about temporary diagnostics becoming permanent, diagnostic field
   misuse, and downstream coupling. These are addressed by amendments 1 (hard
   sunset), 2 (internal diagnostic only), and 5 (negative-scope tests).

### Directions

1. Prepare a W6-C diagnostic projection implementation package (direction only
   from this result; implementation is a separate package under Captain approval
   gate for schema/projection change).
2. Do not proceed with inference-based retrieval improvement (Direction B) until
   diagnostic data is captured.
3. Do not increase evidence volume beyond 3 (Direction C) — 5 canaries show
   more-of-same does not move the needle.
4. Do not weaken W6-C prompts, relax W7 gates, add providers without Steer-Co,
   or expose public behavior.

### Lead Developer Prompt

```text
As Lead Developer,
Skill: /debt-guard

Objective:
Add a bounded structural diagnostic projection to the W6-C sufficiency
assessment decision. Project the `missingEvidenceDimensions` array as
dimension enum + materiality enum pairs from the already-parsed
`EvidenceSufficiencyResult`, so post-canary observation can identify which
rubric dimensions the LLM flagged as material when recommending
`refine_retrieval`.

Authority:
Captain Deputy delegated workstream. Schema/projection change requires
Captain approval before implementation. Proceed with package preparation
autonomously; stop for Captain approval before editing source.

Scope:
- Allowed files/actions:
  - `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`
    — add projected dimension/materiality fields to SufficiencyAssessmentDecision
  - `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance.ts`
    — update DECISION_KEYS and provenance contract
  - `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.ts`
    — populate new fields from parsed result
  - Test files for the above
  - `Docs/AGENTS/V2_Retirement_Ledger.md` — add row with removal trigger
- Forbidden files/actions:
  - Prompt text edits
  - Schema validation changes (Zod schemas)
  - Model/config/UCM/gateway policy changes
  - Route/sink/artifact creation
  - Public/default-admin behavior
  - Provider expansion
  - W7/W8 gate changes
  - V1 work
  - `redaction.sufficiencyResultPayloadReturned` must stay `false` (the new
    fields are a separate structural projection, not the full payload)
  - Projected enum pairs must NOT be exposed in public behavior, final
    reports, user-facing outputs, provider scoring, or downstream claim
    adjudication — internal diagnostic/retrieval-debug use only

Reasoning budget:
- Lead Developer: R2
- Senior Developer / implementer: R1
- Reviewers: R2

Mandatory workflows:
- /debt-guard (compact path)

Debt-guard control:
- Required path: compact
- Complexity budget owner: Lead Developer
- Net mechanism increase allowed: no — this is redaction relaxation, not a
  new mechanism
- Must retire/merge/quarantine: none (but must add V2 Retirement Ledger row
  with removal trigger AND hard sunset per amendment 1 — retire at earliest
  of: first continue_to_boundary_formation, Steer-Co caveat_report
  authorization, Captain sufficiency-bar escalation, diagnostic plan
  exhaustion, or fixed calendar/iteration limit)
- Steer-Co trigger: if the change requires widening the redaction type literal
  beyond the scoped enum projection, reconvene

Mechanical debt sensors:
- Required: intake + closeout
- Command: npm run debt:sensors
- Latest status: advisory_warn (stable)

V2 convergence controls:
- Scorecard impact: diagnostic/observability, enables targeted retrieval
  improvement
- Retirement ledger rows: new row for W6-C diagnostic projection, hard
  sunset = "retire at earliest of: first continue_to_boundary_formation,
  Steer-Co caveat_report, Captain sufficiency-bar escalation, plan
  exhaustion, or fixed calendar/iteration limit"
- Hidden-only exception needed: no

Validation:
- Required: focused sufficiency tests, provenance contract tests,
  npm test, npm -w apps/web run build, npm run validate:v2-gates,
  npm run debt:sensors
- Negative-scope tests: must verify projection includes ONLY
  dimension in {source_diversity, direct_evidence, counter_evidence,
  temporal_coverage, method_quality, source_access, other} and
  materiality in {none, minor, material}, and EXCLUDES rationale,
  source text, quotes, sufficiencyStatus, materialScarcityCandidate,
  free-text, and provider identifiers
- Expensive or live checks: one canary after Captain approval + commit +
  runtime refresh (separate package)
- Canary budget: 1 diagnostic + 2 targeted + 1 contingency from 4
  remaining; if diagnostic canary fails, Steer-Co reconvenes before
  further spend

Stop triggers:
- Captain approval needed before any source edit
- Redaction widening beyond scoped enum projection
- Any downstream contract breakage from new projected fields
- Verifier failure with unclear root cause

Output:
Follow the Exchange Protocol. Include:
- Implementation package for Captain approval review
- Debt-guard result block
- V2 Retirement Ledger row
- Accepted-debt owner and removal trigger
- Final debt sensor output
```

### Reconvene Trigger

- The diagnostic canary returns `refine_retrieval` and the dimension breakdown
  reveals a dimension not addressable through existing retrieval paths.
- Two post-diagnostic targeted retrieval canaries still return
  `refine_retrieval`.
- The Captain questions the sufficiency bar for internal alpha.
- The implementation requires redaction widening beyond the scoped enum
  projection.

### Cross-Model Review: GPT-5.5 (Member A) — 2026-05-21

Invoked via `node scripts/agents/invoke-gpt.cjs` (model: gpt-5.5). Full
system/user prompt included the steering package, Leader recommendation with 4
amendments, self-recommendation bias flag, and member return format. (Retry
invocation returned empty output at `max_completion_tokens=2048` — root cause
not investigated; may be reasoning-token budget exhaustion since GPT-5.5 is a
reasoning model. Original response treated as authoritative because prompt and
process were unchanged.)

**Position:** modify (→ support with additional containment)

**5 additional amendments (compatible with Leader's original 4):**

1. **Captain approval before implementation.** Because the redaction contract is
   a type literal `false`, the Captain request must include exact field shape,
   allowed enum values, sample redacted output, retention behavior, and
   retirement trigger. (Reinforces Leader amendment 4.)

2. **Hard sunset.** The ledger row should retire or require renewed Steer-Co
   approval at the earliest of: first `continue_to_boundary_formation`, Steer-Co
   authorization of `caveat_report`, Captain sufficiency-bar escalation after two
   targeted failures, exhaustion of the W6-C diagnostic plan, or a fixed
   calendar/iteration limit. (Strengthens Leader amendment 1.)

3. **Internal diagnostic only.** The projected enum pairs must not be exposed in
   public behavior, final reports, user-facing outputs, provider scoring, or
   downstream claim adjudication — diagnostic/retrieval-debug steering only.
   (Makes explicit what Leader amendment 2 implied.)

4. **Negative-scope tests.** Tests must verify projection contains only
   `dimension ∈ {7 allowed values}` and `materiality ∈ {none, minor, material}`,
   and excludes rationale text, source text, quotes, sufficiencyStatus,
   materialScarcityCandidate, free-text, and provider identifiers. (New.)

5. **Canary budget accounting.** Reserve from 4 remaining slots: 1 diagnostic
   validation, up to 2 targeted retrieval, 1 contingency/escalation. If
   diagnostic canary fails due to schema issues, Steer-Co reconvenes before
   further spend. (New.)

**Key concerns:** Precedent creep (normalizing redaction loosening), temporary
diagnostic becoming permanent (W6-C3 pattern), diagnostic field misuse (treated
as authoritative labels instead of retrieval-steering hints), schema contract
breakage (literal false → structured), downstream coupling (hard to retire),
expansion pressure (other W-gates may request similar).

**Risk assessment:** Blast radius moderate but containable (bounded enums, not
source text). Larger risk is governance precedent. Reversible if ledgered,
feature-flagged, schema-versioned, and isolated to internal diagnostic.

**Self-recommendation bias check:** GPT-5.5 examined the same-agent pattern,
considered Directions B and C independently, and explicitly weighted them lower.
Direction A increases observability while preserving the sufficiency bar; the
bias concern does not change the recommendation.

### Cross-Model Review: Gemini 2.5 Pro (Member B) — 2026-05-21

Invoked via `node scripts/agents/invoke-gemini.cjs` (model: gemini-2.5-pro).
Full system/user prompt included the steering package, Leader recommendation
with 4 amendments, self-recommendation bias flag, and member return format.
(Initial invocation failed with HTTP 429 — billing credits depleted. Captain
topped up credits; retry succeeded.)

**Position:** consent (no additional amendments)

**Key assessment:**

- **Systems impact:** Minimal. Data already parsed in-memory; change is to
  projection/storage layer only. Two enum fields per item is trivial data load.
- **Implementation feasibility:** High. Straightforward schema + data mapping
  change. "One implementation package" cost estimate is realistic.
- **Operational risk:** Low, thanks to existing amendments. Amendment 1 (ledger)
  mitigates untracked debt; amendment 4 (scoped approval) mitigates governance
  precedent; amendment 3 (exit criteria) caps waste at 2 canary slots.
- **Cost-effectiveness:** High. One canary slot traded for diagnostic data that
  unblocks all future retrieval work. Solving this blind "has already wasted 5
  slots and could easily waste the remaining 4."

**Risk concerns:** Schema change cascade (low — internal pipeline, standard
integration risk); precedent misinterpretation (process/people risk, mitigated by
ledger row); diagnostic insufficiency (enums may reveal "what" but not "why" —
but still far more informed than current state).

**Self-recommendation bias check:** Gemini examined the pattern and dismissed it:
"the engineering equivalent of turning on the lights in a dark room." Direction B
is "hope-based" (inference after 5 failures). Direction C is "even less logical"
(5 canaries show more-of-same doesn't work). Direction A is "the only approach
that replaces guesswork with data."

### Captain Escalation

**One remaining escalation:**

1. **Schema/projection change approval** required before the Lead Developer
   edits source code. The Captain pre-approved the schema/projection change in
   the prior session. This Steer-Co result with full cross-model consent (3
   model families) provides the reviewed direction with 6 consolidated
   amendments. The Lead Developer implementation package is the Captain approval
   artifact — it must include exact field shape, allowed enum values, and sample
   output per amendment 4.

   Prior escalations resolved:
   - Model-family panel degradation: resolved — full 3-model-family panel
     achieved (Opus + GPT-5.5 + Gemini).
   - Self-recommendation bias: resolved — both independent model families
     dismissed the concern.
