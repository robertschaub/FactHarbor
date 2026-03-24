# UI Design: Test/Tuning Mode

**Status:** 🧭 Proposal — pending review
**Created:** 2026-02-17
**Depends on:** `TestTuning_Mode_Design_2026-02-17.md`

---

## Pipeline Stage Identifiers

The stop-after position uses string identifiers, not numbers. These are the canonical stage IDs used across API, pipeline code, and UI:

| Stage ID              | Display Name         | Description                                      |
|-----------------------|----------------------|--------------------------------------------------|
| `extract-claims`      | Extract Claims       | Two-pass claim extraction + Gate 1 validation    |
| `research`            | Research             | Web search + evidence gathering with EvidenceScope |
| `cluster-boundaries`  | Cluster Boundaries   | Group evidence into ClaimAssessmentBoundaries    |
| `verdict`             | Verdict              | 5-step LLM debate per claim per boundary         |
| `aggregate`           | Aggregate            | Weighted aggregation + narrative + quality gates  |

**API field:** `stopAfterStage: string | null` (null = run all stages). Replaces the earlier `maxStage: number` from the architecture doc.

**Type definition (types.ts):**
```typescript
export type PipelineStageId =
  | "extract-claims"
  | "research"
  | "cluster-boundaries"
  | "verdict"
  | "aggregate";
```

**Stage ordering** is defined once in code as an ordered array and referenced everywhere:
```typescript
export const PIPELINE_STAGES: { id: PipelineStageId; label: string; icon: string }[] = [
  { id: "extract-claims",     label: "Extract Claims",     icon: "1" },
  { id: "research",           label: "Research",           icon: "2" },
  { id: "cluster-boundaries", label: "Cluster Boundaries", icon: "3" },
  { id: "verdict",            label: "Verdict",            icon: "4" },
  { id: "aggregate",          label: "Aggregate",          icon: "5" },
];
```

---

## UI Changes Overview

| Page                        | What changes                                            |
|-----------------------------|---------------------------------------------------------|
| `/admin`                    | New "Test/Tuning" section card                          |
| `/admin/test-runner` (NEW)  | Full test job submission page                           |
| `/admin/config`             | New "Test Profiles" tab                                 |
| `/jobs`                     | Admin toggle to show/hide test jobs; TEST badge         |
| `/jobs/[id]`                | Test run banner; partial-execution stage indicator      |

---

## 1. Admin Dashboard — Test/Tuning Section

**File:** `apps/web/src/app/admin/page.tsx`

