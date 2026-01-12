param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][string]$BaselineDir
)

$ErrorActionPreference = "Stop"

function Read-Json([string]$p) { Get-Content $p -Raw | ConvertFrom-Json }
function Write-Text([string]$p, [string[]]$lines) { $lines | Out-File -FilePath $p -Encoding utf8 }
function LenSafe([string]$s) { if ([string]::IsNullOrWhiteSpace($s)) { return 0 }; return $s.Trim().Length }

function TruthPct($r) {
  if ($null -eq $r) { return $null }
  if ($null -ne $r.questionAnswer -and $null -ne $r.questionAnswer.truthPercentage) { return [int]$r.questionAnswer.truthPercentage }
  if ($null -ne $r.articleAnalysis -and $null -ne $r.articleAnalysis.articleVerdict) { return [int]$r.articleAnalysis.articleVerdict }
  return $null
}

function BuildRows([string]$dirPath) {
  $rows = @()
  Get-ChildItem $dirPath -Filter "*.job.json" | ForEach-Object {
    $name = $_.Name.Replace(".job.json", "")
    $job = Read-Json $_.FullName
    $res = $job.resultJson
    $truth = TruthPct $res

    $impliedLen = 0
    if ($res -and $res.understanding) { $impliedLen = LenSafe ([string]$res.understanding.impliedClaim) }

    $summaryLen = 0
    if ($res) {
      if ($res.articleThesis) { $summaryLen = LenSafe ([string]$res.articleThesis) }
      elseif ($res.articleAnalysis -and $res.articleAnalysis.articleThesis) { $summaryLen = LenSafe ([string]$res.articleAnalysis.articleThesis) }
    }

    $note = ""
    if ($res -and $res.questionAnswer -and $res.questionAnswer.calibrationNote) { $note = [string]$res.questionAnswer.calibrationNote }

    $rows += [pscustomobject]@{
      name = $name
      status = [string]$job.status
      truthPct = $truth
      impliedLen = $impliedLen
      summaryLen = $summaryLen
      # v2.6.x UI guidance: never show Implied Claim in UI.
      shouldShowImplied_UI = $false
      calibrationNote = $note
    }
  }
  return ($rows | Sort-Object name)
}

function WriteSummary([string]$outDir, $rows) {
  $lines = @()
  $lines += ""
  $lines += "name                status    truthPct impliedLen summaryLen shouldShowImplied_UI calibrationNote"
  $lines += "----                ------    -------- ---------- ---------- -------------------- ---------------"
  foreach ($r in $rows) {
    $lines += ('{0,-18} {1,-8} {2,8} {3,10} {4,10} {5,20} {6}' -f $r.name, $r.status, $r.truthPct, $r.impliedLen, $r.summaryLen, $r.shouldShowImplied_UI, $r.calibrationNote)
  }
  $lines += ""
  Write-Text (Join-Path $outDir "summary.txt") $lines
}

function WriteDivergence([string]$outDir, $rows) {
  $q = $rows | Where-Object name -eq "bolsonaro_question" | Select-Object -First 1
  $s = $rows | Where-Object name -eq "bolsonaro_statement" | Select-Object -First 1
  $div = 0
  if ($q -and $s -and $q.truthPct -ne $null -and $s.truthPct -ne $null) { $div = [Math]::Abs([int]$q.truthPct - [int]$s.truthPct) }
  Write-Text (Join-Path $outDir "bolsonaro-divergence.txt") @("question=$($q.truthPct) statement=$($s.truthPct) divergence=$div")
  return $div
}

