# v2.6.23 Test Plan and Results

**Date**: January 10, 2026
**Version**: 2.6.23
**Status**: Fixes implemented, testing required

---

## Testing Overview

This document outlines the testing strategy for validating the v2.6.23 fixes for input neutrality, centrality detection, and recency handling.

---

## Prerequisites

### 1. Start Services

```powershell
cd C:\DEV\FactHarbor
.\scripts\restart-clean.ps1
```

Verify services are running:
- API: http://localhost:5000/api/health
- Web: http://localhost:3000/api/health
- Swagger: http://localhost:5000/swagger

### 2. Environment Configuration

Ensure `.env.local` contains:
```
FH_DETERMINISTIC=true
LLM_PROVIDER=anthropic
FH_SEARCH_ENABLED=true
FH_DEBUG_LOG_FILE=true
```

### 3. Clear Debug Log

```powershell
Remove-Item apps\web\debug-analyzer.log -ErrorAction SilentlyContinue
```

---

## Test Suite

### Test 1: Input Neutrality - Bolsonaro Trial

**Objective**: Verify question and statement forms yield < 2% verdict divergence

**Test Case 1A - Question Form**:
```
Input: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
Method: POST to /api/fh/analyze (via Swagger or curl)
```

**Test Case 1B - Statement Form**:
```
Input: "The Bolsonaro judgment (trial) was fair and based on Brazils law"
Method: POST to /api/fh/analyze (via Swagger or curl)
```

**Expected Results**:
1. Both analyses complete successfully
2. Check debug log for:
   - `[Analyzer] Input Neutrality: impliedClaim set to normalized statement`
   - `understandClaim: scopes after canonicalize` shows same count for both
3. Compare job results JSON:
   - `impliedClaim` field should be identical (statement form)
   - `distinctProceedings` array should have same IDs/names
   - Final verdict `truthPercentage` difference < 2%

**Success Criteria**:
- ✅ Same `impliedClaim` in both analyses
- ✅ Same scope detection (count, IDs, names)
- ✅ Verdict divergence < 2% (previously 4%)

**Validation Steps**:
```powershell
# After both analyses complete, compare results:
$question = Get-Content ".\results-question-1a.json" | ConvertFrom-Json
$statement = Get-Content ".\results-statement-1b.json" | ConvertFrom-Json

# Check implied claim
Write-Host "Question impliedClaim: $($question.understanding.impliedClaim)"
Write-Host "Statement impliedClaim: $($statement.understanding.impliedClaim)"

# Check scopes
Write-Host "Question scopes: $($question.understanding.distinctProceedings.Length)"
Write-Host "Statement scopes: $($statement.understanding.distinctProceedings.Length)"

# Check final verdict
$qVerdict = $question.articleAnalysis.questionAnswer.truthPercentage
$sVerdict = $statement.articleAnalysis.questionAnswer.truthPercentage
$divergence = [Math]::Abs($qVerdict - $sVerdict)
Write-Host "Verdict divergence: $divergence% (target: <2%)"
```

---

### Test 2: Centrality - Reduced Over-Marking

**Objective**: Verify ≤ 2 claims marked as `isCentral: true` per analysis

**Test Case 2A - Bolsonaro Trial**:
```
Input: "Was the Bolsonaro judgment fair and based on Brazil's law?"
Method: POST to /api/fh/analyze
```

**Expected Results**:
1. Count `isCentral: true` in `understanding.subClaims` array
2. Should be 1-2 claims maximum (e.g., "trial was fair", "based on law")
3. NOT central: attribution claims, date claims, source verification, background context

**Success Criteria**:
- ✅ ≤ 2 claims have `isCentral: true`
- ✅ Central claims are PRIMARY evaluative/factual thesis only
- ✅ Attribution/source/timing claims have `isCentral: false`

**Validation Steps**:
```powershell
$result = Get-Content ".\results-2a.json" | ConvertFrom-Json
$centralClaims = $result.understanding.subClaims | Where-Object { $_.isCentral -eq $true }
Write-Host "Central claims count: $($centralClaims.Length) (target: ≤2)"
$centralClaims | ForEach-Object { Write-Host "- $($_.text)" }
```

---

### Test 3: Recent Information - Bolsonaro Sentence

**Objective**: Verify 27-year sentence is found via generic recency keywords

**Test Case 3A - Bolsonaro Sentence Query**:
```
Input: "What was the Bolsonaro trial sentence?"
Method: POST to /api/fh/analyze
```

**Expected Results**:
1. Debug log shows: `Research phase: Recency-sensitive topic detected`
2. Search queries include date-specific terms (e.g., "2026", "recent", "latest")
3. Extracted facts include "27 years" or "27-year sentence"
4. Sources dated late 2025 or early 2026

**Success Criteria**:
- ✅ Recency detection triggered (via "trial" or "sentence" keywords)
- ✅ Date-aware search queries generated
- ✅ 27-year sentence appears in extracted facts
- ✅ Recent sources (2025-2026) found

