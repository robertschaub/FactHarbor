# FactHarbor as Procedural Epistemology: An Evidence-Centered Architecture for Automated Public-Interest Fact-Checking

**Date:** 2026-05-20  
**Status:** Draft scientific paper  
**Scope:** Philosophical and system-design analysis of FactHarbor, based on repository documentation and selected epistemology / automated fact-checking literature.

## Abstract

This paper interprets FactHarbor as an epistemic system: a technical procedure designed to transform public claims into accountable degrees of warrant under uncertainty. Rather than treating fact-checking as a binary labeling task, FactHarbor operationalizes a procedural theory of justification: a claim is not merely declared true or false, but decomposed into AtomicClaims, researched against external sources, organized into evidence-emergent ClaimAssessmentBoundaries, adjudicated through structured LLM debate, and published with confidence, evidence provenance, and warning states. This architecture aligns with several traditions in epistemology. It treats knowledge as more than true belief, because verdicts must be justified by retrievable evidence. It has a reliabilist dimension, because trust attaches to the repeatable quality of the process. It has a Bayesian family resemblance, because it reports graded confidence rather than all-or-nothing certainty. It is also social epistemology in practice, because the system evaluates testimony, institutions, source portfolios, and the public information environment. The paper argues that FactHarbor's central scientific contribution is not machine certainty, but auditable epistemic mediation: a reproducible, inspectable process for converting contested testimony into fallible but accountable public warrant.

**Keywords:** epistemology, automated fact-checking, social epistemology, reliabilism, evidence provenance, LLM debate, public knowledge, FactHarbor.

## 1. Introduction

Public fact-checking is usually presented as a media practice: a claim is checked, a verdict is assigned, and readers are told whether the claim is true, false, misleading, or unsupported. That framing is incomplete for an AI-powered system such as FactHarbor. FactHarbor is better understood as an epistemic instrument: it defines how a claim becomes an object of inquiry, how evidence is gathered and filtered, how uncertainty is represented, and how the resulting warrant is communicated.

The philosophical stakes are immediate. In classical epistemology, knowledge cannot be reduced to mere belief, nor even to a correct conclusion reached accidentally. The Stanford Encyclopedia of Philosophy describes epistemology as concerned with varieties of cognitive success and with how truth, justification, understanding, evidence, testimony, and cognitive failure are related. FactHarbor's architecture maps directly onto these concerns: its pipeline is a procedural attempt to prevent accidental truth, unsupported assertion, hidden source dependence, and misleading confidence.

The practical stakes are equally immediate. Automated fact-checking research has shown that claim verification is not solved by answer generation alone. The FEVER dataset framed fact verification as a task requiring both verdict labels and supporting evidence; its authors found that evidence handling was a central difficulty, not a decorative add-on. Recent survey work on multilingual claim detection likewise treats automated fact-checking as a sequence of tasks: identifying claims that need verification and then verifying them against evidence. FactHarbor's current production runtime, the ClaimAssessmentBoundary pipeline, follows this staged view: claim extraction, evidence research, boundary clustering, verdict generation, and aggregation. Its V2 target architecture keeps the same epistemic sequence while separating trust policy, evidence lifecycle, report writing, and compatibility adapters more cleanly.

The thesis of this paper is simple: FactHarbor should be evaluated as a procedural epistemology for public claims. Its success condition is not that it becomes an oracle. Its success condition is that it reliably produces proportionate, evidence-grounded, transparent, and multilingual warrant, while exposing when that warrant is weak, contested, or unavailable.

## 2. Method and Sources

This paper uses a conceptual design-analysis method. It synthesizes:

1. FactHarbor repository documentation, especially the architecture overview, AKEL pipeline, quality and trust pages, quality gates reference, current status, backlog, and knowledge-base research notes.
2. Core epistemology references on knowledge, justification, social epistemology, reliabilism, Bayesian epistemology, and scientific objectivity.
3. Automated fact-checking literature and practice, especially FEVER, multilingual claim detection surveys, and Full Fact's public fact-checking methodology.

