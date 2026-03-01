Looking at the plan from before the consolidation (`eventual-wobbling-pearl.md`), here's what remains:


| Step    | Description                                  | Status      | Still relevant?                                                                            |
| --------- | ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| **2.5** | Fix B-1 trace wiring + D5 UCM seed           | Not started | **Yes** — `runtimeRoleModels: undefined` in last gate run. Needed before any re-baseline. |
| **3a**  | Canary run (1 pair, baseline profile)        | Not started | **Yes** but fixture is now v3.3.0, not v2.0.0. Would be Baseline v3, not v2.               |
| **3b**  | Full gate run (baseline profile)             | Not started | **Yes** — same caveat, fixture evolved. ~$3-5.                                            |
| **4**   | Cost audit (read-only, from run artifacts)   | Not started | **Yes** — depends on having a completed run to analyze.                                   |
| **5**   | Cross-provider French regression (2pp→43pp) | Not started | **Yes** — independent investigation, depends on B-1 trace wiring.                         |

**The blocker is the same as before:** Step 2.5 (B-1 trace wiring) should come first so any runs produce complete metrics. That's ~1h of code investigation, no API cost.

**The plan's fixture references are stale** — it says v2.0.0 throughout but the fixture is now v3.3.0 with 14 pairs, diagnostic gate, etc. The plan itself could be updated or simply retired in favor of the Backlog items that now track the same work (B-sequence validation, Verdict Accuracy Test Set, C13 rebalancing validation).

Want me to start on Step 2.5 (B-1 trace wiring investigation), or would you prefer to retire the plan and work from the Backlog instead?
