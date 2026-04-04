# Stage-4 Payload Duplication — Architect Review

**Date:** 2026-04-02
**Role:** Lead Architect / Code Reviewer
**Status:** RESOLVED — payload simplification shipped in `e0cf6752` (2026-04-03). Inner-quote repair shipped in same commit. Both validated by successful German Plastik reruns.

---

## 1. Executive Summary

The Stage-4 contract alignment patch (prompt variable rename, JSON serialization, `reportLanguage` threading) fixed a real contract bug but did **not eliminate** the German Plastik `VERDICT_ADVOCATE` parse failures. Post-patch job `bc7f2cafc8fb4ea09267e18cf2a5f409` still fails with the same symptom: both advocate attempts return fenced JSON that fails all parser recovery strategies.

The remaining issue is now a **prompt size problem amplified by payload duplication**. The system prompt contains fully serialized structured data (correct, as of the contract fix), but the user message still sends the identical data a second time via `JSON.stringify(input)`. For evidence-heavy runs, this pushes advocate prompt tokens to ~80K, roughly doubling the necessary input size. The proposed fix — replacing the duplicated user-message JSON with a short fixed instruction — is the narrowest correct next step.

---

## 2. What the Evidence Proves

### Post-patch comparative data (same prompt hash `342b5ef5...`)

| Job | Evidence Items | Advocate promptTokens | schemaCompliant | Outcome |
|-----|---------------|-----------------------|-----------------|---------|
| c86a (success) | 85 | 53,958 | true | 3 verdicts, conf 68 |
| 974a (success) | 93* | 75,026 | true | 3 verdicts, conf 71 |
| bc7f (FAILED) | 110 | 79,774 | false x2 | `analysis_generation_failed` |

*974a also had one self-consistency parse failure that recovered on retry — at the same 75K prompt token level.

### What this proves:

1. **The contract fix was necessary but not sufficient.** The placeholder mismatch and `[object Object]` coercion are gone — the system prompt now contains real serialized data. But the failure pattern persists for large evidence sets.

2. **Prompt size is the strongest remaining discriminator.** 54K succeeds cleanly, 75K succeeds with one parse hiccup, 80K fails outright. This is consistent across the entire job family including pre-patch failures (b467 at 38K failed when the system prompt was garbage — now 80K fails with a correct but doubled system prompt).

3. **The output is not truncated.** bc7f's advocate produced 7,038 and 7,028 completion tokens against a 16,384 max. The outputs are 18K and 19K characters. The JSON is malformed, not incomplete.

4. **Retry is not curative.** Both attempts at 80K produce malformed output. This is expected: re-sending the same oversized prompt produces the same quality degradation.

5. **The `userMessage` branch is dead code.** No caller in `verdict-stage.ts` ever sets `input.userMessage`. The `typeof input.userMessage === "string"` check at line 261 never triggers — the user message is always `JSON.stringify(input)`.

---

## 3. Assessment of the Payload-Duplication Hypothesis

**Hypothesis:** Duplicating the full structured payload in both system prompt and user message roughly doubles the token count, pushing evidence-heavy runs past a quality threshold where Sonnet's JSON output becomes unreliable.

**Evidence supporting this hypothesis:**

- The system prompt already contains **all** the data the LLM needs (post contract fix). The user-message JSON adds zero new information.
- For bc7f: the system prompt renders ~40K tokens of instructions + serialized data. The user message adds ~40K more tokens of the same data as raw JSON. Total: ~80K. Without duplication: ~40K — well within the successful range.
- The failing job's estimated halved prompt (~40K) would sit between c86a (54K, clean success) and the comfortable middle of 974a. The size reduction makes it comparable to the successful runs.
- Every prior run that succeeded at >54K prompt tokens had less evidence and therefore less duplication impact.

**Evidence weakening this hypothesis:**

- Token count alone does not perfectly predict failure. 974a succeeded at 75K (though with one SC parse hiccup). The relationship is probabilistic, not deterministic.
- The exact nature of the JSON malformation is unknown — we lack raw failed response artifacts. It could be an unrelated Sonnet issue that happens to correlate with prompt size.

**Assessment: Strong but not conclusive.** The duplication is the only remaining architectural defect in the Stage-4 input path. It is the highest-probability remaining cause, and removing it costs nothing (the data is already in the system prompt). Even if another cause exists, the duplication is wasteful and harmful, so removing it is correct regardless.

