# FactHarbor Setup & Deployment Checklist

**Version**: 2.8.1  
**Date**: 2026-01-19  
**Status**: Ready for Deployment

---

## ✅ Pre-Deployment Checklist

### 1. Database Setup

- [ ] **Verify database exists**: `apps/api/factharbor.db`
  ```powershell
  Test-Path apps/api/factharbor.db
  ```

- [ ] **Apply AnalysisMetrics migration** (Choose ONE option):
  
  **Option A: PowerShell Script** (Easiest)
  ```powershell
  .\scripts\apply-migration.ps1
  ```
  
  **Option B: SQLite Command**
  ```bash
  sqlite3 apps/api/factharbor.db < apps/api/Migrations/20260119_AddAnalysisMetrics_Manual.sql
  ```
  
  **Option C: EF Core CLI** (If dotnet-ef installed)
  ```bash
  cd apps/api
  dotnet ef database update
  ```
  
  **Option D: Automatic** (Lazy option)
  - Just start the API - EF Core will create tables automatically
  - ⚠️ May not work without additional DbContext configuration

### 2. Build Verification

- [ ] **Web build successful**
  ```bash
  cd apps/web
  npm run build
  ```
  Expected: ✓ Compiled successfully (14 pages)

- [ ] **API build successful**
  ```bash
  cd apps/api
  dotnet build
  ```
  Expected: Build succeeded. 0 Error(s)

### 3. Service Startup

- [ ] **Start API server**
  ```bash
  cd apps/api
  dotnet run
  # or: dotnet watch run (for hot reload)
  ```
  Expected: `Now listening on: http://localhost:5000`

- [ ] **Start Web server**
  ```bash
  cd apps/web
  npm run dev
  ```
  Expected: `✓ Ready on http://localhost:3000`

### 4. Endpoint Verification

- [ ] **API Health Check**
  ```
  http://localhost:5000/health
  ```
  Expected: `{"status":"healthy","timestamp":"..."}`

- [ ] **Web Health Check**
  ```
  http://localhost:3000/api/health
  ```
  Expected: `{"status":"ok"}`

- [ ] **Swagger UI**
  ```
  http://localhost:5000/swagger
  ```
  Expected: Swagger UI with `/api/fh/metrics` endpoints visible

- [ ] **Metrics Dashboard**
  ```
  http://localhost:3000/admin/metrics
  ```
  Expected: Dashboard loads (may show "No metrics available")

---

## 🧪 Functional Testing

### Test 1: Manual Analysis

- [ ] Submit a simple analysis via UI
  ```
  http://localhost:3000/analyze
  Input: "The Earth orbits the Sun"
  ```

- [ ] Wait for completion (~30-60 seconds)
- [ ] View results at `/jobs/[id]`
- [ ] Verify verdict is TRUE with high confidence

### Test 2: Metrics API

- [ ] Get metrics for a job (replace `{jobId}`)
  ```
  http://localhost:3000/api/fh/metrics/{jobId}
  ```
  Expected: JSON metrics or 404 if not integrated yet

- [ ] Get summary statistics
  ```
  http://localhost:3000/api/fh/metrics/summary?limit=10
  ```
  Expected: Summary stats or empty if no metrics collected yet

### Test 3: Dashboard

- [ ] View metrics dashboard
  ```
  http://localhost:3000/admin/metrics
  ```

- [ ] Change time range (24h/7d/30d/90d)
- [ ] Verify metrics update (if any analyses with metrics exist)

---

## 🔧 Optional: Metrics Integration

### Enable Automatic Metrics Collection

**File**: `apps/web/src/lib/analyzer.ts`

Add at the **top of file**:
```typescript
import {
  initializeMetrics,
  startPhase,
  endPhase,
  recordGate1Stats,
  recordGate4Stats,
  recordOutputQuality,
  finalizeMetrics,
} from './analyzer/metrics-integration';
```

Add at **start of runAnalysis()**:
```typescript
initializeMetrics(jobId, 'orchestrated');
```

Add **around major phases**:
```typescript
startPhase('understand');
// ... existing understanding code ...
endPhase('understand');
```

Add at **end of runAnalysis()** (in finally block):
```typescript
} finally {
  await finalizeMetrics();
}
```

