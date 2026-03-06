# Screen Report Visual Redesign Plan (v2)

**Status:** PROPOSAL - Revised after review
**Date:** 2026-03-06
**Author:** Senior Developer (Claude Opus 4.6)
**Scope:** `apps/web/src/app/jobs/[id]/` (page.tsx, page.module.css, components/, globals.css)

---

## 1. Problem Statement

The exported HTML report has a polished, visually structured layout with clear hierarchy, generous spacing, and prominent verdict presentation. The interactive screen report looks utilitarian by comparison: dense, flat, and lacking visual authority.

### Visual Gaps (HTML vs Screen)

| Aspect | HTML Report (good) | Screen Report (current) |
|--------|-------------------|------------------------|
| **Overall feel** | Editorial, structured, authoritative | Dense, dev-tool-like |
| **Verdict** | Prominent banner with colored border, meter bars, clear hierarchy | Flat text: badge + percentage + confidence on one line |
| **Section hierarchy** | Clear headings with consistent spacing | Mixed heading styles, tight gaps |
| **Typography** | Consistent sizing, generous line-height | Varied, tight |
| **Spacing** | 16-20px padding, visual breathing room | 12px gaps, cramped |
| **Cards** | Bordered sections with subtle shadows | Flat cards with thin borders |
| **Mobile** | Responsive with stacking | Partial |

---

## 2. What's Already Implemented (not in scope)

These features are already working in the codebase:

1. **Tab/admin visibility** (page.tsx:849-865): `[Json]` admin-only, `[Events]` hidden for non-admins on SUCCEEDED, tab bar hidden when only 1 tab visible.
2. **Evidence direction grouping** (page.tsx:1492-1641): Top-level grouping by direction (supporting, contradicting, opposite-claim, contrarian, neutral) with methodology sub-groups inside.
3. **ExpandableText** on most long text fields: evidence statements, verdict explanation, assessment, key findings, limitations, evidence base, claim reasoning, key factor explanations, input summary.

---

## 3. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Max-width | 1080px | Wide enough for comfortable reading on large screens |
| Evidence grouping | Keep as-is (direction + methodology) | Already direction-grouped at top level |
| Mobile export buttons | Collapse into menu | Clean on small screens |
| JSON export | Available to everyone | Only [Json] tab is admin-only |
| Verdict display | No huge %, no small graphic; meter bar instead | Matches HTML report style |
| Color mode | System default (light + dark) | Already uses `prefers-color-scheme` |

---

## 4. Verdict Render Paths

All paths must be visually consistent:

| Path | Location | Pipeline | Redesign |
|------|----------|----------|----------|
| **CB banner** | page.tsx:1050-1082 | CB (current) | Full meter-bar treatment |
| **Legacy ArticleVerdictBanner** | page.tsx:2060-2168 | Legacy | Same meter-bar pattern for consistency |
| **Per-claim badges** | page.tsx:2378-2380 | Both | Verdict-colored left-border card (no meter bar — too compact) |
| **Legacy MultiContext/Dynamic** | page.tsx:1085, 2519 | Legacy | CSS-only (border, spacing). No JSX restructuring. |

---

## 5. Detailed Changes

### 5.1 Global CSS Variables

**File:** `globals.css`

Add spacing, typography, and dark-mode-aware accent variables to `:root` and the dark media query.

### 5.2 Page Layout — Spacing & Max-Width

**File:** `page.module.css`

- `.pageContainer`: gap 20px, max-width 1080px centered, padding 0 16px
- `.contentCard`: add box-shadow
- `.resizableLong`: replace hardcoded colors with CSS vars
- New `.sectionHeader` class for consistent heading treatment

### 5.3 Verdict Banner Redesign

**Files:** `page.tsx`, `page.module.css`

New layout for CB banner AND legacy ArticleVerdictBanner:

```
+---------------------------------------------------------------+
| [border-left: 4px colored]                                     |
|  VERDICT                                                       |
|  [Icon] MOSTLY TRUE                     Confidence: HIGH       |
|                                                                |
|  72%  [============================........]  (68%-76%)       |
|                                                                |
|  "Headline key finding text..."                                |
+---------------------------------------------------------------+
```