The paper does not report a new empirical benchmark. It is a theory-building and architecture-interpretation paper. Its empirical claims about FactHarbor are limited to documented repository status as of 2026-05-20: the V1 ClaimAssessmentBoundary pipeline is the current production runtime, while V2 is a gated target architecture and not yet public analytical behavior.

## 3. Philosophical Frame: From Truth Labels to Justified Warrant

### 3.1 Knowledge, justification, and anti-accidentality

A verdict is epistemically valuable only if its conclusion is connected to appropriate reasons. A system that often guesses correctly without evidence would be practically lucky but epistemically defective. This is the lesson behind post-Gettier epistemology: a true belief can still fail to be knowledge when the truth is accidental relative to the justification.

FactHarbor's design is anti-accidental. It does not treat an LLM's fluent answer as sufficient. The current AKEL pipeline begins by extracting AtomicClaims, filters non-verifiable or low-fidelity claims through Gate 1, researches external evidence, clusters EvidenceScopes into ClaimAssessmentBoundaries, generates verdicts through structured debate, and then aggregates those verdicts into a final result. The key point is not merely that there are many steps. The key point is that each step creates a relation between conclusion and warrant.

This makes FactHarbor closer to an epistemic procedure than to a classifier. A classifier maps input to label. An epistemic procedure must also preserve the path by which the label became justified.

### 3.2 Reliabilism and process trust

Reliabilist epistemology evaluates justification partly through the reliability of the process that produces belief. FactHarbor adopts a system-level analogue. The object of trust is not any single model output but a repeatable process: claim fidelity checks, evidence retrieval, evidence quality filtering, citation integrity, source reliability context, confidence calibration, and warning materiality.

This is visible in FactHarbor's quality and trust architecture. Gate 1 protects claim integrity before research begins. Gate 4 protects verdict integrity after evidence and debate. Source reliability is evaluated and cached, but current documentation is careful not to treat source reliability as an automatic truth formula. Confidence is calibrated through evidence density, band snapping, verdict-confidence coupling, and consistency checks. These are process-level controls intended to make the system more truth-conducive over repeated use.

Reliabilism also explains why FactHarbor's "system over data" principle matters. Manually correcting a single report may improve one artifact, but it does not improve the belief-forming process. FactHarbor's governing design norm is therefore epistemologically appropriate: fix the procedure, not the individual verdict.

### 3.3 Bayesian family resemblance: confidence as graded credence

Bayesian epistemology studies how degrees of belief should change in response to evidence. FactHarbor does not implement a pure Bayesian probability calculus, and its truth percentages should not be mistaken for formal posterior probabilities. Nevertheless, its design has a Bayesian family resemblance: it rejects all-or-nothing epistemic presentation and represents support as graded.

The current system reports verdict labels on a seven-point scale, truth percentages, confidence tiers, and warning states. This is important because public claims often sit between obvious truth and obvious falsehood. Evidence can be partial, stale, source-concentrated, or directionally mixed. A binary verdict would erase precisely the uncertainty that responsible epistemology should preserve.

The strongest design requirement follows from this: confidence must be about evidential warrant, not rhetorical confidence. LLMs can sound certain when evidence is weak. FactHarbor's confidence calibration and warning policy are therefore not cosmetic. They are mechanisms for preventing a high-fluency model from creating false epistemic authority.

### 3.4 Social epistemology and testimony

Social epistemology studies how knowledge is pursued through testimony, institutions, practices, norms, and communities. Automated fact-checking is inherently social epistemology. Most factual claims in public life are not verified through direct observation by the reader. They are mediated through journalists, official statistics, courts, scientific institutions, NGOs, political actors, archives, and previous fact-checkers.

FactHarbor's EvidenceItems are therefore not "facts" in the naive sense. Repository terminology explicitly forbids calling them facts in new code. They are evidence extracted from sources. This distinction is epistemologically mature: a source statement becomes probative only in relation to a claim, an EvidenceScope, a source type, and a broader evidential portfolio.

