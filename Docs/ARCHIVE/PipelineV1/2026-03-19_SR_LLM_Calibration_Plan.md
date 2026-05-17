# Source Reliability LLM Calibration Plan

**Date:** 2026-03-19  
**Status:** Active as a **future feature-flagged experiment summary**. Detailed design history moved to archive.  
**Historical detail:** [2026-03-19_SR_LLM_Calibration_Plan_arch.md](../ARCHIVE/2026-03-19_SR_LLM_Calibration_Plan_arch.md)

---

## 1. Current State

Stage 4.5 SR calibration now exists in the codebase as scaffolding, but it remains **feature-flagged / off** and is not part of the active production-quality lane.

This means:
- the design is no longer just theoretical
- but it is also **not** approved for activation by drift

---

## 2. What Still Matters

If this track is reopened later, the important guardrails remain:

- SR should not blindly own verdict direction
- calibration should stay bounded and attributable
- activation must happen only after a stable validated baseline exists
- validation must compare the feature-flagged path against the current live baseline

---

## 3. Current Decision Rule

- Keep this file as the short reference for the still-open SR calibration idea.
- Do not use it as an execution plan while the current validation gate is open.
- Use the archived detailed design only if this experiment is explicitly selected again.
