# Job Events Readability — Design & Implementation Plan
**Date:** 2026-03-16 | **Author:** Senior Developer | **Status:** ✅ Implemented (2026-03-16)

---

## Current State

The Events tab renders a plain list:

```
{ISO timestamp}  INFO  — Extracting claims: Pass 1 (rapid scan)...
{ISO timestamp}  INFO  — Extracting claims: preliminary web search...
{ISO timestamp}  WARN  — Search provider "google-cse" error: quota exceeded
{ISO timestamp}  INFO  — Extracting claims: Pass 2 (evidence-grounded refinement)...
```

**Problems:**
- Raw pipeline-internal messages — unintelligible to users
- No sense of which stage you're in or how far along
- Errors shown in same style as normal progress
- ISO 8601 timestamps are hard to scan (was this 3 seconds ago or 3 minutes?)
- Important parameters (e.g. which search provider failed, which retry number) buried in the message string
- No schema change is possible (event data = only `id, tsUtc, level, message`)

---

## Goals

- User understands **what the pipeline is doing** at each step
- User can spot **warnings and errors** immediately
- Key parameters (provider name, retry count, claim count) are visible at a glance
- **Not too long** — compact by default; detail is one click away
- **No schema change** in this phase — frontend-only, structural message mapping

## Non-Goals

- Showing internal metrics / debug data to all users
- Real-time animation / progress bars (separate concern)
- LLM-powered message interpretation

---

## Event Inventory

### Pipeline phases and their raw messages

| Phase | Raw message prefix(es) | User-friendly label |
|-------|------------------------|---------------------|
| **Setup** | `Job created`, `Runner started`, `Preparing input` | Analysis started |
| **Understanding** | `Extracting claims: Pass 1`, `Pass 2`, `Gate 1`, `preliminary web search`, `reprompt attempt` | Understanding input |
| **Research** | `Researching evidence`, `Running contrarian evidence search`, `Assessing evidence applicability` | Searching for evidence |
| **Clustering** | `Clustering evidence into boundaries` | Grouping evidence |
| **Verdict** | `Generating verdicts`, `Aggregating final assessment` | Generating verdicts |
| **Quality** | `Performing holistic TIGERScore` | Quality evaluation |
| **Done** | `Storing result`, `Result stored`, `Done` | Complete |
| **Lifecycle** | `Job cancelled`, `Report hidden`, `Retry job created from` | Lifecycle event |
| **Error** | level=`error` | Error |

### Messages with extractable parameters

| Raw message pattern | Extracted params |
|--------------------|-----------------|
| `Search provider "{p}" error: {msg}` | Provider name, short error |
| `Retry job created from {id} (retry #{n}, pipeline: {v})` | Source job ID, retry count, pipeline |
| `Extracting claims: reprompt attempt {n}/{max}` | Attempt number |
| `Failed to extract verdict: {ex}` | Exception summary |
| `Stack (truncated):\n{trace}` | Stack trace (collapsible) |

---

## Proposed UI Design

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ 📋 Analysis Timeline                                     │
├─────────────────────────────────────────────────────────┤
│ ✅ Setup                              0s – 1s            │
│ ✅ Understanding input                1s – 8s     ▸      │  ← collapsed (done)
│ ✅ Searching for evidence            8s – 34s     ▸      │  ← collapsed (done)
│ ⚠  Searching for evidence           Warning: 1          │  ← warning badge on phase
│ 🔄 Generating verdicts              34s …        ▸      │  ← current = expanded
│    · Running debate for 4 claims…                       │
│    · Aggregating final assessment…                      │
└─────────────────────────────────────────────────────────┘
```

### Per-event display (within expanded phase)

```
  · 00:08  Understanding input
           Pass 2: evidence-grounded refinement
  ⚠ 00:14  Search provider error
           google-cse — quota exceeded
  · 00:34  Grouping evidence
```

### Key design decisions

1. **Phase groups** — events binned into ~7 named phases; one `<details>` per phase
2. **Collapsed by default for completed phases** — keeps the list short; user expands to inspect
3. **Current phase always expanded** with a spinning indicator
4. **Warning/error counts** shown as badge on the phase header even when collapsed
5. **Relative timestamps** — seconds elapsed since job start (`00:08`) not wall-clock ISO
6. **Errors always visible** — never hidden inside a collapsed group; full message shown; stack trace in nested `<details>`
7. **Key params highlighted** — extracted parameters shown as secondary line in muted colour (e.g. `google-cse — quota exceeded`), not buried in the message string
8. **Lifecycle events** (hide, retry, cancel) shown below the timeline as a separate compact list

---

## Technical Design

### New file: `apps/web/src/app/jobs/[id]/lib/event-display.ts`

Pure structural mapping — no LLM, no semantic analysis. Maps known machine-generated string prefixes to display metadata.

```typescript
export type EventPhase =
  | "setup" | "understand" | "research" | "cluster"
  | "verdict" | "quality" | "done" | "lifecycle" | "error";