function WriteAnalysisReport([string]$outDir, [string]$baselineId, $rows, $baselineRows, [int]$divergence) {
  $runId = Split-Path -Leaf (Resolve-Path $outDir)
  $md = @()
  $md += "# Regression Analysis Report"
  $md += ""
  $md += ("**Date**: {0}  " -f (Get-Date -Format "yyyy-MM-dd"))
  $md += ("**Test Run**: {0}  " -f $runId)
  $md += ("**Baseline**: {0}  " -f $baselineId)
  $md += ""
  $md += "## Results"
  $md += ""
  $md += "| Test | Status | Truth% | Delta vs baseline | Notes |"
  $md += "|------|--------|--------|------------------|-------|"
  foreach ($r in $rows) {
    $b = $baselineRows | Where-Object name -eq $r.name | Select-Object -First 1
    $delta = ""
    if ($b -and $b.truthPct -ne $null -and $r.truthPct -ne $null) { $delta = ("{0:+#;-#;0}%" -f ([int]$r.truthPct - [int]$b.truthPct)) }
    $notes = ""
    if ($r.status -ne "SUCCEEDED") { $notes = "Investigate failure in debug-errors.txt / after.log" }
    $md += ("| {0} | {1} | {2} | {3} | {4} |" -f $r.name, $r.status, $r.truthPct, $delta, $notes)
  }
  $md += ""
  $md += "## Input Neutrality (Bolsonaro)"
  $md += ""
  $md += ("- **Divergence**: {0} percentage points (target: <5%)" -f $divergence)
  $md += ""
  $md += "## Artifacts"
  $md += ""
  $md += "- `swagger.v1.json`: captured OpenAPI document from the live API"
  $md += "- `debug-analyzer.before.log` / `debug-analyzer.after.log`: snapshots for runtime validation"
  $md += "- `debug-analyzer.delta.log`: newly appended log lines for this run"
  $md += "- `debug-errors.txt`: extracted errors/warnings of interest from this run"
  $md += "- `*.job.json` / `*.result.json`: full results for each canonical input"
  $md += ""
  Write-Text (Join-Path $outDir "analysis-report.md") $md
}

function RefreshDebugDeltaAndErrors([string]$outDir) {
  $beforeLog = Join-Path $outDir "debug-analyzer.before.log"
  $afterLog = Join-Path $outDir "debug-analyzer.after.log"
  $deltaLog = Join-Path $outDir "debug-analyzer.delta.log"
  $errorsOut = Join-Path $outDir "debug-errors.txt"

  if (!(Test-Path $beforeLog) -or !(Test-Path $afterLog)) {
    Write-Text $errorsOut @("")
    return
  }

  $beforeLines = (Get-Content -Path $beforeLog -ErrorAction SilentlyContinue).Count
  if ($beforeLines -lt 0) { $beforeLines = 0 }

  Get-Content -Path $afterLog -ErrorAction SilentlyContinue | Select-Object -Skip $beforeLines | Out-File -FilePath $deltaLog -Encoding utf8

  $patterns = @("ERROR", "FAILED", "Exception", "Unhandled", "HTTP 4", "HTTP 5", "Fetch failed", "WARN", "Warning:")
  $m = Select-String -Path $deltaLog -Pattern $patterns -SimpleMatch -ErrorAction SilentlyContinue
  if ($m) { $m | ForEach-Object Line | Out-File -FilePath $errorsOut -Encoding utf8 }
  else { Write-Text $errorsOut @("") }
}

if (!(Test-Path $Dir)) { throw "Dir not found: $Dir" }
if (!(Test-Path $BaselineDir)) { throw "BaselineDir not found: $BaselineDir" }

$rows = BuildRows $Dir
WriteSummary $Dir $rows
$div = WriteDivergence $Dir $rows

$baselineRows = @()
Get-ChildItem $BaselineDir -Filter "*.result.json" | ForEach-Object {
  $name = $_.Name.Replace(".result.json", "")
  $r0 = Read-Json $_.FullName
  $baselineRows += [pscustomobject]@{ name = $name; truthPct = (TruthPct $r0) }
}
WriteAnalysisReport $Dir (Split-Path -Leaf (Resolve-Path $BaselineDir)) $rows $baselineRows $div
RefreshDebugDeltaAndErrors $Dir

Write-Host "Updated regression bundle summaries in $Dir" -ForegroundColor Green

