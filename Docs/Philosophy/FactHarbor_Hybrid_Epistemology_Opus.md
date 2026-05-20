# Automated Epistemic Architecture: How FactHarbor Operationalizes Philosophical Theories of Knowledge

**Working Paper — May 2026**

---

**Abstract.** Contemporary fact-checking systems overwhelmingly reduce truth to a binary verdict, collapsing the epistemological richness that distinguishes genuine knowledge from lucky guess, balanced disagreement from ignorance, and direct evidence from derivative testimony. This paper analyzes FactHarbor, an AI-powered evidence analysis platform, as a case study in *applied computational epistemology* — the translation of philosophical theories of knowledge into working software architecture. We argue that FactHarbor instantiates a hybrid epistemology combining constrained coherentism, Popperian adversarial validation, and Goldmanian process reliabilism, whose distinctive contribution is the structural separation of *underdetermination* (evidence genuinely balanced) from *epistemic poverty* (evidence insufficient to judge). We trace this architecture through five epistemological lenses — fallibilism, coherentism, reliabilism, argumentation theory, and epistemic contextualism — and examine its tensions with epistemic justice and the philosophy of AI agency. The paper concludes that FactHarbor's design represents a philosophically coherent, if necessarily incomplete, attempt to encode what philosophy has long argued: that knowing responsibly requires knowing the limits of one's knowledge.

**Keywords:** computational epistemology, automated fact-checking, evidence theory, epistemic architecture, coherentism, reliabilism, fallibilism, post-truth

---

## 1. Introduction: The Epistemic Crisis and Its Computational Response

The contemporary information environment presents a distinctly epistemological problem. Not a shortage of information — the opposite. The proliferation of claims, counter-claims, and meta-claims about claims creates what Floridi (2011) calls an *infosphere* in which the challenge is not access to propositions but justified discrimination among them. The "post-truth" condition described by McIntyre (2018) is not, at its core, a failure of truth itself but a failure of the social and institutional processes through which individuals connect evidence to belief.

Fact-checking organizations have emerged as one institutional response. Yet the dominant paradigm — a human analyst rendering a binary or coarsely categorical verdict (True, Mostly True, Pants on Fire) — suffers from two epistemological deficiencies. First, it compresses the evidentiary landscape into a single judgment, making the reasoning opaque. Second, it conflates fundamentally different epistemic states: a claim rated "Half True" might reflect genuine evidential balance (strong evidence on both sides) or evidential poverty (almost no evidence at all). These are epistemologically distinct conditions that demand different responses from a rational agent, yet the standard fact-checking format renders them indistinguishable.

FactHarbor, an AI-powered evidence analysis platform, attempts to address these deficiencies through what we term *epistemic architecture* — the deliberate encoding of philosophical commitments about knowledge, evidence, and justification into software structure. This paper examines that architecture not as a technical system to be evaluated on accuracy metrics, but as a philosophical artifact: an instantiation of epistemological theory that can be analyzed for its coherence, commitments, and limitations.

Our central thesis is that FactHarbor implements a *hybrid epistemology* whose components — constrained coherentism in evidence grouping, Popperian adversarial testing in verdict generation, and Goldmanian reliabilism in source evaluation — converge on a distinctive structural contribution: the separation of *underdetermination* from *epistemic poverty* at the architectural level. This separation, we argue, operationalizes a distinction that philosophy has long recognized but that automated systems have largely ignored.

---

## 2. The Anatomy of an Epistemic System

Before analyzing FactHarbor's philosophical commitments, we must understand its structure. The system implements a five-stage pipeline that transforms a natural-language claim into a structured evidence landscape:

**Stage 1 — Claim Extraction.** User input is decomposed into *atomic claims*: single, verifiable assertions extracted with their original language preserved. Each atomic claim receives metadata including *verifiability* (high/medium/low/none), *freshness requirement* (temporal sensitivity), and an *expected evidence profile* (what types of sources should exist if the claim is true). This stage embodies a commitment we examine further in Section 3: the claim itself is not assumed true or false but is treated as a proposition whose truth conditions must be discovered through evidence.

