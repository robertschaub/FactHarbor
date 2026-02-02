$ErrorActionPreference = "Stop"

Write-Host "== Validating FactHarbor Configuration =="
Write-Host ""

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$apiConfigPath = Join-Path $repoRoot "apps\api\appsettings.Development.json"
$webEnvPath = Join-Path $repoRoot "apps\web\.env.local"

$errors = @()
$warnings = @()

if (!(Test-Path $apiConfigPath)) {
    $errors += "Missing API config: $apiConfigPath"
}

if (!(Test-Path $webEnvPath)) {
    $errors += "Missing web env: $webEnvPath"
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Host "? $_" -ForegroundColor Red }
    exit 1
}

$apiConfig = Get-Content $apiConfigPath -Raw | ConvertFrom-Json
$runnerBaseUrl = $apiConfig.Runner.BaseUrl
$runnerKey = $apiConfig.Runner.RunnerKey
$adminKey = $apiConfig.Admin.Key

$envLines = Get-Content $webEnvPath
$envMap = @{}
foreach ($line in $envLines) {
    if ($line.Trim().Length -eq 0) { continue }
    if ($line.Trim().StartsWith("#")) { continue }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
        $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$webApiBaseUrl = $envMap["FH_API_BASE_URL"]
$webRunnerKey = $envMap["FH_INTERNAL_RUNNER_KEY"]
$webAdminKey = $envMap["FH_ADMIN_KEY"]
$openAiKey = $envMap["OPENAI_API_KEY"]
$anthropicKey = $envMap["ANTHROPIC_API_KEY"]
$googleKey = $envMap["GOOGLE_GENERATIVE_AI_API_KEY"]
$mistralKey = $envMap["MISTRAL_API_KEY"]
$configDbPath = $envMap["FH_CONFIG_DB_PATH"]

if ([string]::IsNullOrWhiteSpace($runnerBaseUrl)) { $errors += "Runner:BaseUrl is missing in appsettings.Development.json" }
if ([string]::IsNullOrWhiteSpace($runnerKey)) { $errors += "Runner:RunnerKey is missing in appsettings.Development.json" }
if ([string]::IsNullOrWhiteSpace($adminKey)) { $errors += "Admin:Key is missing in appsettings.Development.json" }

if ([string]::IsNullOrWhiteSpace($webApiBaseUrl)) { $errors += "FH_API_BASE_URL is missing in apps/web/.env.local" }
if ([string]::IsNullOrWhiteSpace($webRunnerKey)) { $errors += "FH_INTERNAL_RUNNER_KEY is missing in apps/web/.env.local" }
if ([string]::IsNullOrWhiteSpace($webAdminKey)) { $errors += "FH_ADMIN_KEY is missing in apps/web/.env.local" }

if ($runnerKey -and $webRunnerKey -and ($runnerKey -ne $webRunnerKey)) {
    $errors += "Runner:RunnerKey does not match FH_INTERNAL_RUNNER_KEY"
}

if ($adminKey -and $webAdminKey -and ($adminKey -ne $webAdminKey)) {
    $errors += "Admin:Key does not match FH_ADMIN_KEY"
}

if ($webApiBaseUrl -and ($webApiBaseUrl -ne "http://localhost:5000")) {
    $warnings += "FH_API_BASE_URL is '$webApiBaseUrl' (expected http://localhost:5000 for local dev)"
}

# Warn if UCM DB not found (optional but useful)
$candidateDbPaths = @()
if (![string]::IsNullOrWhiteSpace($configDbPath)) {
    $candidateDbPaths += $configDbPath
} else {
    $candidateDbPaths += (Join-Path $repoRoot "config.db")
    $candidateDbPaths += (Join-Path $repoRoot "apps\web\config.db")
}

$dbExists = $false
foreach ($p in $candidateDbPaths) {
    if (Test-Path $p) {
        $dbExists = $true
        break
    }
}

if (-not $dbExists) {
    $warnings += "UCM config database not found (config.db). It will be created on first run."
}

if (
    [string]::IsNullOrWhiteSpace($openAiKey) -and
    [string]::IsNullOrWhiteSpace($anthropicKey) -and
    [string]::IsNullOrWhiteSpace($googleKey) -and
    [string]::IsNullOrWhiteSpace($mistralKey)
) {
    $warnings += "No LLM API keys configured (set OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / MISTRAL_API_KEY)"
}

$placeholderKeys = @(
    "DEV_SHARED_SECRET_ADMIN_KEY",
    "DEV_SHARED_SECRET_RUNNER_KEY",
    "PASTE_YOUR_KEY_HERE"
)

if ($placeholderKeys -contains $adminKey) { $warnings += "Admin:Key is set to a placeholder value" }
if ($placeholderKeys -contains $runnerKey) { $warnings += "Runner:RunnerKey is set to a placeholder value" }
if ($placeholderKeys -contains $openAiKey) { $warnings += "OPENAI_API_KEY is set to a placeholder value" }
if ($placeholderKeys -contains $anthropicKey) { $warnings += "ANTHROPIC_API_KEY is set to a placeholder value" }
if ($placeholderKeys -contains $googleKey) { $warnings += "GOOGLE_GENERATIVE_AI_API_KEY is set to a placeholder value" }
if ($placeholderKeys -contains $mistralKey) { $warnings += "MISTRAL_API_KEY is set to a placeholder value" }

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Host "? $_" -ForegroundColor Red }
}

if ($warnings.Count -gt 0) {
    $warnings | ForEach-Object { Write-Host "! $_" -ForegroundColor Yellow }
}

if ($errors.Count -eq 0) {
    Write-Host "V Configuration looks consistent." -ForegroundColor Green
}

Write-Host ""
