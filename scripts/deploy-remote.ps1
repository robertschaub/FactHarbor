param(
    [string]$Tag = "",
    [string]$SshKey = "",
    [string]$SshHost = "",
    [switch]$DryRun
)

<#
.SYNOPSIS
    Deploy FactHarbor to VPS from local Windows machine.

.DESCRIPTION
    SSHes into the VPS and runs the deploy.sh script.
    Reads connection details from scripts/.deploy.env (gitignored).
    Optionally pushes local changes to GitHub first.

.PARAMETER Tag
    Optional git tag to deploy (e.g., "v1.0.0"). If omitted, deploys latest main.

.PARAMETER SshKey
    Path to SSH private key. Overrides DEPLOY_SSH_KEY from .deploy.env.

.PARAMETER SshHost
    SSH host string (e.g., "user@host"). Overrides DEPLOY_SSH_HOST from .deploy.env.

.PARAMETER DryRun
    Show what would be done without executing.

.EXAMPLE
    .\scripts\deploy-remote.ps1                    # Deploy latest main
    .\scripts\deploy-remote.ps1 -Tag v1.0.0        # Deploy specific tag
    .\scripts\deploy-remote.ps1 -DryRun             # Show what would happen
#>

$ErrorActionPreference = "Stop"

# --- Load connection config from .deploy.env ---
$envFile = Join-Path $PSScriptRoot ".deploy.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)\s*$') {
            Set-Variable -Name $Matches[1] -Value $Matches[2].Trim()
        }
    }
}

# Apply defaults from .deploy.env, allow param overrides
if (-not $SshKey) { $SshKey = if ($DEPLOY_SSH_KEY) { $DEPLOY_SSH_KEY } else { "$env:USERPROFILE\.ssh\fh" } }
if (-not $SshHost) { $SshHost = if ($DEPLOY_SSH_HOST) { $DEPLOY_SSH_HOST } else { "" } }

if (-not $SshHost) {
    Write-Host "No SSH host configured." -ForegroundColor Red
    Write-Host "Create scripts/.deploy.env with:" -ForegroundColor Yellow
    Write-Host "  DEPLOY_SSH_HOST=user@your-server-ip" -ForegroundColor Yellow
    Write-Host "  DEPLOY_SSH_KEY=~/.ssh/your-key" -ForegroundColor Yellow
    Write-Host "Or pass -Host parameter directly." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FactHarbor Remote Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Pre-flight: Check SSH key exists ---
$resolvedKey = $SshKey -replace '~', $env:USERPROFILE
if (-not (Test-Path $resolvedKey)) {
    Write-Host "SSH key not found: $SshKey" -ForegroundColor Red
    Write-Host "Set DEPLOY_SSH_KEY in scripts/.deploy.env or pass -SshKey parameter." -ForegroundColor Red
    exit 1
}

# --- Pre-flight: Check for unpushed commits ---
$ahead = git rev-list --count "origin/main..HEAD" 2>$null
if ($ahead -gt 0) {
    Write-Host "Local branch is $ahead commit(s) ahead of origin/main." -ForegroundColor Yellow
    $response = Read-Host "Push to origin/main first? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        if ($DryRun) {
            Write-Host "[DryRun] Would run: git push origin main" -ForegroundColor Gray
        } else {
            Write-Host "Pushing to origin/main..." -ForegroundColor Yellow
            git push origin main
            Write-Host "Push complete." -ForegroundColor Green
        }
    } else {
        Write-Host "Skipping push. VPS will deploy whatever is on GitHub." -ForegroundColor Yellow
    }
}

# --- Build SSH command ---
$deployCmd = "/opt/factharbor/scripts/deploy.sh"
if ($Tag) {
    $deployCmd += " $Tag"
    Write-Host "Deploying tag: $Tag" -ForegroundColor Yellow
} else {
    Write-Host "Deploying latest main" -ForegroundColor Yellow
}
Write-Host "Target: $SshHost" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "[DryRun] Would run:" -ForegroundColor Gray
    Write-Host "  ssh -i $SshKey -t $SshHost `"$deployCmd`"" -ForegroundColor Gray
    exit 0
}

# --- Execute remote deployment ---
Write-Host "Connecting to VPS..." -ForegroundColor Cyan
ssh -i $SshKey -t $SshHost $deployCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Remote deployment failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "SSH into VPS to investigate: ssh -i $SshKey $SshHost" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Remote deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