**Stage 2 — Evidence Gathering.** For each atomic claim, the system generates research queries, retrieves web sources, classifies their relevance, and extracts structured evidence items. Critically, each evidence item carries an *EvidenceScope* — mandatory metadata recording the methodology by which the evidence was produced, its temporal boundaries, geographic limitations, and analytical dimensions. Evidence is not treated as context-free; it is situated within the conditions of its production.

**Stage 3 — Boundary Clustering.** Extracted evidence scopes are clustered into *Claim Assessment Boundaries* (CABs) — groupings of methodologically compatible evidence. A claim about emissions, for instance, might generate one boundary for well-to-wheel lifecycle analyses and another for tank-to-wheel operational measurements. The same claim can receive different verdicts under different boundaries, and boundaries emerge from the evidence itself rather than being imposed a priori.

**Stage 4 — Adversarial Verdict.** Within each boundary, verdicts are generated through a five-step debate: an advocate proposes an initial assessment, self-consistency probes test stability, an adversarial challenger argues against the emerging verdict, a reconciler integrates challenges, and validators check that citations are grounded in actual evidence. The output is a truth percentage (0–100%) and a confidence level, mapped to a seven-point scale.

**Stage 5 — Aggregation.** Per-boundary verdicts are aggregated into an overall assessment, weighted by claim centrality, evidence probative value, and harm potential. The output preserves the full reasoning trace: every debate step, every evidence item, every scope caveat.

This pipeline is not epistemologically neutral. Every architectural choice — the insistence on evidence scopes, the adversarial debate structure, the separation of truth percentage from confidence — encodes a philosophical position. The following sections trace these positions to their philosophical roots.

---

## 3. Fallibilism as Architecture: Popper in the Pipeline

Karl Popper's *The Logic of Scientific Discovery* (1959) argued that scientific theories are never verified — only not yet falsified. Knowledge advances not through accumulation of confirming instances but through the systematic attempt to refute conjecture. The asymmetry between verification and falsification is, for Popper, the demarcation criterion of science itself.

FactHarbor's verdict generation pipeline is a structural instantiation of Popperian conjecture and refutation. The advocate role in Stage 4 proposes a conjecture: an initial truth assessment based on the available evidence. The adversarial challenger then attempts to refute this conjecture, identifying evidence gaps, alternative interpretations, and counter-evidence. The reconciler does not simply average these positions but produces a revised assessment that has survived attempted falsification.

This is not merely analogical. The system's challenge documents record specific *challenge points* — concrete objections with cited evidence — and track whether each challenge was *accepted* (the verdict was adjusted) or *rejected* (the verdict was maintained with justification). A rejected challenge strengthens the verdict's epistemic status precisely because it represents a survived falsification attempt, in the Popperian sense.

The system's graduated truth scale further encodes fallibilism. By offering seven verdicts (TRUE, MOSTLY-TRUE, LEANING-TRUE, MIXED, UNVERIFIED, LEANING-FALSE, FALSE) rather than a binary, the system expresses the fallibilist insight articulated by Peirce (1877): that certainty admits of degrees, and that responsible assertion requires qualifying one's confidence. A verdict of LEANING-TRUE (58–71% truth) is not a failed attempt at TRUE — it is an epistemically honest expression of the evidence's weight.

Yet FactHarbor's fallibilism is bounded in a way Popper's is not. Popperian science is temporally open: theories remain perpetually vulnerable to future falsification. FactHarbor produces *epistemic snapshots* — assessments that capture the evidential landscape at a moment in time but do not natively track how that landscape evolves. A truly Popperian system would maintain persistent conjectures that are continuously tested against incoming evidence. The absence of this temporal dimension is an architectural limitation that constrains the system's fallibilist commitments to the synchronic: the adversarial debate tests a verdict *within* a single analysis, not *across* time.

