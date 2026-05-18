# 2026-05-18 Lead Developer V2 X7-W2-TR1 Live Result And Pivot

## Summary

Closed the TR1 post-repair live canary and prepared the required pivot package.

TR1 implementation was already committed at `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd`. Runtime was refreshed from that commit, endpoint docs were re-checked, hidden artifact routes passed admin-only/no-store preflight, and the worktree stayed clean through the required idle checkpoint. Exactly one approved canary was submitted using:

```text
Using hydrogen for cars is more efficient than using electricity
```

Job `fcf5135297e449468e881e957d89464d` reached `SUCCEEDED`, first prepared `pipeline: claimboundary-v2`, and public V2 output remained `4.0.0-cb-precutover` / `blocked_precutover` with no hidden-marker leak.

The canary did not pass the TR1 W2 success bar. Hidden W2 recorded three provider/network attempts, but all stopped at `response_stream` with `compressed_byte_cap_exceeded`, zero bytes, and zero candidates. Classification: `PIVOT_REQUIRED_X7_W2_TR1_RESPONSE_STREAM_BYTE_CAP_ZERO_CANDIDATES`.

## Files Changed

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Live_Result.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-TR1_Live_Result_And_Pivot.md`

## Key Evidence

- TR1 improved the failure point from the earlier address-selection failure to response-stream byte-cap failure.
- Provider network executed: `true`.
- Search fetch called: `true`.
- Provider attempts: `3`.
- Network attempts: `3`.
- Candidate count: `0`.
- Total bytes: `0`.
- Total duration: `2729ms`.
- Cost: `0`, reason `no_paid_api_no_credentials`.
- Downstream gate stayed `candidate_to_source_material_gate_closed`.
- All source-material/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public-write flags remained false.

## Warnings

- Do not continue TR1 repair.
- Do not patch the old custom DNS/pinned lookup path.
- Do not run another TR1 canary.
- Do not add retries, provider expansion, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, prompt/config/model/schema edits, ACS/direct URL, or V1 work.
- The next package is a Steering Board review of endpoint/client/response-size choices, not implementation.

## For Next Agent

Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`.

Recommended next action is review/debate of PIV1. The likely implementation package after approval is a bounded-response repair: keep standard Node HTTPS, preserve all containment, and either add an explicit small result limit to the approved endpoint or move to the official project-local equivalent search endpoint with the same small limit. Avoid byte-cap increases as the first move unless review proves a useful candidate list cannot fit within the current cap.

Do not implement PIV1-A until the pivot package is accepted.

## Learnings

The transport client itself is no longer the primary blocker. TR1 showed the standard Node path reaches the response stream. The remaining question is endpoint/request response sizing and durability, especially because Wikimedia documents gradual Core API deprecation beginning in July 2026 and maps Core page search to a project-local REST equivalent.
