# deploy-ghpages.ps1
# Builds and deploys xWiki documentation to the gh-pages branch for GitHub Pages.
#
# Usage (from repo root):
#   powershell Docs/xwiki-pages/scripts/deploy-ghpages.ps1
#
# What it does:
#   1. Runs build_ghpages.py to generate index.html + pages.json
#   2. Switches to gh-pages branch (creates orphan if first time)
#   3. Copies generated files to branch root
#   4. Commits and pushes
#   5. Switches back to original branch

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Error "Not inside a git repository"
    exit 1
}

Set-Location $repoRoot

# Remember current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

# Step 1: Build
Write-Host "`n--- Building GitHub Pages ---" -ForegroundColor Yellow
$buildScript = Join-Path $scriptDir 'build_ghpages.py'
$buildDir = Join-Path $repoRoot 'gh-pages-build'

python $buildScript -o $buildDir
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Step 2: Stash uncommitted changes if any
$hasChanges = git status --porcelain
$stashed = $false
if ($hasChanges) {
    Write-Host "`nStashing uncommitted changes..." -ForegroundColor Yellow
    git stash push -m "deploy-ghpages: auto-stash"
    $stashed = $true
}

try {
    # Step 3: Switch to gh-pages branch
    $branchExists = git rev-parse --verify gh-pages 2>$null
    if ($branchExists) {
        Write-Host "`nSwitching to gh-pages branch..." -ForegroundColor Yellow
        git checkout gh-pages
    } else {
        Write-Host "`nCreating gh-pages orphan branch..." -ForegroundColor Yellow
        git checkout --orphan gh-pages
        git rm -rf . 2>$null
        # Clean up any leftover files
        git clean -fd 2>$null
    }

    # Step 4: Copy generated files
    Write-Host "Copying generated files..." -ForegroundColor Yellow
    Copy-Item (Join-Path $buildDir 'index.html') -Destination (Join-Path $repoRoot 'index.html') -Force
    Copy-Item (Join-Path $buildDir 'pages.json') -Destination (Join-Path $repoRoot 'pages.json') -Force
    Copy-Item (Join-Path $buildDir '.nojekyll') -Destination (Join-Path $repoRoot '.nojekyll') -Force

    # Step 5: Commit
    git add index.html pages.json .nojekyll
    $date = Get-Date -Format 'yyyy-MM-dd'
    $commitHash = git -C $repoRoot log $currentBranch -1 --format='%h' 2>$null
    $msg = "docs: update gh-pages ($date, $commitHash)"

    $hasStaged = git diff --cached --name-only
    if ($hasStaged) {
        git commit -m $msg
        Write-Host "`nCommitted: $msg" -ForegroundColor Green

        # Step 6: Push
        Write-Host "Pushing to origin/gh-pages..." -ForegroundColor Yellow
        git push origin gh-pages
        Write-Host "Pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nNo changes to deploy." -ForegroundColor Yellow
    }
} finally {
    # Step 7: Switch back to original branch
    Write-Host "`nSwitching back to $currentBranch..." -ForegroundColor Yellow
    git checkout $currentBranch

    # Step 8: Restore stash if needed
    if ($stashed) {
        Write-Host "Restoring stashed changes..." -ForegroundColor Yellow
        git stash pop
    }
}

# Clean up build directory
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
    Write-Host "Cleaned up $buildDir" -ForegroundColor Gray
}

Write-Host "`n--- Done! ---" -ForegroundColor Green
Write-Host "GitHub Pages will update at: https://<username>.github.io/FactHarbor/" -ForegroundColor Cyan
Write-Host "Configure in: GitHub repo Settings > Pages > Branch: gh-pages, folder: / (root)" -ForegroundColor Gray