---

## 4. Constrained Coherentism: Evidence Boundaries as Epistemic Webs

The coherentism–foundationalism debate concerns the *structure* of justification. Foundationalism holds that knowledge rests on basic, self-justifying beliefs. Coherentism (Quine 1951, BonJour 1985) holds that beliefs are justified by their mutual coherence within a web — no belief is epistemically privileged, and justification is holistic.

FactHarbor leans toward coherentism, but with constraints. Within each Claim Assessment Boundary, evidence items are evaluated for their mutual coherence. Each boundary carries an explicit *internal coherence* score (0–1), measuring how well the constituent evidence scopes agree. Verdicts emerge from the pattern of agreement and disagreement within this web, not from any single foundational source.

The coherentist architecture is most visible in the boundary-clustering mechanism. Boundaries are not predefined categories imposed by the system designer; they *emerge* from the evidence itself. When the system encounters evidence produced by different methodologies, it clusters compatible scopes together, allowing the evidence to self-organize into coherent analytical lenses. This evidence-emergent clustering is a direct implementation of what BonJour called the *observation requirement* for coherentism: the web of belief must be responsive to observational input, not merely internally consistent.

Yet FactHarbor is not a pure coherentist system. It retains foundationalist elements that create an explicit evidential hierarchy. Evidence items carry a *probative value* (high, medium, low) and a *source authority* classification (primary, secondary, opinion). Peer-reviewed studies carry more weight than anecdotal reports. Institutional sources (governmental, academic, peer-reviewed) are partitioned from general sources in the debate architecture, with the advocate role receiving institutional evidence and the challenger receiving general evidence.

This is what we term *constrained coherentism*: coherence determines the verdict within a boundary, but the boundary's epistemic strength depends on the quality of its foundations. The tension is philosophically real — the system simultaneously claims that truth emerges from evidential coherence and that some evidence types are intrinsically more authoritative — but it is also pragmatically productive. Pure coherentism risks the *isolation objection* (a perfectly coherent fiction is maximally justified), while pure foundationalism risks the *regress problem* (what justifies the foundations?). FactHarbor's hybrid avoids both by grounding coherence in externally anchored evidence quality while allowing the pattern of that evidence to determine the verdict.

---

## 5. Reliabilism: Trust Through Process

Alvin Goldman's reliabilism (1979, 1986) shifts the locus of justification from the internal reasoning of the knower to the *reliability of the process* that produced the belief. A belief is justified if it was produced by a cognitive process with a good track record of producing true beliefs.

FactHarbor implements reliabilism at two levels. At the *source level*, the system evaluates the historical reliability of evidence sources. Domain-level reliability scores are computed via LLM-based assessment and cached, implementing what Goldman calls *track-record* reliability. A source that has historically published well-sourced, accurate reporting receives higher reliability than one with a record of inaccuracy. These scores feed into evidence weighting: more reliable sources contribute more to the verdict.

The mathematical formulation of this reliabilist commitment is revealing. The source reliability adjustment operates as:

`adjustedTruth = 50 + (originalTruth - 50) × avgSourceScore`

This formula creates what we might call an *epistemological gravity well*. The neutral state of absolute uncertainty is 50. When source reliability is high (e.g., 0.95), the original truth assessment is nearly preserved. When sources are unreliable (e.g., 0.15), the adjustment pulls the verdict sharply toward epistemic neutrality. The formula institutionalizes a Bayesian-like principle: the value of an observation is inextricably linked to the credibility of the observer.

At the *process level*, the self-consistency check in Stage 4 directly measures the reliability of the verdict-generating process itself. By running the verdict generation multiple times with independent model calls and comparing results, the system tests whether its own cognitive process produces stable outputs. Verdicts that fluctuate across runs — indicating an unreliable process — are flagged and receive confidence penalties. This is a direct operationalization of Goldman's insight: the justified status of the output depends on the reliability of the process that produced it.

