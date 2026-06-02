# V1 ClaimBoundary Recovery Source

Date: 2026-05-31

## Decision

Use `C:\DEV\FH-rehome-validation` as the practical source for V1 ClaimBoundary pipeline analysis commits that are not on current `main`.

The relevant commit range is:

```text
2f7a2805c44c3a72f9102c94f54aee30bd114ba9..92b5a5f3
```

`C:\DEV\FH-rehome-validation` is detached at:

```text
31b3ea90d128bb97c17817d0238f9c7050ba14f7
```

That detached head contains the shared old-main V1 lineage, including the `2f7a2805..92b5a5f3` block, plus one non-analysis documentation commit after `92b5a5f3`.

## Why This Target

Compared against current `main` (`a4aa66d6`), the shared block contains 185 unique runtime patches under V1-relevant paths:

- `apps/web/src/lib/analyzer`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/configs`
- `apps/web/src/lib/config-schemas.ts`

These include claim selection, Gate 1 repair, research/refinement, verdict citation guards, evidence-direction consistency, prompt fixes, and report warning behavior.

## Practical Next Step

If recovering V1-relevant analysis improvements, start from `C:\DEV\FH-rehome-validation` and inspect/cherry-pick only from the shared range `2f7a2805..92b5a5f3`, with normal review of each candidate commit before applying it to `main`.

Do not replay the full range wholesale. It contains 185 V1-relevant runtime patches, including 113 prompt-touching commits and several revert/over-patching sequences. Port by concept/diff review, in small validated batches.

## Takeover Candidates

### Take First

Low-risk observability/performance candidates:

```text
6b1507e7 fix(research): emit stage two heartbeat events
f9406499 feat(analyzer): trace acquisition source transitions
04dbc99f fix(analyzer): preserve prepared acquisition trace
0b3238b9 chore(stage1): expose contract repair diagnostics
7b6cce38 fix(stage1): type repair observability in result builder
fb2943db perf(analyzer): reuse resolved url source bodies
```

These should improve diagnosis, cost, or runtime behavior without intentionally changing verdict semantics.

### Likely Worth Porting With Focused Validation

These fit known weak areas: evidence preservation, Stage 1 recovery, and research completeness.

```text
12783ed1 fix(stage1): keep recovery retries input-bound
d16ed7ba preserve single-claim preliminary evidence on selection
94a12778 preserve remappable preliminary evidence on selection
d0c10e42 fix(pipeline): keep prepared preliminary evidence
1359baf5 fix(stage1): decouple anchor preservation from claim drift
6293c705 fix(research): preserve contradiction query reserve
01466a0d fix(stage2): prioritize refuting contradiction queries
e51b85ed fix(research): always refine current aggregate routes
377397a9 fix(research): keep refinement from disappearing after dedupe
5068efef fix(research): let refinement fetch full relevant set
```

Port these by concept/diff review rather than blind cherry-pick, because current `main` already has newer ACS, refinement, and UNVERIFIED work.

### Compare Before Porting

Verdict/citation integrity has newer work on current `main`, so compare these against current code before taking them:

```text
959b7280 Fix verdict citation integrity guard
79d83c42 Fix deferred verdict citation guard warnings
84671b43 Surface final verdicts missing decisive citations
837284ab fix(verdict): adjudicate neutral citations before downgrade
e91a2b5d fix(verdict): adjudicate citation direction conflicts
1519f688 fix(stage4): validate citation reasoning coherence
4a4e407f fix(verdict): surface claim direction summaries
```

Use this group only if current F3/citation issues persist after existing `main` fixes are accounted for.

### Defer For Now

Do not bulk-take the prompt micro-calibration series, especially the comparison, standards, and fair-trial sequence. Some individual changes may be useful, but they need explicit prompt review and benchmark validation one small group at a time.

Also defer the old ACS session/draft workflow unless there is a current UI/product reason. Current `main` already has newer automatic claim selection work.

## Suggested Integration Path

Create a candidate branch from current `main`, port the `Take First` batch, run build and safe tests, then run one small live-job gate before moving to the evidence-preservation/research batch.