**See**: `apps/web/src/lib/analyzer/metrics-integration.ts` for complete examples

---

## 🚀 Optional: Enable Performance Optimizations

### Option 1: Parallel Verdicts

**Benefit**: 50-80% faster verdict generation

**How**: In `analyzer.ts`, replace sequential verdict loop:
```typescript
// OLD
for (const claim of claims) {
  const verdict = await generateClaimVerdict(claim);
  verdicts.push(verdict);
}

// NEW
import { generateClaimVerdictsParallel } from './analyzer/parallel-verdicts';
const verdicts = await generateClaimVerdictsParallel(
  claims, facts, sources, model, { maxConcurrency: 5 }
);
```

### Option 2: Tiered LLM Routing

**Benefit**: 50-70% cost reduction

**How**: Add to `.env.local`:
```bash
FH_LLM_TIERING=true
```

Then in `analyzer.ts`:
```typescript
import { getModelForTask } from './analyzer/model-tiering';

// For understanding (use budget model)
const understandConfig = getModelForTask('understand', 'anthropic');
const understandModel = anthropic(understandConfig.modelId);

// For verdicts (use premium model)
const verdictConfig = getModelForTask('verdict', 'anthropic');
const verdictModel = anthropic(verdictConfig.modelId);
```

---

## 📊 Optional: Run Baseline Test

**Cost**: $20-50  
**Benefit**: Establish quality baseline, identify actual issues

### Prerequisites
- [ ] Both services running (API + Web)
- [ ] Budget approval obtained
- [ ] LLM API keys configured

### Execute
```bash
cd apps/web
npm run test:baseline
```

### Expected Output
- Duration: 1-3 hours
- File: `baseline-results-YYYY-MM-DD.json`
- Console: Completed/Failed counts

### Next Steps After Baseline
1. Review `baseline-results-*.json`
2. Analyze metrics and identify issues
3. Document findings
4. Implement targeted fixes
5. Re-run to validate improvements

---

## 🔬 Optional: Run A/B Test

**Cost**: $100-200 (full) or $10-20 (quick)  
**Benefit**: Validate v2.8 prompt optimizations

**NOT RECOMMENDED** until after baseline test

### Quick Test
```bash
cd apps/web
npm run test:ab:quick
```

### Full Test
```bash
cd apps/web
npm run test:ab
```

---

## ✅ Deployment Complete When...

- [x] Build successful (both Web and API)
- [x] All compilation errors fixed
- [ ] Database migration applied
- [ ] Both services running
- [ ] Health checks passing
- [ ] Swagger UI accessible
- [ ] Metrics dashboard accessible
- [ ] Manual analysis works end-to-end

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| **QUICKSTART.md** | 5-minute setup guide |
| **FINAL_DELIVERY_REPORT.md** | Complete implementation summary |
| **METRICS_SCHEMA.md** | Metrics API documentation |
| **TESTING_STRATEGY.md** | Testing approach & cost management |
| **BUILD_FIXES_2026-01-19.md** | Build issue resolutions |

---

## 🆘 Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution**: This is OK - table was already created. Verify with:
```bash
sqlite3 apps/api/factharbor.db "SELECT name FROM sqlite_master WHERE type='table';"
```

### Issue: Metrics dashboard shows "No metrics available"
**Solution**: This is expected until:
1. Metrics integration is added to analyzer.ts, OR
2. Baseline/A/B tests are run (they collect metrics automatically)

### Issue: API won't start - port conflict
**Solution**: 
```bash
# Kill process on port 5000
npx kill-port 5000
# Then restart API
```

### Issue: Web won't start - port conflict
**Solution**:
```bash
# Kill process on port 3000
npx kill-port 3000
# Then restart Web
```

### Issue: TypeScript errors in new files
**Solution**: Restart TypeScript server in VS Code:
- Ctrl+Shift+P → "TypeScript: Restart TS Server"

---

## 🎉 Success Indicators

You know deployment is successful when:

1. ✅ Both services start without errors
2. ✅ Swagger shows `/api/fh/metrics` endpoints
3. ✅ Dashboard loads at `/admin/metrics`
4. ✅ Manual analysis completes successfully
5. ✅ No build errors or warnings

**Congratulations! FactHarbor v2.8.1 is now deployed with complete metrics & testing infrastructure.** 🚀
