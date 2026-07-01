# Evidence-Based Action Tools Product Concept

**Status:** DRAFT — current design is the 3 consolidated tools in the "2026-07-01 refinement" section below. Session 2 (2026-07-01) also pruned superseded forward-looking content: the MVP 1/2/3 build sequence, the stale next-work packet, concept #10, and the #2 auth-gate framing. Session 3 (2026-07-01) restored three constraints that must survive the consolidation: non-surveilling agent enforcement for mutating actions, explicit outcome-learning closure, and the parked workplace/team-practice track.
**Created:** 2026-07-01
**Last Updated:** 2026-07-01 (session 3, Codex)
**Author Role:** Product Strategist + LLM Expert

---

## Context

This WIP captures a product direction proposed after the LinkedIn discussion about a simple shared rule:

> Decisions and actions should be evidence-based, whether they are human actions or AI-agent actions.

The extension is the important part: if evidence is missing, the system should not pretend certainty or proceed by intuition alone. It should create evidence through bounded, reversible, observable probes before committing to higher-impact action.

This is product discovery, not an approved roadmap. Any implementation path still needs Product Strategist, Lead Architect, and LLM Expert review.

## Source Anchors

- FactHarbor role in the broader program: evidence modelling, contested-claim analysis, reasoning transparency, and verifiable reports.
- FactHarbor user needs: evidence transparency, source provenance, understanding uncertainty/consensus, professional API access, and social-media fact-checking.
- FactHarbor quality model: quality gates, evidence quality defence, source reliability, source provenance tracking, and confidence calibration.
- Cynefin: choose action mode based on situation type: clear, complicated, complex, chaotic, or disorder.
- BestWorkplace: iterate, make work visible, build psychological safety, empower teams, and use feedback loops instead of top-down certainty.
- Evidence-based management: combine scientific evidence, organizational data, practitioner expertise, and stakeholder values/concerns.
- Improvement science/PDSA: treat uncertain changes as small tests with explicit learning criteria.
- Human decision psychology: emotions, loss aversion, motivated reasoning, social threat, and trust shape whether people can use evidence well.
- AI risk guidance: AI systems need accountability, transparency, monitoring, risk controls, and human oversight for consequential actions.

Public references:

- https://thecynefin.co/about-us/about-cynefin-framework
- https://hbr.org/2007/11/a-leaders-framework-for-decision-making
- https://robertschaub.github.io/BestWorkplace
- https://cebma.org/resources-and-tools/what-is-evidence-based-management/
- https://www.ihi.org/resources/how-to-improve
- https://www.nist.gov/itl/ai-risk-management-framework

## 2026-07-01 refinement — debated, consolidated, plain-language, first live application

*This section is the current state. It took the concept catalog below through two adversarial debates (`/debate`, FULL tier), consolidated it, translated it to plain language, and applied it to one real decision. Read this first; the fuller catalog further down is the raw material it draws on.*

### Two debates run

1. **General design — "are these the right tools?"** → **MODIFY: consolidate to 3** (confidence INFERRED). Both consistency probes broke the larger set: failure-mode coverage only justifies ~3 tools, and a Decision Ledger + Agent Firewall pairing *reads as surveillance* — failing the human-psychology / agency-and-dignity requirement as a **design** flaw, not a deployment risk.
2. **FactHarbor-specific — "build it during alpha?"** → **MODIFY: defer, dogfood only** (confidence INFERRED). Keep capacity on core analysis quality; the "non-rival dogfood" case rests on an unmeasured assumption (does the work compete for the same solo-founder hours?). Proposed gate: quality tripwires (calibrate against the n=1550 UNVERIFIED census, do not pin invented numbers) **+** a ≤2-founder-day internal probe with no new UX, before any product build. *This is a roadmap conclusion, separate from whether the tools are the right general design.*

### The consolidated design — 3 tools (down from the component catalog below)

