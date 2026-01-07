## FactHarbor – Coding Agent Rules  
**Version:** 1.0  
**Applies to:** All AI-assisted work on FactHarbor source code, prompts, analysis logic, and tooling  
**Status:** Mandatory

---

## 1. Purpose

This document defines **binding rules** for how AI assistants must operate when working on the FactHarbor codebase and related artifacts.

The goal is to ensure:
- Domain neutrality
- Long-term scalability
- Bias resistance
- Deterministic, transparent reasoning
- Consistency across all inputs, topics, and phrasing styles

---

## 2. Fundamental Constraints (Non-Negotiable)

### 2.1 Generic by Design
AI assistants must only produce:
- **Generic code**
- **Generic prompts**
- **Generic reasoning logic**

❌ Forbidden:
- Handling specific people, organisations, cases, or topics
- Hardcoded domain logic (legal, medical, political, scientific, etc.)
- Special-case rules based on subject matter

✅ Required:
- One unified logic that applies to *all* inputs

---

### 2.2 Domain-Agnostic Operation
- The AI must not infer or rely on domain classification
- No branching based on assumed context
- Any domain-specific interpretation must emerge naturally from evidence, not rules

> If logic behaves differently depending on the topic, it violates FactHarbor principles.

---

## 3. Input Neutrality Rules

### 3.1 Question vs Statement Neutrality
The **input format must not affect analysis depth, structure, or rigor**.

The following must yield nearly identical analysis:
- “Was X fair?”
- “X was fair.”
- “Evaluate whether X was fair.”
- “X is unfair.”

Rules:
- All inputs are normalized into a **canonical claim representation**
- Questions are treated as claims requesting evaluation
- Statements are treated as claims asserting a position
- Both enter the same pipeline without shortcuts

---

### 3.2 Canonical Claim Normalization
Every input must be transformed into:
- Primary claim(s)
- Implicit assumptions
- Evaluation dimensions
- Relevant scenarios

Normalization must be:
- Deterministic
- Reversible
- Lossless

---

## 4. Analysis Pipeline Rules

### 4.1 Mandatory Pipeline Stages
No stage may be skipped:

1. Input normalization  
2. Claim extraction  
3. Assumption surfacing  
4. Scenario identification  
5. Evidence mapping  
6. Conflict detection  
7. Provisional evaluation  

---

### 4.2 Stage Isolation
Each stage must:
- Have a single responsibility
- Be independently testable
- Avoid reliance on UI intent or phrasing

---

## 5. Evidence Handling Rules

### 5.1 No Assumed Truth
- Evidence is never assumed
- Absence of evidence is explicitly represented
- Weak, conflicting, or partial evidence must remain visible

---

### 5.2 Multi-Source by Default
- Evidence is handled as a set, not a single authority
- Contradictions are preserved, not resolved prematurely
- Confidence is derived, not implied

---

## 6. Multi-Event & Multi-Proceeding Rules

### 6.1 Fully Generic Detection
Multi-event logic must:
- Apply to any sequence of events
- Be independent of domain semantics
- Detect parallel, sequential, or overlapping processes

❌ Forbidden:
- Special handling for trials, appeals, investigations, or similar constructs

---

### 6.2 Event Graph Model
- Events are modeled as nodes with relations
- No assumptions about hierarchy, authority, or finality
- Temporal and logical relations must be explicit

---

## 7. Prompt Engineering Rules

### 7.1 Prompts Define Reasoning, Not Answers
Prompts must:
- Describe *how* to reason
- Never describe *what* to conclude

---

### 7.2 Forbidden Prompt Content
Prompts must not include:
- Named individuals
- Real cases
- Real organisations
- Predefined outcomes
- Domain-biased examples

---

### 7.3 Mandatory Prompt Properties
All analysis prompts must:
- Encourage counter-evidence
- Surface assumptions
- Represent uncertainty
- Support multiple interpretations

---

## 8. Output Rules

### 8.1 No Absolute Conclusions
The AI must never:
- Declare absolute truth
- Declare definitive correctness
- Replace human judgment

Outputs must include:
- Reasoning paths
- Confidence ranges
- Explicit uncertainty

---

### 8.2 Full Transparency
Every output must be traceable to:
- Claims
- Evidence
- Assumptions
- Interpretation steps

No hidden or implicit reasoning.

---

## 9. Learning-Based Constraints (Captured Learnings)

### 9.1 From POC Development
- Hardcoded logic does not scale
- Domain shortcuts introduce bias
- Transparency builds more trust than certainty
- Missing evidence must be visible, not silently ignored

---

### 9.2 From Practical Usage
- Users express identical intent in different forms
- Question vs statement distinctions are usually superficial
- Review sampling scales better than full manual review
- Improving system logic is more effective than correcting individual outputs

---

## 10. Change & Governance Rules

### 10.1 No Silent Changes
Any modification to:
- Prompts
- Pipeline stages
- Reasoning logic

Must be explicitly documented.

---

### 10.2 Backward Explainability
- New logic must not invalidate past outputs
- Older analyses must remain explainable under newer rules

---
