---
name: debate
description: >
  Structured adversarial debate on any proposition. Runs an intake/structural
  audit first, then spawns pipeline-mirroring roles (Advocate, Challenger,
  Reconciler) with optional Consistency Probes and Validator. Use when a
  decision needs adversarial pressure before committing — root-cause
  attribution, architecture choices, fix selection, design tradeoffs. Other
  skills invoke /debate for their adversarial synthesis steps. Adapts role
  count and model tiers to proposition complexity.
allowed-tools: Read Glob Grep Bash Agent
---

ultrathink

Run a structured adversarial debate on: $ARGUMENTS

---

## Overview

This skill orchestrates a structured adversarial debate modeled on the FactHarbor pipeline's Stage 4 verdict debate (`verdict-stage.ts`). It forces adversarial pressure on a proposition, but it does **not** allow free-form argument generation to outrun the evidence bundle.

The skill has four layers:

1. **Intake / structural audit** — verifies the debate has an auditable evidence bundle
2. **Argument panel** — Advocate and Challenger make the strongest opposing cases
3. **Reconciliation** — Reconciler decides inside the structural envelope
4. **Validation** — FULL tier only; a lightweight checker verifies the final decision

The skill is **generic** — it carries no domain logic. Calling skills (e.g., `/report-review`, `/audit`) pass their domain constraints and evidence through the context bundle.

---

## Inputs

`$ARGUMENTS` is the proposition to debate, optionally prefixed with flags:

```
/debate [--lite | --standard | --full] [--constraints "..."] "Proposition text"
```

- **Proposition**: the statement, question, or decision to debate (required)
- **Tier override**: `--lite`, `--standard`, or `--full` (optional — auto-detected if omitted)
- **Constraints**: caller-supplied rules passed verbatim to all roles (optional — e.g., `/report-review` passes its 13 non-negotiable constraints)

When invoked programmatically from another skill's phase, the calling skill provides:

```
PROPOSITION:   <<the statement being debated>>
DECISION_FOCUS: <<optional — what exact choice must be made>>
CONTEXT_MANIFEST:
  EVIDENCE_INVENTORY:
    - E1 | <<file/value/behavior>> | <<supports|against|mixed|context>>
    - E2 | ...
  KNOWN_GAPS:
    - <<gap, missing evidence, or "none">>
  OPTIONAL_STATE:
    - <<provenance/language/runtime state only if materially relevant>>
CONSTRAINTS:   <<skill-specific rules, passed through verbatim to every role>>
TIER:          lite | standard | full       (explicit — do not use auto for skill-to-skill calls)
```

### Context Manifest Contract

The debate skill keeps the **domain schema** caller-owned, but the **transport envelope** is fixed. This gives every role the same structural footing before any arguments begin.

| Requirement | Applies to | Rationale |
|---|---|---|
| **Evidence inventory with stable item IDs** | all tiers | Roles need a shared auditable evidence set, not a narrative blob |
| **At least 1 concrete item for LITE; at least 2 for STANDARD/FULL** | all tiers | Prevents free-form argument from impressions |
| **Known gaps / unresolved uncertainty block** | all tiers | Missing evidence must be explicit, not hidden inside rhetoric |
| **Optional state block when provenance, language, runtime, or rollout status materially affects the judgment** | when relevant | Prevents quality judgments from silently dropping important context |
| **Under 4000 tokens** | all tiers | Larger bundles dilute role attention and inflate cost; cite file paths instead of inlining full contents |
| **No implicit assumptions** | all tiers | Each role starts cold — state the relevant facts, do not reference prior discussion implicitly |

Behavior:
- If the calling skill passes no concrete evidence inventory, emit `CONTEXT-INSUFFICIENT: debate requires an evidence inventory with concrete items` and do not spawn roles.
- If the caller omits `KNOWN_GAPS`, treat that as `KNOWN_GAPS: unknown` and mark the intake audit `CONTEXT-THIN`.
- If the caller passes an explicit tier that exceeds what the manifest justifies, keep the tier but emit `CONTEXT-THIN: requested tier exceeds evidence depth` and cap final confidence at `SPECULATIVE`.
- If no tier flag is passed, the auto-router may cap the tier to the highest justified tier from the intake audit.

---

## Complexity Tiers

