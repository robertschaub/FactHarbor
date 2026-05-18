# V2 Slice X7-W2-RP1 Local Raw-Code Probe Package

**Date:** 2026-05-18
**Status:** Claude Opus-reviewed and approved; docs-only; exactly one local transient probe allowed only after package commit and pre-probe checks
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS5_DIAG4_Taxonomy_Live_Result.md`
**Baseline:** `01949273` (`docs: record v2 w2 ls5 live result`)

## 1. Purpose

X7-W2-LS5 proved that the product V2 route still reaches W2 after DIAG4 and still classifies all three W2 transport attempts as:

```text
transportFailureClass = unknown_transport_failure
transportFailurePhase = unknown_phase
transportErrorShape = node_error_code_present
nodeErrorCodeCategory = other_known
candidateCount = 0
byteCount = 0
```

DIAG4 deliberately avoided raw error-code inspection and first closed known taxonomy gaps. Since LS5 still reports `other_known`, another enum guess would be speculative. RP1 is a strictly local operator diagnostic to observe the exact Node error code once, outside product/admin/runtime artifacts, so the next package can choose between:

- a narrow DIAG5 taxonomy/mapping source package;
- a mapping-bug repair if the code is already covered;
- endpoint/client design review if the raw signal is library-internal, absent, or not reproducible.

RP1 is not a product runtime package, live-job package, provider expansion, source-material package, endpoint redesign, W2 completion-semantics repair, or public-readiness gate.

## 2. Consolidated Direction

The post-LS5 reviewer consensus is:

- do not run another live job before understanding the remaining `other_known` category;
- do not add raw-code telemetry to product/admin artifacts;
- do not make another bounded taxonomy edit without evidence;
- use one operator-local transient probe only if it exactly mirrors the product transport path enough to explain the W2 failure.

Important correction: the product W2 transport uses Node `https.request` with custom DNS resolution and a pinned lookup callback, not `fetch`, curl, axios, or undici. RP1 must therefore mirror the `https.request` path in `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`.

## 3. Probe Authority

After this package is reviewed, recorded, committed, and the pre-probe checks pass, RP1 authorizes exactly one operator-local probe.

Allowed transient behavior:

- create a temporary probe helper outside the repository under a local temp directory such as `%LOCALAPPDATA%\Temp\fh-w2-rp1\`;
- run Node from the same local runtime used by the repo;
- use `dns.promises.lookup(hostname, { all: true, verbatim: true })`;
- use Node `https.request` with:
  - protocol `https`;
  - hostname and SNI `api.wikimedia.org`;
  - port `443`;
  - method `GET`;
  - fixed path `/core/v1/wikipedia/en/search/page`;
  - one `q` request parameter with a synthetic non-sensitive probe query;
  - headers equivalent to the product request envelope: `accept: application/json` and `user-agent: FactHarbor-V2-Internal`;
  - `agent: false`;
  - timeout `1500ms`;
  - custom `lookup` callback returning the selected public DNS result;
- print the observed raw low-level code to console only for operator inspection;
- immediately destroy the response if a response is reached, without reading a body;
- delete the temporary helper directory after the observation.

The synthetic query value is intentionally not Captain analysis input. RP1 is not an analysis job and does not interpret or evaluate the query. The query is used only to exercise the approved endpoint path. Since LS5 failed before final-address validation and before any bytes were observed, the raw transport-code observation should not depend on claim semantics.

## 4. Strict Non-Persistence Contract

The observed raw code must not be written to:

- product runtime artifacts;
- admin route JSON;
- committed docs;
- source/test files;
- repo scripts;
- repo-local temp files;
- logs;
- screenshots;
- public output;
- result envelopes.

Committed RP1 result documentation must use:

```text
[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]
```

and record only the categorical conclusion.

The shell output may transiently display the raw code during the local run. Do not quote it back into chat, documents, or commit messages.

## 5. Explicitly Forbidden

RP1 must not:

- edit production source, tests, prompts, configs, schemas, models, provider policy, package files, or lockfiles;
- add a committed helper script;
- run a live analysis job;
- use the product runner/orchestrator/API/UI/report/export path;
- use `fetch`, curl, axios, browser automation, provider SDKs, redirects, proxies, credentials, cache, storage, or Source Reliability;
- read, parse, store, log, or commit response body bytes;
- consume source material, source candidates, packets, frames, parser input, parsed material, EvidenceCorpus, EvidenceItems, reports, verdicts, warnings, confidence, truth percentage, or public payloads;
- use ACS/direct URL execution;
- reuse, inspect, clean, or modify V1 code;
- broaden to another provider or endpoint;
- make endpoint/client design changes;
- add retries or multiple probes;
- preserve probe files after completion.

## 6. Stop Conditions

Stop and document without repair if:

- the repo worktree is dirty before the probe;
- the probe cannot be created outside the repo;
- the transient helper writes any file other than its own temporary script;
- the probe needs a committed helper;
- the probe needs a different endpoint, client, provider, header posture, timeout, proxy, redirect policy, credential, or DNS policy;
- the probe reaches a response and would need to read bytes to continue;
- the failure cannot be reproduced in one bounded attempt;
- a raw observed code accidentally appears in a repo file, status document, handoff, result file, commit message, or chat response;
- a product/source/test/config/prompt edit appears necessary.

If any stop condition is hit, do not continue into DIAG5 or endpoint redesign inside RP1. Create a separate package.

## 7. Result Classification

Record exactly one of these outcomes:

| Outcome | Meaning | Next package |
|---|---|---|
| `rp1_observed_existing_category_mapping_gap` | The observed code is already covered by the approved taxonomy but product telemetry still reports `other_known`. | Mapping-bug source package. |
| `rp1_observed_unmapped_standard_node_code` | The observed code is a standard Node/POSIX-style code not currently mapped. | DIAG5 taxonomy source package. |
| `rp1_observed_library_internal_or_absent_code` | The raw signal is library-internal, absent, or not suitable for bounded taxonomy. | Endpoint/client design review. |
| `rp1_response_reached_unexpectedly` | The probe reached a response before the product-style failure occurred. | Endpoint/client/path comparison package; do not read body. |
| `rp1_failure_not_reproduced` | The one bounded local probe did not reproduce the transport failure. | Product/local environment comparison package. |
| `rp1_aborted_stop_condition` | A stop condition was triggered. | Review before any continuation. |

Do not add a more specific outcome without review.

## 8. Allowed Committed Files

Package/review/closeout files only:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`
- optional later RP1 result file under `Docs/WIP/`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`
- optional later RP1 result handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

No source/test/script/config/prompt/package/lockfile changes are allowed.

## 9. Required Checks Before Probe

Before the transient local probe:

```powershell
git status --short --untracked-files=all
git diff --check
node -v
```

The worktree must be clean except for the committed package state. If not clean, stop.

## 10. Required Checks After Probe

After the transient local probe:

```powershell
git status --short --untracked-files=all
git diff --check
```

Also verify:

- the temp helper directory has been deleted;
- no repo-local helper/log/temp/probe file was created;
- the RP1 result file, status updates, Agent_Outputs entry, and handoff do not contain the observed raw code;
- the result file contains `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]`.

Run `npm run index` after handoff/status updates. No unit/build suite is required because RP1 edits no source or test files. If any source/test edit becomes necessary, stop and create a separate reviewed package.

## 11. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`.

