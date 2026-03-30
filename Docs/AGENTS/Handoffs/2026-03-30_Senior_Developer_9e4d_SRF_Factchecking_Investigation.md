---
### 2026-03-30 | Senior Developer | Codex (GPT-5) | 9e4d SRF Faktenpruefung Investigation
**Task:** Investigate job `9e4d3712e12d49bc8cadd601766e5f4b`, identify the root cause, and propose the best low-risk/high-quality fix.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The root cause is Stage 1 claim shaping, not Stage 4 or Stage 5. The input `Die SRF leistet hervorragende Arbeit bei der Faktenprüfung` was classified as `ambiguous_single_claim`, then decomposed into three direct dimensions: method quality (`AC_01`), scope/reach (`AC_02`), and transparency/error communication (`AC_03`). `AC_02` and likely `AC_03` are proxy dimensions rather than clean interpretations of the original thesis. Contract validation ran but incorrectly approved the set (`preservesContract=true`, `rePromptRequired=false`, summary: "The extracted claim is identical to the original input. No transformation occurred."). Gate 1 then preserved all three claims because ambiguous-single-claim outputs are tagged `isDimensionDecomposition=true` and exempt from fidelity filtering. Downstream verdict integrity did its job: `AC_02` hit grounding + direction issues, triggered `verdict_integrity_failure`, downgraded to `UNVERIFIED`, and article confidence dropped via article adjudication. This is the expected downstream effect of a bad claim set, not the cause.
**Open items:** I could not use a dedicated multi-agent spawn tool from this runtime, so I performed two independent investigation passes manually: (A) Stage 1 / contract-validation path, and (B) verdict/integrity path. If a separate agent runtime is available later, the highest-value external review would be a prompt-only review of `CLAIM_CONTRACT_VALIDATION` on broad evaluative activity-quality inputs.
**Warnings:** Do not "fix" this in Stage 4/5. The direction-integrity downgrade on `AC_02` is protective, not causal. Do not add deterministic claim-similarity or proxy-keyword logic. The lowest-risk fix is prompt-level hardening in Stage 1, not new code heuristics.
**For next agent:** Evidence anchors:

- Job facts:
  - Input: `Die SRF leistet hervorragende Arbeit bei der Faktenprüfung`
  - Output claims:
    - `AC_01` method quality / accuracy
    - `AC_02` scope / reach of fact-check activity
    - `AC_03` transparency / communication of errors
  - `understanding.inputClassification = ambiguous_single_claim`
  - `understanding.contractValidationSummary = { ran: true, preservesContract: true, rePromptRequired: false, summary: "The extracted claim is identical to the original input. No transformation occurred, so meaning is perfectly preserved." }`
  - `AC_02` final: `UNVERIFIED 50 / 24`, `verdictReason = verdict_integrity_failure`
  - Article final: `LEANING-TRUE 58 / 24`

- Stage 1 anchors:
  - `apps/web/prompts/claimboundary.prompt.md`
    - ambiguous-single-claim rules around lines 138-192
    - contract-validation rules around lines 307-360
    - current overlap rule already covers same-evidence splits (`efficient` / `effective`, `tools` / `methods`) but not this broader "quality -> quantity/reach / communications proxy" family clearly enough
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
    - contract validation + retry around lines 247-350
    - dimension tagging via explicit `ambiguous_single_claim` at lines 407-415
    - Gate 1 fidelity exemption for dimension decompositions at lines 1982-1990

- Downstream anchors:
  - `AC_02` evidence pool is mostly neutral activity/trust material plus one volume item (`EV_010`), showing the claim is weakly grounded from the start
  - `AC_03` evaluates policy/transparency proxies and general SRG communication incidents, not direct fact-check performance
  - `apps/web/src/lib/analyzer/verdict-stage.ts`
    - grounding/direction validation and safe downgrade are working as intended
  - `apps/web/src/lib/analyzer/aggregation-stage.ts`
    - article adjudication lowering confidence is working as intended

Recommended fix path (low risk, high quality):
1. **Primary fix — prompt-only hardening in `CLAIM_CONTRACT_VALIDATION`:**
   - broaden the existing proxy-drift rule for broad evaluative activity-quality claims
   - require retry when decomposition turns "quality of doing X" into quantity/frequency/reach/visibility/publicity/policy/communications proxies unless the input explicitly asks for those
   - require retry when the dimensions do not assess the quality of the underlying activity itself
2. **Secondary backup — small Pass 2 prompt clarification:**
   - for `ambiguous_single_claim`, interpretation dimensions must stay on the original predicate, not surrounding organizational proxies
   - keep this narrow; do not change the classification system itself unless broader evidence shows misclassification is the main failure mode
3. **Do not change Stage 4/5** for this issue.

Suggested validation set after prompt approval:
- `9e4d3712e12d49bc8cadd601766e5f4b` thesis family
- one `8640/cd4501` evaluative over-fragmentation control
- one genuine ambiguous evaluative control where decomposition should remain
- one direct factual-property control to ensure no regression from the earlier Flat-Earth tightening
**Learnings:** no