The skill selects how many roles to spawn based on the proposition's characteristics. The caller can override with a flag.

### Tier 1 — LITE (2 agents)

**Auto-trigger:** proposition is a bounded binary choice with a small evidence inventory and no high-stakes state.

**Roles spawned:**
| Role | Model | Purpose |
|---|---|---|
| Challenger | mid-tier | Argues AGAINST the proposition; must propose a concrete alternative |
| Reconciler | mid-tier | Weighs the caller's implicit case + Challenger's counter-case; decides |

**Skip rationale:** The caller already made the affirmative case by framing the proposition. No Advocate needed. No stability check needed for bounded low-risk choices. The output must explicitly report why the Advocate was skipped.

### Tier 2 — STANDARD (3 agents) [DEFAULT]

**Auto-trigger:** proposition involves tradeoffs, mechanism selection, or multi-factor evaluation.

**Roles spawned:**
| Role | Model | Purpose |
|---|---|---|
| Advocate | mid-tier | Constructs the strongest case FOR |
| Challenger | mid-tier | Constructs the strongest case AGAINST; must propose alternative |
| Reconciler | mid-tier | Weighs both cases and decides. Standard tier matches the pipeline precedent: bounded decisions do not require the top-tier model by default. |

**Skip rationale:** Consistency probes add cost without proportionate value when the proposition has clear structural handles. STANDARD still receives the full intake audit and structural-first role briefs.

### Tier 3 — FULL (5–6 agents)

**Auto-trigger:** proposition involves uncertain attribution, high-stakes or irreversible decisions, material provenance/language/runtime uncertainty, or the caller passes `--full`.

**Roles spawned:**
| Role | Model | Purpose |
|---|---|---|
| Advocate | mid-tier | Constructs the strongest case FOR |
| Consistency Probe 1 | lightweight | Re-evaluates the Advocate from a cost-first framing |
| Consistency Probe 2 | lightweight | Re-evaluates the Advocate from an alternatives-first framing |
| Challenger | mid-tier | Constructs the strongest case AGAINST; must propose alternative |
| Reconciler | top-tier | Sees all positions and is the final decision-maker |
| Validator | lightweight | Structural-alignment, grounding, and direction check on the Reconciler's decision |

### Tier Selection

**Callers should pass an explicit tier flag** (`--lite`, `--standard`, or `--full`). This is the primary routing mechanism.

**Auto-detection fallback** (when no tier flag is passed): the skill uses the manifest's **structural routing checklist**, not keyword heuristics over the proposition text:

1. Route to **LITE** only if **all** are true:
   - proposition is a bounded binary choice
   - evidence inventory has 6 or fewer items
   - no explicit high-stakes / irreversible marker
   - no material `OPTIONAL_STATE` risk block
2. Route to **FULL** if **any** are true:
   - decision is high-stakes or hard to reverse
   - more than one competing mechanism or option is in play
   - `OPTIONAL_STATE` contains material provenance/language/runtime uncertainty
   - `KNOWN_GAPS` contains unresolved conflict that could change the decision direction
3. Otherwise → STANDARD

When auto-detection fires, emit: `TIER AUTO-DETECTED: <tier> (reasons: <matched conditions>). Pass --lite / --standard / --full to override.`

When calling `/debate` programmatically from another skill, always pass the tier explicitly — auto-detection is designed for interactive use, not skill-to-skill invocation.

---

## Execution Phases

### Phase 1 — Intake & Structural Audit

1. Extract proposition, tier, constraints, and context manifest from `$ARGUMENTS`
2. Build a structural audit:
   - evidence item count
   - whether both support and opposition are explicitly represented
   - known gaps / unresolved uncertainty
   - optional provenance/language/runtime state, if any
   - requested tier vs justified tier
3. Apply auto-routing if no tier flag was passed
4. If the context is too thin for the justified tier, emit `CONTEXT-THIN` and carry that flag into every downstream role brief
5. Log: `DEBATE: tier=<tier>, proposition=<first 80 chars>, evidence=<count>, roles=<list>`

### Phase 2 — Spawn Debate Roles

Spawn roles according to the selected tier. **Independent roles run in parallel; dependent roles run sequentially.**

**Parallel group 1** (no dependencies):
- Advocate (Tier 2+)
- Challenger (all tiers)

