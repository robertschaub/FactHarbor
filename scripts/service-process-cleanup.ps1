$script:FhServiceCleanupRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:FhServiceCleanupApiPath = (Resolve-Path (Join-Path $script:FhServiceCleanupRepoRoot "apps\api")).Path
$script:FhServiceCleanupWebPath = (Resolve-Path (Join-Path $script:FhServiceCleanupRepoRoot "apps\web")).Path

function Get-FhProcessTree([array]$allProcesses, [int[]]$rootProcessIds) {
    $seen = @{}
    $queue = New-Object System.Collections.Queue
    $result = New-Object System.Collections.ArrayList

    foreach ($rootId in $rootProcessIds) {
        $rootKey = [string]$rootId
        if ($rootId -and -not $seen.ContainsKey($rootKey)) {
            $seen[$rootKey] = $true
            $queue.Enqueue($rootId)
        }
    }

    while ($queue.Count -gt 0) {
        $currentId = [int]$queue.Dequeue()
        $current = $allProcesses | Where-Object { $_.ProcessId -eq $currentId } | Select-Object -First 1
        if ($current) {
            [void]$result.Add($current)
        }

        foreach ($child in ($allProcesses | Where-Object { $_.ParentProcessId -eq $currentId })) {
            $childKey = [string]$child.ProcessId
            if (-not $seen.ContainsKey($childKey)) {
                $seen[$childKey] = $true
                $queue.Enqueue([int]$child.ProcessId)
            }
        }
    }

    return @($result)
}

function Stop-FhCimProcesses([string]$label, [array]$cimProcesses) {
    $unique = @($cimProcesses | Where-Object { $_ } | Sort-Object ProcessId -Unique)
    if ($unique.Count -eq 0) {
        return
    }

    foreach ($cim in ($unique | Sort-Object CreationDate -Descending)) {
        try {
            $proc = Get-Process -Id $cim.ProcessId -ErrorAction Stop
            Write-Host "Killing $label PID $($proc.Id) ($($proc.ProcessName))..." -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } catch {
            # Process already exited between enumeration and cleanup.
        }
    }
}

function Test-FhInitialServiceProcess($cim) {
    if (!$cim -or [string]::IsNullOrWhiteSpace($cim.CommandLine)) {
        return $false
    }

    $name = $cim.Name.ToLowerInvariant()
    $commandLine = $cim.CommandLine
    $repoRoot = [regex]::Escape($script:FhServiceCleanupRepoRoot)
    $apiPath = [regex]::Escape($script:FhServiceCleanupApiPath)
    $webPath = [regex]::Escape($script:FhServiceCleanupWebPath)

    if ($name -match '^(powershell|pwsh)\.exe$') {
        return (
            $commandLine -match $apiPath -or
            $commandLine -match $webPath -or
            (($commandLine -match 'dotnet\s+watch\s+run|npm\s+run\s+dev') -and $commandLine -match $repoRoot)
        )
    }

    if ($name -eq 'dotnet.exe') {
        return (
            $commandLine -match $apiPath -or
            $commandLine -match 'FactHarbor\.Api(\.csproj|\.dll|\.exe)'
        )
    }

    if ($name -eq 'node.exe') {
        return (
            $commandLine -match $webPath -or
            ($commandLine -match $repoRoot -and $commandLine -match 'next\\dist|npm-cli\.js.*run\s+dev|start-server\.js')
        )
    }

    return $false
}

function Test-FhServiceAncestor($cim) {
    if (!$cim -or [string]::IsNullOrWhiteSpace($cim.CommandLine)) {
        return $false
    }

    $name = $cim.Name.ToLowerInvariant()
    $commandLine = $cim.CommandLine
    $repoRoot = [regex]::Escape($script:FhServiceCleanupRepoRoot)
    $apiPath = [regex]::Escape($script:FhServiceCleanupApiPath)
    $webPath = [regex]::Escape($script:FhServiceCleanupWebPath)

    if ($name -match '^(powershell|pwsh)\.exe$') {
        return (
            $commandLine -match $apiPath -or
            $commandLine -match $webPath -or
            (($commandLine -match 'dotnet\s+watch\s+run|npm\s+run\s+dev') -and $commandLine -match $repoRoot)
        )
    }

    if ($name -eq 'dotnet.exe') {
        return (
            $commandLine -match 'dotnet-watch\.dll|dotnet\.exe"\s+watch\s+run|dotnet\s+watch\s+run|run --no-build' -or
            $commandLine -match 'FactHarbor\.Api(\.csproj|\.dll|\.exe)' -or
            $commandLine -match $apiPath
        )
    }

    if ($name -eq 'node.exe') {
        return (
            $commandLine -match $webPath -or
            ($commandLine -match $repoRoot -and $commandLine -match 'next\\dist|npm-cli\.js.*run\s+dev|start-server\.js')
        )
    }

    return $false
}

