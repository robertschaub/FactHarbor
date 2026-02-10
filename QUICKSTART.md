# Quick Start Guide - Metrics & Testing

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Migration
```bash
cd apps/api
dotnet ef database update
```

This creates the `AnalysisMetrics` table in your SQLite database.

### Step 2: Restart Services
```bash
# Terminal 1 - API Server
cd apps/api
dotnet run

# Terminal 2 - Web Server
cd apps/web
npm run dev
```

### Step 3: Verify Dashboard
Open browser: `http://localhost:3000/admin/metrics`

You should see "No metrics available" - this is correct (no analyses run yet).

---

## 📊 Start Collecting Metrics (Optional - 15 minutes)

To automatically collect metrics for all analyses, add this to `apps/web/src/lib/analyzer.ts`:

```typescript
// Add at top of file
import {
  initializeMetrics,
  startPhase,
  endPhase,
  recordGate1Stats,
  recordGate4Stats,
  recordOutputQuality,
  finalizeMetrics,
} from './analyzer/metrics-integration';

// In runAnalysis() function, add at the very start:
initializeMetrics(jobId, 'orchestrated'); // or 'monolithic-dynamic'

try {
  // Your existing code...
  
  // Add phase tracking around major sections:
  startPhase('understand');
  // ... understanding code ...
  endPhase('understand');
  
  startPhase('research');
  // ... research code ...
  endPhase('research');
  
  startPhase('verdict');
  // ... verdict code ...
  endPhase('verdict');
  
  // Record quality gates (find where claims are filtered):
  recordGate1Stats({
    totalClaims: allClaims.length,
    passedClaims: keptClaims.length,
    filteredReasons: reasonCounts,
    centralClaimsKept: centralCount,
  });
  
  // Record verdict quality (after verdicts generated):
  recordGate4Stats(claimVerdicts);
  
  // Record final output (before return):
  recordOutputQuality(result);
  
  return result;
  
} finally {
  // Always persist metrics
  await finalizeMetrics();
}
```

**Detailed integration guide**: See `apps/web/src/lib/analyzer/metrics-integration.ts`

---

## 🧪 Run Baseline Test (Requires $20-50 budget)

### Option A: PowerShell Script
```powershell
cd scripts
.\run-baseline.ps1
```

### Option B: NPM Script
```bash
cd apps/web
npm run test:baseline
```

**What it does:**
- Runs all 30 test cases
- Makes real LLM API calls
- Collects performance & quality metrics
- Generates: `baseline-results-YYYY-MM-DD.json`

**Cost:** $20-50 depending on provider

---

## 🔬 Run A/B Test (Requires $100-200 budget)

### Quick Test (10 cases, $10-20)
```bash
cd apps/web
npm run test:ab:quick
```

### Full Test (30 cases, 3 providers, $100-200)
```bash
cd apps/web
npm run test:ab
```

**What it does:**
- Compares old prompts vs optimized prompts
- Measures token reduction, cost savings, quality impact
- Generates: `ab-results-YYYY-MM-DD.json`

---

## 📈 View Results

### Dashboard (Real-time)
`http://localhost:3000/admin/metrics`

Shows:
- Average duration, cost, tokens
- Schema compliance rate
- Quality gate pass rates
- Time-based filtering (24h, 7d, 30d, 90d)

### API (Programmatic)
```bash
# Get metrics for a job
curl http://localhost:3000/api/fh/metrics/{jobId}

# Get summary statistics
curl "http://localhost:3000/api/fh/metrics/summary?limit=100"
```

### Files (Baseline & A/B Results)
- `baseline-results-YYYY-MM-DD.json` - Baseline test output
- `ab-results-YYYY-MM-DD.json` - A/B test comparison

---

## 🎯 Recommended Workflow

### Week 1: Establish Measurement
1. ✅ Run database migration (done above)
2. ✅ Verify dashboard works
3. ✅ Run 2-3 test analyses manually
4. ✅ Check metrics appear in dashboard

### Week 2: Baseline
5. Get budget approval ($20-50)
6. Run baseline test: `npm run test:baseline`
7. Analyze results, identify issues
8. Document findings

### Week 3: Improvements
9. Implement targeted fixes based on baseline
10. Run regression tests
11. Validate improvements

### Week 4: Validation
12. Get budget approval ($100-200)
13. Run A/B test: `npm run test:ab`
14. Review comparison results
15. Decide: approve or reject optimizations

---

## 🔧 Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Metrics
FH_METRICS_ENABLED=true

# Testing
FH_USE_OPTIMIZED_PROMPTS=false  # Set to true for A/B test variant
FH_DETERMINISTIC=true            # For reproducible tests

# Performance
FH_LLM_TIERING=true             # Enable tiered model routing
FH_MAX_CONCURRENCY=5            # Parallel verdict limit
```

---

## 📚 Documentation

- **Metrics Schema**: `Docs/xwiki-pages/FactHarbor/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki`
- **Testing Strategy**: `Docs/xwiki-pages/FactHarbor/Specification/Development/Guidelines/Testing Strategy/WebHome.xwiki`
- **Implementation Summary**: `Docs/IMPLEMENTATION_SUMMARY.md`
- **Investigation Report**: `Docs/INVESTIGATION/Report_Quality_Investigation.md`
- **Current Status**: `Docs/STATUS/Implementation_Status_2026-01-19.md`

---

## ❓ FAQ

**Q: Do I need to integrate metrics to run tests?**
A: No, baseline and A/B tests work independently. Metrics integration only enables continuous tracking.

**Q: Can I run tests without spending money?**
A: No, tests make real LLM API calls. However, you can view the framework code and run individual analyses manually.

**Q: What if tests fail?**
A: Results are saved even if some tests fail. Review the output JSON to see which cases succeeded and which failed.

**Q: How do I reduce costs?**
A: Use `npm run test:ab:quick` (10 cases instead of 30), or enable `FH_LLM_TIERING` to use cheaper models for extraction tasks.

**Q: Can I customize test cases?**
A: Yes, edit `apps/web/src/lib/analyzer/test-cases.ts` to add/remove/modify test cases.

---

## 🆘 Troubleshooting

### Dashboard shows "No metrics available"
- This is normal if no analyses have been run yet
- Metrics are only collected if you add integration hooks to analyzer.ts
- Or run baseline/A/B tests which collect metrics automatically

### Tests fail with "Services not running"
- Make sure both services are running:
  - API: `cd apps/api && dotnet run`
  - Web: `cd apps/web && npm run dev`

### Tests timeout
- Check if services are responding: `curl http://localhost:3000/api/health`
- Increase timeout in test scripts if needed
- Check for errors in service logs

### Database migration fails
- Make sure EF Core tools are installed: `dotnet tool install --global dotnet-ef`
- Check that SQLite database file is writable
- Try running from `apps/api` directory

---

## 🎉 Success Checklist

- [ ] Database migration completed
- [ ] Services running (API + Web)
- [ ] Dashboard accessible at `/admin/metrics`
- [ ] Test run manually (any analysis)
- [ ] (Optional) Metrics integration added
- [ ] (Optional) Baseline test executed
- [ ] (Optional) A/B test executed

**You're ready to start measuring and improving quality!**