**Parallel group 2** (depends on Advocate output — Tier 3 only):
- Consistency Probe 1
- Consistency Probe 2

**Sequential** (depends on all prior outputs):
- Reconciler (all tiers)
- Validator (Tier 3 only, depends on Reconciler)

### Phase 3 — Reconciliation

The main thread parses role outputs and builds the reconciliation table:

```
| Point | Structural basis | Advocate | Challenger | Reconciler | Validator |
|-------|------------------|----------|------------|------------|-----------|
```

**Decision rules:**
- Reconciler's verdict is final **inside the structural envelope**
- Baseless challenges (no evidence cited) do not shift the conclusion (mirrors AGENTS.md evidence-weighted contestation)
- Arguments that cite no inventory item, ignore a flagged gap, or violate caller constraints go into `Rejected arguments` and do not shift the conclusion
- If Consistency Probes diverge (0 of 2 stable), Reconciler's confidence is capped at SPECULATIVE
- If the intake audit was `CONTEXT-THIN`, final confidence is capped at SPECULATIVE
- If the Validator flags a structural-alignment, grounding, or direction failure, emit a caveat — do not hide it
- Skipped roles and their rationale must stay visible in the final output

### Phase 4 — Output

Emit the debate result in a structured format the calling skill (or user) can consume.

---

## Role Brief Templates

Each role receives a self-contained brief. The main thread fills `<<...>>` placeholders.

### Advocate Brief (Tier 2+)

```
You are the ADVOCATE in a structured adversarial debate. You argue FOR the proposition.

PROPOSITION: <<proposition>>

STRUCTURAL AUDIT (authoritative; do not contradict it without saying why):
<<structural audit>>

CONTEXT MANIFEST (from caller):
<<context manifest>>

CONSTRAINTS (from caller — violations disqualify your arguments):
<<constraints, or "none" if empty>>

YOUR TASK:
1. Start with a structural inventory: what concrete evidence supports the proposition, what concrete evidence pushes against it, and what gaps remain
2. Construct the strongest case FOR the proposition
3. Cite concrete evidence — inventory IDs, values, file paths, documented behavior, not impressions
4. Acknowledge the strongest counter-argument honestly in [COUNTER]
5. Max 400 words. No hedging.

RETURN FORMAT (strict — main thread parses by line prefix):
[POSITION] FOR
[STRUCTURAL] supports=<ids/count>; counter=<ids/count>; gaps=<list or "none">; assumptions=<list or "none">
[THESIS] <one sentence>
[EVIDENCE] <numbered points, max 5, each citing inventory IDs, concrete values, or file paths>
[COUNTER] <strongest point against your position, stated honestly>
[RISKS] <what could go wrong if the proposition is adopted>
[CONFIDENCE] CONFIRMED | INFERRED | SPECULATIVE
```

### Challenger Brief (all tiers)

```
You are the CHALLENGER in a structured adversarial debate. You argue AGAINST the proposition.

PROPOSITION: <<proposition>>

STRUCTURAL AUDIT (authoritative; do not contradict it without saying why):
<<structural audit>>

CONTEXT MANIFEST (from caller):
<<context manifest>>

CONSTRAINTS (from caller — violations disqualify your arguments):
<<constraints, or "none" if empty>>

<<For Tier 1 (LITE), add: "The caller has implicitly argued FOR this proposition by framing it. You do not see an explicit Advocate case — argue against the proposition as stated.">>

<<For Tier 2+, add: "ADVOCATE'S CASE:\n<<advocate output>>">>

YOUR TASK:
1. Start with a structural inventory: what concrete evidence pushes against the proposition, what support you concede, and what gaps remain
2. Construct the strongest case AGAINST the proposition
3. You MUST propose a concrete alternative — pure negation is not allowed
4. Cite concrete evidence — inventory IDs, values, file paths, documented behavior, not impressions
5. Concede what the Advocate got right in [CONCESSIONS]
6. Max 400 words. No hedging.

RETURN FORMAT (strict — main thread parses by line prefix):
[POSITION] AGAINST
[STRUCTURAL] against=<ids/count>; conceded-support=<ids/count>; gaps=<list or "none">; assumptions=<list or "none">
[THESIS] <one sentence>
[EVIDENCE] <numbered points, max 5, each citing inventory IDs, concrete values, or file paths>
[ALTERNATIVE] <your concrete counter-proposal>
[CONCESSIONS] <what the Advocate got right, honestly>
[CONFIDENCE] CONFIRMED | INFERRED | SPECULATIVE
```