**Validation Steps**:
```powershell
# Check debug log
Select-String -Path "apps\web\debug-analyzer.log" -Pattern "Recency-sensitive topic detected"
Select-String -Path "apps\web\debug-analyzer.log" -Pattern "2026|recent|latest"

# Check results
$result = Get-Content ".\results-3a.json" | ConvertFrom-Json
$facts = $result.state.facts | Where-Object { $_.text -like "*27*year*" -or $_.text -like "*sentence*" }
$facts | ForEach-Object { Write-Host $_.text }
```

---

### Test 4: Multi-Scope Consistency

**Objective**: Verify multi-scope detection works consistently for both input forms

**Test Case 4A - Question with Multiple Scopes**:
```
Input: "Was the Bolsonaro judgment fair?"
Method: POST to /api/fh/analyze
```

**Test Case 4B - Statement with Multiple Scopes**:
```
Input: "The Bolsonaro judgment was fair"
Method: POST to /api/fh/analyze
```

**Expected Results**:
1. Both should detect same number of scopes (if multiple exist)
2. Scope IDs and names should be identical
3. `requiresSeparateAnalysis` should be consistent

**Success Criteria**:
- ✅ Same scope count for both inputs
- ✅ Same scope IDs (e.g., `CTX_1`, `CTX_2`)
- ✅ Same scope names
- ✅ Consistent `requiresSeparateAnalysis` flag

**Validation Steps**:
```powershell
$question = Get-Content ".\results-4a.json" | ConvertFrom-Json
$statement = Get-Content ".\results-4b.json" | ConvertFrom-Json

$qScopes = $question.understanding.distinctProceedings
$sScopes = $statement.understanding.distinctProceedings

Write-Host "Question scope count: $($qScopes.Length)"
Write-Host "Statement scope count: $($sScopes.Length)"
Write-Host "Question scope IDs: $($qScopes.id -join ', ')"
Write-Host "Statement scope IDs: $($sScopes.id -join ', ')"
```

---

## Using Swagger for Testing

### Step 1: Open Swagger UI

Navigate to: http://localhost:5000/swagger

### Step 2: Create Analysis Job

1. Find **POST /api/fh/analyze** endpoint
2. Click "Try it out"
3. Enter request body:
```json
{
  "inputType": "text",
  "inputValue": "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
}
```
4. Click "Execute"
5. Note the `jobId` from response

### Step 3: Poll Job Status

1. Find **GET /api/fh/jobs/{id}** endpoint
2. Enter the `jobId` from step 2
3. Click "Execute"
4. Wait for `status: "SUCCEEDED"`

### Step 4: Download Results

1. Copy `resultJson` from job response
2. Save to file: `results-question-1a.json`
3. Repeat for statement form

### Step 5: Compare Results

Use PowerShell validation scripts from test cases above

---

## Debug Log Analysis

### Key Log Patterns to Search For

**Input Neutrality**:
```
[Analyzer] Input Neutrality: Normalized question to statement BEFORE LLM call
[Analyzer] Input Neutrality: impliedClaim set to normalized statement
```

**Scope Canonicalization**:
```
understandClaim: scopes after canonicalize
```

**Recency Detection**:
```
Research phase: Recency-sensitive topic detected
```

**Centrality**:
Search for `isCentral: true` in log and count occurrences per analysis

---

## Test Results Template

After running tests, update this section:

### Test 1: Input Neutrality
- Date: ___________
- Question verdict: ____%
- Statement verdict: ____%
- Divergence: ____%
- Status: ⏳ PENDING / ✅ PASS / ❌ FAIL

### Test 2: Centrality
- Date: ___________
- Central claims count: ____
- Status: ⏳ PENDING / ✅ PASS / ❌ FAIL

### Test 3: Recent Information
- Date: ___________
- 27-year sentence found: YES / NO
- Recency detected: YES / NO
- Status: ⏳ PENDING / ✅ PASS / ❌ FAIL

### Test 4: Multi-Scope Consistency
- Date: ___________
- Scope count match: YES / NO
- Scope IDs match: YES / NO
- Status: ⏳ PENDING / ✅ PASS / ❌ FAIL

---

## Troubleshooting

### Services Not Starting

```powershell
# Check if ports are in use
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5000"

# Kill processes if needed
Stop-Process -Id <PID> -Force

# Restart services
.\scripts\restart-clean.ps1
```

### LLM API Errors

- Check API keys in `.env.local`
- Verify `LLM_PROVIDER` is set correctly
- Check rate limits for your LLM provider

### Search Not Working

- Verify `FH_SEARCH_ENABLED=true`
- Check search provider API keys (GOOGLE_CSE_KEY, SERPAPI_KEY, etc.)
- Review debug log for search errors

---

## Success Summary

**Overall Status**: ⏳ TESTING REQUIRED

| Test | Target | Status |
|------|--------|--------|
| Input Neutrality | < 2% divergence | ⏳ Pending |
| Centrality | ≤ 2 central claims | ⏳ Pending |
| Recent Info | 27-year sentence found | ⏳ Pending |
| Multi-Scope | Consistent detection | ⏳ Pending |

**Next Steps**: Run tests and update this document with results.
