param(
  [string]$ApiBase = "http://localhost:5000",
  [int]$PollIntervalMs = 2000,
  [int]$MaxWaitMinutesPerJob = 25
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Invoke-Json([string]$method, [string]$url, $bodyObj = $null) {
  $headers = @{ "Accept" = "application/json" }
  if ($bodyObj -ne $null) {
    $body = ($bodyObj | ConvertTo-Json -Depth 40)
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType "application/json" -Body $body
  }
  return Invoke-RestMethod -Method $method -Uri $url -Headers $headers
}

function Write-Json([string]$path, $obj) {
  # PowerShell enforces a maximum serialization depth (commonly 100).
  # Keep this shallow; for full fidelity, write raw JSON from the API.
  $json = $obj | ConvertTo-Json -Depth 50
  $json | Out-File -FilePath $path -Encoding utf8
}

function Write-Raw([string]$path, [string]$content) {
  $content | Out-File -FilePath $path -Encoding utf8
}

function Get-JsonRaw([string]$method, [string]$url, $bodyObj = $null) {
  $headers = @{ "Accept" = "application/json" }
  if ($bodyObj -ne $null) {
    $body = ($bodyObj | ConvertTo-Json -Depth 40)
    $resp = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -ContentType "application/json" -Body $body -UseBasicParsing
    return [string]$resp.Content
  }
  $resp2 = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -UseBasicParsing
  return [string]$resp2.Content
}

function Wait-Job([string]$jobId) {
  $deadline = (Get-Date).AddMinutes($MaxWaitMinutesPerJob)
  while ($true) {
    $j = Invoke-Json "GET" ($ApiBase.TrimEnd("/") + "/v1/jobs/" + $jobId)
    if ($j.status -eq "SUCCEEDED" -or $j.status -eq "FAILED") { return $j }
    if ((Get-Date) -gt $deadline) { throw "Timeout waiting for job $jobId" }
    Start-Sleep -Milliseconds $PollIntervalMs
  }
}

function Get-Contexts($resultObj) {
  if ($null -eq $resultObj) { return @() }
  if ($resultObj.analysisContexts) { return @($resultObj.analysisContexts) }
  return @()
}

function Get-SubClaimsCount($resultObj) {
  try {
    if ($resultObj.understanding -and $resultObj.understanding.subClaims) {
      return [int](@($resultObj.understanding.subClaims).Count)
    }
  } catch {}
  return 0
}

function Get-CentralClaimEvidenceStats($resultObj) {
  $out = [pscustomobject]@{
    centralClaims = 0
    centralWithEvidence = 0
    centralWithoutEvidence = 0
  }
  try {
    $cvs = @($resultObj.claimVerdicts)
    if (!$cvs) { return $out }
    $central = @($cvs | Where-Object { $_.isCentral -eq $true })
    $out.centralClaims = $central.Count
    foreach ($cv in $central) {
      $sf = @($cv.supportingEvidenceIds)
      if ($sf -and $sf.Count -gt 0) { $out.centralWithEvidence++ } else { $out.centralWithoutEvidence++ }
    }
    return $out
  } catch {
    return $out
  }
}

function Assert-True([bool]$cond, [string]$msg) {
  if (-not $cond) { throw $msg }
}

Write-Host "== Inverse Context Regression ==" -ForegroundColor Cyan
Write-Host "ApiBase: $ApiBase"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outRoot = Join-Path $repoRoot "test-output\inverse-regressions"
Ensure-Dir $outRoot
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $outRoot $ts
Ensure-Dir $outDir
Write-Host "Output:  $outDir"

$cases = @(
  # Pair 1: user-reported inverse comparative inputs
  @{ name = "efficiency_h2_gt_ev"; input = "Using hydrogen for cars is more efficient than using electricity" },
  @{ name = "efficiency_ev_gt_h2"; input = "Using electricity for cars is more efficient than using hydrogen" },

  # Pair 2: additional generic inverse pair (topic-agnostic)
  @{ name = "safety_flying_gt_driving"; input = "Flying is safer than driving" },
  @{ name = "safety_driving_gt_flying"; input = "Driving is safer than flying" }
)

$jobs = @{}
foreach ($c in $cases) {
  Write-Host ""
  Write-Host "Submitting: $($c.name)" -ForegroundColor Green
  $resp = Invoke-Json "POST" ($ApiBase.TrimEnd("/") + "/v1/analyze") @{ inputType = "text"; inputValue = $c.input }
  $jobId = [string]$resp.jobId
  Assert-True ($jobId.Length -gt 0) "No jobId returned for $($c.name)"
  $jobs[$c.name] = $jobId
  Write-Host "  jobId: $jobId"
}

$results = @{}
foreach ($c in $cases) {
  $jobId = $jobs[$c.name]
  Write-Host ""
  Write-Host "Waiting: $($c.name) ($jobId)" -ForegroundColor Yellow
  $job = Wait-Job $jobId

  # Persist raw API JSON to avoid ConvertTo-Json depth limits.
  $rawJobJson = Get-JsonRaw "GET" ($ApiBase.TrimEnd("/") + "/v1/jobs/" + $jobId)
  Write-Raw (Join-Path $outDir ($c.name + ".job.json")) $rawJobJson

  $rj = $job.resultJson
  $results[$c.name] = $rj
  Write-Host "  status: $($job.status)"
}

function Describe-Case([string]$name) {
  $r = $results[$name]
  $contexts = Get-Contexts $r
  $subClaimsCount = Get-SubClaimsCount $r
  $ce = Get-CentralClaimEvidenceStats $r
  return [pscustomobject]@{
    name = $name
    contextsCount = [int](@($contexts).Count)
    contextIds = ($contexts | ForEach-Object { $_.id }) -join ","
    subClaimsCount = $subClaimsCount
    centralClaims = $ce.centralClaims
    centralWithEvidence = $ce.centralWithEvidence
    centralWithoutEvidence = $ce.centralWithoutEvidence
  }
}

$summary = @(
  (Describe-Case "efficiency_h2_gt_ev"),
  (Describe-Case "efficiency_ev_gt_h2"),
  (Describe-Case "safety_flying_gt_driving"),
  (Describe-Case "safety_driving_gt_flying")
)

Write-Json (Join-Path $outDir "summary.json") $summary

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
$summary | Format-Table -AutoSize | Out-String | Write-Host

foreach ($row in $summary) {
  if ($row.centralClaims -gt 0 -and $row.centralWithoutEvidence -gt 0) {
    Write-Host ("WARN: {0}: {1}/{2} central claims have zero supportingEvidenceIds (best-effort coverage, may happen)." -f $row.name, $row.centralWithoutEvidence, $row.centralClaims) -ForegroundColor Yellow
  }
}

function Assert-Pair([string]$a, [string]$b, [int]$minContexts, [int]$minSubClaims, [bool]$requireContextSymmetry) {
  $ra = $results[$a]
  $rb = $results[$b]
  $sa = Get-Contexts $ra
  $sb = Get-Contexts $rb
  $ca = [int](@($sa).Count)
  $cb = [int](@($sb).Count)
  $cla = Get-SubClaimsCount $ra
  $clb = Get-SubClaimsCount $rb

  Assert-True ($ca -ge $minContexts) "$a contextsCount=$ca (expected >= $minContexts)"
  Assert-True ($cb -ge $minContexts) "$b contextsCount=$cb (expected >= $minContexts)"
  if ($requireContextSymmetry) {
    Assert-True ($ca -eq $cb) "$a contextsCount=$ca != $b contextsCount=$cb (expected symmetry)"
  }

  Assert-True ($cla -ge $minSubClaims) "$a subClaimsCount=$cla (expected >= $minSubClaims)"
  Assert-True ($clb -ge $minSubClaims) "$b subClaimsCount=$clb (expected >= $minSubClaims)"
}

# Expectations:
# - For the primary inverse pair: contexts must be non-empty AND symmetric; claims must not collapse to 1.
# - For the secondary pair: search evidence can legitimately differ run-to-run, so we only assert non-empty contexts and non-collapsing claim counts.
Assert-Pair "efficiency_h2_gt_ev" "efficiency_ev_gt_h2" 1 3 $true
Assert-Pair "safety_flying_gt_driving" "safety_driving_gt_flying" 1 3 $false

Write-Host ""
Write-Host "✅ Inverse context regression PASSED" -ForegroundColor Green

