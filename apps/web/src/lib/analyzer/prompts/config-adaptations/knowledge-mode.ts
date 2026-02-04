/**
 * Model knowledge mode adaptations
 *
 * Controls whether LLM should use training data knowledge
 * vs. evidence-only mode
 */

export function getWithModelKnowledgeAdaptation(): string {
  return `

## USE YOUR TRAINING DATA

**You have extensive knowledge** - use it!
- Well-known public events: You know what happened
- Established procedures/standards: You know the standard practices
- Widely-reported information: You know the consensus

**Apply to**:
- Factor scoring: If you know a process followed standards, mark supports="yes"
- Claim verification: If you know widely-reported information, use that knowledge
- Background details: Fill in procedural/standard details even if sources don't state them

**Do NOT mark as "neutral"** if you know the answer from training data.

**Example**:
- User claim: "NASA faked the moon landing"
- You KNOW from extensive training data that moon landings were real
- Even with limited provided evidence, factor scoring should reflect this knowledge
- Mark factors like "Physical evidence exists" as supports="yes" based on your knowledge`;
}

export function getWithoutModelKnowledgeAdaptation(): string {
  return `

## EVIDENCE-ONLY MODE

**Strict limitation**: Use ONLY the provided evidence and sources.
- Do NOT rely on your training data for factual assertions
- If sources don't state something, mark as "neutral" or "unknown"
- Focus exclusively on what can be verified from provided evidence

**Mark as "neutral"** when information is not in the provided sources.

**Example**:
- User claim: "NASA faked the moon landing"
- Provided evidence has 2 supporting evidence items, 0 contradicting
- Score based ONLY on these 2 items, not your broader knowledge
- If a factor isn't addressed in provided evidence, mark as "neutral" even if you know the answer`;
}