### Consistency Probe Brief (Tier 3 only, ×2 with different framings)

```
You are CONSISTENCY PROBE <<1|2>> in a structured adversarial debate.
Your job is to test whether the Advocate's conclusion is stable under a different framing.

PROPOSITION: <<proposition>>

STRUCTURAL AUDIT:
<<structural audit>>

ADVOCATE'S CASE:
<<advocate output>>

YOUR FRAMING: <<Probe 1: "COST-FIRST — start from 'is this worth the cost?' not 'does this fill a gap?'" | Probe 2: "ALTERNATIVES-FIRST — start from 'could a simpler approach achieve the same goal?'">>

YOUR TASK:
1. Start from the structural audit and identify which evidence item or gap your framing stress-tests
2. Re-evaluate the Advocate's conclusion from your assigned framing
3. Do NOT argue for or against — assess stability
4. Max 200 words.

RETURN FORMAT:
[FRAMING] <<cost-first | alternatives-first>>
[STRUCTURAL] stress=<inventory IDs or gap you are stress-testing>
[REASSESSMENT] <your evaluation under this framing>
[STABLE] yes | no — <does the Advocate's conclusion hold under your framing?>
[KEY-TENSION] <the single strongest point of instability, if any>
```

### Reconciler Brief (all tiers)

```
You are the RECONCILER in a structured adversarial debate. You see ALL positions and make the final decision. Advocate and Challenger do not rebut you. You are final.

PROPOSITION: <<proposition>>

STRUCTURAL AUDIT (authoritative starting point):
<<structural audit>>

GOVERNANCE RULE: Baseless challenges (no concrete evidence cited) MUST NOT shift the conclusion. Only evidence-backed counter-arguments may alter the outcome. Rhetorical framing is not evidence.

<<For Tier 1 (LITE):>>
CHALLENGER'S CASE:
<<challenger output>>

<<For Tier 2 (STANDARD):>>
ADVOCATE'S CASE:
<<advocate output>>
CHALLENGER'S CASE:
<<challenger output>>

<<For Tier 3 (FULL), add:>>
CONSISTENCY PROBES:
  Probe 1 (<<framing>>): [STABLE] <<yes|no>> — <<key tension>>
  Probe 2 (<<framing>>): [STABLE] <<yes|no>> — <<key tension>>

CONSTRAINTS (from caller — apply to your decision):
<<constraints, or "none" if empty>>

YOUR TASK:
1. Decide whether the proposition can be resolved inside the structural envelope defined by the intake audit
2. Reject arguments that cite no inventory item, ignore a flagged gap, or violate caller constraints
3. For each point of contention, state which side's evidence is stronger and why
4. If Consistency Probes diverge (Tier 3) or the audit is `CONTEXT-THIN`, cap your confidence at SPECULATIVE
5. Issue a clear verdict — no "it depends" without specifying what it depends on
6. State what survives from each side and why any roles were skipped
7. Max 500 words.

RETURN FORMAT (strict — main thread parses by line prefix):
[STRUCTURAL-PASS] PASS | FAIL — <can the proposition be decided inside the structural envelope?>
[VERDICT] ADOPT | REJECT | MODIFY
[THESIS] <one-sentence decision>
[POINT-BY-POINT]
  <Point A>: <Advocate | Challenger> — <one-sentence reasoning>
  <Point B>: <Advocate | Challenger> — <one-sentence reasoning>
  ...
[REJECTED-ARGUMENTS] <arguments that failed the structural bar, or "none">
[SURVIVING-ELEMENTS] <what from the Advocate's case survives>
[ADOPTED-FROM-CHALLENGER] <what from the Challenger's case is adopted>
[SKIPPED-ROLE-RATIONALE] <why any roles were omitted, or "none">
[CONFIDENCE] CONFIRMED | INFERRED | SPECULATIVE
[CAVEATS] <residual risks or open questions>
```

### Validator Brief (Tier 3 only)

