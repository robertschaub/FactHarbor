# Latency and Versioned Assessment Registry Roadmap

**Created:** 2026-08-10

**Status:** Future-facing architecture note; no implementation is authorized by this document

**Scope:** Faster access to an existing current assessment, measurement of the cold analysis path, and post-phase optimization options

**Non-goals:** Claiming that fresh FactHarbor analysis is real-time; weakening pipeline quality gates; semantic matching in the first bounded slice; live benchmark runs

---

## 1. Decision Summary

FactHarbor should distinguish two different latency questions:

1. **Can a previously produced, still-current assessment be available at release time?** Yes. A versioned assessment registry with exact-match lookup can make this a fast structural verification path.
2. **Can a new evidence search and multi-model verdict be completed in real time?** Not honestly on the current architecture. Fresh analysis remains asynchronous and may take seconds to minutes depending on claim and source complexity.

The phrase **“answerable in real time”** can truthfully describe release-time availability of already-prepared evidence and provenance. It must not be expanded into a claim that FactHarbor computes a fresh verdict synchronously. This note therefore creates no requirement to remove that phrase from a separate document that already makes the pre-analysis/release-time distinction clear.

The recommended first engineering work, if this track is activated, is:

1. an offline latency census from already-persisted metrics;
2. a definition-only ADR for a versioned assessment registry, exact-match key, freshness, and invalidation;
3. only then, a bounded exact-match implementation slice.

Semantic matching and cold-path pipeline surgery remain later roadmap items.

---

## 2. Current Verified Baseline

The current status records typical analysis times of 30–60 seconds for 1–2 claims, 2–5 minutes for a medium article, and 5–15 minutes for larger analyses. It also records that results remain JSON blobs, with no normalized claim cache, so every analysis recomputes from scratch.

The implementation explains the latency shape:

- the ClaimAssessmentBoundary pipeline runs five top-level stages sequentially;
- preliminary search is already parallelized across claims, queries, and source fetches;
- the main research loop is adaptive and sequential;
- each generated research query awaits search, LLM relevance classification, bounded-parallel source fetching, and LLM evidence extraction before the next query;
- source fetching is already concurrency-limited, currently defaulting to three;
- the verdict stage is a dependent debate chain: advocate, parallel self-consistency and challenger work, reconciliation, then validation;
- the aggregation stage establishes the structured truth/confidence result before generating an explanatory, non-adjudicatory narrative.

Search-result caching and source-reliability caching already exist. Whole-assessment caching is deliberately off during Alpha so run-to-run variance stays observable. The missing architectural component is not another generic response cache; it is a normalized, provenance-bound assessment record with explicit currentness semantics.

Existing metrics already persist total duration, per-phase timings, individual LLM-call durations, query timings, token use, and estimated cost. A new live run is therefore not required for the first latency census.

---

## 3. Target: Two-Speed Assessment Architecture

### 3.1 Fast path — exact current assessment

An exact-match request may reuse a prior assessment only when all binding fields match and the assessment remains current. The lookup performs structural verification; it does not reinterpret the claim.

Expected response states:

- `current-assessment`: an exact, unexpired, non-invalidated match exists;
- `refresh-pending`: a matching assessment exists but requires refresh before reliance;
- `no-current-assessment`: no eligible match exists;
- `invalidated-assessment`: a prior match exists but a recorded invalidator prevents reuse.

Only `current-assessment` returns a reusable verdict. All other states fail closed with respect to reuse and may enqueue the asynchronous cold path.

### 3.2 Cold path — fresh analysis

A cache miss, stale record, changed dependency, or mismatched scope invokes the complete FactHarbor analysis pipeline. The cold path continues to run all required stages and quality gates. It produces a new immutable assessment version; it does not silently overwrite the record previously consulted by another action.

### 3.3 Later path — semantic candidate matching

Semantic reuse is explicitly excluded from the first bounded scope.

If explored later, embeddings or text similarity may retrieve candidates only. An LLM must decide semantic equivalence, and reuse must still pass the same scope, freshness, provenance, and invalidation checks as an exact match. Candidate retrieval alone can never authorize reuse.

---

## 4. Versioned Assessment Record

The registry should bind at least:

- canonical assessment id and immutable version;
- normalized claim-contract hash and exact submitted claim representation;
- assessment boundary, geography, language, and temporal scope;
- evidence-item and source-snapshot fingerprints;
- source retrieval timestamps and freshness requirements;
- pipeline implementation, prompt, configuration, and resolved-model provenance;
- structured per-claim and aggregate verdict fields;
- creation time, `valid_until`, and freshness policy;
- dependency epochs or equivalent invalidation inputs;
- invalidation time, reason, and replacement version when applicable.

