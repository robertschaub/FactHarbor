# Evidence-Based Action Tools — Competitive Landscape

**Status:** WORKING NOTES — grounded market snapshot; product statuses verified 2026-07-01/02
**Created:** 2026-07-02
**Last Updated:** 2026-07-02
**Author Role:** AI Expert (deep-research harness)
**Companion to:** `2026-07-01_Evidence_Based_Action_Tools_Product_Concept.md`

Method: two multi-agent research runs (~124 agents): category sweeps over vendor sites, docs, news, and `site:linkedin.com` positioning, then adversarial single-skeptic verification of 10 load-bearing claims (existence, shutdowns, M&A, white-space). Every status below carries a dated source. Gap-sweep entries are single-agent findings, not multi-vote verified, unless listed in the corrections table.

## Verified corrections (things we would otherwise have gotten wrong)

| Claim checked | Verdict | Corrected fact |
|---|---|---|
| No shipped Estuarine Mapping software exists | corrected (medium) | No dedicated app, template, or OSS tool found anywhere — but The Cynefin Co has offered an Estuarine-specific *capture* variant inside SenseMaker/MassSense engagements since ~2024 ([source](https://thecynefin.co/cynefin-st-davids-2024-estuarine-3-5/), [wiki 2025-03](https://cynefin.io/wiki/Estuarine_framework)) |
| Cynefin Co sells no self-serve decision-orientation software | supported (high) | [thecynefin.co/effective-decision-making-support-tool](https://thecynefin.co/effective-decision-making-support-tool/) is a 2024-08-06 blog article, not a tool; catalog = SenseMaker, Hexi kits, courses, books |
| Statsig availability affected, Amplitude a "migration path" | corrected (high) | OpenAI acquired Statsig 2025-09-02 (~$1.1B); on 2026-05-05 **Amplitude took over brand, platform, and customers** (team stays at OpenAI); no forced migration ([Amplitude](https://amplitude.com/blog/amplitude-and-statsig-partnership)) |
| Eppo now a Datadog capability | supported (high) | Datadog Feature Flags GA 2026-02-03; **Datadog Experiments GA 2026-04-02**; geteppo.com: "Eppo is now Datadog Experiments" |
| Logically sold in administration | supported (high) | Pre-pack to **Kreatur Ltd** 2025-07-07; logically.ai runs on as "narrative decision intelligence" (© 2026 Kreatur); editorial arm Logically Facts ceased, domain dead |
| GLIDR dormant | **refuted** (high) | Rebranded **GLIDR AI Co-Founder** (LaunchPad Central): AI release 2025-06-17, live pricing ($59–$990/mo), 8 staff on LinkedIn |
| Murmur shut ~2023-24 | corrected (high) | Murmur abandoned in a 2022-23 pivot; company (via Supermanage → Plumb) shut down entirely **2025-10**; murmur.com parked |
| Cloverpop alive incl. Decision Bank | supported (high) | LinkedIn posts within hours of 2026-07-02; 2025-12-24 blog; brand of ClearBox Decisions Inc. since 2021 |
| HumanLayer still sells agent-approval API | **refuted** (high) | Pivoted to an AI coding IDE / "software factory"; approval SDK "pretty much all deprecated" (GitHub), legacy dashboard TLS expired, PyPI last release 2025-06-03 |
| LaunchDarkly AgentControl gates per-action | supported (high) | Launched 2026-05-19; guarded, auto-rollback releases of agent **configurations/versions**; "doesn't reach inside the agent's execution to evaluate individual tool calls" ([independent](https://aioutlooks.com/launchdarkly-agentcontrol-vs-galileo-agent-control/)) |

## A. Decision intelligence & decision ledgers

Category: structured what/why/who decision records are widespread; Cloverpop and Aera even capture outcomes — but to train vendor AI and dashboards, not as expected-shift-vs-observed-effect comparison. Nothing does complexity-first orientation, probes, or an impact-derived guard on agent actions.

- **Cloverpop** (ClearBox Decisions) — [cloverpop.com](https://www.cloverpop.com/) — active (verified).
  Enterprise decision-intelligence platform: decision workflows, "Decision Bank" system of record (rationale, data sources, outcomes), decision analytics, D-Sight AI assistants under a "Human ^ AI" framing; Slack/Teams apps.
  *Better:* mature enterprise system of record, analytics at scale, distribution, category credibility. *Lacks:* no Cynefin-style orientation, no substrate map, no probe designer, no dissent mechanics; outcome capture feeds vendor AI/ROI dashboards, not per-decision expected-vs-observed learning; approval tiers are workflow config, not a risk/reversibility guard.
- **Aera Technology (Decision Cloud)** — [aeratechnology.com](https://www.aeratechnology.com/aera-decision-cloud/) — active; Leader in the inaugural **2026 Gartner MQ for Decision Intelligence Platforms** (2026-01-29); Agentic Reasoning launch 2026-05.
  Automates high-volume operational decisions (supply chain, finance) from integrated enterprise data; Decision Data Model = "decision memory" of context/actions/outcomes; recommendations execute "on your approval".
  *Better:* true closed-loop execution across ERP, explainability, analyst standing. *Lacks:* automates ops decisions rather than supporting deliberation under complexity; approval gates are configuration, not risk/reversibility semantics; heavyweight data-integration sell.
- **Decision Lens** — [decisionlens.com](https://www.decisionlens.com/) — active (3-0 verified in run 1).
  AI-driven prioritization/budgeting decision platform for US government (DoD, federal, state/local): tradeoffs, optimization, "defend every decision", persistent record across leadership transitions.
  *Better:* governed decision record + public-sector depth. *Lacks:* portfolio/budget scope only; no evidence typing, orientation, probes, or agent side.
- **Fingertip** — [getfingertip.com](https://getfingertip.com/) — active (pages updated 2026-06).
  Teams-native "leadership execution system": meetings, decisions (owner, rationale, Draft→Request→Approve lifecycle), tasks, objectives; restrained AI framing ("without losing human ownership").
  *Better:* native Microsoft Teams distribution; teammate-tone AI. *Lacks:* no evidence/uncertainty/revisit fields, no backward outcome loop, no dissent, no agent features.
- **Loomio** — [loomio.com](https://www.loomio.com/) — active (OSS v3.0.22, 2026-04-24; worker co-op since 2012).
  Open-source collaborative decision-making: threads, proposals, multiple voting methods, reasons attached ("people don't just click agree — they share why"), timestamped outcomes.
  *Better:* democratic legitimacy, self-hostable, 14-year track record, 35 languages. *Lacks:* prose+votes, not typed claims/evidence/uncertainty; human-only; no learning loop.
- **DecisionOps** — [aidecisionops.com](https://aidecisionops.com/) — active, very early (© 2026; maturity unverified).
  Decision records for AI-native software teams, served to IDEs/coding agents via MCP; PR checks flag code conflicting with accepted decisions; agent skill evaluates options on "impact, risk, reversibility, and constraints".
  *Better:* MCP-native distribution into coding agents + an enforcement loop (PR checks). *Lacks:* software-engineering scope; no evidence/uncertainty typing; dashboards track drift, not outcomes. Closest agent-side ledger found.
- **Decision Ledger** — [decisionledger.co](https://www.decisionledger.co/) — private beta, solo founder (© 2026).
  AI "sparring partner" for founders: challenges reasoning, then auto-writes a structured record with success criteria, review dates, check-ins.
  *Better:* cheap live demonstration of ledger + revisit triggers + adversarial pushback. *Lacks:* solo journal, no team/participation, no provenance, viability risk.
- **Commoditization + graveyard:** monday.com markets decision logs with rationale/alternatives/review-trigger fields (2026-01 blog) — the basic ledger layer is being commoditized by generic work platforms. **Loqbooq** (pure Slack decision log) discontinued 2024-09. **Murmur** (IDM-based team decisions) abandoned in pivot, company dead 2025-10 — co-founder's post-mortem: "Decision-making isn't just a process problem, it's a people, power and politics problem." **Log4brains**/ADR tooling covers engineering decision records, deliberately unstructured, human-only.

## B. Cynefin / SenseMaker / Estuarine digital tooling

Category: heavily occupied at the IP/services layer (kits, training, SenseMaker capture), but **no shipped software walks a team through Cynefin orientation of a specific decision or an Estuarine energy/time map** — validated empty, including open source. The one credible threat is the method owner itself.

- **SenseMaker + MassSense** (The Cynefin Co) — [thecynefin.co/sensemaker](https://thecynefin.co/sensemaker/) — active (© 2026; MassSense university engagement documented 2026-02-26).
  The ecosystem's only shipped software: distributed-ethnography capture (micro-narratives self-signified by respondents on triads/dyads) + pattern dashboards; consultancy-mediated, no self-serve pricing; "does not use AI to analyse the data by default". Estuarine-specific capture variant available inside engagements since ~2024.
  *Better:* field-validated mass participatory capture at scale; self-signification ethos matches the concept's no-surveillance line. *Lacks:* no per-decision orientation walkthrough, no decision ledger, no probe designer, nothing agent-facing.
- **Hexi kits + virtual environment (ALPHA)** — [thecynefin.co/hexi-kits](https://thecynefin.co/hexi-kits/) — physical kits shipping (BaseKit V2 £195); Snowden blog **2026-03-01**: a virtual environment for this "is currently in alpha test"; Dec 2024 post promised "virtual Hexi assembly with supporting AI".
  *Meaning:* the closest **announced** competitor to the Honest Inquiry & Intervention Engine, from the method's originator — first-mover room exists but is time-limited. Nothing on ledgers, probes-as-objects, outcome closure, or agents in the announcements.
- **"Effective decision-making support tool" page** — verified: a 2024-08-06 explainer article (Beth Smith) routing to training and SenseMaker, **not** a tool. The company's catalog contains no interactive decision-orientation software (verified, high).
- **NarraFirma** — [narrafirma.com](https://narrafirma.com/) — active (v1.6.14, 2026-06-22; GPL).
  Open-source Participatory Narrative Inquiry app (plan projects, collect stories with interpretation questions, catalysis reports, sensemaking sessions) by Cynthia Kurtz (original SenseMaker author, 2004).
  *Better:* fully open source; mature facilitation support; deliberately preserves contrasting interpretations. *Lacks:* no Cynefin domains, no Estuarine grid, no ledger/probes/agents; dated UI, niche community.
- **Third-party shelf:** Miro Cynefin canvases and a Mermaid diagram type are static memory aids; GitHub search "estuarine mapping" (2026-07-02) returns only oceanography tools. No third-party app guides a decision through orientation.

## C. Experimentation & product discovery

Category: crowded and consolidating hard around **software** experimentation (Eppo→Datadog 2025-05; Statsig→OpenAI 2025-09→Amplitude 2026-05; DoubleLoop→Mixpanel 2025-10). Hypothesis fields, statistical stop rules, and program management are commoditized; nobody generalizes to organizational decisions with stop-rule/reversibility/harm probe design.

- **Efestra** (formerly Effective Experiments) — [efestra.com](https://efestra.com/) — active, rebranded (301-redirect; © 2026).
  Experimentation-program management rebranded as a "Decision Intelligence Suite": hypothesis structuring, learning capture, "complete governance infrastructure for how you run, learn from, and act on evidence".
  *Better:* a decade of program-governance workflow and C-suite reporting. *Lacks:* no complexity orientation, no probe semantics (stop rules/reversibility/harms), nothing agent-side — but it is the closest **rhetorical** twin to the concept's evidence-to-decision story.
- **Strategyzer** — [strategyzer.com/platform](https://www.strategyzer.com/platform) — active (© 2026 Strategyzer AG).
  Business-design SaaS (not just method/kits): teams test business-model assumptions in-app with **Test Cards** (hypothesis, test, metric, success criterion) and **Learning Cards** (insight, action).
  *Better:* massive methodology adoption and pedagogy. *Lacks:* no stop rules, reversibility, harm bounds, or sensing plans; no uncertainty/revisit tracking; innovation-validation scope; human-only.
- **Optimizely** — active market leader (~300k experiments run in 2025; 2026: Opal program agents, remote MCP server).
  *Better:* industrial stats engine, scale, holdout discipline. *Lacks:* digital-product experiments only; its agent story is agents *operating* experiments — the inverse of guarding agent actions.
- **GrowthBook** — active (© 2026; OSS). Warehouse-native flags+experiments; "one platform for your team and your agents" (MCP/REST for agents). Same scope limits; agents as experiment operators.
- **Datadog Experiments (Eppo)** — GA 2026-04-02. Statistics + "real-time observability guardrails" that auto-catch harm **during experiments** — the category's nearest cousin to blast-radius checking, applied to experiment health, not agent actions.
- **Statsig under Amplitude** — platform continues (cloud + warehouse); original team at OpenAI; rivals publicly question momentum — consolidation turbulence.
- **DoubleLoop** — acquired by Mixpanel 2025-10-07, standalone product in wind-down. Pre-acquisition it was the category's nearest thing to expected-vs-observed closure (bets with hypotheses wired to live metric movement); the niche moves inside Mixpanel Metric Trees.
- **LaunchDarkly guarded rollouts + AgentControl** — guarded, metric-monitored, auto-rollback releases = **stop rules and reversibility are commodity for software/config changes**; AgentControl (2026-05-19) extends this to agent configs/versions and tool allowlists, explicitly **not** per-action evaluation (verified).
- **GLIDR AI Co-Founder** (LaunchPad Central) — active (verified). AI-generated experiment plans with success criteria for innovation programs (universities, accelerators, government). *Lacks:* no stop rules/reversibility/harms, no ledger, advisory-only AI agents.
- **Vistaly** — active; v2.0 private beta with phased rollout. Opportunity/strategy-tree product-discovery tool; adjacent, light overlap.

## D. Agent human-in-the-loop approval & authorization

Category: the **escalation plumbing** of the Agent Provenance Contract is densely occupied — pre-execution gating with human approval routing and identity/scope authorization. But every trigger is permission-, identity-, or hand-wired; none evaluates evidence quality, none scores risk/reversibility/blast-radius, none closes an outcome loop. The pure-play pioneer (HumanLayer) exited.

- **Permit.io** — [permit.io](https://www.permit.io/) — active; MCP Gateway launched 2026-03-17.
  Authorization-as-a-service (RBAC/ABAC/ReBAC) extended to agents: agents submit operation approval requests ("Can I delete this resource?"), humans approve via UI/Slack (LangGraph interrupt/resume); MCP Gateway proxies tool calls with authN/authZ/consent/audit.
  *Better:* mature policy engine, drop-in proxy, audit trail, no-code approval UIs — the strongest shipped overlap with the capability-side guard. *Lacks:* which actions need approval is hand-authored policy; no risk/reversibility/blast-radius model, no evidence input, no learning loop; "real-time monitoring, anomaly detection" posture sits in tension with teammate-not-watchdog.
- **Auth0/Okta "Auth for AI Agents"** — GA 2025-11 (Oktane); Auth for MCP GA 2026-05-06.
  Identity for agentic apps incl. **CIBA async authorization**: tool execution blocks until the user approves out-of-band with "rich authorization data".
  *Better:* enterprise identity-grade, standards-based, push-notification UX. *Lacks:* developer decides per-tool what gets gated; no impact semantics, no evidence, no outcomes.
- **Arcade.dev** — $60M Series A 2026-06-15; docs updated 2026-06-30.
  "MCP runtime for production agents": OAuth user authorization, scoped permissions, per-action runtime enforcement, audit; claims authorship of the MCP authorization spec; bank deployments.
  *Better:* production-scale runtime and enterprise distribution far beyond what a newcomer could build. *Lacks:* identity/scope-based (does this user permit this scope), not impact-based; no human-approval product, no evidence, no learning.
- **gotoHuman** — active but quiet (no 2026 news found; last announcements mid-2025).
  API-first human-review: agents pause for approval on customizable forms (Agent Inbox); approved/edited outputs feed back as "agent memory" — the category's only learning-loop gesture.
  *Better:* fastest low-code adoption path (n8n/Make/MCP), EU hosting. *Lacks:* review points hand-inserted; no risk tiering, no evidence flags; small-team momentum risk.
- **Composio** — active ($25M Series A 2025-07). Tool integration + managed auth, positioning **pro-autonomy** ("No human is required"). Occupies the same chokepoint while removing human checkpoints.
- **HumanLayer** — pivoted out (verified refuted). Was the reference "guarantee human oversight of high-stakes function calls" SDK; now an AI coding IDE. **Category signal: a standalone generic approval layer did not sustain a company** — approval gates are being absorbed into platforms (LangGraph interrupts, cloud guardrails).
- **APort** — [aport.io](https://aport.io/) — active. Deterministic pre-action ALLOW/DENY policy checks at the tool boundary ("the action layer is where the irreversibility lives"); CTF-style validation claims; no human escalation or evidence semantics. Its 2026-04 comparison of ~16 guardrail tools discusses no HITL at all. Also notes **Microsoft shipped an "Agent Governance Toolkit" (2026-03)** — pre-execution policy middleware from the largest vendor.

## E. Agent governance & observability

Category: observe/evaluate/govern is fully occupied and converging on runtime intervention (Gartner even has a 2026 **Market Guide for Guardian Agents**). All gating found is policy-, metric-, or identity-driven; none reasons about evidence sufficiency or reversibility as a contract; audit trails link actions to execution/policy, never to claims/evidence/uncertainty.

- **IBM watsonx.governance** — active; Q1 2026 agent monitoring/insights. Decorator-based **in-the-loop evaluators that compute metrics during execution and can control agent flow** (block/route/fallback) — the strongest incumbent runtime control; metric-gated (faithfulness/safety), threshold alerts, factsheet/audit machinery; compliance-watchdog framing.
- **LangSmith (LangChain)** — active; Fleet launched 2026-03-19. Tracing + evals + durable runtime with **platform-native HITL approvals** ("ask permission before taking sensitive actions"). Sensitive = developer-designated interrupts; no impact derivation, no evidence link.
- **Holistic AI (Guardian Agents)** — active; Gartner Representative Vendor 2026-03. Sentinel (observe) + Operative (intervene: kill switches, blocking, privilege revocation) agents — explicitly watchdog-postured, the antithesis of teammate framing; marketing outpaces verifiable deployment detail.
- **Credo AI** — active (GAIA GA ~2026-05; Fast Company 2026 listing). Policy packs, AI Agent Registry with drift alerts; its 2026-05 field guide *advocates* a "Tool Gateway" for action-level enforcement — messaging (#runtimeaigovernance) ahead of shipped enforcement.
- **Microsoft Entra Agent ID** — GA (2026-04/05). Agent identities, Conditional Access, risk-based blocking, lifecycle governance with human sponsors, full logging; third-party agents via federation. Gates **access**, not action semantics; log-everything posture. A substrate the concept's guard would sit on, not a competitor.
- **Guardrails AI** — active (OSS v0.10.2, 2026-06-04) but drifted toward simulation/evals (Snowglobe); runtime validators gate content in/out, not mutating-action risk.
- **Langfuse / AgentOps** — active tracing/replay (Langfuse v3.203.1 released 2026-07-01). After-the-fact audit trails of what agents did; nothing preventive, no evidence linkage.

## F. Evidence repositories & claim/deliberation tools

Category: owns corpus-level evidence synthesis and the two dissent mechanics the concept borrows — but everything is per-corpus or per-question, never per-decision; no outcome loops; no agent side.

- **Elicit** — [elicit.com](https://elicit.com) — active, expanding (Research Agents 2025-12, API 2026-03; 7 of top-20 life-sciences companies claimed).
  AI research assistant over 138M papers: PRISMA-grade screening, structured extraction, systematic reviews, "reproducible, traceable, and auditable at every step". 2026 push: **"living causal models"** mapping what has to be true for a pharma program, each link tied to evidence.
  *Better:* retrieval/extraction accuracy and auditability at scale. *Lacks:* scientific literature only, not an org's own claims/observations; no orientation, ledger, probes, agents, or outcome closure. **Watch item: nearest encroachment on decision-anchored assumption mapping.**
- **Consensus** — active; **$30M Series B 2026-05-11**. Academic search over 220M papers; Consensus Meter shows stance distribution (Yes/No/Maybe) — off-the-shelf uncertainty visualization, per research question, not per decision.
- **Dovetail** — active (AI-native relaunch Fall 2025; Atlassian/Spotify-class logos). Customer-research repository: transcribe, tag, AI-cluster, dashboards. Per-corpus, not per-decision; **does sentiment analysis on customers — a capability the concept's no-emotion-scoring line deliberately excludes** (clean differentiation).
- **Kialo / Kialo Edu** — active, free (BETT award 2025; 3.3M contributions). Pro/con argument trees — the canonical structured-dissent UI. Opinions, not evidence with provenance; education audience; no revenue model.
- **Pol.is** — active (national-scale deployments; Bowling Green 2025; AGPL). Mass opinion clustering that surfaces minority opinion groups and consensus statements. Opinions not evidence; **as AGPL open source it is a potential component rather than a competitor** for participatory intake.
- Market note: claim-verification as a standalone business took a beating — **Logically** (≈£30M raised) died on platform-contract loss 2025; its buyer runs the brand as government-facing "narrative decision intelligence".

## G. Provenance, groundedness & audit

Category: crowded at three adjacent layers — media provenance (C2PA), AI supply-chain provenance (AIBOM), output-groundedness flags (commodity cloud APIs). Nobody binds **actions** to **evidence** or routes "no evidence" to evidence **creation**.

- **C2PA / Content Credentials** — accelerating (2026-06 independent review: "real but uneven"): Pixel 10 signs photos by default, Sony/Canon/Nikon cameras, Adobe CC, OpenAI images (2026-05), Microsoft 365 (2026-02), TikTok >1.3B labeled videos; driver = **EU AI Act Art. 50 transparency enforcement from 2026-08-02**.
  *vs concept:* declares how a media file was made, not what evidence a statement/action rests on; explicitly "a missing Content Credential is not proof"; the reigning provenance standard any output-provenance product will be compared against.
- **Azure AI Content Safety — groundedness detection** — active (page updated 2026-06-05). Flags ungrounded segments of LLM output vs supplied sources, with reasoning mode and auto-correction preview. **Closest shipping analogue to the no-evidence flag** — but only relative to supplied sources; remedy is correct/flag, never "design a probe".
- **Amazon Bedrock Guardrails — contextual grounding** — active. Score-and-block below threshold. Confirms "is this output evidenced?" is now a **commodity cloud primitive**.
- **Cleanlab TLM** — was the closest match to "flag knowledge gaps + hand off to human" **without** supplied sources; company absorbed by Handshake AI 2026-01-28 (talent deal), product continuity uncertain — the niche is effectively vacated.
- **Kognitos** — active (2026-05 audit-trail content). Neurosymbolic automation with plain-English per-action audit trails, dual human+AI attribution — tonally the closest to a teammate-feel ledger; but reasoning-as-English is process logic, not evidence; compliance audience.
- **ChainProof** (Clevyr) — active, very early ($49/mo). Hash-chained tamper-evident ledger of agent actions incl. human approvals — but "only knows what your agent tells it": log integrity, not evidence for the action.
- **AIBOM wave** (Manifest Cyber; SPDX 3.0 AI Profile / CycloneDX ML-BOM) — moving into 2026 procurement requirements. System-level provenance of what an AI is built from — complementary layer below an Agent Provenance Contract, not competition.

## Synthesis

### Commoditized (do not differentiate here)
- Basic decision logs — what/why/who/alternatives/review-trigger fields (monday.com, Fingertip, Loomio, ADR tools).
- Software experimentation with statistical stop rules, guardrails, auto-rollback, and program management (Optimizely, GrowthBook, Datadog, Amplitude/Statsig, LaunchDarkly guarded rollouts).
- Output groundedness checks vs supplied sources (Azure, Bedrock — cloud primitives).
- Agent identity, scoped authorization, audit plumbing, and approval-workflow mechanics (Entra, Arcade, Auth0/Okta CIBA, Permit, LangGraph interrupts).
- Media provenance (C2PA).

### Validated white space (as of 2026-07)
1. **Software-guided Cynefin orientation of a specific decision** — nothing ships this; only static canvases. (Verified against the method owner's catalog.)
2. **Estuarine substrate-mapping software** — empty shelf incl. OSS; capture-only variant exists inside Cynefin Co consulting engagements; the owner's virtual environment is in **alpha (2026-03)** → time-limited window.
3. **Impact-derived gating** — every shipped guard triggers on identity, hand-written policy, or metric thresholds; none derives escalation from risk × reversibility × blast-radius of the specific action.
4. **Evidence sufficiency as an authorization input** — no product anywhere feeds evidence quality/provenance into whether an agent may act.
5. **"No evidence → probe-required" routing** — grounding checks block/correct/hand-off; none route to designing a bounded evidence-creating intervention (closest match, Cleanlab TLM, was absorbed 2026-01).
6. **Per-decision outcome-learning closure** (expected shift vs observed effects) — partial precedents only: DoubleLoop (sunsetting), Cloverpop/Aera (outcomes captured to train vendor AI/dashboards), Decision Ledger (solo-scale review dates).
7. **One evidence discipline spanning humans AND agents** — the categories are fully siloed: decision tools have no agent side; agent tools have no evidence side.

### Nearest overall competitors
1. **Cloverpop** — nearest on the Evidence Compass ledger + outcome capture + human-AI decision workflows.
2. **The Cynefin Company** — nearest strategically: owns the methods and mindshare, ships SenseMaker/MassSense, and has the Hexi/Estuarine virtual environment in alpha.
3. **Aera Technology** — the enterprise heavyweight for "decision memory + approval-gated agent execution" (different market: ops automation).
4. **Permit.io** — nearest shipped capability-side guard with human escalation (policy-based, not impact-based); with IBM watsonx.governance, LangSmith Fleet, and Holistic AI as incumbent pressure converging on runtime agent control.
5. **Efestra** — nearest positioning twin ("governance infrastructure for how you run, learn from, and act on evidence").
Watch: **Elicit** (decision-anchored causal/assumption maps for pharma) encroaching on Evidence Compass from the research side.

### Market cautions (from the graveyard and pivots)
- Murmur, Loqbooq, and Plumb show thin decision-process tooling fails on adoption: "people, power and politics", not features — direct support for the concept's adoption-psychology gap and teammate-not-watchdog requirement.
- HumanLayer's pivot shows a standalone approval layer wasn't a business; gating plumbing is being absorbed into platforms (LangGraph, cloud vendors, LaunchDarkly, Microsoft's Agent Governance Toolkit). Differentiation must live in the **evidence and impact semantics**, not the interception mechanics.
- Logically's failure is a caution for claim-verification-as-service revenue, not for decision-evidence tooling — but it shows how fast platform-dependent evidence businesses can die.

### Implications for the concept doc's open gaps
- **First wedge:** the two occupied-but-shallow beachheads are (a) decision ledger for human+AI teams (Cloverpop's turf, but SMB/team-scale is open) and (b) evidence-aware guard semantics layered on existing authz plumbing (Permit/Arcade/MCP gateways as substrate, not competition). The Cynefin-orientation + probe-designer combination has no occupant at all but also no proven buyer — consistent with treating it as hypothesis, not validated demand (KG1 still requires probes).
- **Anti-evidence-theatre:** no competitor has solved contestable evidence either; Kialo/Pol.is mechanics are the available building blocks.
- **Timing:** the Estuarine software window is real but closing (owner alpha, 2026-03); agent-guard white space is narrowing quarterly (Gartner guardian-agent category, Microsoft toolkit 2026-03, LaunchDarkly 2026-05).

## Caveats
- Statuses are a 2026-07-01/02 snapshot; this space moves monthly.
- Gap-sweep entries rest on single-agent research (vendor pages + independent coverage + LinkedIn snippets); only the 10 corrections-table claims were adversarially verified.
- LinkedIn evidence came from `site:linkedin.com` search snippets (direct fetches are auth-walled); company-page recency signals are approximate.
