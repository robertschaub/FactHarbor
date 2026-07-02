---
roles: [Product Strategist, LLM Expert]
topics: [evidence_based_tools, debate, wizard_decisions, estuarine, decision_ledger, agent_provenance]
files_touched:
  - Docs/WIP/2026-07-01_Evidence_Based_Action_Tools_Product_Concept.md
  - Docs/AGENTS/Handoffs/2026-06-30_Product_Strategist_LLM_Expert_Evidence_Action_Tools_Proposal.md
  - Docs/AGENTS/Handoffs/2026-07-01_Product_Strategist_LLM_Expert_Evidence_Action_WIP_Documentation.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/WIP/README.md
---
### 2026-07-01 | Product Strategist + LLM Expert | Claude Code (Opus 4.8) | Evidence-Action Debates, Wizard, and Consolidation

**Task:** Pressure-test and consolidate the evidence-based human/AI-agent tools proposal; resolve its open questions with the founder; record everything in WIP; hand the state over to Codex (GPT-5), who worked the same doc in parallel sessions.

**Done:**
- **Two FULL-tier `/debate` runs** (Advocate, Challenger, 2 consistency probes, Reconciler, Validator each):
  1. *General design* → MODIFY: consolidate ~10 concepts to **3 tools** (Evidence Compass, Honest Inquiry Engine, Agent Provenance Contract). Both probes broke the larger set: coverage justifies ~3, and Ledger+Firewall paired *reads as surveillance* — a design failure against agency/dignity, not a deployment risk.
  2. *FactHarbor-specific* → MODIFY: **defer-and-dogfood** during alpha. The "non-rival dogfood" case rests on unmeasured founder-hour rivalry (KG3). Gate: quality tripwires calibrated against the n=1550 UNVERIFIED census (do not pin invented numbers) + a ≤2-founder-day no-UX internal probe before any product build.
- **7-question founder wizard** → "Resolved concept choices" table in the WIP doc: (1) standalone Decision Ledger app+service as possible long-run shape; (2) guard **any** action type; (3) **reversibility + blast-radius** risk model; (4) agent autonomy **only if safe-to-fail**, mutating/external escalates; (5) **all** evidence sources (source-agnostic evidence-item shape); (6) **hybrid** Cynefin orientation (LLM proposes, human confirms); (7) emotion signals **voluntary, anonymous, aggregate, decision-attached**.
- **Supersession banners** added to the two prior Codex handoffs (2026-06-30 proposal, 2026-07-01 WIP documentation) + a pointer line under the stale "MVP 1 = Card + Firewall" entry in `Agent_Outputs.md`.
- **Non-binding roadmap restore:** after Codex's "Concept Gaps Consolidation" removed the staged app/service roadmap, the founder chose to keep it (option B). Re-added as *"Starting hypothesis, if this graduates to a spec (non-binding)"* — Card schema (~1 day) → plain-file/CLI dogfood (~3 weeks, the KG1/KG4 probe) → thin service/API → thinnest app; Stages 2–3 wait for dogfood signal + FactHarbor quality gate. Spec-boundary sentence adjusted to "no **committed** build sequence".
- **Commits (main, not pushed by this session):** `7cd90803` (3-tool consolidation + handoff banners) and `ccf43df9f` (concept doc folding Codex's Estuarine revision + diagrams + gaps table + spec boundary, plus wizard table and restored non-binding hypothesis).

**Decisions:**
- Endorsed Codex's Estuarine revision in full — especially the evidence-assessment block (practitioner frameworks ≠ demand evidence) and the observation-vs-enforcement split (declaration protocol for outputs; separate non-surveilling capability guard for mutating/external agent actions), which closes the gap this session had flagged.
- Kept commits narrowly scoped throughout (concept doc / own handoffs only); the analysis-quality stream's files were deliberately left for their owner and have since landed via `42a0a9cc0`…`058f16b11`. **Nothing dangles as of `058f16b11`; docs tree clean.**
- The Charter live application ("which path for Our AI Charter": A movement / B audit standard / C author+federate; recommendation probe-B/C-first) was demoted by Codex to an incomplete-application caveat — accepted; the full worked pass remains in session history if a worked example is wanted again.

**Warnings:**
- The concept doc is co-owned across Claude and Codex sessions and moved *during* edits several times. Re-read before editing; do not trust remembered line numbers or section names ("Open Questions" → "Resolved concept choices" + "Conceptual gaps before spec").
- Do not silently re-remove the non-binding starting hypothesis — it exists by explicit founder decision (option B). If it conflicts with a future pass, discuss rather than delete.
- Sophistication-vs-adoption is the live tension: the Estuarine machinery is now rich; the debate's own finding ("teammate, not watchdog"; completeness ≠ use) says adoption dies on ceremony.

**Learnings:** No Role_Learnings append; the co-editing warning above is session-specific, not a durable role gotcha.

**For next agent:** Read `Docs/WIP/2026-07-01_Evidence_Based_Action_Tools_Product_Concept.md` top-to-bottom first (it changed under every session). Highest-value next pass: the open gap **"minimum Estuarine map without expert facilitation"** (the sophistication-vs-adoption crux), then the remaining "Conceptual gaps before spec" items. Build sequence stays non-binding until the defer-and-dogfood gate is met.