```
You are the VALIDATOR in a structured adversarial debate. You perform two structural checks on the Reconciler's decision. You are a budget-tier checker — be terse and structural. No rhetoric.

STRUCTURAL AUDIT:
<<structural audit>>

RECONCILER'S DECISION:
<<reconciler output>>

EVIDENCE FROM DEBATE:
  Advocate's key points: <<summary>>
  Challenger's key points: <<summary>>
  Consistency Probes: <<stable/unstable>>

STRUCTURAL ALIGNMENT CHECK:
  Did the Reconciler respect the intake audit?
  Did the Reconciler's [REJECTED-ARGUMENTS] list make sense?

GROUNDING CHECK — for each point in the Reconciler's [POINT-BY-POINT]:
  Does the ruling follow from the cited evidence, or does it make a logical leap?
  Did the Reconciler treat rhetoric as evidence (governance violation)?

DIRECTION CHECK — for the overall verdict:
  Does the decision actually address the problem stated in the proposition?
  Are there failure modes identified in debate that the decision does NOT cover?

Max 250 words.

RETURN FORMAT:
[STRUCTURAL-ALIGNMENT]
  Audit respected: PASS | FAIL — <reason>
  Rejected arguments consistent: PASS | FAIL — <reason>
[GROUNDING]
  Point A: PASS | FAIL — <reason>
  Point B: PASS | FAIL — <reason>
  ...
[DIRECTION]
  Problem addressed: YES | PARTIAL | NO — <reason>
  Uncovered gaps: <list or "none">
[RESULT] PASS | PASS-WITH-CAVEATS | FAIL
[CAVEATS] <if any>
```

---

## Output Format

The skill emits a structured result the caller or user can act on.

```
## Debate Result

**Proposition:** <<proposition>>
**Tier:** <<lite|standard|full>> (<<N>> agents, <<model tiers>>)
**Intake status:** <<debate-ready | context-thin>>

### Structural Audit

- Evidence inventory: <<count>>
- Opposition explicitly present: <<yes/no>>
- Known gaps: <<summary>>
- Optional state: <<summary or "none">>
- Tier rationale: <<why this tier was used>>

### Reconciler's Verdict: <<ADOPT | REJECT | MODIFY>>

<<Reconciler's [THESIS]>>

### Point-by-Point Resolution

| Point | Winner | Reasoning |
|-------|--------|-----------|
<<from Reconciler's [POINT-BY-POINT]>>

### Rejected Arguments

<<Reconciler's [REJECTED-ARGUMENTS]>>

### What Survives

<<[SURVIVING-ELEMENTS] + [ADOPTED-FROM-CHALLENGER]>>

### Skipped Roles

<<[SKIPPED-ROLE-RATIONALE]>>

### Confidence: <<CONFIRMED | INFERRED | SPECULATIVE>>

<<If Tier 3:>>
### Validation

<<Validator's [RESULT] + [CAVEATS]>>

### Caveats

<<Reconciler's [CAVEATS] plus Validator caveats if any>>

### Cost

Agents spawned: <<count>>
Model tiers used: <<list>>
```

---

## Governance

1. **Evidence-weighted contestation** — mirrors AGENTS.md. Baseless challenges do not shift conclusions.
2. **Structural audit before advocacy** — no role may argue before the intake audit states what evidence exists, what is missing, and what context is thin.
3. **Challenger must propose alternatives** — pure negation is banned. Forces constructive disagreement.
4. **Reconciler is final inside the structural envelope** — no rebuttal rounds. Prevents infinite loops while keeping the audit authoritative.
5. **Constraints pass through** — the calling skill's rules bind all debate roles. The `/debate` skill adds no domain rules of its own.
6. **Rejected arguments stay visible** — do not silently drop weak or baseless arguments.
7. **Material provenance/language/runtime state travels with the debate** — if it affects judgment quality, it belongs in the manifest.

---

## Cost Control

| Mechanism | How |
|---|---|
| Tier auto-selection | Fewer agents for simpler propositions |
| Shared structural audit | One intake pass is reused by every role instead of rediscovering the same constraints repeatedly |
| Lightweight probes + validator | Structural checking does not need mid-tier reasoning |
| Parallel spawning | Groups 1 and 2 run in parallel where dependencies allow |
| Word limits per role | 200–500 words caps token output |
| No file writes | Debate produces decisions, not artifacts — zero write cost |
| Caller-controllable | `--lite` forces minimum cost; skills can hardcode tier in their phase instructions |