---

## 4. Evaluation of the Proposed Fix

### What it does

Replace lines 261-263 of `verdict-generation-stage.ts`:

```typescript
// Before:
const userContent = typeof input.userMessage === "string"
  ? input.userMessage
  : JSON.stringify(input);

// After:
const userContent = "Analyze the data provided in the system prompt and return output matching the required JSON schema.";
```

### Is this correct?

**Yes, with one refinement.** The fixed instruction should be applied to all Stage-4 calls uniformly, because:

1. Every Stage-4 prompt section (ADVOCATE, CHALLENGER, RECONCILIATION, GROUNDING_VALIDATION, DIRECTION_VALIDATION, DIRECTION_REPAIR) embeds its data in the system prompt via `loadAndRenderSection()` with serialized variables.
2. No caller passes `userMessage` — the escape hatch is dead code.
3. The user message currently serves no purpose beyond satisfying Anthropic's API requirement for at least one user message.

### Scope assessment

The change is:
- **Narrow:** One variable assignment, one file.
- **Reversible:** Revert the one line to restore duplication.
- **Safe:** No prompt content changes, no model routing changes, no parser changes.
- **Cost-reducing:** Halves prompt tokens for verdict calls (~$0.30-0.50 saved per run).

---

## 5. Risks / Cautions

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| LLM needs user-message data to produce correct output | Very low — system prompt already contains it | The contract tests verify all variables resolve. Successful runs at lower token counts confirm the system prompt is sufficient. |
| TPM guard estimate changes | Certain — `estimatedInputTokens` includes `approxTokenCount(userContent)` | The estimate drops by ~40K for heavy runs. This is correct behavior: the actual input IS smaller. The OpenAI TPM guard will be less likely to trigger, which is appropriate since the request is now smaller. |
| Some Stage-4 section relies on user-message JSON for context the system prompt doesn't provide | Very low | All six sections have full variable contracts verified by `verdict-prompt-contract.test.ts`. The user message never contained information absent from the system prompt. |
| Sonnet still produces malformed JSON at ~40K | Possible | This would indicate a separate issue (output format instability at moderate prompt sizes). The fix is still correct — it removes the amplifier. Further mitigation would be a separate patch (e.g., structured output mode, max output increase). |

---

## 6. Recommended Path

1. **Implement the fix as proposed.** Replace `userContent` with a short fixed instruction string. Remove the dead `userMessage` branch.
2. **Update the TPM guard comment** to reflect that the user message is now a fixed short string, so the estimate is dominated by the rendered system prompt.
3. **Update the existing pipeline test** expectation if it asserts on user message content.
4. **Do NOT** add a test that asserts on the exact user message wording — the instruction text is not a contract.
5. **Validation gate:** `npm test` + `npm -w apps/web run build` + one German Plastik rerun with the patched code.

---

## 7. Validation Gate

| Gate | Method | Pass criteria |
|------|--------|---------------|
| Unit tests | `npm test` | All pass, no regressions |
| Build | `npm -w apps/web run build` | Clean compilation |
| Live validation | Rerun German Plastik (`Plastik recycling bringt nichts`) | Advocate parse succeeds; job produces 3 verdicts with non-zero confidence |

---

## 8. Final Judgment

**`Stage-4 payload simplification is the right next fix`**

The contract alignment patch fixed what was broken in the prompt. The payload duplication fix removes what is wasteful and harmful. Together they complete the Stage-4 input path repair:

| Attempt | What it fixed | Was it sufficient? |
|---------|--------------|-------------------|
| #1 Parser hardening (Mar 20) | Better recovery from malformed output | No — output itself is malformed |
| #2 Provider concurrency guard (Mar 23) | Rate limiting under load | No — serial runs still fail |
| #3 Retry on parse failure (post-Mar 23) | Second chance after parse failure | No — same broken input produces same broken output |
| #4 Contract alignment (Apr 2) | System prompt now contains real data | Necessary but not sufficient — duplication doubles token cost |
| **#5 Payload simplification (this fix)** | **Remove redundant user-message JSON** | **Completes the input path repair** |

The fix is narrow (1 line), reversible, evidence-driven, and reduces cost. It should ship immediately.