The system also implements what we might call *meta-reliabilism*: mechanisms that ensure the reliability-assessment process is itself reliable. The verdict debate uses models of different capability tiers (verified by a diversity check function), preventing the process from being unreliable due to homogeneous reasoning. Source reliability scores require high-confidence LLM assessments (threshold: 0.8); low-confidence assessments are discarded rather than used, avoiding the introduction of unreliable reliability judgments.

Goldman's *generality problem* — at what level of description should we assess process reliability? — applies here. The system's overall reliability depends on numerous sub-processes: search engine quality, web scraping fidelity, LLM evidence extraction accuracy, LLM verdict reasoning, and aggregation arithmetic. Reliability at one level does not guarantee reliability at another. A perfectly reliable aggregation algorithm operating on evidence extracted by an unreliable LLM produces unjustified results. FactHarbor partially addresses this through its multi-stage validation gates, but the generality problem remains an irreducible challenge for any complex epistemic system.

---

## 6. The Core Contribution: Separating Underdetermination from Epistemic Poverty

We arrive at what we consider FactHarbor's most philosophically significant architectural choice: the structural separation of *underdetermination* from *epistemic poverty* through the MIXED/UNVERIFIED distinction.

Both MIXED and UNVERIFIED verdicts occupy the same truth-percentage band (43–57%), indicating that the evidence does not clearly favor either truth or falsity. But they differ on a dimension that most fact-checking systems ignore: *confidence*. MIXED requires confidence at or above 45% — indicating that the system has gathered substantial evidence and that the evidence genuinely points in both directions. UNVERIFIED requires confidence below 45% — indicating that the system lacks sufficient evidence to render any judgment.

This distinction operationalizes a deep philosophical difference. The Pyrrhonian skeptics distinguished between *epoche* (suspension of judgment due to equipoise — equally strong arguments on both sides) and suspension due to ignorance (lack of arguments on any side). These are fundamentally different epistemic states. In epoche, the inquirer has *done the work* and found the question genuinely underdetermined. In ignorance, the inquirer has not yet acquired the evidence needed to judge. The rational response to each differs: epoche warrants the conclusion that reasonable people can disagree; ignorance warrants further inquiry.

Most automated fact-checking systems — and indeed most human fact-checking organizations — collapse these states. A claim rated "Unproven" or "Half True" might reflect either condition; the consumer cannot tell whether the fact-checker found strong evidence on both sides or found almost no evidence at all. This collapse is epistemologically irresponsible because it treats a maximally informed judgment (the evidence is balanced) identically to a minimally informed one (there is no evidence).

FactHarbor's architecture prevents this collapse structurally. The confidence calculation draws on three independent signals: *evidence density* (how many sources were found and their probative quality), *verdict stability* (how consistent the assessment is across multiple reasoning runs), and *evidential agreement* (the degree of consensus among sources). A claim with three high-quality sources producing contradictory findings will register as MIXED: the truth percentage will be near 50%, but confidence will be high because the evidence base is substantial. A claim with zero or one source will register as UNVERIFIED: the truth percentage may also be near 50%, but confidence will be low because there is no evidential basis for judgment.

This structural separation is, to our knowledge, absent from existing automated fact-checking frameworks — including PolitiFact's six-point scale, Snopes's categorical verdicts, and the ClaimReview schema's binary reviewRating — and represents a genuine contribution to applied epistemology.

---

## 7. Argumentation Theory: Toulmin in Code

Stephen Toulmin's *The Uses of Argument* (1958) proposed a model of practical reasoning that departed from formal logic's emphasis on deductive validity. Toulmin identified six components of real-world arguments: *claim* (what is asserted), *data* (the evidence supporting it), *warrant* (the inference principle connecting data to claim), *backing* (support for the warrant), *qualifier* (the degree of certainty), and *rebuttal* (conditions under which the claim fails).