Return `approve`, `modify`, or `reject`.

Check whether RP1 is the right next step after LS5:

- local-only raw-code inspection is justified because DIAG4 still left `other_known`;
- the probe mirrors the actual product transport (`https.request` with custom DNS lookup), not fetch/undici/curl;
- the synthetic query choice is acceptable because the failure is pre-byte/pre-final-address and the package does not analyze claim content;
- no observed raw code is committed, logged in repo, exposed through product/admin artifacts, or repeated in chat;
- the package permits exactly one transient probe and deletes the temp helper;
- no live job, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, endpoint redesign, ACS/direct URL, V1 work/cleanup, source/test/prompt/config/schema/model edits, or retry is authorized.

## 12. Review Decision

| Role | Reviewer | Date | Decision | Notes |
|---|---|---:|---|---|
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE | Reviewer confirmed RP1 is the correct next step after LS5, that another enum guess would be speculative, and that transport parity is sufficient because the package mirrors `https.request`, `agent: false`, explicit DNS lookup, pinned lookup callback, and product headers. Reviewer accepted synthetic query use because LS5 failed before final-address validation and before bytes, and found raw-code non-persistence robust. Non-blocking probe-time advisories: set `servername` explicitly to the hostname, and treat helper timeout as `rp1_failure_not_reproduced`. |
