<#
.SYNOPSIS
    Launches XWiki Viewer with a local HTTP server and opens it in your browser.
    Place this script alongside xwiki-viewer.html in your project.

.DESCRIPTION
    Starts a lightweight .NET HttpListener on localhost, serves the viewer,
    and opens Chrome/Edge with the folder picker auto-triggered.
    Press Ctrl+C in the terminal to stop the server.

.PARAMETER Port
    Port number for the local server (default: 8471)

.PARAMETER Browser
    Browser to open: 'chrome', 'edge', or 'default' (default: 'chrome')

.PARAMETER NoAutoOpen
    Skip auto-triggering the folder picker on load

.EXAMPLE
    .\Open-XWikiViewer.ps1
    .\Open-XWikiViewer.ps1 -Port 9000 -Browser edge
    .\Open-XWikiViewer.ps1 -NoAutoOpen
#>
param(
    [int]$Port = 8471,
    [ValidateSet('chrome','edge')]
    [string]$Browser = 'chrome',
    [switch]$NoAutoOpen
)

$ErrorActionPreference = 'Stop'

# Kill any existing processes on our port range
function Stop-ExistingListeners {
    param([int]$StartPort, [int]$Range = 10)

    for ($p = $StartPort; $p -lt ($StartPort + $Range); $p++) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {
                if ($conn.OwningProcess -and $conn.OwningProcess -ne 0) {
                    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Warning "Killing existing process on port $p`: $($proc.ProcessName) (PID: $($proc.Id))"
                        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Milliseconds 200
                    }
                }
            }
        } catch {
            # Port not in use or access denied - continue
        }
    }
}

# Clean up any existing listeners on our port range
Stop-ExistingListeners -StartPort $Port -Range 10

# Resolve viewer HTML path (same directory as this script)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$viewerPath = Join-Path $scriptDir 'xwiki-viewer.html'

if (-not (Test-Path $viewerPath)) {
    Write-Error "xwiki-viewer.html not found in $scriptDir"
    exit 1
}

$viewerContent = [System.IO.File]::ReadAllBytes($viewerPath)

# Scan FactHarbor wiki directory for auto-loading
$wikiRoot = Join-Path (Split-Path $scriptDir) 'FactHarbor'
$manifestBytes = $null
if (Test-Path $wikiRoot) {
    $allFiles = Get-ChildItem -Path $wikiRoot -Recurse -File
    $wikiFiles = $allFiles | Where-Object { $_.Extension -eq '.xwiki' }
    $sortFiles = $allFiles | Where-Object { $_.Name -eq '_sort' }

    $fileList = @()
    foreach ($f in $wikiFiles) {
        $fileList += $f.FullName.Substring($wikiRoot.Length + 1).Replace('\', '/')
    }

    $sortData = @{}
    foreach ($sf in $sortFiles) {
        if ($sf.Directory.FullName -eq $wikiRoot) {
            $key = ''
        } else {
            $key = $sf.Directory.FullName.Substring($wikiRoot.Length + 1).Replace('\', '/')
        }
        $lines = @(Get-Content $sf.FullName -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') })
        $sortData[$key] = $lines
    }

    $manifest = @{ root = 'FactHarbor'; files = $fileList; sorts = $sortData }
    $manifestJson = $manifest | ConvertTo-Json -Depth 4 -Compress
    $manifestBytes = [System.Text.Encoding]::UTF8.GetBytes($manifestJson)
    Write-Host "  Wiki:   $wikiRoot ($($fileList.Count) pages)" -ForegroundColor DarkGray
}

$prefix = "http://localhost:$Port/"
$queryParam = if ($NoAutoOpen -or $manifestBytes) { '' } else { '?open=folder' }
$url = "${prefix}xwiki-viewer.html${queryParam}"

# MIME types for serving
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript'
    '.css'  = 'text/css'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.json' = 'application/json'
    '.ico'  = 'image/x-icon'
}

# Start HTTP listener - try multiple ports if needed
$listener = $null
$maxAttempts = 10
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        $listener = New-Object System.Net.HttpListener
        $prefix = "http://localhost:$Port/"
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        $url = "${prefix}xwiki-viewer.html${queryParam}"
        break
    } catch {
        if ($listener) {
            try { $listener.Close() } catch {}
        }
        $attempt++
        if ($attempt -ge $maxAttempts) {
            Write-Error "Could not find an available port after $maxAttempts attempts (tried $($Port - $maxAttempts + 1) to $Port)"
            exit 1
        }
        Write-Warning "Port $Port is in use. Trying port $($Port + 1)..."
        $Port++
    }
}