The exact-match key must be versioned and deterministic. Changing any reuse-binding or analytical field must produce a miss rather than a near match.

The registry is the system of record. A future release-time gateway or cache is a consumer of an exact, current record; it should not synchronously call the full FactHarbor research pipeline while an answer or action is waiting to be released.

---

## 5. Bounded Activation Sequence

### Slice 0 — Offline latency census

Use existing persisted metrics only. Do not run live or expensive analyses merely to establish the first baseline.

Report, by representative job class where the stored data permits:

- p50, p95, and maximum total duration;
- p50 and p95 by `understand`, `research`, `cluster`, `verdict`, and `aggregate` phase;
- LLM wait time by task type, provider, model, and retry count;
- search, source-fetch, and source-reliability wait time;
- query, source, evidence, and claim fan-out;
- critical-path time versus summed work;
- cache-hit/miss information already available;
- time to structured verdict versus time to complete narrative/report, if derivable.

If the persisted records cannot answer one of these questions, record it as a telemetry gap rather than manufacturing a value.

### Slice 1 — Definition-only registry ADR

Specify:

- exact-match key and canonicalization boundary;
- record schema and provenance contract;
- TTL and claim/source/config invalidators;
- immutable version and replacement semantics;
- fail-closed miss/stale behavior;
- evaluation-mode isolation from user-facing reuse;
- latency targets as design targets, not measured claims;
- synthetic contract and invalidation test cases.

This slice changes no analysis behavior.

### Slice 2 — Exact-match implementation

Only after review of the ADR:

- add the normalized assessment store behind an explicit feature flag;
- write a record after successful complete analysis;
- implement exact-match lookup and currentness validation;
- keep evaluation/calibration runs uncached;
- test expiry, invalidation, provenance mismatch, partial writes, and concurrent refresh;
- expose honest non-hit states rather than a provisional final verdict.

---

## 6. Post-Phase Cold-Path Roadmap

These ideas require a fresh benchmark and separate quality review. They are not part of the exact-match slice.

### 6.1 Separate verdict readiness from report readiness

The aggregation code computes truth and confidence before generating the explanatory narrative. A future interface could persist and expose the structured verdict first, then attach the completed narrative/report as a later immutable presentation version. The narrative must remain explanatory and must not retroactively change the verdict.

### 6.2 Bounded research waves

The main research loop can potentially move from one-query-at-a-time execution to bounded waves:

1. select independent under-researched claims from one immutable state snapshot;
2. generate a small query wave;
3. execute query pipelines with global provider and token budgets;
4. collect results locally;
5. merge deterministically;
6. re-evaluate sufficiency before the next wave.

The existing preliminary-search implementation demonstrates the local-result/deterministic-merge pattern. Blind parallelism is not acceptable: the adaptive research loop uses earlier evidence to prevent redundant work, and provider bursts have previously caused rate limiting, latency, and evidence-pool variance.

### 6.3 Incremental evidence refresh

Once normalized records exist, refresh work can be dependency-aware:

- retain source snapshots that remain within their freshness policy;
- re-fetch expired, failed, or explicitly invalidated sources;
- append a new assessment version when evidence changes;
- preserve the evidence and provenance of the prior version;
- never silently present a stale verdict as current.

### 6.4 Controlled overlap

After profiling, independent work such as early source-reliability prefetch or Stage-1 subtasks may be overlapped. Any such change needs local-result isolation, deterministic merge behavior, provider throttling, and quality comparison. It should not be assumed to be safe merely because two operations are technically concurrent.

---

## 7. Non-Negotiable Quality Boundaries

- No stage skipping for a fresh final verdict: Understand → Research → Verdict remains intact.
- Gate 1 and Gate 4 remain mandatory.
- Every reusable verdict retains evidence transparency and exact provenance.
- Missing, stale, invalidated, or ambiguous matches fail closed.
- Deterministic text similarity cannot decide semantic equivalence.
- A provisional or refresh-pending result cannot be presented as final.
- Performance work must not erase Alpha variance measurement; evaluation runs remain explicitly uncached.
- Latency targets remain targets until measured on the then-current stack.

---

## 8. Relationship to Existing Plans

This note complements rather than replaces:

- [Current Status](../STATUS/Current_Status.md) for the verified operational and performance baseline;
- [Backlog](../STATUS/Backlog.md) for canonical task state, including the existing claim-level caching item;
- [Pipeline Speed & Cost Optimization Plan](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) for residual cold-path optimization candidates and the requirement for a fresh baseline;
- [Pipeline Telemetry Concept and Plan](2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md) for persisted measurement semantics.

If this track is activated, the latency census and registry ADR should receive their own approval and review. This roadmap itself authorizes no implementation, live analysis, prompt/configuration change, or external integration.
