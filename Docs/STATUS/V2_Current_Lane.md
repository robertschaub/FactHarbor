# V2 Current Lane Projection

**Last updated:** 2026-05-22
**Status:** advisory projection for active coordination, not a second approval source

This file mirrors the active V2 lane so agents do not need to reconstruct the
same state from chat, WIP packages, handoffs, status, backlog, and the live-job
ledger before every step. If this projection conflicts with an implementation
package, gate register, live-job ledger, or Captain instruction, the
authoritative source wins.

## Active Goal

Use the HighJump approach to get complete internal Pipeline V2 reports through
the normal manual submission path, now that V2 is the default pipeline and the
admin job UI can display V2 report markdown. Lower only report-blocking bars
that are shown by live evidence, then raise quality, safety, and completeness
from observed report defects.

## Current Implementation Anchor

Latest committed implementation anchor:

`30d8d011 fix(v2): add bounded serper preview material`

This commit adds a bounded, hidden/admin-only Serper search-preview Source
Material feed into the existing W3-B/W4/W5 path. It uses V2-owned transport
and redaction, hashes raw locators, caps records/bytes/time, admits preview
material only alongside stronger Source Material, and keeps parser,
cache/SR/storage, retries, report/verdict/confidence behavior, V1 reuse, and
public exposure closed.

Runtime has not yet been refreshed to this commit for the next validation job.

## Latest Result

Latest validation:

`STOP_X7_HJ25_BOLSONARO_W5_NO_EXTRACTABLE_EVIDENCE_AFTER_PREVIEW_MATERIAL`

Result document:

No standalone result document has been written yet; the job was recorded in
the active Codex thread and should be folded into the next HighJump closeout.

Important evidence:

- `d2e18575dcbe453c9cbae2281438405e` ran the default manual V2 path for the
  Bolsonaro/fair-trial input on runtime/docs commit `52afbc2b`.
- Claim Understanding accepted; Query Planning produced five legal/fair-trial
  queries; candidate provider network completed; W3-B created nine Source
  Material records with `8626` aggregate bytes.
- W5 still returned `hidden_no_extractable_evidence` and no report was created.
- This confirmed the next missing capability is source-content usefulness, not
  another report-writer repair or more preview-only lowering.
- Public/default containment held: public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public and
  default job/page surfaces did not expose hidden report text or hidden statuses.

## Open Generalization Gap

The Bolsonaro input now reaches W5 after W3-B and W4-A repairs, but the
Wikimedia/OpenAlex material has been insufficient for W5 extraction. HJ25
confirmed this after bounded preview material:

- `315886278aa34b4a9ba8fd91d9ac3cc0`: W3-B later fetch failure;
- `d2aaaee251cd40bb9d6dd2291d235a76`: W4-A fetch diagnostic overstrictness;
- `34e0057f557a4e3f859702dbb1a45874`: W5 no extractable evidence;
- `4d9ff1dd1292405e8796937472774e51`: W5 no extractable evidence persisted
  after topic-neutral prompt lowering.
- `d2e18575dcbe453c9cbae2281438405e`: W5 no extractable evidence persisted
  after bounded search-preview material.

Treat this as a source-content/usefulness and evidence-extraction
generalization problem. The next committed repair is the bounded Serper preview
Source Material feed at `30d8d011`; validate whether the stronger snippet pool
allows W5 and the internal report writer to progress.

## Live Budget

The machine ledger is `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current active tranche:

- reset total: `18`;
- consumed after reset: `0`;
- remaining: `18`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, Web/API runtime commit match, and result documentation.

## Next Action

1. Commit this current-lane and live-budget sync.
2. Refresh runtime to `30d8d011` plus this docs sync.
3. Run one Captain-defined Bolsonaro-family validation job through the default
   manual V2 path and classify its information yield.
4. If Serper preview material remains absent, first inspect the bounded
   transport/key path. If Serper material is present but W5 still returns no
   extractable evidence, pivot the next repair toward W5 extraction/report
   quality using the observed hidden evidence rather than adding more source
   acquisition machinery.

## Stop Conditions

Stop and reconvene Steer-Co, or escalate to Captain only if needed, when:

- runtime commit does not match the committed source under test;
- the default manual submission path unexpectedly runs V1;
- route/default-admin/public/log/error surfaces leak report text, source text,
  prompt text, provider payload, hidden ids, or public verdict/truth/confidence;
- the next repair would require retries, schema relaxation, a parallel report
  path, source/provider expansion, public behavior, V1 cleanup, parser/cache/SR
  storage, ACS/direct URL, or another hidden mechanism;
- a standing Captain approval gate is reached or team consent fails on a
  material decision.

Do not stop for routine implementation mechanics inside the current
HighJump/report-quality path.