This also explains why source diversity and provenance matter. If ten articles reproduce the same press release, the public web may appear evidentially rich while being epistemically narrow. FactHarbor's planned source provenance work and V2 EvidenceCorpus direction respond to this problem: public knowledge depends not just on the number of testimonies, but on their independence, origin, and relation to the claim.

### 3.5 Objectivity without the "view from nowhere"

Philosophy of science distinguishes objectivity as faithfulness to facts from objectivity as value-freedom. FactHarbor should not pretend to eliminate all values. It makes values explicit in its operating rules: evidence transparency, input neutrality, multilingual robustness, warning materiality, and no domain-specific hardcoding. These are epistemic values.

The "view from nowhere" is especially dangerous in fact-checking. Treating all sides as equally supported when the evidence is asymmetric produces false balance. FactHarbor's local knowledge base already identifies this as epistemic harm: evidence-following systems can appear politically biased when the public evidence environment is itself asymmetric. The correct response is not to force symmetric verdicts. It is to measure symmetric treatment, improve evidence retrieval, expose evidence-pool asymmetry, and distinguish unsupported doubt from evidence-backed contestation.

## 4. FactHarbor's Epistemic Architecture

### 4.1 Claim formation: making the object of inquiry explicit

FactHarbor begins with claim understanding. User inputs are often messy: rhetorical questions, compound assertions, opinions, implied comparisons, or broad accusations. The system must transform this input into AtomicClaims without importing meaning that the user did not express.

This is why Gate 1 is epistemically foundational. If the claim is distorted at extraction time, every later evidence item can be "relevant" to the wrong object. The Stage 1 fidelity requirement therefore protects the relation between the user's analytical request and the system's object of inquiry.

The V2 target sharpens this by introducing a ClaimContract and treating claim integrity as a named gate. This is a cleaner expression of the same epistemic principle: before asking whether a claim is true, the system must know which claim it is checking.

### 4.2 Research: evidence before verdict

FactHarbor's core invariant is stage integrity: Understand -> Research -> Verdict. This matters because LLMs can generate plausible verdicts from prior knowledge, training-data residue, or rhetorical pattern matching. FactHarbor's pipeline instead requires source acquisition and evidence extraction before verdict adjudication.

The automated fact-checking literature supports this ordering. FEVER made evidence retrieval part of the verification task. Full Fact's public methodology likewise emphasizes understanding the claim, gathering a wide range of evidence, preferring primary sources where possible, and guiding readers through the evidence rather than merely telling them what to think.

FactHarbor's Stage 2 is thus the system's empirical engine. It generates queries, fetches and parses sources, classifies relevance, extracts EvidenceItems, assigns probative value, and iterates within budget. The main epistemic risk here is evidence-pool distortion: search results can be incomplete, popularity-biased, language-biased, source-concentrated, or skewed by the phrasing of the query. This is why the repository's research notes identify evidence retrieval as the primary quality bottleneck.

### 4.3 ClaimAssessmentBoundaries: evidence-emergent framing

FactHarbor's most distinctive epistemological concept is the ClaimAssessmentBoundary. A ClaimAssessmentBoundary is an evidence-emergent grouping of compatible EvidenceScopes after research. It is not a predeclared topic bucket or a synonym for context.

This is philosophically important. Many public disputes are not disagreements about a single proposition under a single interpretation. They are disagreements about temporal bounds, jurisdiction, methodology, comparison class, source type, or evidential standard. By grouping compatible EvidenceScopes into ClaimAssessmentBoundaries, FactHarbor tries to prevent evidence from one frame from inappropriately deciding another.

This is an applied answer to underdetermination and equivocation. A claim can look true under one boundary and false under another because the relevant evidence differs. The correct epistemic response is not to collapse those differences prematurely, but to expose the boundaries under which warrant changes.

### 4.4 Debate and contestation: from objection to evidence-backed challenge

FactHarbor's verdict stage uses a structured advocate, challenger, and reconciliation pattern. In epistemic terms, the challenger is not a ritual adversary. It is a mechanism for searching for defeaters: reasons why the initial warrant may fail, require qualification, or overstate the evidence.