Write-Host ""
Write-Host "  XWiki Viewer Server" -ForegroundColor Yellow
Write-Host "  ===================" -ForegroundColor DarkYellow
Write-Host "  URL:    $url" -ForegroundColor Cyan
Write-Host "  Folder: $scriptDir" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

# Open browser (Chrome preferred, Edge fallback)
function Open-InChrome($targetUrl) {
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    $chromePath = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($chromePath) {
        Start-Process $chromePath -ArgumentList $targetUrl
        return $true
    }
    return $false
}

function Open-InEdge($targetUrl) {
    $edgePaths = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
    )
    $edgePath = $edgePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($edgePath) {
        Start-Process $edgePath -ArgumentList $targetUrl
        return $true
    }
    return $false
}

switch ($Browser) {
    'chrome' {
        if (-not (Open-InChrome $url)) {
            Write-Warning "Chrome not found, trying Edge..."
            if (-not (Open-InEdge $url)) {
                Write-Error "Neither Chrome nor Edge found. Please install one."
                exit 1
            }
        }
    }
    'edge' {
        if (-not (Open-InEdge $url)) {
            Write-Warning "Edge not found, trying Chrome..."
            if (-not (Open-InChrome $url)) {
                Write-Error "Neither Edge nor Chrome found. Please install one."
                exit 1
            }
        }
    }
}

# Serve requests
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $requestPath = $request.Url.LocalPath.TrimStart('/')

        # Serve the viewer HTML for root or viewer path
        if ($requestPath -eq '' -or $requestPath -eq 'xwiki-viewer.html') {
            $response.ContentType = 'text/html; charset=utf-8'
            $response.ContentLength64 = $viewerContent.Length
            $response.Headers.Add('Access-Control-Allow-Origin', '*')
            $response.OutputStream.Write($viewerContent, 0, $viewerContent.Length)
            Write-Host "  $(Get-Date -Format 'HH:mm:ss') GET /$requestPath" -ForegroundColor DarkGray
        }
        # Serve wiki manifest for auto-loading
        elseif ($requestPath -eq 'wiki-manifest.json' -and $manifestBytes) {
            $response.ContentType = 'application/json; charset=utf-8'
            $response.ContentLength64 = $manifestBytes.Length
            $response.Headers.Add('Access-Control-Allow-Origin', '*')
            $response.OutputStream.Write($manifestBytes, 0, $manifestBytes.Length)
            Write-Host "  $(Get-Date -Format 'HH:mm:ss') GET /wiki-manifest.json" -ForegroundColor DarkGray
        }
        # Serve wiki files from FactHarbor directory
        elseif ($requestPath.StartsWith('wiki/') -and $wikiRoot -and (Test-Path $wikiRoot)) {
            $wikiRelPath = [Uri]::UnescapeDataString($requestPath.Substring(5))
            $wikiFilePath = [System.IO.Path]::GetFullPath((Join-Path $wikiRoot $wikiRelPath))
            if ($wikiFilePath.StartsWith($wikiRoot) -and (Test-Path $wikiFilePath -PathType Leaf)) {
                $fileBytes = [System.IO.File]::ReadAllBytes($wikiFilePath)
                $response.ContentType = 'text/plain; charset=utf-8'
                $response.ContentLength64 = $fileBytes.Length
                $response.Headers.Add('Access-Control-Allow-Origin', '*')
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
        # Serve other files from the script directory (for potential local assets)
        else {
            $filePath = Join-Path $scriptDir $requestPath
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath)
                $contentType = $mimeTypes[$ext]
                if (-not $contentType) { $contentType = 'application/octet-stream' }
                $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $fileBytes.Length
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                Write-Host "  $(Get-Date -Format 'HH:mm:ss') GET /$requestPath" -ForegroundColor DarkGray
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`n  Server stopped." -ForegroundColor Yellow
}
