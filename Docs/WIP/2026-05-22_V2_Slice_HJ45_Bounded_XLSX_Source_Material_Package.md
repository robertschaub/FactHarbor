# V2 Slice HJ45 - Bounded XLSX Source Material Package

## Decision

Status: approved by Captain Deputy / Steer-Co consent for implementation inside this package.

HJ44 produced a complete internal Alpha report for the Captain-defined Swiss
asylum-stock input, but the report still lacked direct current-stock evidence.
The next HighJump step is therefore not another search-preview/cap tweak. HJ45
adds one bounded source-native capability: XLSX-only source material discovered
from already selected Serper linked pages.

## Steer-Co Consensus

Claude Opus and the GPT explorer reviewer both consented to a narrow XLSX-only
slice. They rejected a broad document-ingestion or official-attachment
framework.

Consensus conditions:

- discover XLSX links only from an already fetched HTTPS linked page;
- restrict attachment fetches to the same hostname as that linked page;
- no PDF, CSV, XML, JSON, DOCX, browser, JavaScript, cookies, redirects, direct
  URL, ACS, provider expansion, cache/SR/storage, public behavior, V1 work, or
  semantic row selection;
- pass bounded structural spreadsheet text to the existing hidden Source
  Material and W5 LLM extraction path;
- let W5/LLM decide meaning; code must not decide which row answers the claim.

## V2 Scorecard Impact

Expected impact: positive report-quality value.

HJ45 targets the concrete HJ38-HJ44 defect: internal reports are complete but
source usefulness is too weak for source-native statistical claims. Bounded XLSX
source material should give the existing extraction/report path access to
official tabular values when search results point to pages with spreadsheet
attachments.

This is not counted as public report readiness. Public/default V2 remains
precutover and blocked.

## V2 Retirement Ledger Impact

Accepted temporary debt:

- one bounded XLSX extraction helper in the V2 source-acquisition runtime;
- one new Source Material kind for provider-result XLSX text;
- one in-place extension of the Serper linked-page source-material seam.

Retirement / merge trigger:

- before public cutover, merge HJ45 with the unified Source Material fetch and
  document policy, or retire it if direct source-native attachments are not kept;
- remove HighJump-specific cap/fallback drift when source-material selection is
  consolidated.

## V2 Consolidation Gate

This is allowed because it advances report value from observed live evidence and
does not add another hidden denial/proof layer. Net mechanism count increases,
but the classification is `missing-capability`: no current V2 source-material
path can read bounded spreadsheet attachment text.

Latest debt-sensor status before this package: `advisory_warn`.

Salient warnings remain the known V2 source/test/docs/boundary-guard footprint.
These warnings are steering context, not a hard blocker.

## Implementation Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.ts`
- focused downstream source-material kind support only if required by verifier
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
- focused existing V2 source-material / corpus / extraction-input tests if
  their contract needs the new source-material kind
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if the new
  file/import must be registered
- minimal status, ledger, Agent_Outputs, and index updates

## Required Boundaries

- XLSX only.
- Same-host attachment URLs only.
- HTTPS only.
- No credentials, cookies, proxy use, redirects, browser, JavaScript, shell
  execution, Docker, OCI, or host repo mount.
- Bounded response bytes, bounded sheets/rows/cells, bounded output text.
- No deterministic semantic row/claim matching.
- No raw URLs, source text, provider payloads, prompts, hidden ledger ids, or
  internal statuses in public/default admin/log/error surfaces.
- Existing public/default containment must remain:
  `4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`, and no public
  report markdown.

## Stop Conditions

Stop and reconvene Steer-Co if:

- XLSX extraction requires importing the legacy retrieval module;
- the implementation needs PDF/CSV/XML/JSON/DOCX support;
- the implementation needs direct URL or ACS support;
- a parser framework, sandbox, Docker/OCI, or browser becomes necessary;
- code starts choosing semantically relevant rows or hardcoding source/domain
  terms;
- global W4/W5 caps must be raised;
- public/default containment regresses;
- focused verifiers fail twice with contradictory evidence.

## Verifier Plan

Run before source commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
```

After commit and runtime refresh, one HJ45 live job is authorized by Steer-Co
inside the active Captain live-job budget if all local verifiers pass and git is
clean.