The repository's evidence-weighted contestation rule is central here. Unsubstantiated objections, political criticism, or denial without counter-evidence are classified as doubted rather than contested. They should not reduce truth percentage or confidence in the same way as evidence-backed counterarguments. This rule is a strong epistemological position: disagreement is not automatically evidence.

That distinction is especially valuable in public discourse, where the existence of controversy is often treated as evidence of uncertainty. FactHarbor's design rejects that shortcut. It asks whether contestation has probative support.

### 4.5 Aggregation and public report: warrant becomes communicable

The final report is not a passive rendering layer. It is the point where internal warrant becomes public knowledge infrastructure. The report must communicate verdict, confidence, evidence, warnings, and residual uncertainty without overstating what the pipeline knows.

V2 correctly treats report generation as a quality-bearing surface. The canonical ReportResult owns verdict meaning, warning materiality, evidence references, and report-quality status. Adapters and exports should not reinterpret verdicts. This is epistemologically sound because many failures of public knowledge occur at the communication layer: nuance disappears, confidence is inflated, caveats are hidden, or source limitations are buried.

## 5. FactHarbor's Core Epistemic Contributions

### 5.1 Auditable warrant instead of oracle authority

FactHarbor's first contribution is replacing oracle-like answer generation with auditable warrant production. The system's output is not merely "believe this." It is "here is the claim as understood, the evidence found, the boundaries under which evidence was grouped, the verdict generated, the confidence assigned, and the warnings that affect trust."

This is a more defensible epistemic posture for AI. It does not require users to trust the model as an authority. It lets users inspect the warrant.

### 5.2 Procedural neutrality instead of outcome neutrality

FactHarbor's input-neutrality rule says that "Was X fair?" and "X was fair" should receive materially equivalent analysis. This is procedural neutrality: equivalent meaning should receive equivalent treatment.

Procedural neutrality differs from outcome neutrality. If evidence is asymmetric, equivalent treatment may produce asymmetric verdicts. The local epistemic-asymmetry research correctly treats this as a design challenge, not a reason to force false balance. The system should avoid bias in extraction, research, model refusal, and warning handling, but it should not equalize evidence where the world does not.

### 5.3 Multilingual robustness as epistemic justice

FactHarbor's multilingual mandate is not a secondary localization feature. It is an epistemic justice requirement. If the system works reliably only for English, it privileges one information environment and one set of source distributions. For a Swiss-rooted project, German, French, Italian, Portuguese, and other languages are not edge cases; they are part of the public knowledge domain.

This is also why the no-hardcoded-keywords rule matters. Language-dependent heuristics can silently encode cultural and linguistic assumptions. FactHarbor's policy that semantic decisions must be LLM-powered and not regex- or keyword-driven is an architectural attempt to avoid English-only epistemic bias.

### 5.4 Warning materiality as epistemic honesty

FactHarbor's warning policy asks whether the verdict would be materially different if an event had not occurred. This is a disciplined way to prevent both alarm fatigue and hidden degradation. Routine recovered operations should not be shown as user-facing warnings. But evidence scarcity, source acquisition collapse, budget exhaustion, or verdict-generation failure must be visible when they affect trust.

This is not merely UX policy. It is epistemic honesty. A user cannot responsibly update beliefs if the system hides the reasons its own warrant is weak.

## 6. Operational Research Propositions

The epistemological interpretation above becomes scientifically useful only if it yields falsifiable expectations. FactHarbor should therefore treat the following as candidate research propositions rather than settled claims.

