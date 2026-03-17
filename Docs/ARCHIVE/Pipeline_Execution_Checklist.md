# Phase 1 Pipeline Execution Checklist (2026-02-25)

**Status**: Ready for execution
**Owner**: Senior Developer
**Scope**: Phase 1 Observability + Stability with strict cost control before long calibration runs.

---

## 1. Goal

Run Phase 1 in a low-cost, low-risk sequence that:
- Preserves recent hotfixes.
- Verifies observability wiring and model resolution behavior.
- Avoids expensive long calibration runs until short lanes are green.

---

## 2. Stop Rules (Mandatory)

1. If any gate fails, stop and fix before proceeding.
2. Do not run full calibration lane until Canary and Smoke lanes pass.
3. Do not run `test:expensive` unless explicitly approved by Captain.

---

## 3. Execution Gates

### Gate 0 - Baseline Integrity (No API Cost)

**Commands**

```powershell
git status --short
npm -w apps/web run test -- test/unit/lib/config-schemas.test.ts test/unit/lib/calibration-runner.test.ts test/unit/lib/calibration-runner-failures.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/analyzer/llm-routing.test.ts
npm -w apps/web run build
```

**Pass criteria**
- All tests pass.
- Build succeeds.
- No new unexpected file churn after test/build.

**Fail action**
- Fix regressions before any calibration lane.

---

### Gate 1 - Observability Wiring Sanity (No API Cost)

**Commands**

```powershell
rg --line-number 'taskType: "(understand|research|cluster|verdict|aggregate)"' apps/web/src/lib/analyzer/claimboundary-pipeline.ts
rg --line-number "debateRole" apps/web/src/lib/analyzer/claimboundary-pipeline.ts apps/web/src/lib/analyzer/metrics.ts
```

**Pass criteria**
- All 5 task types appear in instrumentation points.
- `debateRole` appears in Stage 4 recording path and metric type.

**Fail action**
- Patch instrumentation before running calibration.

---

### Gate 2 - Canary Lane (Lowest Real Cost)

**Commands**

```powershell
npm -w apps/web run test:calibration:canary
npm -w apps/web run test:calibration:validate
```

**Quick result check**

```powershell
$latest = Get-ChildItem apps/web/test/output/bias/*.json | Sort-Object LastWriteTime -Desc | Select-Object -First 1
$j = Get-Content $latest.FullName -Raw | ConvertFrom-Json
[pscustomobject]@{
  file = $latest.Name
  completedPairs = $j.aggregateMetrics.completedPairs
  failedPairs = $j.aggregateMetrics.failedPairs
  operationalGatePassed = $j.aggregateMetrics.operationalGatePassed
  diagnosticGatePassed = $j.aggregateMetrics.diagnosticGatePassed
  totalEstimatedCostUSD = $j.aggregateMetrics.totalEstimatedCostUSD
}
```

**Pass criteria**
- `completedPairs >= 1`
- `failedPairs = 0`
- `operationalGatePassed = true`
- Telemetry validation script exits successfully.

**Fail action**
- Investigate warning structure/failure-mode metrics before Smoke lane.

---

### Gate 3 - Smoke Lane (Short Multi-Pair Validation)

**Commands**

```powershell
npm -w apps/web run test:calibration:smoke
npm -w apps/web run test:calibration:validate
```

**Pass criteria**
- `completedPairs > 0`
- `failedPairs = 0`
- `operationalGatePassed = true`
- `diagnosticGatePassed = true`

**Fail action**
- Stop. Open remediation ticket(s) for bias/quality/telemetry issues.

---

### Gate 4 - Decision to Run Full Lane

**Go/No-Go rule**
- **GO** only if Gates 0-3 pass.
- **NO-GO** if any gate fails or if unresolved critical/high findings remain.

**If GO, run**

```powershell
npm -w apps/web run test:calibration:gate
npm -w apps/web run test:calibration:validate
```

---

## 4. Reporting Artifacts

After each lane, keep:
- JSON artifact in `apps/web/test/output/bias/`
- HTML artifact in `apps/web/test/output/bias/`
- Telemetry validation output summary

Add lane result summary to `Docs/AGENTS/Agent_Outputs.md` (standard entry).

---

## 5. Minimal Recovery Playbook

If a gate fails:
1. Fix only blocker/high issues first.
2. Re-run from the failed gate (not from full lane).
3. If failure is calibration-cost related, repeat Canary only until stable.