| Tool | Absorbs (from catalog below) | Human face | Agent face |
|---|---|---|---|
| **Evidence Compass** | #1 Card, #4 Cynefin room, #5 Ledger, #7 Claim radar | guided intake infers the situation type → returns a regime (use-evidence / create-evidence→probe / decompose); records decision, load-bearing claims, assumptions, revisit trigger | regime-classification call + machine-readable claim ledger |
| **Honest Inquiry Engine** | #3 Experiment Designer, #6 Emotional radar, #9 Dissent room | one pre-commit ritual: steelman + disconfirming-evidence hunt + bias-naming + premortem + calibrated/emotion-aware presentation + anonymous dissent — with a **named, separable Probe Designer sub-module** (hypothesis, stop-rule, reversibility, provenance) that fires on the create-evidence regime | disconfirming-evidence checks, named-bias flags, probe specs as discrete callable steps |
| **Agent Provenance Contract** | #2 Firewall (scoped down), #8 Provenance graph | reader sees each agent claim's provenance block or a `no-evidence / probe-required` flag; the **human** decides high-impact gating via the Compass regime | declaration protocol: attach provenance or the honest no-evidence flag to every output — **no autonomous auth-gate** |

Key design rulings: (a) keep the Probe Designer hard-edged and separable — it is the only generator of *created* evidence and must never dissolve into soft ritual; (b) replace the "firewall" with a **declaration protocol** to remove the surveillance substrate the red line forbids; (c) embed the Cynefin triage *inside* Compass intake rather than as a standalone router (a standalone classifier is a single point of cascade failure — misroute once and everything downstream runs on the wrong evidence regime). Surveillance of people is not the same as gating an AI agent's high-impact tool use: the red line forbids the first, while AI-risk control requires the second. A workplace-practice-coach concept was dropped as out of core for FactHarbor alpha, not invalidated as a future or adjacent product track.

Preserved constraints from the original proposal:

- **Agent action enforcement is still needed for mutating/external actions.** The lighter Agent Provenance Contract is right for agent outputs and human-facing review, but declaration alone may be too weak when an agent can spend money, publish, modify production state, change configuration, send messages, or create irreversible side effects. The next design pass must find a non-surveilling capability-side guard: risk/reversibility-aware, evidence-aware, and human-escalating for high-impact actions.
- **Outcome-learning closure is non-negotiable.** Every accepted action or probe should record the expected outcome, revisit trigger, observed result, and what changed in the evidence base. Without this loop, the product degrades into decision justification rather than evidence-based learning.
- **BestWorkplace remains a parked adjacent track.** The workplace-practice coach is out of core for the current FactHarbor alpha build, but the underlying need remains: help teams improve psychological safety, transparency, iteration, and decision quality through evidence and bounded experiments rather than slogans or surveillance.

### Plain-language version (the "explain it to anyone" cut)

The whole idea in three sentences:

> People — and AI agents — make most decisions on shaky ground. These tools (1) make the *evidence behind a decision* visible and honest before you act, and (2) when the evidence isn't there, help you run a *small, cheap, safe test* to get it instead of guessing or freezing.

Make-or-break principle: **they must feel like a teammate ("let's figure this out together"), not a watchdog ("prove you followed the process").** The watchdog version gets routed around — which is the human-psychology requirement failing in practice.

Worked examples used to explain it (rendered as in-session visuals, not embedded here):
- **Hiring:** "should we hire X?" → name the bet (a good interview ≈ weak proof) → create evidence with a small paid trial task → the AI shows why it ranked a CV and never rejects a person on its own (dignity).
- (Earlier, discarded as too generic: a live-chat-button decision.)

### First live application — "which path for Our AI Charter?"

Ran the founder's real decision through the three tools as the first test. The charter itself lives in `Docs/Initiatives/our-ai-charter/` and `github.com/robertschaub/our-ai-charter`; this is only the *tools applied* to the path decision, not charter strategy.