| ID | Proposition | Possible measure |
|---|---|---|
| P1 | AtomicClaim extraction improves auditability over whole-input verdicting. | Human reviewer agreement on what was checked; claim-level citation validity. |
| P2 | ClaimAssessmentBoundaries reduce false binary verdicts on claims whose truth depends on method, geography, time, jurisdiction, or definition. | Boundary-aware vs single-frame ablation; expert review of boundary coherence. |
| P3 | EvidenceScope metadata reduces incompatible evidence aggregation. | Rate of apples-to-oranges aggregation before and after EvidenceScope-aware clustering. |
| P4 | Evidence-backed contestation improves disagreement handling compared with treating all objections equally. | Accuracy and confidence calibration on claims with unsupported criticism vs documented counter-evidence. |
| P5 | Source reliability improves confidence calibration without suppressing valid minority evidence. | Calibration curves, Brier-style error, source-type ablations, and expert audit of downgraded evidence. |
| P6 | Multi-provider structured debate improves robustness over single-model verdicting when the evidence pool is held constant. | Direction-error rate, citation grounding, verdict stability, and challenge-response quality. |
| P7 | Multi-source retrieval reduces evidence-pool asymmetry compared with general web search alone. | Mirror-claim skew, support/contradict balance, source diversity, and independent-origin counts. |
| P8 | Warning materiality improves user trust calibration compared with undifferentiated warning display. | User study on warning comprehension, over-trust, under-trust, and actionability. |
| P9 | Multilingual semantic analysis reduces English-centric bias compared with deterministic language-specific heuristics. | Cross-language truth and confidence deltas on Captain-approved inputs and benchmark variants. |

These propositions also define a publication path. A strong paper on FactHarbor should not merely describe the pipeline; it should run ablations that show which epistemic mechanisms actually improve warrant quality.

## 7. Limitations and Open Epistemic Risks

### 7.1 The evidence environment is not the world

FactHarbor researches accessible sources. Accessible sources are not identical with reality. They are shaped by language, indexing, copyright, search ranking, publication incentives, institutional power, and historical archiving. A claim may be true but poorly documented; false but widely repeated; or supported by high-quality evidence locked behind paywalls.

The system must therefore continue treating insufficient evidence as an epistemic state, not as falsehood.

### 7.2 Source reliability is not truth

A reliable source can publish a weak claim; an unreliable source can quote a true document; an official source can be self-interested; a peer-reviewed paper can be outdated or retracted. Source reliability is a signal about testimonial conditions, not a truth engine.

FactHarbor's V2 posture is therefore appropriate: source reliability should be observable and traceable, but direct verdict weighting requires careful policy review and comparator validation.

### 7.3 LLM debate can amplify shared blind spots

Multi-agent debate helps only if the agents bring genuinely useful diversity in evidence, reasoning path, model behavior, or challenge strategy. If all agents share the same evidence pool and similar priors, debate can produce consensus around the same mistake. Repository research notes already point toward stronger challenger models, path-based consistency, tool-diverse advocates, and debate-informed re-search as future directions.

The epistemic requirement is diversity of relevant reasons, not merely multiplicity of voices.

### 7.4 V2 is a target, not current public behavior

The V2 architecture is epistemologically cleaner than V1 in its separation of ownership: ClaimContract, EvidenceCorpus, SufficiencyAssessment, BoundarySet, VerdictSet, ReportResult, and CompatibilityView. However, repository status is clear that V2 remains gated and pre-cutover. Scientific presentation must not conflate the target architecture with current runtime capability.

## 8. Research Agenda

FactHarbor's epistemic claims can be made scientifically stronger through explicit evaluation:

1. **Claim fidelity tests:** measure whether extracted AtomicClaims preserve input meaning across languages and phrasings.
2. **Evidence sufficiency tests:** evaluate whether low-evidence cases become caveated, refined, or blocked instead of overconfident.
3. **Citation integrity tests:** verify that verdict claims are supported by cited EvidenceItems and that citations match direction.
4. **Evidence-pool asymmetry tests:** separate model bias from search-result asymmetry using mirrored claim pairs.
5. **Multilingual neutrality tests:** compare equivalent approved inputs across German, French, English, Portuguese, and other languages without forcing translation.
6. **Source portfolio tests:** measure source concentration, provenance independence, primary-source coverage, and repeated-origin amplification.
7. **Report comprehension tests:** determine whether users correctly understand confidence, warnings, mixed evidence, and insufficient evidence states.