FactHarbor's pipeline maps to the Toulmin model with remarkable fidelity. The *AtomicClaim* type provides the claim. *EvidenceItem*, with its statement, source authority, and evidence basis fields, provides the data and implicit warrants — the source's authority and methodology serve as warrants for why the evidence should be believed. The *probativeValue* classification and the graduated truth scale function as qualifiers, expressing the force of the argument rather than asserting deductive certainty. The adversarial challenge step (Stage 4, Step 3) operationalizes the rebuttal component: the challenger identifies conditions under which the verdict fails. Source reliability scores and quality gate thresholds serve as backing for the warrants.

The Toulmin mapping reveals both the system's strengths and a structural tension. Toulmin designed his model for individual arguments — a single chain from data through warrant to qualified claim. FactHarbor operates on *aggregations* of many such arguments. The verdict for a single atomic claim may rest on dozens of evidence items, each carrying its own warrant and qualifier. The aggregation step in Stage 5, which collapses per-boundary verdicts into a weighted overall assessment, necessarily compresses the Toulminian structure: the dialectical richness of individual argument chains is reduced to a single truth percentage.

This compression is pragmatically necessary — a consumer cannot process dozens of independent argument chains — but epistemologically costly. The full debate trace (preserved in the system's output) retains the Toulminian structure for those who wish to inspect it, creating a two-tier epistemic product: a compressed verdict for practical consumption and a full argumentative structure for epistemic audit. This two-tier design is itself philosophically interesting, as it separates the *assertoric* function of the verdict (what to believe) from the *justificatory* function of the trace (why to believe it).

---

## 8. Epistemic Contextualism: Boundaries as Contexts of Assessment

Epistemic contextualism, as developed by DeRose (1992) and Lewis (1996), holds that the truth conditions of knowledge attributions vary with context. What counts as "knowing that p" depends on the epistemic standards operative in the context of attribution. In a low-stakes conversation, I might know that the bank is open on Saturday; in a high-stakes scenario where my mortgage payment depends on it, the same evidence might fail to constitute knowledge because the standards are higher.

FactHarbor's Claim Assessment Boundary architecture implements a form of *methodological contextualism*. The same claim can receive different verdicts under different analytical boundaries, and these differences are not errors to be resolved but legitimate reflections of how truth depends on the frame of assessment. A claim about a technology's environmental impact might be MOSTLY-TRUE under a full lifecycle analysis and LEANING-FALSE under a use-phase-only analysis. Neither verdict is wrong; they answer different questions with different methodological standards.

The system's *boundary disagreement* tracking — which explicitly records where verdicts diverge across boundaries and surfaces these divergences in the output narrative — is a computational implementation of the contextualist insight that apparent contradictions in truth assessment often dissolve when the context of assessment is made explicit. Two analysts who disagree about whether a claim is true may, on contextualist analysis, not be disagreeing at all: they are applying different standards to different evidential contexts.

Yet the system must ultimately produce a single aggregated verdict, which requires collapsing contextual variation into a weighted average. This aggregation step runs against the contextualist insight that different contexts may be *incommensurable* — that there may be no principled way to average a well-to-wheel verdict with a tank-to-wheel verdict. FactHarbor handles this by weighting boundaries by evidence density and internal coherence, but the philosophical tension remains: any single number necessarily fails to capture the full contextual landscape that the boundary architecture was designed to preserve.

---

## 9. Epistemological Weaknesses and Architectural Blind Spots

No analysis of an automated epistemic system is complete without examining its structural vulnerabilities. FactHarbor's limitations emerge where formal computational models meet the ambiguity of human language, the boundaries of automated empiricism, and the risks of epistemic injustice.

### 9.1 The Illusion of Source Independence

FactHarbor's triangulation scoring rewards evidence drawn from multiple independent sources. Yet the system struggles epistemologically when apparent independence masks an underlying dependency. Multiple highly-rated evidence items may trace to a single primary study or a shared institutional ecosystem — overlapping lifecycle analyses citing the same dataset, or news outlets all reporting a single wire-service story. This creates a false epistemic consensus. The mathematical triangulation inflates confidence based on volume, mistaking repetitive reporting for independent verification. Epistemologically, this represents a failure to distinguish between *dependent* and *independent* epistemic warrant — a distinction that Bayesian epistemology treats as fundamental to rational belief updating.

### 9.2 The Proxy Assumption Gap

The pipeline excels at processing explicit, literal claims but exhibits structural weakness when evaluating claims requiring causal inference or proxy validation. When a claim asserts a causal relationship and the retrieved evidence provides only correlational data, the system lacks an architectural mechanism to flag this mismatch. The evidence items carry scope metadata (methodology, temporal bounds) but not an explicit *inferential mode* (correlation vs. causation vs. analogy). This blind spot means the system may treat proxy evidence as direct evidence, violating what philosophers of science call the *underdetermination of theory by data* — the recognition that correlational data cannot, by itself, justify causal claims.

### 9.3 Epistemic Justice and Automated Credibility

Miranda Fricker (2007) identified *testimonial injustice* — the systematic deflation of certain speakers' credibility due to prejudice — as a fundamental epistemic wrong. FactHarbor's source reliability system automates credibility assessment, and automation introduces specific injustice risks. If the LLM-based domain scoring systematically underrates sources from certain regions, languages, or institutional backgrounds, this constitutes *automated testimonial injustice*: the computational analogue of prejudicially deflating a speaker's credibility.

The system's evidence taxonomy privileges institutionally legible forms of knowledge: peer-reviewed studies, government reports, expert statements. Lived experience, community testimony, and culturally specific knowledge forms have no dedicated category. The multilingual design requirements and the prohibition on domain-specific hardcoding partially mitigate these risks, but the underlying LLM's training data, the web's representational biases, and the system's reliance on indexed, publicly accessible sources create epistemic blind spots that no architectural choice can fully eliminate.

This limitation reveals the *boundary conditions* of computational epistemology. An automated system can encode epistemic virtues — humility, transparency, fallibilism — but it cannot escape the epistemic limitations of its information environment. FactHarbor's honest treatment of these limitations — the mandatory *limitations* field in every verdict narrative, the UNVERIFIED category for insufficient evidence, the scope caveats on every evidence item — is itself an epistemic virtue. The system does not pretend to omniscience; it structures its output to make its ignorance visible.

### 9.4 Temporal Fragility

Every analysis is a snapshot. The system cannot track how verdicts should evolve as new evidence emerges, studies are retracted, or scientific consensus shifts. A verdict rendered TRUE today may become LEANING-FALSE tomorrow without the system recognizing the drift. This temporal fragility is not merely a feature gap but an epistemological limitation: it confines the system's fallibilism to the synchronic, preventing the diachronic revision that characterizes genuine scientific inquiry.

---

## 10. The Recursive Question: Can an AI System Have Epistemic Agency?

This paper has analyzed FactHarbor's architecture using the vocabulary of epistemology: justification, evidence, coherence, reliability. But a deeper question lurks beneath the analysis. Can an AI system — one built on large language models whose internal reasoning processes remain opaque even to their creators — genuinely *possess* the epistemic properties we have attributed to it?

Floridi (2011) distinguishes between entities that are *epistemic agents* (capable of genuine knowledge) and those that are *epistemic instruments* (tools that extend human epistemic capacities without themselves knowing anything). FactHarbor's design suggests a third category: the *epistemic architecture* — a system whose structure encodes epistemological commitments that constrain its outputs in philosophically meaningful ways, regardless of whether any component of the system "understands" those commitments.

The adversarial debate pattern does not require any individual LLM call to understand what falsification means in the Popperian sense. The MIXED/UNVERIFIED distinction does not require the system to grasp the philosophical difference between underdetermination and ignorance. The boundary architecture does not require the system to hold a theory of epistemic contextualism. These properties are *emergent from the structure*, not present in any individual component. The epistemic sophistication resides in the architecture, not in the reasoning engine.

This observation has a recursive dimension we should acknowledge: this paper itself is authored with the assistance of AI systems analyzing an AI system's philosophical commitments. The epistemic status of this analysis is precisely the kind of question the paper addresses. We do not resolve this recursion — we flag it as an open problem for the emerging field of computational epistemology.

---

## 11. Conclusion: Architecture as Epistemological Commitment

FactHarbor demonstrates that software architecture is never epistemologically neutral. Every design choice — the seven-point truth scale, the adversarial debate pattern, the evidence-emergent boundaries, the MIXED/UNVERIFIED distinction, the mandatory scope caveats — encodes a philosophical position about what knowledge is, how it is justified, and what responsible assertion requires.

The system's hybrid epistemology — constrained coherentism for evidence organization, Popperian adversarial testing for verdict generation, Goldmanian reliabilism for source evaluation — is philosophically coherent if not formally unified. Its most distinctive contribution is the structural separation of underdetermination from epistemic poverty, operationalizing a distinction that philosophy has articulated for millennia but that automated systems have largely ignored.

The system's limitations — bounded fallibilism without temporal revision, epistemically unjust blind spots in source evaluation, the compression of contextual richness in aggregation, the echo-chamber risk in dependent evidence chains — are not failures of implementation but reflections of the *necessary incompleteness* of any computational epistemology. No finite system can capture the full complexity of human epistemic practice. What FactHarbor demonstrates is that a system can be *honest about* that incompleteness — structuring its output to make visible not only what it knows but what it does not know, not only its verdicts but the conditions under which those verdicts might fail.

In an information environment characterized by epistemic crisis, this architectural honesty may be the most valuable contribution computational systems can make: not replacing human judgment, but making the grounds of judgment transparent, auditable, and — crucially — defeasible.

---

## References

BonJour, L. (1985). *The Structure of Empirical Knowledge*. Harvard University Press.

Carnap, R. (1950). *Logical Foundations of Probability*. University of Chicago Press.

Coady, C.A.J. (1992). *Testimony: A Philosophical Study*. Oxford University Press.

DeRose, K. (1992). Contextualism and Knowledge Attributions. *Philosophy and Phenomenological Research*, 52(4), 913–929.

Floridi, L. (2011). *The Philosophy of Information*. Oxford University Press.

Fricker, M. (2007). *Epistemic Injustice: Power and the Ethics of Knowing*. Oxford University Press.

Gettier, E.L. (1963). Is Justified True Belief Knowledge? *Analysis*, 23(6), 121–123.

Goldman, A.I. (1979). What Is Justified Belief? In G.S. Pappas (Ed.), *Justification and Knowledge*. Reidel.

Goldman, A.I. (1986). *Epistemology and Cognition*. Harvard University Press.

Goldman, A.I. (1999). *Knowledge in a Social World*. Oxford University Press.

Lewis, D. (1996). Elusive Knowledge. *Australasian Journal of Philosophy*, 74(4), 549–567.

Longino, H. (2002). *The Fate of Knowledge*. Princeton University Press.

McIntyre, L. (2018). *Post-Truth*. MIT Press.

Peirce, C.S. (1877). The Fixation of Belief. *Popular Science Monthly*, 12, 1–15.

Pollock, J.L. (1986). *Contemporary Theories of Knowledge*. Rowman & Littlefield.

Popper, K.R. (1959). *The Logic of Scientific Discovery*. Routledge.

Quine, W.V.O. (1951). Two Dogmas of Empiricism. *The Philosophical Review*, 60(1), 20–43.

Toulmin, S.E. (1958). *The Uses of Argument*. Cambridge University Press.

---

*Working paper. Draft for discussion. Comments welcome at info@factharbor.ch.*