Add a new section between "Quality Administration" and "Source Reliability Admin". Follows the existing section pattern (inline-styled div with heading + description + action links).

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Test / Tuning                                       │
│                                                      │
│  Run analysis tests with custom configs and partial  │
│  pipeline execution. Test jobs are hidden from       │
│  non-admin users.                                    │
│                                                      │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │  12 test jobs        │  │  3 test config profiles│ │
│  │  (4 this week)       │  │  (pipeline: 2, sr: 1) │ │
│  └─────────────────────┘  └────────────────────────┘ │
│                                                      │
│  [ Run Test Analysis ]                               │
│    Submit a test job with stage selection and         │
│    config overrides                                   │
│                                                      │
│  [ Manage Test Configs ]                             │
│    View and manage test/* config profiles            │
│                                                      │
│  [ Cleanup Test Data ▾ ]                             │
│    Delete test jobs and configs older than N days     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Specs

**Section heading:** `font-size: 20px; font-weight: 600; color: #374151;`

**Stats row:** 2-column grid, `gap: 12px`. Each stat box:
- `padding: 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;`
- Count: `font-size: 20px; font-weight: 700;`
- Sublabel: `font-size: 12px; color: #666;`

**"Run Test Analysis" button:** `.btnPrimary` with `background: #7c3aed;` (purple — distinguishes test actions from production actions). Links to `/admin/test-runner`.

**"Manage Test Configs" button:** `.btnPrimary` with `background: #10b981;` (green, matching existing config link). Links to `/admin/config?tab=test-profiles`.

**"Cleanup Test Data" button:** `.btnSecondary` with a dropdown for age selection (7 / 14 / 30 / 90 days). On click, calls `DELETE /api/admin/test-cleanup?olderThanDays=N`. Shows confirmation toast with count of deleted items.

**Data fetching:**
- Stats loaded via `GET /api/admin/config/test-profiles` (config count) and `GET /api/fh/jobs?includeTestJobs=true&pageSize=1` (job count from pagination.totalCount).
- Non-blocking: stats show "—" while loading.

---

## 2. Test Runner Page (NEW)

**File:** `apps/web/src/app/admin/test-runner/page.tsx` (NEW)
**CSS:** `apps/web/src/app/admin/test-runner/test-runner.module.css` (NEW)

This is the primary interface for submitting test jobs. It follows the card-based layout from `/analyze` but adds stage selection and config override controls.

### Full Layout

```
┌──────────────────────────────────────────────────────────┐
│  Test Analysis Runner                                    │
│  Run the pipeline with custom configs, stopping at any   │
│  stage to inspect intermediate results.                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  INPUT                                             │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Enter a claim or paste a URL...             │  │  │
│  │  │                                              │  │  │
│  │  │                                              │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │  Detected: 🔤 Text input                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  STOP AFTER STAGE                                  │  │
│  │                                                    │  │
│  │  ○──────○──────○──────○──────●                     │  │
│  │  1      2      3      4      5                     │  │
│  │  Extract Research Cluster Verdict Aggregate        │  │
│  │  Claims          Bound.          (full run)        │  │
│  │                                                    │  │
│  │  ℹ️ Will run stages 1 → 5 (all stages)            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  CONFIG OVERRIDES                                  │  │
│  │                                                    │  │
│  │  Pipeline config   [ Production (default)    ▾ ]   │  │
│  │  Search config     [ test/high-iteration     ▾ ]   │  │
│  │  Calculation config [ Production (default)   ▾ ]   │  │
│  │  SR config         [ Production (default)    ▾ ]   │  │
│  │                                                    │  │
│  │  [ + Create Test Profile ]                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [ 🔬 Run Test Analysis ]          [ Clear ]       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  RECENT TEST JOBS                                  │  │
│  │                                                    │  │
│  │  abc123  SUCCEEDED  Stages 1→3  2 min ago    →     │  │
│  │  def456  RUNNING    Stages 1→5  just now     →     │  │
│  │  ghi789  FAILED     Stages 1→2  15 min ago   →     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Input Section

Reuses the pattern from `/analyze`:

- **Textarea**: Same styling as analyze page (`.textarea` equivalent): `min-height: 150px; padding: 16px; border: 2px solid #ddd; border-radius: 12px; font-size: 14px;` Focus: `border-color: #7c3aed` (purple instead of blue, to indicate test context).
- **Detected type indicator**: Same as analyze — flex row with emoji + label, light background.
- **No pipeline selector**: Test runner always uses ClaimBoundary pipeline (the only production pipeline).

### 2.2 Stop After Stage — Stepper Control

A horizontal stepper showing all 5 stages as connected nodes. The user clicks a node to set the stop-after point.

**Visual design:**

```
  ●━━━━━━●━━━━━━●━━━━━━●━━━━━━○
  1      2      3      4      5
  Extract Research Cluster Verdict Aggregate
  Claims          Bound.          (full run)
```

- **Nodes**: 28px circles, connected by 3px horizontal lines.
- **Active/included nodes** (stages that will run): `background: #7c3aed; color: #fff; border: 2px solid #7c3aed;`
- **Inactive nodes** (stages that won't run): `background: #fff; color: #999; border: 2px solid #ddd;`
- **Connecting lines**: Active segment: `background: #7c3aed;` Inactive: `background: #ddd;`
- **Labels below nodes**: `font-size: 11px; color: #666; text-align: center; max-width: 70px;`
- **Click behavior**: Clicking a node sets `stopAfterStage` to that stage's ID. Clicking the last node (aggregate) sets `stopAfterStage: null` (full run).
- **Hover**: Node scales to 1.1x, cursor pointer, transition 0.2s.

**Info line below stepper:**
- `font-size: 13px; color: #666; margin-top: 8px;`
- Dynamic text:
  - Full run: `"Will run all 5 stages (full analysis)"`
  - Partial: `"Will run stages 1 → 3 (Extract Claims → Cluster Boundaries), then return partial result"`

**Implementation:** Stateful component. Default: last stage (full run). Value stored as `PipelineStageId | null`.

### 2.3 Config Overrides Section

A card containing one dropdown per config type, allowing the user to select a test profile or keep the production default.

**Each row:**
```
  Pipeline config   [ Production (default)    ▾ ]
```

- **Label**: `font-size: 14px; font-weight: 500; color: #374151; min-width: 160px;`
- **Dropdown** (`.formInput` / `<select>`): Same styling as config page selects. `min-width: 280px; padding: 8px 12px;`
- **Options**:
  - First option: `"Production (default)"` — value `"default"`
  - Then: each `test/*` profile for that config type, showing `profile_key` + `version_label` if available
  - Example: `"test/high-iteration (v3 — higher search count)"`
- **Layout**: Each row is flex with `gap: 12px; align-items: center; margin-bottom: 10px;`
- **Config types shown**: pipeline, search, calculation, sr (4 rows). Prompt overrides are omitted from the UI (advanced — agents can use the API directly).

**"+ Create Test Profile" button:**
- `font-size: 13px; color: #7c3aed; background: none; border: none; cursor: pointer; text-decoration: underline;`
- On click: navigates to `/admin/config?tab=test-profiles&action=create`.

**When a non-default profile is selected**, the row gets a subtle highlight:
- `background: #f5f3ff; border-radius: 6px; padding: 6px 10px;` (light purple tint)

**Data fetching:** On page load, fetch `GET /api/admin/config/test-profiles` to populate dropdowns. Cache in component state.

### 2.4 Submit Area

- **"Run Test Analysis" button**: Full width (flex: 1), same size as analyze page submit button. `background: #7c3aed; color: #fff; font-size: 16px; font-weight: 600; padding: 14px 24px; border-radius: 8px;` Hover: `background: #6d28d9;` Disabled: `background: #ccc; cursor: not-allowed;`
- **Prefix icon**: "🔬" (microscope, distinguishes from production "🔍").
- **Loading state**: Icon changes to "⏳", text changes to "Starting Test Analysis...", button disabled.
- **"Clear" button**: Same as analyze page clear button. Resets all fields to defaults.

**On submit:**
1. POST to `/api/fh/analyze` with `{ inputType, inputValue, isTestRun: true, stopAfterStage, configOverrides }`.
2. On success, navigate to `/jobs/{jobId}`.

### 2.5 Recent Test Jobs

A compact list of the 5 most recent test jobs, shown below the submit area for quick access.

**Each row:**
```
  abc123  ✅ SUCCEEDED  Stages 1→3  2 min ago    →
```

- **Container**: `border: 1px solid #ddd; border-radius: 8px; overflow: hidden;`
- **Row**: `padding: 10px 14px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 12px; cursor: pointer;` Hover: `background: #f8f9fa;`
- **Job ID**: `font-family: monospace; font-size: 12px; color: #666;` (first 8 chars)
- **Status badge**: Same badge styling as jobs page (color-coded by status).
- **Stage info**: `font-size: 12px; color: #666;` Shows `"Stages 1→3"` or `"Full run"` based on `stopAfterStage`.
- **Relative time**: `font-size: 11px; color: #999;`
- **Arrow**: `color: #ccc; font-size: 16px;` — right chevron `›`
- **Click**: navigates to `/jobs/{jobId}`.
- **Empty state**: `"No test jobs yet. Submit one above."` (centered, 13px, color: #999)

**Data fetching:** `GET /api/fh/jobs?includeTestJobs=true&pageSize=5` filtered client-side to show only test jobs. Refreshes on submit.

---

## 3. Config Admin — Test Profiles Tab

**File:** `apps/web/src/app/admin/config/page.tsx`

Add a new tab "Test Profiles" to the existing tab bar (after "Effective").

### Tab Bar (extended)

```
  [ Active ]  [ History ]  [ Edit ]  [ Effective ]  [ Test Profiles ]
```

The "Test Profiles" tab uses the same `.tab` / `.tabActive` styling as existing tabs.

### Test Profiles Tab Content

```
┌──────────────────────────────────────────────────────────┐
│  Test Profiles                                           │
│                                                          │
│  Test config profiles (test/*) are isolated from         │
│  production. Use them for tuning experiments.            │
│                                                          │
│  [ + Clone from Production ]     [ Delete Old ▾ ]        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Pipeline                                        │    │
│  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  test/high-iteration                       │  │    │
│  │  │  Label: "v3 — doubled search iterations"   │  │    │
│  │  │  Hash: a1b2c3...  Created: 2026-02-17      │  │    │
│  │  │  [ View ] [ Compare ] [ Edit ] [ Delete ]  │  │    │
│  │  └────────────────────────────────────────────┘  │    │
│  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  test/low-temperature                      │  │    │
│  │  │  Label: "v1 — reduced LLM temperature"     │  │    │
│  │  │  Hash: d4e5f6...  Created: 2026-02-16      │  │    │
│  │  │  [ View ] [ Compare ] [ Edit ] [ Delete ]  │  │    │
│  │  └────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Search                                          │    │
│  │  (no test profiles)                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Calculation                                     │    │
│  │  (no test profiles)                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  SR (Source Reliability)                          │    │
│  │  (no test profiles)                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Specs

**Grouped by config type.** Each type is a collapsible section:
- **Type heading**: `font-size: 16px; font-weight: 600; color: #374151; padding: 12px 0; border-bottom: 1px solid #e5e7eb;`
- **Empty state**: `font-size: 13px; color: #999; font-style: italic; padding: 12px 0;`

**Profile card** (within each type group):
- `padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin-bottom: 8px;`
- **Profile name**: `font-size: 14px; font-weight: 600; font-family: monospace; color: #7c3aed;`
- **Version label**: `font-size: 13px; color: #555;`
- **Hash + date**: `font-size: 12px; color: #999; font-family: monospace;`
- **Action buttons**: Row of small `.buttonSecondary` buttons, `font-size: 12px; padding: 4px 10px;`

**"+ Clone from Production" button**: `.buttonPrimary`, `background: #7c3aed;` Opens a modal/inline form:
1. Select config type (dropdown)
2. Enter profile name (text input, prefix `test/` shown as fixed label)
3. Content is pre-filled from the active production config for that type
4. Save creates the blob + activates it under the `test/{name}` profile key

**"Delete Old" button**: `.buttonSecondary` with dropdown (7 / 14 / 30 days). Calls cleanup endpoint, shows toast with count.

**Action button behaviors:**
- **View**: Opens the config viewer (same dark-bg JSON viewer as existing Active tab)
- **Compare**: Opens a side-by-side diff against the production (default) config. Reuses existing diff endpoint `POST /api/admin/config/diff`.
- **Edit**: Navigates to the existing Edit tab with the test profile pre-selected in the profile dropdown
- **Delete**: Confirmation prompt, then deletes the single profile. Shows toast.

---

## 4. Jobs Page — Test Job Toggle

**File:** `apps/web/src/app/jobs/page.tsx`

### Changes

**Admin toggle** — added to the header row, right-aligned next to the "New Analysis" button:

```
┌──────────────────────────────────────────────────────────┐
│  Jobs                     [☐ Show test jobs] [+ New]     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  abc123  ✅ SUCCEEDED  CB  "Was the claim..."  2m  │  │
│  │  TEST  Stages 1→3                                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  def456  ⏳ RUNNING    CB  "The report states..." 5s │  │
│  └────────────────────────────────────────────────────┘  │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

**Toggle control:**
- Only shown when admin key is present in localStorage
- Styled as a compact checkbox + label: `font-size: 13px; color: #666; cursor: pointer;`
- Unchecked by default
- When checked: re-fetches with `?includeTestJobs=true`
- State persisted in localStorage key `fh_show_test_jobs`

**TEST badge on job cards** — when `isTestRun` is true:
- A badge appears in the `.jobMeta` row: `background: #f3e8ff; color: #7c3aed; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;`
- Text: `"TEST"`

**Stage info** — when `stopAfterStage` is not null:
- Shown as additional text in the job meta row: `font-size: 11px; color: #999;`
- Format: `"Stages 1→3"` (where 3 is the index of the stop-after stage)
- If full run: not shown (normal jobs don't display stage info)

---

## 5. Job Detail — Test Run Indicators

**File:** `apps/web/src/app/jobs/[id]/page.tsx`

### Test Run Banner

When the job has `isTestRun: true`, show a banner at the top of the page (above the job info card):

```
┌──────────────────────────────────────────────────────────┐
│  🔬 Test/Tuning Run                                     │
│                                                          │
│  ○━━━━━━●━━━━━━●━━━━━━●━━━━━━○                           │
│  Extract Research Cluster Verdict Aggregate              │
│  Claims          Bound.          (skipped)               │
│                                                          │
│  Completed stages: Extract Claims → Cluster Boundaries   │
│  Config overrides: pipeline → test/high-iteration        │
└──────────────────────────────────────────────────────────┘
```

**Banner styling:**
- `background: #f5f3ff; border: 2px solid #ddd5f5; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px;`
- **Title**: `font-size: 16px; font-weight: 600; color: #7c3aed;` with 🔬 prefix
- **Mini stepper**: Same visual as test runner stepper, but read-only (not clickable), smaller (20px nodes). Completed stages are filled purple; skipped stages are hollow gray.
- **Stage summary line**: `font-size: 13px; color: #555;`
  - Partial: `"Completed stages: Extract Claims → Cluster Boundaries"`
  - Full: `"All 5 stages completed"`
- **Config overrides line** (only if overrides present): `font-size: 13px; color: #555;`
  - Lists each overridden type: `"pipeline → test/high-iteration, search → test/exp-1"`
  - Uses `font-family: monospace` for profile names

### Partial Result Handling

When `meta.partialExecution === true` in the result JSON:

- **Tabs that have no data are disabled** (grayed out, `opacity: 0.5; cursor: not-allowed`). E.g., if stopped after stage 2, the "Summary" tab (which needs verdicts) is disabled, but "Sources" tab works.
- **Tab availability by stage:**

| stopAfterStage      | Summary | Sources | JSON | Events |
|---------------------|---------|---------|------|--------|
| `extract-claims`    | off     | off     | on   | on     |
| `research`          | off     | on      | on   | on     |
| `cluster-boundaries`| off     | on      | on   | on     |
| `verdict`           | partial | on      | on   | on     |
| `aggregate` / null  | on      | on      | on   | on     |

- **"Summary" tab at verdict stage**: Shows claim verdicts without the overall assessment section (which requires aggregation). The headline/narrative area shows: `"Overall assessment not available — aggregation stage was not run."`
- **JSON tab** always works and is the **default active tab** for partial results (instead of Summary).
- **Sources tab**: Available from stage 2 onward. Shows search queries and fetched sources.

### Job Info Card Extension

Add test-specific fields to the meta row in the job info card:

```
  Status: SUCCEEDED    Pipeline: ClaimBoundary
  Test Run: Yes        Stop After: cluster-boundaries
  Config Overrides: pipeline → test/high-iteration
```

- **"Test Run: Yes"** uses the purple badge: `background: #f3e8ff; color: #7c3aed;`
- **"Stop After"** uses monospace font for the stage ID
- **"Config Overrides"** listed as `type → profile` pairs, monospace for profile names

---

## 6. Visual Conventions for Test Mode

### Color: Purple (#7c3aed)

All test-mode UI elements use **purple** as the accent color, differentiating them from production blue (#007bff). This includes:

- Stepper nodes and connecting lines
- Submit button on test runner
- TEST badge on job cards
- Test run banner background tint
- Test profile names in config admin
- Focus border on test runner textarea
- "Create Test Profile" link text

### Consistent purple palette:
| Usage           | Color     |
|-----------------|-----------|
| Primary action  | `#7c3aed` |
| Hover action    | `#6d28d9` |
| Light bg tint   | `#f5f3ff` |
| Light border    | `#ddd5f5` |
| Badge bg        | `#f3e8ff` |
| Badge text      | `#7c3aed` |

### Icon: 🔬 (microscope)

The microscope emoji is the standard icon for test mode throughout the UI:
- Test runner submit button: "🔬 Run Test Analysis"
- Test run banner title: "🔬 Test/Tuning Run"
- Admin section heading icon

This distinguishes from the production search icon "🔍".

---

## 7. Component Summary

### New Files

| File | Type | Purpose |
|------|------|---------|
| `apps/web/src/app/admin/test-runner/page.tsx` | Page | Test job submission |
| `apps/web/src/app/admin/test-runner/test-runner.module.css` | CSS | Test runner styles |
| `apps/web/src/components/PipelineStepper.tsx` | Component | Reusable stage stepper (interactive + read-only modes) |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/app/admin/page.tsx` | Add Test/Tuning section card |
| `apps/web/src/app/admin/config/page.tsx` | Add "Test Profiles" tab |
| `apps/web/src/app/jobs/page.tsx` | Admin toggle + TEST badge + stage info |
| `apps/web/src/app/jobs/[id]/page.tsx` | Test run banner + partial result tab logic |
| `apps/web/src/styles/common.module.css` | Add `.badgeTest`, `.btnTest` utility classes |

### Shared Component: PipelineStepper

A reusable component for the horizontal stage visualization, used in both the test runner (interactive) and job detail (read-only).

**Props:**
```typescript
interface PipelineStepperProps {
  /** Which stage to stop after. null = all stages */
  stopAfterStage: PipelineStageId | null;
  /** Interactive mode: user can click nodes to change stopAfterStage */
  interactive?: boolean;
  /** Callback when user clicks a stage (interactive mode only) */
  onChange?: (stage: PipelineStageId | null) => void;
  /** Visual size variant */
  size?: "normal" | "compact";
}
```

**Rendering:** Maps over `PIPELINE_STAGES` array, renders connected nodes with labels.

---

## 8. Data Flow: Test Job Submission (UI)

```
User fills form on /admin/test-runner
  ↓