These tests would let FactHarbor publish not only a system description but an epistemic performance profile.

## 9. Conclusion

FactHarbor is best understood as a procedural epistemology for public claims. Its architecture encodes a theory of responsible belief formation: understand the claim before judging it, gather evidence before verdict, distinguish evidence from fact, group evidence by compatible EvidenceScopes, challenge verdicts with evidence-backed objections, calibrate confidence, and expose limitations when warrant is weak.

This makes FactHarbor philosophically more interesting than a fact-checking app. It is a practical experiment in how AI systems can mediate public knowledge without pretending to be omniscient. Its promise lies in a disciplined middle position: neither human-only editorial judgment at limited scale, nor ungrounded automated certainty, but transparent, evidence-centered, procedurally constrained, and continuously evaluated warrant production.

The central epistemic standard for FactHarbor should therefore be: not "Did the machine say the right label?", but "Did the system produce a proportionate, traceable, and defeasible warrant that a rational public could inspect, contest, and improve?"

## References

### FactHarbor repository documentation

- [FactHarbor Architecture](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/WebHome.xwiki)
- [AKEL Pipeline](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/AKEL%20Pipeline/WebHome.xwiki)
- [Quality and Trust](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/Quality%20and%20Trust/WebHome.xwiki)
- [Quality Gates Reference](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/Deep%20Dive/Quality%20Gates/WebHome.xwiki)
- [AKEL Pipeline V2](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/AKEL%20Pipeline%20V2/WebHome.xwiki)
- [Quality and Trust V2](../xwiki-pages/FactHarbor/Product%20Development/Specification/Architecture/Quality%20and%20Trust%20V2/WebHome.xwiki)
- [Requirements](../xwiki-pages/FactHarbor/Product%20Development/Requirements/WebHome.xwiki)
- [Current Status](../STATUS/Current_Status.md)
- [Backlog](../STATUS/Backlog.md)
- [Epistemic Asymmetry](../Knowledge/Truth_Seeking.md)
- [FactHarbor Knowledge Executive Summary](../Knowledge/EXECUTIVE_SUMMARY.md)
- [Full Fact AI Lessons for FactHarbor](../Knowledge/FullFact_AI_Lessons_for_FactHarbor.md)
- [CheckThat! Lab Lessons for FactHarbor](../Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md)
- [Research Ecosystem and FactHarbor Opportunities](../Knowledge/Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md)

### External philosophy and fact-checking sources

- Ichikawa, J. J., and Steup, M. "Epistemology." *Stanford Encyclopedia of Philosophy*. Substantive revision 2024. https://plato.stanford.edu/entries/epistemology/
- Goldman, A., and Beddor, B. "Reliabilist Epistemology." *Stanford Encyclopedia of Philosophy*. Spring 2022 archive. https://plato.stanford.edu/archives/spr2022/entries/reliabilism/
- Hedden, B., and Mormann, T. "Bayesian Epistemology." *Stanford Encyclopedia of Philosophy*. https://plato.stanford.edu/entries/epistemology-bayesian/
- Goldman, A., and O'Connor, C. "Social Epistemology." *Stanford Encyclopedia of Philosophy*. https://plato.stanford.edu/entries/epistemology-social/
- Reiss, J., and Sprenger, J. "Scientific Objectivity." *Stanford Encyclopedia of Philosophy*. Spring 2019 archive. https://plato.stanford.edu/archives/spr2019/entries/scientific-objectivity/
- Thorne, J., Vlachos, A., Christodoulopoulos, C., and Mittal, A. "FEVER: a large-scale dataset for Fact Extraction and VERification." arXiv:1803.05355, 2018. https://arxiv.org/abs/1803.05355
- Panchendrarajan, R., and Zubiaga, A. "Claim detection for automated fact-checking: A survey on monolingual, multilingual and cross-lingual research." *Natural Language Processing Journal*, 7, 2024. https://doi.org/10.1016/j.nlp.2024.100066
- Full Fact. "How we fact check." https://fullfact.org/about/how-we-fact-check/
