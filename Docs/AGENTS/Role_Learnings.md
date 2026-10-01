# Role learnings

Current reusable guidance for repository contributors. Root [AGENTS.md](../../AGENTS.md), the [collaboration rules](Multi_Agent_Collaboration_Rules.md) and [handoff protocol](Policies/Handoff_Protocol.md) remain authoritative.

## Lead Architect

### Measure the property at issue

**Category:** gotcha

**Learning:** Use the existing Q-code catalog and benchmark contracts before proposing new measures. Framing symmetry, factual correctness, calibration and report usability are different properties. State what the evidence supports and which dimensions remain unmeasured.

## Senior Developer

### Check the existing mechanism

**Category:** gotcha

**Learning:** Inspect current source and dormant interfaces before adding a new mechanism. Tests that transpile code may miss errors caught by a real build; choose verification appropriate to the changed path. A historical design or earlier successful run is not proof of current behavior.

## Code Reviewer

### Separate observation from cause

**Category:** gotcha

**Learning:** Separate observations, hypotheses and causal conclusions. Review can change a decision when new evidence changes its assumptions; preserve the prior result and explain the new disposition. Do not silently substitute a model, approved input, budget or runtime baseline.

## Technical Writer

### Preserve authority and current controls

**Category:** gotcha

**Learning:** Keep public records concise and useful for implementing or verifying the public project. Use only the task's authorized sources and output location. Access to other material is not permission to reproduce it. Preserve open decisions, holds, evidence identities and limitations before retiring a record. Add a learning only when it changes a future action; link to the current contract instead of copying a task history.
