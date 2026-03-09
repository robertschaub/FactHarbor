# Coding Agent Prompts

## Phase 2 — Complete (2026-03)

**Status:** Phase 2 track closed. All deliverables implemented and verified.

**Completed phases:**
- **2.1** — Gate 1 dimension tagging, audit data, reprompt loop for low claim count
- **2.2** — `inputClassification` in Pass 2 output schema
- **2.3** — Verdict stage `maxTokens` fix (eliminated JSON truncation on high-evidence runs)
- **2.4** — SR cache: per-category TTL, per-sourceType TTL (regime-change fix: `government=21d`), web-search augmented evaluation
- **2.5** — LLM-based scope normalization

**Validation baseline:** Iran 60–87% truth, 70–85% conf. Bolsonaro 68–85%. Hydrogen 25–45%.

---

### Backlog (low priority — future phases)

| Item | Description |
|------|-------------|
| D2 | Classification instability (`question` vs `ambiguous_single_claim`) |
| D4 | Gate 1 `passedSpecificity` cleanup |
| maxTokens UCM | Move `maxTokens: 16384` into UCM (currently hardcoded) |

---

### Full plan reference

`Docs/WIP/Report_Quality_Analysis_2026-03-08.md` — consolidated root cause analysis, traceability matrix, Phase 1–3 roadmap.
