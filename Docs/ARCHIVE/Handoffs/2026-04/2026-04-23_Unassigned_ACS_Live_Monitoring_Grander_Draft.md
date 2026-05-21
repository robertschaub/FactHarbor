# ACS Live Monitoring Grander Draft

Date: 2026-04-23  
Role: Unassigned  
Model: Codex (GPT-5)

## Task

Monitor the live Atomic Claim Selection draft-preparation path after the observability patch, focusing on logs plus persisted draft status to verify whether the slow-path diagnosis still points to Stage 1 rather than recommendation.

## Live Case

- Draft ID: `6f18f926e2a2443f96afa097429ec146`
- Selection mode: `automatic`
- Input type: `url`
- Input URL: `https://www.grandervertrieb.ch/ch/informationen-faqs-service/faqs-fragen-kritik/funktion-wirkung#welche-auswirkungen-hat-die-strukturveraenderung-in-einem-grander-belebten-wasser`

## What Was Observed

- Local web (`http://localhost:3000`) and API (`http://localhost:5000/swagger`) were both reachable during monitoring.
- The analyzer log showed Stage 1 progressing through retrieval, initial contract validation, and Gate 1.
- Mid-run, the draft API exposed live progress:
  - `status=PREPARING`
  - `progress=30`
  - `lastEventMessage="LLM call: claim contract validation — claude-sonnet-4-6"`
- After another poll window, the same draft transitioned to:
  - `status=FAILED`
  - `progress=31`
  - `lastEventMessage="Stage 1 preparation failed contract preservation and cannot continue."`

## Confirmed Findings

1. The new persistence path is working.
   - `lastEventMessage` was readable through `GET /v1/claim-selection-drafts/{id}` during preparation and after failure.
   - `draftStateJson.observability` was present on failure and included `phaseCode`, `branch`, `stage1Ms`, `totalPrepMs`, `candidateClaimCount`, and Stage 1 timing details.

2. This live run again confirms the dominant latency is Stage 1, not recommendation.
   - `draftStateJson.observability` reported:
     - `totalPrepMs=330037`
     - `stage1Ms=330004`
     - `candidateClaimCount=20`
     - `stage1.contractValidationMs=127415`
   - `rankedClaimIds` and `recommendedClaimIds` were empty because the draft never reached recommendation.

3. The concrete live failure mode was late Stage 1 contract revalidation, not initial extraction.
   - Next.js dev log:
     - `Claim contract validation passed`
     - `Gate 1: filtered 4 of 24 claims`
     - `Final contract revalidation returned no usable result after two attempts.`
     - `Final accepted claims could not be re-validated; marked as degraded (no silent fail-open).`
   - Persisted observability recorded:
     - `branch=failed_stage1`
     - `contractValidationFailureMode=validator_unavailable`
     - `stageAttribution=initial`

## Interpretation

- The observability patch succeeded in making the draft-preparation path inspectable from the outside.
- The slow-path diagnosis remains valid: the claim-selection dialog delay is still upstream of recommendation.
- This specific Grander draft demonstrates an additional Stage 1 slow/fail seam after Gate 1: final contract revalidation can consume substantial time and still fail before recommendation begins.

## Remaining Gaps

- The current observability payload separates `contractValidationMs`, but not the final contract revalidation duration as its own explicit field.
- The live draft used `selectionMode=automatic`, so this run validates the preparation path and persistence, not the interactive chooser UI itself.

## Verification Performed

- Process check for running `FactHarbor.Api`, `dotnet`, and `node`
- Reachability checks for `http://localhost:3000` and `http://localhost:5000/swagger`
- Tail of:
  - `apps/web/.next/dev/logs/next-development.log`
  - `apps/web/debug-analyzer.log`
- Polling:
  - `GET /internal/v1/claim-selection-drafts/recoverable`
  - `GET /v1/claim-selection-drafts/{id}` using local admin auth

## Warnings

- No code changes were made in this monitoring pass.
- No new tests were run in this pass.
- The live case used a user-created draft already present in the system; no fresh analysis input was submitted here.

## For Next Agent

- If you need the next highest-value instrumentation change, add an explicit `finalContractRevalidationMs` field to draft observability so the long tail after Gate 1 stops being inferred from logs.
- If you need UI verification, create or wait for a real interactive 5+ claim draft and confirm the milestone text shown in the browser matches `lastEventMessage` transitions from the API.