- **The three paths** (from the initiative's own records): **A** movement/manifesto (resonance + coalition); **B** the audit standard (grounding-faithfulness + contestability — the landscape finding that factual-*output* certification is unclaimed white space); **C** author + federate (write the standard as IP, hand execution to a host — RSF/JTI annex or AI Alliance Trust & Safety WG).
- **Tool 1 (classify):** a *complex* / "we don't know yet" decision, not a "think harder" one. The desk analysis is already done (multiple landscape investigations + GPT/Gemini red-teams); the missing input is real-world traction signal.
- **Tool 2 (create evidence):** don't commit — run one small time-boxed probe per path (~3 weeks, success signal set in advance) and let traction pick. Cheapest first = take the existing 1-page GFC protocol to **one real door** (AI Alliance WG / RSF–JTI), because it's cheapest to test and rests on the strongest existing evidence (open white space).
- **Tool 3 (honesty):** the two facts that should decide it — how the published manifesto was actually received, and whether any door has opened — are not in hand. Getting them *is* the test; do not guess them.
- **Recommendation:** don't pick from the chair; **probe B/C first**, read Path A's already-running signal (the published-manifesto response), let traction decide.

### Revised open items / next steps

1. **Close the two design gaps before any build:** KG1 (real demand for these tools vs lighter alternatives?) and KG4 (the shared human/agent evidence substrate is asserted, not designed). Both are themselves create-evidence (probe) questions.
2. **Validator caveats to resolve:** R3 "feels like a teammate" is asserted, not validated; guard the Probe Designer against atrophying into ceremony; find a non-surveilling way to verify agent provenance honesty.
3. **FactHarbor track:** hold to the defer-and-dogfood gate (quality tripwires calibrated to the census + ≤2-day no-UX internal probe) before committing build capacity.
4. **Charter track (if pursued):** draft the three path-probes with pre-set success signals + dates, or narrow now if the manifesto-response signal already exists.
5. **Agent enforcement boundary:** distinguish output provenance from mutating-action capability control. Do not ship an autonomous auth-gate that feels like surveillance, but also do not rely on pure declaration for high-impact agent tool use.
6. **Learning-loop acceptance criterion:** define the minimum ledger fields for prediction, follow-up, observed outcome, and evidence-base update before any dogfood probe counts as successful.
7. **Workplace/team track:** keep BestWorkplace as a parked future concept unless Captain explicitly pulls it into scope; if revived, design it as team learning support, not employee monitoring.

---

## Product Thesis

FactHarbor can expand from:

> Is this claim supported?

to:

> Is this decision or action justified by evidence, and if not, what evidence should we create next?

The core workflow:

```text
Proposed action
-> evidence check
-> risk / reversibility / confidence assessment
-> act, experiment, escalate, or stop
-> measure outcome
-> update decision memory
```

## Primary Users

| User | Need |
|---|---|
| Human decision-maker | Know whether an action is justified, risky, reversible, and evidence-backed. |
| Team lead / Product Manager | Convert uncertainty into small experiments instead of political debate or guesswork. |
| AI agent | Know when it may act, when it must gather evidence, and when it must ask a human. |
| Reviewer / auditor | Trace what evidence supported an action and whether the outcome matched the prediction. |
| Contributor / employee | Raise concerns without being dismissed as negative or emotional. |

## Component detail (feeds the 3 consolidated tools)

*The current top-level design is the three tools in the 2026-07-01 section above. The items below are the build-level detail each tool draws on — kept as raw material, not as the current design. (#2 is scoped down; a #10 workplace-practice-coach concept was dropped as out of core.)*

### 1. Evidence-to-Action Card

A compact object attached to every meaningful decision or action.

Minimum fields:

- Proposed action
- Decision owner
- Claim or assumption being relied on
- Evidence items and source links
- Confidence and uncertainty drivers
- Risk level and affected stakeholders
- Reversibility
- Expected outcome
- What would change our mind
- Follow-up date or measurement event

For AI agents, this becomes a machine-readable pre-action contract.

### 2. Agent Evidence Firewall

> **Superseded 2026-07-01:** the hard auth-gate / risk-tier framing below is **not** adopted — it read as surveillance. The forward design is the lighter **Agent Provenance Contract** (declaration protocol) in the current-design section above. Kept only as the origin of that idea.

A guard layer for agent actions.

Purpose:

- Permit low-risk actions with light evidence.
- Require evidence, rollback plan, and expected outcome for high-impact actions.
- Switch the agent into evidence-creation mode when evidence is missing.
- Block or escalate actions whose impact exceeds evidence quality.

Example policy shape:

| Action risk | Evidence requirement | Allowed outcome |
|---|---|---|
| Low, reversible | Basic rationale and local context | Act and log. |
| Medium | Evidence-to-Action Card + rollback | Act after review or bounded autonomy. |
| High | Strong evidence + human approval + monitoring | Escalate before acting. |
| Unknown evidence | Evidence gap record | Create evidence first. |

### 3. Evidence Gap & Experiment Designer

When evidence is missing, this tool designs the smallest responsible way to create it.

Outputs:

- Hypothesis
- Evidence gap
- Probe type: interview, benchmark, simulation, A/B test, PDSA cycle, prototype, red-team test, or operational dry run
- Metric
- Minimum useful sample
- Stop rule
- Harm guard
- Decision threshold

This is the product expression of “no evidence, then create evidence.”

### 4. Cynefin Sensemaking Room

A team and agent workspace that first classifies the situation before prescribing action.

| Domain | Product behavior |
|---|---|
| Clear | Apply known practice; verify the relevant facts. |
| Complicated | Gather expertise; compare options and trade-offs. |
| Complex | Run multiple safe-to-fail probes before committing. |
| Chaotic | Stabilize first; defer optimization and learning until the situation is safe enough. |
| Disorder | Split the problem until domains can be separated. |

This prevents teams and agents from using a “best practice” mode when the situation is actually complex.

### 5. Decision Memory & Learning Ledger

A durable log of decisions, evidence, predictions, actions, and outcomes.

Key value:

- Turns decisions into learnable assets.
- Lets teams compare predicted versus observed outcomes.
- Gives agents auditable memory without relying on hidden context.
- Helps identify where evidence rules are too strict, too loose, or missing.

### 6. Emotional & Stakeholder Signal Radar

Emotions should be treated as evidence about human impact, not as proof of factual truth.

Signals to capture:

- Fear or perceived threat
- Trust level
- Perceived fairness
- Shame or blame risk
- Psychological safety
- Motivation and resistance
- Stakeholder incentives

Product rule:

> Emotional evidence should shape action design and stakeholder protection, but it should not replace factual evidence for factual claims.

### 7. Claim / Assumption Radar

A scanner for strategy docs, meeting notes, PRs, product specs, and agent plans.

It extracts:

- Actionable claims
- Hidden assumptions
- Predictions
- Unsupported causal statements
- Risk claims
- Evidence gaps

Each item is routed to FactHarbor verification or to the Experiment Designer.

### 8. Evidence Provenance & Independence Graph

Extends source reliability from “where was it published?” to “who originated it, and how independent is the evidence?”

Relevant patterns:

- Single-source amplification
- Attribution washing
- Wire-service repetition
- Advocacy or vendor-originated claims repeated by neutral-looking outlets
- Agent overconfidence caused by non-independent sources

This aligns with the existing planned source provenance direction in FactHarbor.

### 9. Evidence-Backed Dissent Room

A structured review surface for disagreement.

Objections should be classified as:

- Evidence-backed counterevidence
- Risk concern
- Stakeholder concern
- Values conflict
- Unsupported doubt

Only evidence-backed counterevidence changes factual confidence. Risk, stakeholder, and values concerns still affect whether and how to act.

## Product Risks

| Risk | Mitigation |
|---|---|
| Evidence theatre: users attach weak evidence to justify pre-decided action. | Require counterevidence search, source independence checks, and “what would change our mind.” |
| Agent blockage: evidence requirements make agents too slow. | Tier requirements by risk and reversibility. |
| Emotional signals become manipulative or over-weighted. | Treat emotions as impact and adoption evidence, not as factual truth. |
| Complex situations are forced into simple scoring. | Use Cynefin routing and safe-to-fail probes. |
| Tool becomes bureaucracy. | Keep the card compact and auto-fill from existing reports where possible. |
| Privacy or workplace surveillance concerns. | Use aggregation, consent, minimization, and strict access controls before any team/emotion feature. |

## Open Questions

1. Should the first product be a standalone “Decision Ledger” app, or a layer inside the existing FactHarbor job/report UI?
2. Which actions should be guarded first: code changes, product decisions, public claims, team/workplace changes, or AI-agent tool calls?
3. What risk taxonomy should control evidence requirements?
4. How much autonomy should agents have to create evidence without human approval?
5. Which source of evidence should be accepted first beyond documents: interviews, telemetry, benchmarks, incident logs, surveys, or experiments?
6. Should Cynefin classification be LLM-assessed, human-selected, or hybrid?
7. How should psychological safety and emotional signals be captured without creating surveillance or performative compliance?

## Next steps

See **Revised open items / next steps** in the 2026-07-01 current-design section above. (The earlier "build MVP 1 = Card + Firewall now" packet was removed: the debate concluded defer-and-dogfood, and the Firewall was scoped down.)

## Related Local Docs

- `Docs/xwiki-pages/FactHarbor/Product Development/Requirements/User Needs/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Quality and Trust/WebHome.xwiki`
- `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md`
- `Docs/WIP/2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md`
- `Docs/AGENTS/Handoffs/2026-06-30_Product_Strategist_LLM_Expert_Evidence_Action_Tools_Proposal.md`
