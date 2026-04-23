## Task

Investigate the ACS-1 live acceptance failure on the Captain-defined Bundesrat input and determine whether the draft/prepared path diverges from cold-start because of ACS plumbing or because Stage 1 itself is unstable.

## Input

Captain-defined input used throughout:

`Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

## Findings

1. The ACS plumbing is not the source of the parity failure.
   - Draft `31d63ed5056a4fccb7a698cb3b643323` prepared successfully and auto-confirmed into job `a8a3a633e6cc4e40bf200dab471302f0`.
   - The prepared job persisted `ClaimSelectionDraftId`, `PreparedStage1Json`, and `ClaimSelectionJson`.
   - The prepared job event trail includes `Reusing prepared Stage 1 snapshot...`.
   - This confirms the prepared-job reuse seam is functioning as designed.

2. The live parity failure is real and happens before prepared-job reuse.
   - Draft/prepared Stage 1 produced 1 claim:
     - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor Volk und Parlament darüber entschieden haben.`
   - Cold-start job `5dc2089fb984461bbb6dbf2ae18f2765` produced 2 claims:
     - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Volk darüber entschieden hat.`
     - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Parlament darüber entschieden hat.`
   - The cold-start result stored `contractValidationSummary.stageAttribution = "retry"`.
   - The draft/prepared snapshot stored `contractValidationSummary.stageAttribution = "initial"`.

3. Code-path inspection does not show an ACS-specific Stage 1 fork.
   - `prepareStage1Snapshot(...)` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` resolves input text, builds the same initial state shape, and calls `extractClaims(state)`.
   - `runClaimBoundaryAnalysis(...)` also reaches Stage 1 through `extractClaims(state)`.
   - `jobId` only affects config-usage recording in the config loader; it does not select a different prompt/config payload.

4. The unstable seam is the single-claim atomicity / contract-retry branch inside Stage 1.
   - `extractClaims(...)` runs:
     - Pass 1
     - salience commitment
     - preliminary search
     - Pass 2
     - claim contract validation
     - approved single-claim challenges
     - single-claim atomicity validation + re-check
     - optional Pass 2 retry with corrective guidance
   - The cold-start job event trail explicitly showed:
     - `Validating single-claim atomicity...`
     - `Re-checking single-claim atomicity...`
     - `Retrying Pass 2 with claim contract guidance...`
   - The persisted cold-start result demonstrates that this branch escalated and split the conjunction.
   - The persisted draft snapshot demonstrates that the same Stage 1 logic accepted the single bundled claim and never escalated beyond the initial contract-approved path.

5. Direct same-process probing confirms Stage 1 instability rather than ACS wiring drift.
   - A direct `extractClaims(...)` probe was run twice from `apps/web` using the same Captain-defined input:
     - once with `jobId = undefined`
     - once with `jobId = "probe-stage1-jobid"`
   - Both direct probes produced the same 1-claim result with `stageAttribution = "initial"`.
   - That means:
     - the earlier 2-claim cold-start result is not explained by the presence of `jobId`
     - the same Stage 1 code can produce different final candidate sets across runs on the same input
   - This is runtime instability in the LLM-governed Stage 1 validation/retry behavior.

## Evidence

### Persisted draft / prepared artifacts

- Draft `31d63ed5056a4fccb7a698cb3b643323`
  - `Status = COMPLETED`
  - `FinalJobId = a8a3a633e6cc4e40bf200dab471302f0`
  - `DraftStateJson.preparedStage1.preparedUnderstanding.atomicClaims.length = 1`
  - `contractValidationSummary.stageAttribution = "initial"`

- Prepared job `a8a3a633e6cc4e40bf200dab471302f0`
  - `ClaimSelectionDraftId = 31d63ed5056a4fccb7a698cb3b643323`
  - event: `Reusing prepared Stage 1 snapshot...`
  - `PreparedStage1Json.preparedUnderstanding.atomicClaims.length = 1`

### Persisted cold-start artifact

- Cold-start job `5dc2089fb984461bbb6dbf2ae18f2765`
  - `ClaimSelectionDraftId = null`
  - `PreparedStage1Json = null`
  - `ResultJson.understanding.atomicClaims.length = 2`
  - `contractValidationSummary.stageAttribution = "retry"`
  - event trail includes:
    - `Validating single-claim atomicity...`
    - `Re-checking single-claim atomicity...`
    - `Retrying Pass 2 with claim contract guidance...`

### Direct probe result

The direct `extractClaims(...)` probe produced 1 claim in both cases (`jobId` absent and present), with a contract-approved initial path and no retry attribution.

## Conclusion

The ACS-1 acceptance failure on the Bundesrat anchor is caused by Stage 1 instability, not by the ACS draft/prepared-job architecture.

More specifically:

- the same Stage 1 extraction code can accept the single bundled `Volk und Parlament` claim on one run
- and split it into two coordinated-branch claims on another run
- without any ACS-specific code-path difference

This means ACS-1 should not proceed to additional anchor parity sign-off or to ACS-CW-1 until Stage 1 is stabilized for this failure class.

## Recommended Next Step

Treat this as a Stage 1 stabilization task focused on the single-claim atomicity / contract-retry path for Bundesrat-class coordinated-branch inputs.

The likely solution area is one of:

1. prompt-level tightening of `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` / related contract-validation language
2. validator stability hardening (for example, lower-temperature / stricter challenger behavior)
3. an additional LLM challenger specifically for coordinated-branch decomposition if prompt-only tightening is insufficient

Prompt edits were not made in this pass.

## Verification Performed

- Persisted draft/job/result inspection via SQLite
- Code-path inspection of:
  - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
  - `apps/web/src/lib/internal-runner-queue.ts`
  - `apps/web/src/lib/config-loader.ts`
  - `apps/web/src/lib/analyzer/prompt-loader.ts`
  - targeted sections of `apps/web/prompts/claimboundary.prompt.md`
- Direct live Stage 1 probe via `npx tsx` calling `extractClaims(...)` twice on the Captain-defined input

## Warnings

- The direct probe uses real LLM/search calls and is therefore expensive.
- No code change was made in this pass because the evidence points to Stage 1 behavior instability, not a safe local plumbing bug.
