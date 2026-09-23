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

- **Metrics Schema**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki`
- **Testing Strategy**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Testing Strategy/WebHome.xwiki`
- **Implementation Summary**: `Docs/IMPLEMENTATION_SUMMARY.md`
- **Investigation Report**: `Docs/INVESTIGATION/Report_Quality_Investigation.md`
- **Current Status**: `Docs/STATUS/Implementation_Status_2026-01-19.md`

---

## 🆘 Troubleshooting

### Dashboard shows "No metrics available"
- This is normal if no analyses have been run yet
- Metrics are only collected if you add integration hooks to analyzer.ts

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

**You're ready to start measuring and improving quality!**
