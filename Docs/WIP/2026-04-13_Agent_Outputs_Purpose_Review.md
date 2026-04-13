# Agent_Outputs.md — Purpose Review & Retention Redesign

**Date:** 2026-04-13
**Author:** LLM Expert (Claude Opus 4.6)
**Status:** Approved (Gemini review, 2026-04-13) — ready for implementation
**Reviewer decisions baked in:** migration runs as a standalone PR immediately after the root-trim PR; archive folder shape is per-month subfolders (`Docs/ARCHIVE/Handoffs/YYYY-MM/`); **monthly prune is automated via a script invoked manually during Consolidate WIP** (Captain override of Gemini's "defer automation" recommendation — the prune is fully deterministic, no human judgment required); index rows carry 1–2 key symbols (class names, endpoints, file paths) for scan-based triage.
**Scope:** Governance only — how `Docs/AGENTS/Agent_Outputs.md` is used. Does not modify the Agent Exchange Protocol template, role system, or handoff conventions beyond the tier destination rule.

---

## Reviewer orientation

This proposal redesigns how agent task-completion outputs are stored and retained. The current `Agent_Outputs.md` is 2,032 lines and has blown through its own 200-line archival threshold by 10×. The diagnosis is that the file tries to serve two incompatible purposes at once. The recommendation is to split those purposes across files that already exist (`Handoffs/`) and reshape `Agent_Outputs.md` into a triage-weight index. A one-off migration is required; the steady-state is calendar-month archival.

The design has been iterated through four review rounds. Concerns addressed along the way — lossy migration, thin-index triage loss, arbitrary thresholds, retention-math inconsistency, and tier-classification edge cases — are baked into the current design. Rejected-alternatives section logs what was tried and why each previous shape failed.

---

## Problem

`Docs/AGENTS/Agent_Outputs.md` tries to be two things at once:

| Purpose | Retention curve |
|---|---|
| (A) Permanent log of Standard-tier task completions | Forever / append-only |
| (B) Context pointer scanned by incoming agents at role activation | ~2–4 weeks max |

These purposes pull in opposite directions. The current design favors (A) by default, which is why the file grew to 2,032 lines and incoming agents now load ~2,000 lines of history to find the three entries relevant to their task.

Secondary frictions:
- **Duplicate content with `Handoffs/`.** Significant-tier work exists as a dated file in `Docs/AGENTS/Handoffs/` *and* as an inline entry in `Agent_Outputs.md`. Two places, one truth.
- **Uniform template, differing destinations.** Standard and Significant entries use the same template fields — the only real difference is the destination file. Two channels for one content shape.
- **No natural aging.** In a shared log, old entries never leave unless someone prunes. In per-file Handoffs/, old files age out naturally as they're consulted less.

The 200-line archive rule (documented in `Handoff_Protocol.md` §Archival Thresholds) was written but never enforced — a symptom of the dual-purpose confusion, not its cause.

---

## Recommendation

**Collapse Standard-tier completions into `Docs/AGENTS/Handoffs/` as dated files. Reshape `Agent_Outputs.md` into a triage-weight index: one compact block per entry with enough metadata for scan-based intake, plus a link to the full file.**

### Protocol change

| Today | After |
|---|---|
| Trivial → chat only | Trivial → chat only (unchanged) |
| Standard → inline entry in `Agent_Outputs.md` | Standard → dated file in `Handoffs/` + index row in `Agent_Outputs.md` |
| Significant → dated file in `Handoffs/` + inline cross-ref in `Agent_Outputs.md` | Significant → dated file in `Handoffs/` + index row in `Agent_Outputs.md` (same shape as Standard) |

Template fields unchanged. Tier distinction now affects filename/placement only — the unified template governs both.

### Index row shape

Each entry in the active `Agent_Outputs.md`:

```
### 2026-04-13 | LLM Expert | Claude Opus 4.6 | Trim root AI-instruction files — [Standard] [open-items: no]
**For next agent:** Full context in handoff. Touches: AGENTS.md, CLAUDE.md, Docs/AGENTS/Policies/Handoff_Protocol.md. Extend protocol there, not in AGENTS.md.
→ Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md
```

Three lines carrying: date, role, agent/tool, title, tier, open-items flag, the **For next agent** field (which `Handoff_Protocol.md` explicitly flags as the most important part of the record), **1–2 key symbols touched** (class names, API endpoints, or file paths — boosts scan-based triage so an incoming agent can filter by whether the work touched their area), and the link. Enough for an incoming agent to filter on tier, open-items, or symbol overlap and open only the files whose summary signals relevance to the current task.

Approximate active size: 3 lines × ~40 entries (half a month of volume, on average) = ~120 lines. Peak ~240 lines just before the monthly prune.

### Retention: calendar-month archival

Observed volume: **50 handoffs in March 2026, ~44/month run-rate in April 2026 through 04-13**. Conservative forward estimate after Standard collapse: **60–80 files/month**.

**Monthly archive procedure** (runs on the 1st of each month):

1. Identify the previous calendar month — e.g., on 2026-05-01 that is 2026-04.
2. Move every `Handoffs/<YYYY-MM>-*.md` file whose date prefix falls in the previous month → `Docs/ARCHIVE/Handoffs/YYYY-MM/` (preserving filenames).
3. Move every index row in `Agent_Outputs.md` whose date falls in the previous month → `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md`. **When writing each archived row, rewrite the `→ Docs/AGENTS/Handoffs/<file>` link to `→ Docs/ARCHIVE/Handoffs/YYYY-MM/<file>`** so the archived index resolves. The active `Agent_Outputs.md` and active `Handoffs/` are untouched — only the archived copy is rewritten.
4. Leave current-month content in place.

**Why calendar-month boundaries beat "older than 30 days":** A 30-day cutoff combined with monthly cadence leaves files up to ~59 days old in the active set by month-end. Calendar boundaries make the steady-state upper bound exactly one month of volume.

**Steady-state active size:** day 1 = 0 files → day 30 ≈ monthly volume. Average ~½ monthly volume. At 60–80/month, active folder averages ~30–40 files, peaks at ~80 just before the next prune.

---

## One-off migration

Aligned with calendar-month retention from day 1. Migration simulates the calendar-month archive for each prior month, then starts fresh with the current month as the warm set.

**Phase 0 — Audit.** Partition `Agent_Outputs.md` entries by calendar month:
- **Current warm** = 2026-04-* entries (stay active after migration)
- **Prior-month archive target** = 2026-03-* entries (archived as a calendar-month chunk)
- **Cold bulk** = everything dated < 2026-03-01 (single archive file, no per-month split)

**Phase 1 — Cold bulk archive.** Move all pre-2026-03 entries to `Docs/ARCHIVE/Agent_Outputs_pre-2026-03.md`. History preserved, searchable, out of session context. No link rewriting required — these aren't linked from the live index anymore.

**Phase 1.5 — Prior-month calendar archive (2026-03).** Simulate the archive step that will run on every future 1st-of-month, with one important distinction from the steady-state procedure: **at migration time, March content is still in the old inline-entry format** (handoff references appear embedded in `Task:`, `Files touched:`, `For next agent:`, `Warnings:`, and body prose — not yet as arrow-link index rows). The rewrite must therefore operate on *all* embedded handoff paths, not only arrow-link occurrences.
- Move every `Handoffs/2026-03-*.md` → `Docs/ARCHIVE/Handoffs/2026-03/` (preserving filenames).
- Move every 2026-03-* inline entry in `Agent_Outputs.md` → `Docs/ARCHIVE/Agent_Outputs_2026-03.md`, preserving the full entry body (all template fields).
- **Rewrite every `Docs/AGENTS/Handoffs/<file>` string** in the archived entries to `Docs/ARCHIVE/Handoffs/2026-03/<file>`, regardless of formatting or surrounding field. Use a global replace scoped to the archived content — not a pattern restricted to `→` arrow-links. Example scope check (measured on live data): 12 March entries contain handoff references embedded in regular template fields (e.g., `Agent_Outputs.md:665-671` puts the reference inside `For next agent:`). A `→`-only rewrite would leave all 12 with broken `Docs/AGENTS/Handoffs/...` paths.
- Standard-tier 2026-03 entries that never had a handoff file (the majority) are preserved inline inside the archived file as-is. Only warm entries get materialized to new handoff files in Phase 2.

**Phase 2 — Warm migration.** For each current-month entry, classify into one of three cases:

**Case A — Unambiguous Significant.** `Files touched:` lists ≥1 `Docs/AGENTS/Handoffs/*.md` path. This is the protocol's canonical ownership signal.
→ Build index row linking to the existing file. No new file needed.

**Case B — Unambiguous Standard.** No `Docs/AGENTS/Handoffs/*.md` path appears anywhere in the entry (not in Files touched, not in any other field).
→ Create `Docs/AGENTS/Handoffs/<date>_<Role>_<Title_kebab>.md` with the entry body verbatim (all template fields). Build index row linking to the new file.

**Case C — Ambiguous, manual review required.** No handoff path in `Files touched:`, but ≥1 handoff path elsewhere in the entry (`For next agent`, body prose, `Warnings`, etc.). These are either:
- (1) Standard entries that *cite* an unrelated handoff — preserve body, materialize new file, index points to new file (example pattern: `Agent_Outputs.md:154`, a standalone Seven-Run Contract Failure Review whose `For next agent` references a different report-quality handoff), **or**
- (2) malformed Significant entries whose canonical handoff was recorded only in `For next agent` — link to the referenced file, no new file (example pattern: `Agent_Outputs.md:475`, where `Files touched:` lists only code files but `For next agent` points to the existing canonical validation report).

→ Surface each Case-C entry to the human migrator with the deciding question: **"Is the referenced handoff the canonical detailed version of *this same task*, or is it a different task this entry merely cites?"** Same task → Significant (link to existing file). Different task → Standard (materialize new file).
→ Enumeration command for the migrator: `grep -nP 'Docs/AGENTS/Handoffs/' Agent_Outputs.md | grep -vB5 'Files touched:.*Handoffs/'` (or equivalent, adjusted to entry delimiters).

**Step 4 (all cases).** Discard the original inline entry from `Agent_Outputs.md` only after classification is resolved and the corresponding handoff file + index row both exist.

**Why three branches and not two:** Auto-classifying Case C as Significant wrongly preserves references to unrelated handoffs. Auto-classifying Case C as Standard wrongly creates duplicate handoff files that fork the navigation path. Only Case C is genuinely ambiguous. In the April warm slice it's a small set (single-digit count), so human judgment is cheap and produces a cleaner result than any heuristic.

**Phase 3 — Rewrite index.** Replace the active `Agent_Outputs.md` with:
- Short preamble explaining the new shape and pointing to `Handoff_Protocol.md` §Output Tiers for full rules
- Warm index rows in chronological order (newest first)

**Phase 4 — Protocol update.** Edit `Docs/AGENTS/Policies/Handoff_Protocol.md`:
- §Output tiers table: both Standard and Significant destinations → `Handoffs/` (filename-only differentiation)
- §Cross-reference paragraph: every handoff is cross-referenced in `Agent_Outputs.md` (remove the "Significant only" wording)
- §Archival Thresholds: replace with the calendar-month procedure above, including the link-rewrite step

**Phase 5 — Validate.**
- Active `Agent_Outputs.md` line count in 100–300 range
- Every warm index row points to a reachable `Handoffs/` file
- No inline structured-field content remains in active `Agent_Outputs.md`
- `Handoff_Protocol.md` text matches the new retention + link-rewrite rules
- Spot-check three archived rows: their rewritten links resolve to `Docs/ARCHIVE/Handoffs/2026-03/...`
- **No `Docs/AGENTS/Handoffs/` substring remains in `Docs/ARCHIVE/Agent_Outputs_2026-03.md`**. Recommended check: `grep -c "Docs/AGENTS/Handoffs/" Docs/ARCHIVE/Agent_Outputs_2026-03.md` → must return 0. All references must have been rewritten to `Docs/ARCHIVE/Handoffs/2026-03/...`.

---

## Rejected alternatives

- **Enforce the existing 200-line rule without structural change.** Treats the symptom, not the dual-purpose conflict. The rule has already failed once without enforcement tooling; the same outcome would recur.
- **Split `Agent_Outputs.md` by role** (e.g., `Agent_Outputs/<Role>.md`). Breaks cross-role visibility — Captains, Code Reviewers, and incoming agents picking up another role's work all need the full recent picture.
- **Drop the log entirely, Handoffs/ only.** Loses the scan-recent-work affordance. Incoming agents would have to `ls Handoffs/` and open files blind with no triage signal.
- **"Older than 30 days" rolling prune.** Considered as an alternative retention rule to calendar-month archival. Rejected: extra operational cadence without a meaningful gain over once-a-month; calendar boundaries align with how humans reason about dates and produce a tighter steady-state bound.
- **Forwarding stubs in live `Handoffs/` after archive.** Considered as an alternative to link rewriting. Rejected: proliferates files and muddies the active folder's size signal.
- **Body-scan tier classification.** Considered for Phase 2 — any handoff path anywhere in the entry = Significant. Rejected: conflates mention with ownership. Misclassifies standalone Standard entries that cite related handoffs in prose (example: `Agent_Outputs.md:154`).
- **Files-touched-only tier classification.** Considered for Phase 2 — handoff path in `Files touched:` = Significant, otherwise Standard. Rejected: misclassifies malformed Significant entries whose canonical handoff is referenced only outside `Files touched:` (example: `Agent_Outputs.md:475`), producing duplicate handoff files that fork navigation. The three-branch A/B/C classification replaces this.

---

## Resolved decisions (Gemini review, 2026-04-13)

1. **Migration cadence.** Execute as a **standalone PR immediately** after the root-trim PR lands. Rationale (from reviewer): the context-window savings pay for the migration cost within a few turns of subsequent high-reasoning work.
2. **Archive folder shape.** Use **monthly subfolders** (`Docs/ARCHIVE/Handoffs/YYYY-MM/`). Flat aggregated files were rejected — large flat directories degrade performance for both humans and glob tools.
3. **Monthly prune automation.** **Automate** (Captain override of Gemini's defer recommendation). The prune is fully deterministic — no human judgment needed once the one-off migration is complete. A ~80-line script (PowerShell or Node) does in 5 seconds what manual editing does in 5 minutes, and eliminates human error in the link-rewrite step. **Trigger:** manual invocation during Consolidate WIP (e.g., `powershell scripts/monthly-prune-handoffs.ps1`). No CI cron — keeps the Captain in the loop without scheduled-job infrastructure.

    **Script scope:**
    1. Compute previous calendar month from system date.
    2. Move `Docs/AGENTS/Handoffs/<prev-month>-*.md` → `Docs/ARCHIVE/Handoffs/YYYY-MM/` (create target dir if absent).
    3. Parse `Docs/AGENTS/Agent_Outputs.md`; extract index rows whose `### YYYY-MM-DD` prefix falls in the previous month.
    4. Rewrite each extracted row's `→ Docs/AGENTS/Handoffs/<file>` link to `→ Docs/ARCHIVE/Handoffs/YYYY-MM/<file>`.
    5. Append rewritten rows to `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` (create if absent, preserving chronological order).
    6. Remove those rows from the active `Agent_Outputs.md`.
    7. Print summary: files moved, rows archived, any warnings (e.g., index row referring to a handoff file that was already missing).

    **Implementation notes:** Place under `scripts/monthly-prune-handoffs.ps1` (Windows-first per project platform). Dry-run flag (`--dry-run`) strongly recommended — let the Captain preview what will move before the destructive step. Exit non-zero on any parse failure or filesystem error. No state file — idempotent based on current date + file contents.

    **Scope distinction vs migration:** The script handles the **steady-state** case only — archiving index rows (arrow-link format) into the monthly archive file. The one-off **migration** Phase 1.5 is a separate concern because March content at migration time is still inline-entry format with embedded `Docs/AGENTS/Handoffs/` paths in multiple template fields (not just arrow-links). Phase 1.5's broader rewrite scope is executed manually (or via a throwaway migration script) as part of the redesign PR, not by `monthly-prune-handoffs.ps1`.
4. **Index row enhancement.** Include 1–2 key symbols (class names, API endpoints, or file paths) in the For-next-agent line to boost scan-based triage. Incorporated into §Index row shape above.

---

## Sequencing

1. Merge the root AI-instruction file trim first — see `Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md`.
2. Open a dedicated PR for this redesign. Execute the one-off migration per §One-off migration.
3. From the first of the following month, the monthly prune becomes the steady-state procedure run during Consolidate WIP.
