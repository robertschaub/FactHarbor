param(
    [string]$Tag = "",
    [string]$SshKey = "$env:USERPROFILE\.ssh\fh",
    [string]$Host = "ubuntu@83.228.221.114",
    [switch]$DryRun
)

<#
.SYNOPSIS
    Deploy FactHarbor to VPS from local Windows machine.

.DESCRIPTION
    SSHes into the VPS and runs the deploy.sh script.
    Optionally pushes local changes to GitHub first.

.PARAMETER Tag
    Optional git tag to deploy (e.g., "v1.0.0"). If omitted, deploys latest main.

.PARAMETER SshKey
    Path to SSH private key. Defaults to ~/.ssh/fh.

.PARAMETER Host
    SSH host string. Defaults to ubuntu@83.228.221.114.

.PARAMETER DryRun
    Show what would be done without executing.

.EXAMPLE
    .\scripts\deploy-remote.ps1                    # Deploy latest main
    .\scripts\deploy-remote.ps1 -Tag v1.0.0        # Deploy specific tag
    .\scripts\deploy-remote.ps1 -DryRun             # Show what would happen
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FactHarbor Remote Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Pre-flight: Check SSH key exists ---
if (-not (Test-Path $SshKey)) {
    Write-Host "SSH key not found: $SshKey" -ForegroundColor Red
    Write-Host "Set -SshKey parameter or ensure ~/.ssh/fh exists." -ForegroundColor Red
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
Write-Host "Target: $Host" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "[DryRun] Would run:" -ForegroundColor Gray
    Write-Host "  ssh -i $SshKey -t $Host `"$deployCmd`"" -ForegroundColor Gray
    exit 0
}

# --- Execute remote deployment ---
Write-Host "Connecting to VPS..." -ForegroundColor Cyan
ssh -i $SshKey -t $Host $deployCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Remote deployment failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "SSH into VPS to investigate: ssh -i $SshKey $Host" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Remote deployment complete!" -ForegroundColor Green
Write-Host "  Verify: https://app.factharbor.ch/api/health" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