function Stop-Gracefully([string]$label, $cimProcesses) {
    if (!$cimProcesses) {
        Write-Host "No running $label processes found."
        return
    }

    $allProcesses = @(Get-CimInstance Win32_Process)
    foreach ($cim in $cimProcesses) {
        $tree = @(Get-FhProcessTree -allProcesses $allProcesses -rootProcessIds @([int]$cim.ProcessId))
        try {
            $proc = Get-Process -Id $cim.ProcessId -ErrorAction Stop
            Write-Host "Stopping $label PID $($proc.Id) ($($proc.ProcessName))..." -ForegroundColor Yellow
            $closed = $proc.CloseMainWindow()
            if ($closed) {
                Wait-Process -Id $proc.Id -Timeout 10 -ErrorAction SilentlyContinue
            } else {
                Write-Host "  Could not signal graceful close for PID $($proc.Id); force-cleaning its process tree." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Could not stop PID $($cim.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
        }

        $remaining = @($tree | Where-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue })
        if ($remaining.Count -gt 0) {
            Stop-FhCimProcesses -label $label -cimProcesses $remaining
        }
    }
}

function Stop-FactHarborServiceProcesses {
    $allProcesses = @(Get-CimInstance Win32_Process)
    $matches = @($allProcesses | Where-Object { Test-FhInitialServiceProcess $_ })
    if ($matches.Count -eq 0) {
        Write-Host "No leftover FactHarbor service process trees found."
        return
    }

    $ids = @{}
    foreach ($match in $matches) {
        $ids[[int]$match.ProcessId] = $true

        $parentId = [int]$match.ParentProcessId
        while ($parentId -gt 0) {
            $parent = $allProcesses | Where-Object { $_.ProcessId -eq $parentId } | Select-Object -First 1
            if (-not (Test-FhServiceAncestor $parent)) {
                break
            }

            $ids[[int]$parent.ProcessId] = $true
            $parentId = [int]$parent.ParentProcessId
        }
    }

    $processTree = @(Get-FhProcessTree -allProcesses $allProcesses -rootProcessIds @($ids.Keys))
    Write-Host "Cleaning leftover FactHarbor service process tree(s)..." -ForegroundColor Yellow
    Stop-FhCimProcesses -label "FactHarbor service" -cimProcesses $processTree
}

function Stop-OrphanedDotnetWatchProcesses {
    $allProcesses = @(Get-CimInstance Win32_Process)
    $watchRoots = @($allProcesses | Where-Object {
        $_.Name -eq 'dotnet.exe' -and
        $_.CommandLine -match 'dotnet\.exe"\s+watch\s+run|dotnet\s+watch\s+run'
    })

    $orphanedRoots = New-Object System.Collections.ArrayList
    foreach ($root in $watchRoots) {
        $parent = $allProcesses | Where-Object { $_.ProcessId -eq $root.ParentProcessId } | Select-Object -First 1
        if ($parent) {
            continue
        }

        [void]$orphanedRoots.Add($root)
    }

    if ($orphanedRoots.Count -eq 0) {
        Write-Host "No orphaned dotnet watch process trees found."
        return
    }

    $processTree = @(Get-FhProcessTree -allProcesses $allProcesses -rootProcessIds @($orphanedRoots | ForEach-Object { [int]$_.ProcessId }))
    Write-Host "Cleaning orphaned dotnet watch process tree(s) with missing parent shells..." -ForegroundColor Yellow
    Stop-FhCimProcesses -label "orphaned dotnet watch" -cimProcesses $processTree
}
