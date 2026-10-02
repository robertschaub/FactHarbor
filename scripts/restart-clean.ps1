[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ApiUrls = "http://localhost:5000",
    [ValidateRange(1, 65535)][int]$WebPort = 3000,
    [string]$ApiDbPath = "",
    [string]$RunnerBaseUrl = "",
    [string]$ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "== FactHarbor POC1 Clean Restart =="
Write-Host ""

. "$PSScriptRoot\service-ownership.ps1"
$repoRoot = Get-ServiceDirectoryIdentity (Join-Path $PSScriptRoot '..')
$ports = @(Get-ServicePorts $ApiUrls $WebPort)
$apiPorts = @($ports | Where-Object { $_ -ne $WebPort })
if ($WhatIfPreference) {
    Stop-CheckoutServices -Root $repoRoot -Ports $ports -WhatIf
    Write-Host 'WhatIf: configuration validation, reseeding and startup were not run.'
    return
}
if (-not $PSCmdlet.ShouldProcess($repoRoot, 'Validate, stop verified services, reseed and restart')) { return }
& powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\validate-config.ps1"
if ($LASTEXITCODE -ne 0) { throw 'Configuration validation failed; services were not stopped.' }
Stop-CheckoutServices -Root $repoRoot -Ports $ports -Confirm:$false

function ConvertTo-ServiceLiteral([string]$Value) { return "'" + $Value.Replace("'", "''") + "'" }

function Assert-ServiceStartup([string]$label, [int]$serviceShellProcessId, [datetime]$serviceShellStartedAt, [int[]]$ports, [string]$stdoutPath, [string]$stderrPath, [int]$timeoutSeconds = 90) {
    $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
    do {
        $output = (@($stdoutPath, $stderrPath) | ForEach-Object {
            if (Test-Path -LiteralPath $_) { Get-Content -LiteralPath $_ -Raw }
        }) -join "`n"
        if ($output -match '(?im)\berror\s+[A-Z]+\d+\b|\bbuild failed\b|Fehler beim Build|\b(?:Error|TypeError|SyntaxError):|\bnpm (?:ERR!|error\b)|\bEADDRINUSE\b|Failed to start server') {
            throw "$label startup failed: new service reported a build/startup error. See $stdoutPath and $stderrPath."
        }
        $processes = @(Get-CimInstance Win32_Process)
        $owner = $processes | Where-Object ProcessId -eq $serviceShellProcessId
        $ownerHandle = Get-Process -Id $serviceShellProcessId -ErrorAction SilentlyContinue
        if (-not $owner -or -not $owner.CreationDate -or -not $ownerHandle -or $ownerHandle.StartTime.ToUniversalTime() -ne $serviceShellStartedAt.ToUniversalTime()) {
            throw "$label startup failed: new shell $serviceShellProcessId exited. See $stdoutPath and $stderrPath."
        }
        $allListening = $true
        foreach ($port in $ports) {
            $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
            if (-not $listeners.Count) { $allListening = $false }
            foreach ($listener in $listeners) {
                $ancestorId = $listener.OwningProcess
                $visited = @()
                while ($ancestorId -ne $serviceShellProcessId -and $ancestorId -notin $visited) {
                    $visited += $ancestorId
                    $child = $processes | Where-Object ProcessId -eq $ancestorId
                    $parent = $processes | Where-Object ProcessId -eq $child.ParentProcessId
                    if (-not $child -or -not $parent -or -not $child.CreationDate -or -not $parent.CreationDate -or $parent.CreationDate -gt $child.CreationDate) { break }
                    $ancestorId = $parent.ProcessId
                }
                if ($ancestorId -ne $serviceShellProcessId) {
                    throw "$label startup failed: port $port belongs to PID $($listener.OwningProcess), outside new shell $serviceShellProcessId. See $stdoutPath and $stderrPath."
                }
            }
        }
        if ($allListening) { return }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "$label startup failed: no verified listener within $timeoutSeconds seconds. See $stdoutPath and $stderrPath."
}

Write-Host "Starting API and Web services..."

# Do not pass harness provider routing into product services.
$savedProviderRouting = @{}
foreach ($key in @('ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL')) {
    $savedProviderRouting[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $null, 'Process')
}
try {
# Start API with retained logs (creates DB on startup if missing)
Write-Host "Starting API..."
$apiEnvPrefix = "`$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:ASPNETCORE_URLS=$(ConvertTo-ServiceLiteral $ApiUrls); "
if (-not $RunnerBaseUrl) {
    $RunnerBaseUrl = "http://localhost:$WebPort"
}
$apiEnvPrefix += "`$env:Runner__BaseUrl=$(ConvertTo-ServiceLiteral $RunnerBaseUrl); "
if ($ApiDbPath) {
    $apiEnvPrefix += "`$env:ConnectionStrings__FhDbSqlite=$(ConvertTo-ServiceLiteral ('Data Source=' + $ApiDbPath)); "
}
$startupLogDir = Join-Path $PSScriptRoot '..\test-output\service-startup'
New-Item -ItemType Directory -Force -Path $startupLogDir | Out-Null
$startupId = [Guid]::NewGuid().ToString('N')
$apiStdout = Join-Path $startupLogDir "$startupId-api.stdout.log"
$apiStderr = Join-Path $startupLogDir "$startupId-api.stderr.log"
$apiShell = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru -RedirectStandardOutput $apiStdout -RedirectStandardError $apiStderr -ArgumentList @(
  "-NoProfile", "-NoExit",
  "-Command",
  "Set-Location -LiteralPath $(ConvertTo-ServiceLiteral (Join-Path $repoRoot 'apps\api')); $apiEnvPrefix dotnet watch run"
)
try {
    Assert-ServiceStartup -label "API" -serviceShellProcessId $apiShell.Id -serviceShellStartedAt $apiShell.StartTime -ports $apiPorts -stdoutPath $apiStdout -stderrPath $apiStderr
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Propagate ONLY genuinely-runtime vars into the spawned Web dev-server shell
# (FH_RUNNER_MAX_CONCURRENCY, FH_API_BASE_URL, PORT — set just below).
#
# Do NOT re-export apps/web/.env.local here. `next dev` already loads
# apps/web/.env.local from its cwd (the spawned shell cd's into apps/web below),
# and a shell-set $env: var takes PRECEDENCE over Next.js's own .env.local
# loading (Next does not override an already-present process.env value). The
# previous line-by-line re-export also left trailing-CR / quoting corruption on
# values (e.g. ANTHROPIC_API_KEY, FH_INTERNAL_RUNNER_KEY) because Trim() does not
# strip "\r" and single-quote interpolation is unsafe — so the corrupted value
# won, breaking LLM calls (404) and API->web runner-key auth (401) after a
# restart. Removing the re-export lets next dev read the clean .env.local values.
$webEnvPrefix = ""
# Allow explicit shell env to override .env.local
if ($env:FH_RUNNER_MAX_CONCURRENCY) {
    $webEnvPrefix += "`$env:FH_RUNNER_MAX_CONCURRENCY=$(ConvertTo-ServiceLiteral $env:FH_RUNNER_MAX_CONCURRENCY); "
}
$selectedApiUrl = ""
if ($ApiUrls) {
    $selectedApiUrl = $ApiUrls.Split(';') | Where-Object { $_ -match '^http://' } | Select-Object -First 1
    if (-not $selectedApiUrl) {
        $selectedApiUrl = $ApiUrls.Split(';') | Where-Object { $_ -match '^https?://' } | Select-Object -First 1
    }
}
if (-not $ApiBaseUrl) {
    $ApiBaseUrl = $selectedApiUrl
}
if (-not $ApiBaseUrl) {
    $ApiBaseUrl = "http://localhost:5000"
}
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$webEnvPrefix += "`$env:FH_API_BASE_URL=$(ConvertTo-ServiceLiteral $ApiBaseUrl); `$env:PORT='$WebPort'; "

# Reseed prompts and configs into config.db so the dev server picks up file changes
Write-Host "Reseeding prompts and configs..."
try {
    Push-Location "$PSScriptRoot\..\apps\web"
    & npx tsx scripts/reseed-all-prompts.ts --quiet 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "Prompt/configuration reseed failed." }
    Pop-Location
    Write-Host "Reseed complete." -ForegroundColor Green
} catch {
    Pop-Location
    throw "Reseed failed; Web was not started. API may already be running: $($_.Exception.Message)"
}
Write-Host ""

# Start Web with the same log capture and ownership check as API.
Write-Host "Starting Web..."
$webStdout = Join-Path $startupLogDir "$startupId-web.stdout.log"
$webStderr = Join-Path $startupLogDir "$startupId-web.stderr.log"
$webShell = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru -RedirectStandardOutput $webStdout -RedirectStandardError $webStderr -ArgumentList @(
  "-NoProfile", "-NoExit",
  "-Command",
  "Set-Location -LiteralPath $(ConvertTo-ServiceLiteral (Join-Path $repoRoot 'apps\web')); $webEnvPrefix npm run dev"
)
try {
    Assert-ServiceStartup -label "Web" -serviceShellProcessId $webShell.Id -serviceShellStartedAt $webShell.StartTime -ports @($WebPort) -stdoutPath $webStdout -stderrPath $webStderr
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Services started!"
Write-Host "Startup logs: $apiStdout, $apiStderr, $webStdout, $webStderr"
Write-Host ""
Write-Host "Web:    http://localhost:$WebPort  (use HTTP, not HTTPS)"
Write-Host "API:    $ApiBaseUrl"
Write-Host "Swagger:$ApiBaseUrl/swagger"
Write-Host ""
Write-Host "Note: Make sure apps/web/.env.local exists with required environment variables."

} finally {
    foreach ($key in $savedProviderRouting.Keys) { [Environment]::SetEnvironmentVariable($key, $savedProviderRouting[$key], 'Process') }
}