Click "🔬 Run Test Analysis"
  ↓
POST /api/fh/analyze
  {
    inputType: "text",
    inputValue: "...",
    isTestRun: true,
    stopAfterStage: "cluster-boundaries",   ← string ID, not number
    configOverrides: {
      pipeline: "test/high-iteration"       ← profile key per type
    }
  }
  ↓
.NET API creates JobEntity with IsTestRun=true,
  StopAfterStage="cluster-boundaries", ConfigOverrides=JSON
  ↓
Runner reads job → pipeline runs stages 1→3 → returns partial JSON
  ↓
User redirected to /jobs/{id}
  ↓
Job detail shows test banner + partial results
```

---

## 9. API Field Name Change (from architecture doc)

The architecture doc used `maxStage: number`. This UI doc changes it to:

| Old (architecture doc) | New (this doc) |
|------------------------|----------------|
| `maxStage: number` (1-5) | `stopAfterStage: PipelineStageId \| null` |
| `MaxStage: int?` (.NET) | `StopAfterStage: string?` (.NET) |
| `meta.completedStages: number` | `meta.completedThrough: PipelineStageId` |
| `meta.maxStage: number` | `meta.stopAfterStage: PipelineStageId \| null` |
| `meta.partialExecution: boolean` | `meta.partialExecution: boolean` (unchanged) |

The architecture doc (`TestTuning_Mode_Design_2026-02-17.md`) should be updated to reflect this change before implementation begins.
