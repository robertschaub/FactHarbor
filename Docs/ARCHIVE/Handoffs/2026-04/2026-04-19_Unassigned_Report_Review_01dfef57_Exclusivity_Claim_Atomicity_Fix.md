---
### 2026-04-19 | Unassigned | Claude Opus 4.6 | Exclusivity/Uniqueness Claim Atomicity Fix
**Task:** Fix non-atomic claim extraction where AC_01 was a verbatim copy of the full input for uniqueness-structure claims ("the only X that Y").
**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md` (Pass 1 line 72, Pass 2 line 223)

**Key decisions:**
- Root cause: the prompt's classification rules had no guidance for exclusivity/uniqueness claims. An input like "X is the only Y without Z" logically bundles two independently verifiable sub-assertions: (a) X lacks Z, and (b) X is the sole member of class Y in that position. The LLM classified this as `single_atomic_claim` and kept AC_01 as a verbatim copy of the full input instead of decomposing it.
- Fix: added an "Exclusivity/uniqueness override" rule in both Pass 1 and Pass 2 classification sections, placed after the Plurality override and before the `single_atomic_claim` definition. When the input asserts a subject is the sole/only/first/last member of a class to have or lack a property, classify as `multi_assertion_input`. Each decomposed claim must be a genuine sub-assertion, not a verbatim copy of the full input.
- The fix is generic (Rule 1 compliant — no entities/regions/dates), multilingual (Rule 7 — the LLM recognizes these semantic patterns in any language via meaning analysis, not English keyword matching), and avoids deterministic text analysis (Rule 2).

**Open items:**
- The dev server must be restarted to pick up the new active prompt blob (hash changed `ea82aeb0` → `44867b58` via postbuild reseed).
- The same input ("Die Schweiz ist das einzige wohlhabende Land Europas ohne eine einzige unabhängige Faktencheck-Organisation") should be rerun to verify proper decomposition into two genuine atomic sub-assertions.
- This input is not yet in `benchmark-expectations.json` — Captain may want to add it as a family (`ch-factcheck-de` or similar) once the decomposition is verified.

**Warnings:**
- The fix affects ALL inputs with uniqueness/exclusivity structure, not just this one. This is intentional and desirable, but any existing benchmark families with uniqueness structure should be checked for regression after the fix.
- The prompt was reseeded via `postbuild`, but a running dev server will still use the old blob until restarted.

**For next agent:**
- The fix is in `apps/web/prompts/claimboundary.prompt.md` — search for "Exclusivity/uniqueness override" to find both instances (Pass 1 and Pass 2 classification sections).
- Job `01dfef575de44a82bb01d4cdea4480ea` was the trigger: AC_01 was byte-identical to the input, AC_02 ("Alle anderen wohlhabenden Länder Europas verfügen über mindestens eine unabhängige Faktencheck-Organisation") was the only properly decomposed claim.
- Expected post-fix behavior: AC_01 should become something like "Die Schweiz hat keine unabhängige Faktencheck-Organisation" (the subject-specific existence claim) while AC_02 stays as the universality/exclusivity claim about other wealthy European countries.
- All 1721 tests pass, build succeeds.

**Learnings:** No new entry added to Role_Learnings.md — this is a straightforward prompt gap, not a recurring gotcha pattern.
