# Baseline Test Execution Script
# Runs the 30-case baseline test suite to establish quality metrics
# Cost: $20-50 in API calls

param(
    [string]$Provider = "anthropic",
    [int]$CaseLimit = 30,
    [string]$OutputFile = "baseline-results-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FactHarbor Baseline Test Execution" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify services are running
Write-Host "Checking services..." -ForegroundColor Yellow
$webHealth = $null
$apiHealth = $null

try {
    $webHealth = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ Web server running" -ForegroundColor Green
} catch {
    Write-Host "✗ Web server not running" -ForegroundColor Red
    Write-Host "  Run: npm run dev (in apps/web)" -ForegroundColor Yellow
    exit 1
}

try {
    $apiHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5
    Write-Host "✓ API server running" -ForegroundColor Green
} catch {
    Write-Host "✗ API server not running" -ForegroundColor Red
    Write-Host "  Run: dotnet run (in apps/api)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Confirm budget
Write-Host "WARNING: This will make real LLM API calls" -ForegroundColor Yellow
Write-Host "Estimated cost: $20-50 depending on provider and model" -ForegroundColor Yellow
Write-Host "Test cases: $CaseLimit" -ForegroundColor Yellow
Write-Host "Provider: $Provider" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Aborted by user" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting baseline test execution..." -ForegroundColor Cyan
Write-Host ""

# Set environment for baseline mode
$env:FH_USE_OPTIMIZED_PROMPTS = "false"
$env:FH_DETERMINISTIC = "true"

# Run tests via Node script
$testScript = @"
const { BASELINE_TEST_CASES, getTestSuiteStats } = require('./src/lib/analyzer/test-cases');
const fs = require('fs');

async function runBaseline() {
    const stats = getTestSuiteStats();
    console.log('Test Suite Statistics:');
    console.log('  Total cases:', stats.total);
    console.log('  Categories:', stats.categories);
    console.log('  By difficulty:', JSON.stringify(stats.byDifficulty, null, 2));
    console.log('');
    
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < Math.min($CaseLimit, BASELINE_TEST_CASES.length); i++) {
        const testCase = BASELINE_TEST_CASES[i];
        console.log(\`[\${i + 1}/$CaseLimit] Running: \${testCase.id} (\${testCase.category})\`);
        
        try {
            // Submit analysis
            const response = await fetch('http://localhost:3000/api/fh/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputType: testCase.inputType,
                    inputValue: testCase.input,
                }),
            });
            
            if (!response.ok) {
                throw new Error(\`Analysis submission failed: \${response.statusText}\`);
            }
            
            const { jobId } = await response.json();
            console.log(\`  Job ID: \${jobId}\`);
            
            // Wait for completion
            let job = null;
            let attempts = 0;
            const maxAttempts = 150; // 5 minutes
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const jobResponse = await fetch(\`http://localhost:3000/api/fh/jobs/\${jobId}\`);
                job = await jobResponse.json();
                
                if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
                    break;
                }
                
                attempts++;
            }
            
            if (!job || job.status !== 'SUCCEEDED') {
                throw new Error(\`Job failed or timed out: \${job?.status || 'TIMEOUT'}\`);
            }
            
            const result = JSON.parse(job.resultJson);
            
            // Try to fetch metrics
            let metrics = null;
            try {
                const metricsResponse = await fetch(\`http://localhost:3000/api/fh/metrics/\${jobId}\`);
                if (metricsResponse.ok) {
                    metrics = await metricsResponse.json();
                }
            } catch (e) {
                console.log('  (Metrics not available)');
            }
            
            results.push({
                testCase,
                jobId,
                verdict: result.articleVerdict,
                truthPercentage: result.articleTruthPercentage,
                confidence: result.articleVerdictConfidence,
                claimsFound: result.claims?.length || 0,
                metrics,
                success: true,
            });
            
            console.log(\`  ✓ Verdict: \${result.articleVerdict} (\${result.articleTruthPercentage}%)\`);
            
        } catch (error) {
            console.error(\`  ✗ Error: \${error.message}\`);
            results.push({
                testCase,
                error: error.message,
                success: false,
            });
        }
        
        console.log('');
    }
    
    const duration = Date.now() - startTime;
    
    const summary = {
        timestamp: new Date().toISOString(),
        provider: '$Provider',
        totalCases: $CaseLimit,
        completed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        durationMs: duration,
        results,
    };
    
    fs.writeFileSync('$OutputFile', JSON.stringify(summary, null, 2));
    
    console.log('========================================');
    console.log('Baseline Test Complete');
    console.log('========================================');
    console.log('Completed:', summary.completed);
    console.log('Failed:', summary.failed);
    console.log('Duration:', (duration / 1000).toFixed(1), 'seconds');
    console.log('Output:', '$OutputFile');
    console.log('');
}

runBaseline().catch(console.error);
"@

$testScript | Out-File -FilePath "run-baseline-temp.js" -Encoding UTF8

# Execute
try {
    Set-Location "$PSScriptRoot\..\apps\web"
    node run-baseline-temp.js
    Remove-Item run-baseline-temp.js -ErrorAction SilentlyContinue
} catch {
    Write-Host "Error running baseline: $_" -ForegroundColor Red
    Remove-Item run-baseline-temp.js -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Baseline results saved to: $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review results in $OutputFile" -ForegroundColor White
Write-Host "2. Analyze metrics and identify issues" -ForegroundColor White
Write-Host "3. Implement targeted fixes" -ForegroundColor White
Write-Host "4. Run A/B test to validate improvements" -ForegroundColor White
