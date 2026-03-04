# Audit: Report Quality & Event Communication

Reusable audit prompt for verifying all warning emission and display sites comply with `AGENTS.md § Report Quality & Event Communication`.

**One-liner:** `As Code Reviewer, run the audit defined in Docs/AGENTS/Audit_Warning_Severity.md`

---

## Required Reading (read FIRST, in order)
1. `AGENTS.md` — section "### Report Quality & Event Communication"
2. `apps/web/src/lib/analyzer/warning-display.ts` — canonical classification
3. `apps/web/src/lib/analyzer/types.ts` — `AnalysisWarningType` union

## Part A: Emission Audit

Scan every warning emitted in:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`

Search for: `warnings.push`, `severity:`, `.push({` with type/severity fields.

For each warning found:
1. Record: type, severity, message pattern, trigger condition
2. **Classify into category FIRST** (this determines severity constraints):
   - **Routine operation** — recovered automatically, normal in healthy runs → silent or `info` only
   - **System-level failure** — something broke that we could fix → `warning`, `error`, or `severe`
   - **Analytical reality** — the real world lacks evidence, not a system fault → `warning` or `error`, never `severe`
3. Then apply the litmus test: *"Would the verdict be materially different if this event hadn't occurred?"*
4. Check severity against escalation thresholds:
   - silent/info → no verdict impact
   - warning → noticeable but same verdict direction and confidence tier
   - error → confidence tier or verdict direction may differ
   - severe → no valid report possible
5. **Category constrains severity:** Analytical reality is NEVER `severe` (system worked correctly). Routine operations are NEVER `warning`+ (they were handled). Present analytical reality as factual context ("evidence is scarce"), not as a system error ("something failed").
6. Flag violations: current severity, correct severity, category, reasoning

**Common misclassification to avoid:**
`insufficient_evidence` is **analytical reality**, NOT a system failure. Even though it triggers an UNVERIFIED fallback verdict, the system worked correctly — it correctly identified that the real world lacks sufficient evidence for this claim. Present this as context ("evidence is scarce for this claim"), not as an error ("something failed"). Same applies to `low_evidence_count`, `low_source_count`, and `recency_evidence_gap` — these describe the evidence landscape, not system problems.

Budget/resource exhaustion (`budget_exceeded`, `query_budget_exhausted`) is **system-level but recoverable** — the analysis completes with reduced coverage. Severity should be `warning`, not `error`, unless coverage is so thin that the confidence tier or verdict direction is likely to change.

## Part B: Classification Audit

In `warning-display.ts`, check the `WARNING_CLASSIFICATION` registry.

**Bucket assignment rule (provider vs analysis):**
- `provider` = operational issue with an external service (LLM provider down, search provider failed, model fallback, fetch errors). The root cause is infrastructure.
- `analysis` = quality concern about the analysis itself (insufficient evidence, verdict inconsistency, budget limits, evidence gaps). From the user's perspective, this is about report quality.
- Assign by **user-facing meaning**, not by root cause. A verdict generation crash may be *caused* by an LLM provider, but it's an *analysis* problem from the user's perspective — "the analysis failed," not "a provider had issues."

Check:
1. Is every emitted type (from Part A) registered?
2. Is the **bucket** correct per the provider vs analysis rule above?
3. Is the **impact** (degrading/informational) correct per the three categories?
4. Dead entries — types registered but never emitted?
5. Unclassified — types emitted but missing from registry?

## Part C: Display Audit

In:
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/components/FallbackReport.tsx`
- `apps/web/src/components/SystemHealthBanner.tsx`

Check:
1. All classification sourced from `warning-display.ts`? (no inline classification)
2. **Severity floor enforced?** Degrading warnings MUST be displayed at `warning` severity minimum — never passed through as `info`. This is a safety net: even if emission code accidentally sets `info` on a degrading type, the display layer must promote it to `warning`. Non-degrading → forced to `info`.
3. Degrading warnings always visible to users? (never admin-only)
4. Non-degrading warnings hidden from regular users?

## Output Format

### Findings
| # | Sev | File:Line | Warning Type | Category | Current | Should Be | Reasoning |
|---|-----|-----------|-------------|----------|---------|-----------|-----------|

Category must be one of: `routine` / `system-failure` / `analytical-reality`.

### Unregistered Types (emitted but not in warning-display.ts)
### Dead Types (in warning-display.ts but never emitted)

### Fix Plan (ordered by severity)
For each finding:
- Specific code change needed
- File(s) to modify
- Emission-side fix (change severity at source) or classification-side fix (update warning-display.ts)

**DO NOT implement fixes. Audit and plan only.**