- Row 1: verdict badge (left) + confidence tier (right)
- Row 2: percentage (16px bold) + horizontal meter bar (8px, rounded) + range
- Meter fill color from existing per-verdict `ARTICLE_VERDICT_COLORS` palette (inline style)
- Headline below meter

New CSS: `.verdictMeterRow`, `.verdictMeterLabel`, `.verdictMeterBar`, `.verdictMeterFill`, `.verdictRange`, `.verdictConfidenceTag`

### 5.4 Claim Card Styling

**Files:** `page.module.css`, `page.tsx`

- New `.claimCard` with verdict-colored left border (4px), card shadow, proper padding
- Applied via `style={{ borderLeftColor: color.border }}`

### 5.5 Section Headers

**Files:** `page.tsx`, `page.module.css`

Apply `.sectionHeader` to: Atomic Claims Checked, Sources, Evidence Analysis, Coverage Matrix headings.

### 5.6 Evidence Section Left-Border Enhancement

**Files:** `page.module.css`, `page.tsx`

Direction-specific left-border colors on existing evidence section containers:
- Supporting: green (#31a354)
- Contradicting: red (#de2d26)
- Opposite: blue (#1565c0)
- Contrarian: orange (#ed8936)
- Neutral: muted gray

### 5.7 TIGERScore ExpandableText

**File:** `page.tsx` — line 1364

Wrap `tigerScore.reasoning` in `<ExpandableText>` (the only remaining unbounded text found during audit).

### 5.8 Export Buttons — Mobile Collapse

**Files:** `page.tsx`, `page.module.css`

Desktop: flat flex row (current behavior). Mobile (<600px): `<details>/<summary>` collapse with dropdown positioning.

### 5.9 Dark Mode Audit

**Files:** `VerdictNarrative.module.css`, `page.module.css`, `page.tsx`

Fix hardcoded colors:
- Headline border (#3b82f6) -> `var(--link)`
- Key finding label (#854d0e) -> `var(--color-accent-amber)` with dark variant
- Limitations box -> CSS variables with dark variants
- `.deleteTab` -> dark mode overrides
- Inline `color: "#999"`, `color: "#666"` -> `var(--text-muted)`

### 5.10 Mobile Responsiveness Pass

**Files:** `page.module.css`, component CSS files

- < 480px: Verdict meter stacks, padding reduced, stats grid 2-col
- < 768px: Badge + confidence wraps, claim cards full-width
- Coverage matrix: horizontal scroll wrapper
- Floating back button: z-index check

---

## 6. Implementation Order

| Phase | Task | Risk | Effort |
|-------|------|------|--------|
| **1** | Global CSS variables | Low | Small |
| **2** | Page spacing + max-width | Low | Small |
| **3** | Verdict banner redesign (CB + legacy) | Medium | Medium |
| **4** | Claim card styling | Low | Small |
| **5** | Section headers | Low | Small |
| **6** | Evidence left-border colors | Low | Small |
| **7** | TIGERScore ExpandableText | Low | Small |
| **8** | Export collapse on mobile | Low | Small |
| **9** | Dark mode audit | Low | Medium |
| **10** | Mobile responsiveness pass | Medium | Medium |

---

## 7. What This Plan Does NOT Include

- No new components. Reuses existing ExpandableText, BoundaryFindings, CoverageMatrix, etc.
- No layout framework (no Tailwind migration). Stays with CSS Modules.
- No theme toggle UI. Relies on system `prefers-color-scheme`.
- No evidence re-grouping. Already direction-grouped.
- No changes to `generateHtmlReport.ts`.
- No tab/admin visibility changes (already implemented).
- No changes to JSON export visibility (stays available to everyone).

---

## 8. Verification Plan

1. `npm -w apps/web run build` — must compile clean
2. `npm test` — all existing tests pass
3. Visual check at 375px, 768px, 1440px in both light and dark system modes
4. Verify both CB banner AND legacy ArticleVerdictBanner render consistently
5. **Legacy layout QA:** Visually inspect multi-context and dynamic/legacy verdict layouts. These get CSS-only polish (no JSX changes), so verify they don't regress or look inconsistent with the redesigned CB/article paths.
6. Cross-link navigation still highlights targets
7. Export HTML still works (untouched)
8. TIGERScore ExpandableText toggle works
9. Export collapse on mobile, flat on desktop
10. Tab visibility: confirm no regressions
