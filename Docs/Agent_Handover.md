# FactHarbor Handover - January 6, 2026

## 🎯 **Project Overview**
FactHarbor is a fact-checking POC with two main apps:
- **API** (ASP.NET Core) - Job management and data persistence
- **Web** (Next.js) - UI and analysis runner/orchestrator

## 📋 **Current Status**

### ✅ **Completed Work**
- **KeyFactors Architecture Redesign**: Moved KeyFactors from verdict phase to understanding phase with emergent generation
- **Bug Fixes**:
  - Fixed source reliability scale (removed incorrect `/100` division)
  - Simplified highlight colors from 7-color to 3-color system
  - Consolidated FALSE verdict handling
  - Fixed clampConfidence test (confidence clamping range)
  - Fixed syntax error in analyzer.ts prompt (markdown code blocks in TypeScript template literal)

### 🔄 **Current State**
- **Tests**: Basic tests pass (clampConfidence, job lifecycle)
- **KeyFactors**: Successfully aggregated in logs ("Key Factors aggregated: 0 factors from 5 discovered, no contested factors")
- **LLM Integration**: Full end-to-end test runs but takes ~5 minutes per provider

## 🏗️ **Architecture Overview**

### **Data Flow**
1. Client/UI → API creates job (`JobService`)
2. API triggers runner via `RunnerClient` → POST to Next internal route `/api/internal/run-job`
3. Runner fetches job, calls `runFactHarborAnalysis`, writes results back to API

### **Key Files**
```
apps/api/
├── Controllers/
│   ├── JobsController.cs          # Job creation endpoints
│   ├── InternalJobsController.cs  # Internal status/result updates
│   └── AnalyzeController.cs       # Analysis endpoints
├── Services/
│   ├── JobService.cs             # DB operations & events
│   └── RunnerClient.cs           # Triggers runner
├── Data/
│   ├── Entities.cs               # JobEntity, JobEventEntity
│   └── FhDbContext.cs            # EF Core context
└── Program.cs                    # App startup & DB setup

apps/web/
├── src/app/api/internal/
│   └── run-job/route.ts          # Runner implementation
├── src/lib/
│   ├── analyzer.ts               # Main analysis engine
│   ├── quality-gates.ts         # Evidence validation
│   ├── truth-scale.ts           # Color mapping
│   └── llm.ts                    # LLM provider integration
└── src/lib/analyzer/
    └── types.ts                  # TypeScript interfaces
```

## 🔧 **Recent Changes (Last Session)**

### **KeyFactors Redesign**
- **Before**: KeyFactors forced in verdict generation phase
- **After**: Emergent discovery in understanding phase with claim mapping
- **Schema Changes**:
  ```typescript
  // UNDERSTANDING_SCHEMA extended
  {
    keyFactors: KeyFactor[],
    claims: Array<{
      id: string,
      keyFactorId?: string  // New mapping field
    }>
  }
  ```

### **Bug Fixes Applied**
1. **Source Reliability**: Removed `/100` division in `validateVerdictGate4`
2. **Colors**: Simplified `normalizeHighlightColor` function
3. **Verdicts**: Unified FALSE handling
4. **Syntax**: Fixed markdown code blocks in TypeScript template literals

## 📝 **Remaining Tasks**

### **High Priority**
1. **Validate KeyFactors End-to-End**
   - Run complete analysis pipeline
   - Verify KeyFactors appear in final markdown reports
   - Test with claims that should generate KeyFactors

2. **Address Medium Priority Issues**
   - Fix evidence agreement penalization (agreeing evidence shouldn't penalize)
   - Fix model knowledge toggle violations

### **Development Tasks**
3. **Add Unit Tests**
   - Test emergent KeyFactors discovery
   - Test claim-to-factor mapping
   - Test factor verdict aggregation

4. **Performance Optimization**
   - Mock LLM responses for faster testing
   - Parallel test execution
   - Response caching

### **Integration Tasks**
5. **Full Pipeline Testing**
   - Web UI → API → Runner → Results
   - Verify KeyFactors display in UI
   - Test different claim types

## 🔐 **Authentication & Configuration**

### **Internal Endpoints**
Protected by shared secrets:
- **Runner → Next**: Header `X-Runner-Key` (Runner:RunnerKey in API config)
- **Runner → API**: Header `X-Admin-Key` (API Admin:Key / web FH_ADMIN_KEY)

### **Environment Variables**
```bash
# Web app
FH_INTERNAL_RUNNER_KEY=...
FH_API_BASE_URL=http://localhost:5000
FH_ADMIN_KEY=...

# API config (appsettings.Development.json)
Runner:BaseUrl=http://localhost:3000
Runner:RunnerKey=...
Admin:Key=...
```

## 🧪 **Testing Setup**

### **Quick Tests**
```bash
# Basic functionality
npm test -- --run src/lib/analyzer.test.ts      # clampConfidence
npm test -- --run src/lib/job-lifecycle.test.ts # Job lifecycle

# Full integration (slow - ~5min per provider)
npm test  # Runs all tests including LLM integration
```

### **Test Configuration**
- `test-config/llm-providers.json`: Enables/disables LLM integration tests
- Tests run against: OpenAI, Claude, Mistral
- Output saved to: `test-output/`

## 🚀 **Development Commands**

### **Bootstrap**
```powershell
# First time setup
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

### **Development**
```bash
# Web app (port 3000)
cd apps/web && npm run dev

# API (port 5000)
cd apps/api && dotnet watch run
# OR open apps.api.sln in Visual Studio
```

### **Testing**
```bash
# All tests
npm test

# Specific test files
npm test -- --run src/lib/analyzer.test.ts
```

## ⚠️ **Important Notes**

### **Database**
- Uses SQLite by default (`factharbor.db`)
- Auto-created in `Program.cs` via `db.Database.EnsureCreated()`
- No migrations - POC only

### **LLM Integration**
- Supports OpenAI, Anthropic (Claude), Mistral
- Uses structured output with Zod schemas
- Multi-phase analysis: Understand → Research → Verdict

### **KeyFactors Architecture**
- **Emergent**: Discovered during understanding, not forced
- **Optional**: Only generated for complex claims
- **Mapped**: Claims reference factors by ID
- **Aggregated**: Factor verdicts computed from claim verdicts

### **Gotchas**
- Template literals cannot contain unescaped markdown code blocks
- Internal endpoints require specific headers
- LLM integration tests are slow but comprehensive
- Source reliability scale was incorrectly divided by 100

## 🎯 **Immediate Next Steps Recommendation**

1. **Validate KeyFactors end-to-end** - Run complete analysis and check reports
2. **Fix evidence agreement penalization** - Medium priority issue
3. **Add KeyFactors unit tests** - Ensure new logic is properly tested
4. **Performance optimization** - Speed up testing workflow

## 📚 **Documentation**
- `README.md` - Project overview
- `AGENTS.md` - Agent workflow guidelines
- `FactHarbor_Code_Spec_Review.md` - Implementation analysis
- `KeyFactors-Design-Decision.md` - Architecture decisions

---

**Handover Date**: January 6, 2026
**Last Active Session**: KeyFactors architecture redesign and bug fixes
**Ready for**: End-to-end validation and remaining medium-priority fixes</content>
<parameter name="filePath">c:\DEV\FactHarbor\FACTHARBOR_HANDOVER.md