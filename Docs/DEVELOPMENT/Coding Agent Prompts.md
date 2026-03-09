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

### Phase 2 validation — Broader input testing (implementing agent)

**Task:** Run Phase 2 validation across 6 inputs to confirm pipeline health before production. Plan: `Docs/WIP/Phase2_Validation_Plan_2026-03.md`. Checklist: `Docs/DEVELOPMENT/Phase2_Validation_Checklist.md`.

**Steps:**
1. Start apps (API port 5000, Web port 3000) or use deployed app.
2. Run 1–2 analyses for each input:
   - Iran: "Was Iran actually making nukes?"
   - Bolsonaro (Q): "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
   - Bolsonaro (S): "The Bolsonaro judgment (trial) was fair and based on Brazil's law"
   - Hydrogen: "Hydrogen for cars is more efficient than using electricity"
   - Venezuela: "Venezuela's economy under Maduro has performed well"
   - Article: Use a known long-form article URL (or skip if none available)
3. Fill the reporting table in `Phase2_Validation_Checklist.md` with truth%, conf%, verdict, claim count per run.
4. Append a summary to `Phase2_Validation_Plan_2026-03.md`: runs succeeded/failed, overall assessment (production-ready or issues to fix). Note any job IDs for failed runs.
5. Append completion entry to `Docs/AGENTS/Agent_Outputs.md`.

**Success criteria per run:** SUCCEEDED, no UNVERIFIED (truth=50 conf=0), no crashes. Input neutrality: Bolsonaro Q vs S within ~4% truth.

---

### Full plan reference

`Docs/WIP/Report_Quality_Analysis_2026-03-08.md` — consolidated root cause analysis, traceability matrix, Phase 1–3 roadmap.
