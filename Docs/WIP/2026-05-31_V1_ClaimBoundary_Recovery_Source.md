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