export interface EventDisplay {
  phase: EventPhase;
  label: string;               // short human label
  params?: string;             // extracted key parameters (one line)
  stackTrace?: string;         // extracted from stack event
}

/** Classify and enrich a raw event for display */
export function classifyEvent(level: string, message: string): EventDisplay;
```

Classification uses `startsWith` / exact match on the fixed machine-generated strings (structural constants — not semantic analysis of user text).

### Updated Events tab in `page.tsx`

Replace the raw `<ul>` with a `<PhaseTimeline>` component (function component within page.tsx, following existing pattern):

- Groups `EventItem[]` → `PhaseGroup[]` using `classifyEvent()`
- Renders each `PhaseGroup` as a `<details>` with summary = phase label + duration + warn/error badge
- Within each group: compact event rows with relative timestamp + label + params line
- Errors: always rendered outside any `<details>`, with own red card style
- Stack trace events: rendered as `<details>` inside the error card

### CSS additions to `page.module.css`

New classes (additions only, no changes to existing):
- `.timeline` — flex column, gap
- `.phaseGroup` — phase `<details>` container
- `.phaseSummary` — phase header (label + duration + badge)
- `.phaseEvents` — list of events inside a phase
- `.timelineEvent` — individual event row
- `.timelineEventParams` — secondary params line, muted
- `.timelineEventTimestamp` — `00:08` style, monospace, muted
- `.timelineBadge` — warn/error count pill on phase header
- `.errorCard` — always-visible error block
- `.stackTrace` — monospace, scroll, inside `<details>`

---

## Implementation Steps

1. **Create `event-display.ts`** — classification + enrichment logic + unit tests
2. **Write unit tests** (`test/unit/lib/analyzer/event-display.test.ts`) — cover all known message patterns + unknown fallback
3. **Implement `PhaseTimeline` component** inside `page.tsx` — replace raw `<ul>` with new component
4. **Add CSS** — new classes only, no regressions
5. **Verify** — `npm test` + visual check with a real completed job

---

## Open Questions for Review

| # | Question | Impact |
|---|----------|--------|
| Q1 | Should the Events tab be visible to **all users** (not just admins) for completed jobs? Currently admin-only post-completion. | Scope |
| Q2 | Should **warnings** (e.g. search provider fallback) be shown in the main report view as a summary, or only in the Events tab? | Scope |
| Q3 | Phase 2: add optional `data` (JSON) field to `JobEventEntity` so the runner can emit structured parameters instead of relying on message parsing? | Schema change — needs C# + migration |
| Q4 | How many lines per event in the collapsed timeline? Current proposal: 2 (label + params). Is 1 line preferred for very compact view? | UX |

---

## Files to Touch

| File | Change |
|------|--------|
| `apps/web/src/app/jobs/[id]/lib/event-display.ts` | **New** — classification logic |
| `apps/web/test/unit/lib/analyzer/event-display.test.ts` | **New** — unit tests |
| `apps/web/src/app/jobs/[id]/page.tsx` | Replace events tab `<ul>` with `PhaseTimeline` component |
| `apps/web/src/app/jobs/[id]/page.module.css` | Add new timeline CSS classes |

**No changes to:** API, C# model, database schema, existing event emission code.

---

## Review Decisions (2026-03-16)

Reviewed and approved by Code Reviewer. Captain override on timestamp format (local time, not elapsed).

| # | Decision |
|---|----------|
| Q1 | **All users** — Events tab visible to all users for all job states. `showEventsTab` set to `true` unconditionally. |
| Q2 | **Events tab only** — warnings (e.g. search provider fallback) remain in Events tab; no summary in main report view in this phase. |
| Q3 | **Deferred** — structured `data` field on `JobEventEntity` is Phase 2 work; requires C# model + migration. |
| Q4 | **2-line format** — label + muted params line. Compact enough; provides useful context without excessive length. |

**Captain override:** Timestamps display as local `HH:mm:ss` (not elapsed seconds as originally planned in Q5 of design). `formatLocalTime()` uses `toLocaleTimeString()`.
