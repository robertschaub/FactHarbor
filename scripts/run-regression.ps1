param(
  [string]$ApiBase = "http://localhost:5000",
  [string]$BaselineDir = "",
  [int]$PollIntervalMs = 2000,
  [int]$MaxWaitMinutesPerJob = 20
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Read-Json([string]$path) {
  return (Get-Content $path -Raw | ConvertFrom-Json)
}

function Write-Json([string]$path, $obj) {
  $json = $obj | ConvertTo-Json -Depth 100
  $json | Out-File -FilePath $path -Encoding utf8
}

function Invoke-Json([string]$method, [string]$url, $bodyObj = $null) {
  $headers = @{ "Accept" = "application/json" }
  if ($bodyObj -ne $null) {
    $body = ($bodyObj | ConvertTo-Json -Depth 40)
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType "application/json" -Body $body
  }
  return Invoke-RestMethod -Method $method -Uri $url -Headers $headers
}

function Get-LatestRegressionDir([string]$root) {
  $dirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if (!$dirs -or $dirs.Count -eq 0) { return $null }
  return $dirs[0].FullName
}

function Get-CanonicalCases([string]$baselineDir) {
  $jobFiles = Get-ChildItem -Path $baselineDir -Filter "*.job.json" -File | Sort-Object Name
  if (!$jobFiles -or $jobFiles.Count -eq 0) {
    throw "No *.job.json files found in baseline dir: $baselineDir"
  }

  $cases = @()
  foreach ($f in $jobFiles) {
    $j = Read-Json $f.FullName
    if (!$j.inputType -or !$j.inputValue) { continue }
    $name = $f.Name.Replace(".job.json", "")
    $cases += [pscustomobject]@{
      name = $name
      inputType = [string]$j.inputType
      inputValue = [string]$j.inputValue
    }
  }

  if ($cases.Count -eq 0) {
    throw "Baseline dir contained *.job.json but no readable inputType/inputValue."
  }

  return $cases
}

function Get-TruthPct($resultObj) {
  if ($null -eq $resultObj) { return $null }
  if ($resultObj.questionAnswer -and $resultObj.questionAnswer.truthPercentage -ne $null) {
    return [int]$resultObj.questionAnswer.truthPercentage
  }
  if ($resultObj.articleAnalysis -and $resultObj.articleAnalysis.articleVerdict -ne $null) {
    return [int]$resultObj.articleAnalysis.articleVerdict
  }
  return $null
}

function Get-ImpliedLen($resultObj) {
  try {
    $s = [string]$resultObj.understanding.impliedClaim
    if ($s) { return $s.Trim().Length }
  } catch {}
  return 0
}

function Get-SummaryLen($resultObj) {
  try {
    $s = [string]$resultObj.articleThesis
    if ($s) { return $s.Trim().Length }
  } catch {}
  try {
    $s2 = [string]$resultObj.articleAnalysis.articleThesis
    if ($s2) { return $s2.Trim().Length }
  } catch {}
  return 0
}

function ShouldShowImpliedUi($resultObj) {
  # v2.6.x UI guidance: never show an "Implied Claim" field (redundant/noisy).
  # Keep this flag stable for regression reporting consistency.
  return $false
}

function Get-CalibrationNote($resultObj) {
  try {
    return [string]$resultObj.questionAnswer.calibrationNote
  } catch {
    return ""
  }
}

function Write-SummaryTxt([string]$outPath, $rows) {
  $lines = @()
  $lines += ""
  $lines += "name                status    truthPct impliedLen summaryLen shouldShowImplied_UI calibrationNote"
  $lines += "----                ------    -------- ---------- ---------- -------------------- ---------------"
  foreach ($r in $rows) {
    $name = $r.name.PadRight(18).Substring(0, [Math]::Min(18, $r.name.Length + (18 - $r.name.Length)))
    $status = $r.status.PadRight(8)
    $truth = ($r.truthPct.ToString()).PadLeft(8)
    $implied = ($r.impliedLen.ToString()).PadLeft(10)
    $summary = ($r.summaryLen.ToString()).PadLeft(10)
    $show = ($r.shouldShowImplied_UI.ToString()).PadLeft(20)
    $note = $r.calibrationNote
    $lines += "$name $status $truth $implied $summary $show $note"
  }
  $lines += ""
  $lines | Out-File -FilePath $outPath -Encoding utf8
}

function Write-AnalysisReport([string]$outPath, [string]$runId, [string]$baselineId, $rows, $baselineRows, [int]$divergence) {
  $md = @()
  $md += "# Regression Analysis Report"
  $md += ""
  $md += "**Date**: $(Get-Date -Format 'yyyy-MM-dd')  "
  $md += "**Test Run**: $runId  "
  if ($baselineId) { $md += "**Baseline**: $baselineId  " }
  $md += ""
  $md += "## Results"
  $md += ""
  $md += "| Test | Status | Truth% | Delta vs baseline | Notes |"
  $md += "|------|--------|--------|---------------|-------|"
  foreach ($r in $rows) {
    $base = $baselineRows | Where-Object { $_.name -eq $r.name } | Select-Object -First 1
    $delta = ""
    if ($base -and $base.truthPct -ne $null -and $r.truthPct -ne $null) {
      $delta = "{0:+#;-#;0}%" -f ([int]$r.truthPct - [int]$base.truthPct)
    }
    $notes = ""
    if ($r.status -ne "SUCCEEDED") { $notes = "Investigate failure in debug-errors.txt / after.log" }
    $md += "| $($r.name) | $($r.status) | $($r.truthPct) | $delta | $notes |"
  }
  $md += ""
  $md += "## Input Neutrality (Bolsonaro)"
  $md += ""
  $md += "- **Divergence**: $divergence percentage points (target: <5%)"
  $md += ""
  $md += "## Artifacts"
  $md += ""
  $md += "- `swagger.v1.json`: captured OpenAPI document from the live API"
  $md += "- `debug-analyzer.before.log` / `debug-analyzer.after.log`: snapshots for runtime validation"
  $md += "- `debug-errors.txt`: extracted errors/warnings of interest from the debug log"
  $md += "- `*.job.json` / `*.result.json`: full results for each canonical input"
  $md += ""
  $md | Out-File -FilePath $outPath -Encoding utf8
}

Write-Host "== FactHarbor Regression Runner ==" -ForegroundColor Cyan

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$regressionsRoot = Join-Path $repoRoot "test-output\regressions"
$debugLogPath = Join-Path $repoRoot "apps\web\debug-analyzer.log"

Ensure-Dir $regressionsRoot

if ([string]::IsNullOrWhiteSpace($BaselineDir)) {
  $BaselineDir = Get-LatestRegressionDir $regressionsRoot
}
if ([string]::IsNullOrWhiteSpace($BaselineDir) -or !(Test-Path $BaselineDir)) {
  throw "BaselineDir not found. Provide -BaselineDir or ensure test-output/regressions has at least one run."
}

$baselineId = Split-Path -Leaf $BaselineDir
Write-Host "Baseline: $baselineId ($BaselineDir)"

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $regressionsRoot $ts
Ensure-Dir $outDir
Write-Host "Output:   $ts ($outDir)"

if (Test-Path $debugLogPath) {
  Copy-Item $debugLogPath (Join-Path $outDir "debug-analyzer.before.log") -Force
} else {
  "" | Out-File -FilePath (Join-Path $outDir "debug-analyzer.before.log") -Encoding utf8
}

# Capture swagger spec
try {
  $swaggerUrl = ($ApiBase.TrimEnd("/") + "/swagger/v1/swagger.json")
  Invoke-WebRequest -Uri $swaggerUrl -UseBasicParsing -TimeoutSec 10 | Select-Object -ExpandProperty Content | Out-File -FilePath (Join-Path $outDir "swagger.v1.json") -Encoding utf8
} catch {
  Write-Host "WARN: Could not fetch swagger spec: $($_.Exception.Message)" -ForegroundColor Yellow
  "{}" | Out-File -FilePath (Join-Path $outDir "swagger.v1.json") -Encoding utf8
}

$cases = Get-CanonicalCases $BaselineDir
Write-Host "Cases:    $($cases.Count)"

$rows = @()
$baselineRows = @()
foreach ($c in $cases) {
  $resultPath = Join-Path $BaselineDir ($c.name + ".result.json")
  if (Test-Path $resultPath) {
    $r0 = Read-Json $resultPath
    $baselineRows += [pscustomobject]@{
      name = $c.name
      truthPct = (Get-TruthPct $r0)
    }
  }
}

foreach ($c in $cases) {
  Write-Host ""
  Write-Host "Submitting: $($c.name)" -ForegroundColor Green
  $create = Invoke-Json "POST" ($ApiBase.TrimEnd("/") + "/v1/analyze") @{ inputType = $c.inputType; inputValue = $c.inputValue }
  $jobId = [string]$create.jobId
  if ([string]::IsNullOrWhiteSpace($jobId)) { throw "No jobId returned for $($c.name)" }
  Write-Host "  jobId: $jobId"

  $deadline = (Get-Date).AddMinutes($MaxWaitMinutesPerJob)
  $job = $null
  while ($true) {
    if ((Get-Date) -gt $deadline) { throw "Timed out waiting for job $jobId ($($c.name))" }
    $job = Invoke-Json "GET" ($ApiBase.TrimEnd("/") + "/v1/jobs/$jobId")
    $status = [string]$job.status
    if ($status -eq "SUCCEEDED" -or $status -eq "FAILED") { break }
    Start-Sleep -Milliseconds $PollIntervalMs
  }

  Write-Json (Join-Path $outDir ($c.name + ".job.json")) $job

  if ($job.resultJson) {
    Write-Json (Join-Path $outDir ($c.name + ".result.json")) $job.resultJson
  } else {
    "{}" | Out-File -FilePath (Join-Path $outDir ($c.name + ".result.json")) -Encoding utf8
  }

  $truthPct = Get-TruthPct $job.resultJson
  $impliedLen = Get-ImpliedLen $job.resultJson
  $summaryLen = Get-SummaryLen $job.resultJson
  $shouldShow = ShouldShowImpliedUi $job.resultJson
  $note = Get-CalibrationNote $job.resultJson

  $rows += [pscustomobject]@{
    name = $c.name
    status = [string]$job.status
    truthPct = $truthPct
    impliedLen = $impliedLen
    summaryLen = $summaryLen
    shouldShowImplied_UI = $shouldShow
    calibrationNote = $note
  }
}

Write-SummaryTxt (Join-Path $outDir "summary.txt") $rows

$q = $rows | Where-Object { $_.name -match "bolsonaro_question" } | Select-Object -First 1
$s = $rows | Where-Object { $_.name -match "bolsonaro_statement" } | Select-Object -First 1
$div = 0
if ($q -and $s -and $q.truthPct -ne $null -and $s.truthPct -ne $null) {
  $div = [Math]::Abs([int]$q.truthPct - [int]$s.truthPct)
}
"question=$($q.truthPct) statement=$($s.truthPct) divergence=$div" | Out-File -FilePath (Join-Path $outDir "bolsonaro-divergence.txt") -Encoding utf8

Write-AnalysisReport (Join-Path $outDir "analysis-report.md") $ts $baselineId $rows $baselineRows $div

if (Test-Path $debugLogPath) {
  Copy-Item $debugLogPath (Join-Path $outDir "debug-analyzer.after.log") -Force
} else {
  "" | Out-File -FilePath (Join-Path $outDir "debug-analyzer.after.log") -Encoding utf8
}

# Extract obvious errors/warnings from ONLY the newly appended log lines for this run (best-effort)
try {
  $beforeLog = Join-Path $outDir "debug-analyzer.before.log"
  $afterLog = Join-Path $outDir "debug-analyzer.after.log"
  if ((Test-Path $beforeLog) -and (Test-Path $afterLog)) {
    $beforeLines = (Get-Content -Path $beforeLog -ErrorAction SilentlyContinue).Count
    if ($beforeLines -lt 0) { $beforeLines = 0 }

    $deltaPath = Join-Path $outDir "debug-analyzer.delta.log"
    Get-Content -Path $afterLog -ErrorAction SilentlyContinue | Select-Object -Skip $beforeLines | Out-File -FilePath $deltaPath -Encoding utf8

    $patterns = @("ERROR", "FAILED", "Exception", "Unhandled", "HTTP 4", "HTTP 5", "Fetch failed", "WARN", "Warning:")
    $matches = Select-String -Path $deltaPath -Pattern $patterns -SimpleMatch -ErrorAction SilentlyContinue
    if ($matches) {
      $matches | ForEach-Object { $_.Line } | Out-File -FilePath (Join-Path $outDir "debug-errors.txt") -Encoding utf8
    } else {
      "" | Out-File -FilePath (Join-Path $outDir "debug-errors.txt") -Encoding utf8
    }
  } else {
    "" | Out-File -FilePath (Join-Path $outDir "debug-errors.txt") -Encoding utf8
  }
} catch {
  "" | Out-File -FilePath (Join-Path $outDir "debug-errors.txt") -Encoding utf8
}

Write-Host ""
Write-Host "Done. New regression bundle: $outDir" -ForegroundColor Cyan

