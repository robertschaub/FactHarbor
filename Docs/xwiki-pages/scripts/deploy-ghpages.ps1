# deploy-ghpages.ps1
# Builds xWiki documentation for local preview of the GitHub Pages output.
#
# NOTE: Actual deployment to gh-pages is handled by CI (.github/workflows/deploy-docs.yml).
#       CI injects the DOCS_ANALYTICS_URL secret so the stats button works.
#       Do NOT push to gh-pages manually — it will overwrite the CI build and break analytics.
#
# Usage (from repo root):
#   powershell Docs/xwiki-pages/scripts/deploy-ghpages.ps1
#
# What it does:
#   1. Runs build_ghpages.py to generate index.html + pages.json in gh-pages-build/
#   2. Switches to gh-pages branch
#   3. Copies generated files (local preview only, does NOT push)
#   4. Switches back to original branch
#
# To publish: push to main — CI deploys automatically.

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
    # Use git branch --list to avoid stderr with $ErrorActionPreference = 'Stop'
    $localBranch = git branch --list gh-pages
    $remoteBranch = git branch --list -r origin/gh-pages
    if ($localBranch) {
        Write-Host "`nSwitching to local gh-pages branch..." -ForegroundColor Yellow
        git checkout gh-pages
    } elseif ($remoteBranch) {
        Write-Host "`nChecking out gh-pages from remote..." -ForegroundColor Yellow
        git checkout -b gh-pages origin/gh-pages
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

    # Step 5: Commit (local only — CI handles deployment)
    git add index.html pages.json .nojekyll
    $date = Get-Date -Format 'yyyy-MM-dd'
    $commitHash = git -C $repoRoot log $currentBranch -1 --format='%h' 2>$null
    $msg = "docs: update gh-pages ($date, $commitHash)"

    $hasStaged = git diff --cached --name-only
    if ($hasStaged) {
        git commit -m $msg
        Write-Host "`nCommitted: $msg" -ForegroundColor Green
        Write-Host "NOTE: Not pushing — CI handles gh-pages deployment with analytics." -ForegroundColor Yellow
        Write-Host "      Push to main and CI will deploy automatically." -ForegroundColor Yellow
    } else {
        Write-Host "`nNo changes to commit." -ForegroundColor Yellow
    }
} finally {
    # Step 6: Switch back to original branch
    Write-Host "`nSwitching back to $currentBranch..." -ForegroundColor Yellow
    git checkout $currentBranch

    # Step 7: Restore stash if needed
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
Write-Host "Local build complete. To publish, push to main — CI deploys with analytics." -ForegroundColor Cyan
Write-Host "Live site: https://robertschaub.github.io/FactHarbor/" -ForegroundColor Gray
