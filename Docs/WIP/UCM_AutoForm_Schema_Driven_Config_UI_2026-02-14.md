# UCM Auto-Form: Schema-Driven Config UI

**Date**: 2026-02-14
**Author**: Senior Developer (Claude Code, Opus 4.6)
**Branch**: `feature/ucm-autoform` (worktree: `../FactHarbor-ucm-autoform`)
**Status**: Implementation Complete — Awaiting Code Review
**Plan**: [velvet-frolicking-globe.md](../../.claude/plans/velvet-frolicking-globe.md)

---

## Problem

The UCM Admin Config page (`/admin/config`) had hand-coded form editors covering **~50% of config fields**. The remaining ~100 fields across Pipeline and Calculation configs were only editable via a raw JSON textarea — unusable for a human administrator. Specific issues:

1. **CalcConfig interface in page.tsx was stale** — missing 12+ nested sections (contextSimilarity, groundingPenalty, frameSignal, claimDecomposition, etc.) that exist in the authoritative Zod schema
2. **Deeply nested objects** like `confidenceCalibration` (4 sub-objects, 15 fields) had no form UI
3. **Complex arrays** (`contextDetectionCustomPatterns`, `keyFactorHints`) required raw JSON editing
4. **Defaults diverged** — page.tsx had its own stale `DEFAULT_CALC_CONFIG` / `DEFAULT_SEARCH_CONFIG` that didn't match `config-schemas.ts`

## Solution: Schema-Driven Auto-Form

Instead of hand-coding ~100 more form fields (which would diverge again as schemas evolve), we built a **Zod schema introspection engine** that auto-generates form controls from the existing `.describe()` annotations and constraint metadata.

### Architecture

```
config-schemas.ts (Zod schemas with .describe())
        ↓
schema-introspection.ts (walks Zod AST → FieldDescriptor tree)
        ↓
AutoConfigForm.tsx (generic form renderer)
  ├── BooleanField → checkbox
  ├── NumberField → <input type="number"> with min/max/step
  ├── StringField → text input or textarea
  ├── EnumField → <select> with options
  ├── ObjectSection → collapsible <details> with "enabled" toggle
  └── ArrayFallback → comma-separated (string[]) or JSON textarea
        ↓
array-field-renderers.tsx (4 custom renderers for complex arrays)
  ├── KeyFactorHintsEditor
  ├── ContextFactorHintsEditor
  ├── ContextPatternsEditor (with regex ID validation)
  └── CustomBandsEditor
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Zod AST introspection via `._def`** | Semi-internal API, but Zod version is pinned. The 97+ existing `.describe()` annotations are the metadata layer — no separate schema needed. |
| **Custom renderer registry** | 4 complex array-of-objects fields can't be auto-generated. Registry maps dot-paths to custom React components. |
| **Extract to `forms/` directory** | Keeps page.tsx manageable (4300→2597 lines). New files are self-contained. |
| **Inline styles for layout** | Auto-form layout (grids, collapsible sections) uses inline styles. Core styling via existing `config.module.css` classes. Avoids CSS bloat for one-off layout concerns. |
| **`as unknown as ConfigType` casts** | AutoConfigForm returns `Record<string, unknown>` generically. Cast back to specific config type at the boundary. Safe because the form only modifies fields that exist in the schema. |

## Files Changed

| File | Action | Lines | Purpose |
|------|--------|-------|---------|
| `apps/web/src/lib/schema-introspection.ts` | NEW | 404 | Zod schema → FieldDescriptor[] introspection engine |
| `apps/web/src/app/admin/config/forms/AutoConfigForm.tsx` | NEW | 593 | Generic schema-driven form renderer |
| `apps/web/src/app/admin/config/forms/array-field-renderers.tsx` | NEW | 487 | 4 custom renderers for complex array fields |
| `apps/web/src/app/admin/config/page.tsx` | MODIFIED | 4300→2597 | Removed 4 hand-coded forms (~1500 lines), wired AutoConfigForm |
| `apps/web/src/lib/config-schemas.ts` | MODIFIED | +~100 annotations | Added `.describe()` to all ~100 fields that lacked it |

**Net**: +1484 new lines, -1946 removed = **-462 lines** while covering **all ~196 fields** (was ~50%).

## Verification

- **Build**: `npm -w apps/web run build` — passes (no type errors)
- **Tests**: `npm test` — 47 files, 843 tests pass (no regressions)
- **Manual UI**: Not yet tested in browser (needs reviewer verification)

## Review Focus Areas

1. **schema-introspection.ts** — Is the Zod AST walking robust? Are edge cases (ZodEffects, ZodNullable, ZodDefault) handled correctly? Is memoization appropriate?
2. **AutoConfigForm.tsx** — Is the recursive FieldRenderer clean? Are the ObjectSection collapsible pattern and "enabled" toggle detection correct? Grid layout logic?
3. **array-field-renderers.tsx** — Do the 4 custom editors match the expected schema shapes? Is the ContextPatternsEditor regex validation correct?
4. **page.tsx changes** — Are the type casts safe? Is the wiring of schema fields + section ordering + custom renderers correct?
5. **config-schemas.ts** — Are the new `.describe()` annotations accurate and helpful for administrators?

## Known Limitations

- **No unit tests for introspection** — relies on build passing + existing integration tests. A regression test validating introspection output against known schema structure would add safety.
- **Zod `._def` is semi-internal** — could break on major Zod upgrades. Pinned version mitigates this.
- **Cross-field `.refine()` validators** are not surfaced in the form UI — they surface as validation errors at save time (existing behavior).
- **One-to-many context splits** in confidenceCalibration sub-objects: each sub-object section is independently collapsible but shares the parent "enabled" toggle.

## Manual Testing Checklist

- [ ] `/admin/config?type=pipeline` → Edit tab → verify ALL pipeline fields render
- [ ] `/admin/config?type=calculation` → Edit tab → verify ALL calc fields including nested sections
- [ ] `/admin/config?type=search` → Edit tab → verify search form with queryGeneration section
- [ ] `/admin/config?type=sr` → Edit tab → verify SR form
- [ ] Collapsible sections: expand/collapse nested objects (confidenceCalibration, aggregation)
- [ ] "Enabled" toggle on sections that have an `enabled` field
- [ ] Array editors: add/remove items in contextDetectionCustomPatterns
- [ ] Modify field via form → verify JSON editor below updates
- [ ] Save → verify active config updates correctly
- [ ] Invalid values (number below min) → verify constraints enforced

---

**Maintained by**: Senior Developer
