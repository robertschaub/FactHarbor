using System.Diagnostics;

namespace FactHarbor.Api.Helpers;

/// <summary>
/// Holds build-time metadata resolved once at startup and injected as a singleton.
/// GitCommitHash is stored on every Job at creation so admins can trace any job
/// back to the exact deployed code version that ran it.
///
/// Format:
///   Clean working tree : "{hash}"              e.g. "cdd78d0f"
///   Dirty working tree : "{hash}-{timestamp}"  e.g. "cdd78d0f-20260322T1904"
///
/// The timestamp suffix marks local dev runs with uncommitted changes so jobs
/// cannot be confused with a clean, reproducible commit state. The timestamp
/// is the UTC assembly build time (minutes precision) — constant across restarts
/// of the same binary, changing only when the code is rebuilt.
/// </summary>
public sealed record AppBuildInfo(string? GitCommitHash)
{
    // A valid full or abbreviated git commit hash is 7–40 lowercase hex chars.
    private static bool IsValidHash(string s) =>
        s.Length >= 7 && s.Length <= 40 && s.All(char.IsAsciiHexDigit);

    /// <summary>
    /// Resolves the git commit hash by:
    /// 1. Reading the GIT_COMMIT env var (set by CI/CD at deployment — always clean)
    /// 2. Falling back to `git rev-parse HEAD` + dirty check (local dev, 3-second timeout)
    /// 3. Returning null if neither is available
    /// </summary>
    public static AppBuildInfo Resolve()
    {
        // 1. Deployment-injected env var — always a clean commit on the VPS.
        var envHash = Environment.GetEnvironmentVariable("GIT_COMMIT")?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(envHash) && IsValidHash(envHash))
            return new AppBuildInfo(envHash);

        // 2. Local dev fallback: run git with a hard 3-second wall-clock timeout.
        //    We read stdout on a background thread so WaitForExit(3000) is the real gate.
        try
        {
            var hash = RunGit("rev-parse HEAD");
            if (hash is null || !IsValidHash(hash))
                return new AppBuildInfo(GitCommitHash: null);

            // Check for uncommitted changes. Any output from --porcelain means dirty.
            var porcelain = RunGit("status --porcelain");
            if (!string.IsNullOrWhiteSpace(porcelain))
            {
                // Append the assembly build timestamp so all jobs from the same dirty
                // binary share the same identifier regardless of how many times the
                // server is restarted. Format: yyyyMMddTHHmm (UTC, minutes precision).
                var buildTime = File.GetLastWriteTimeUtc(typeof(AppBuildInfo).Assembly.Location);
                var ts = buildTime.ToString("yyyyMMddTHHmm");
                return new AppBuildInfo($"{hash}-{ts}");
            }

            return new AppBuildInfo(hash);
        }
        catch { /* git not available or not in a repo */ }

        return new AppBuildInfo(GitCommitHash: null);
    }

    /// <summary>
    /// Runs a git command and returns trimmed stdout, or null on timeout/error.
    /// </summary>
    private static string? RunGit(string arguments)
    {
        try
        {
            var psi = new ProcessStartInfo("git", arguments)
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = AppContext.BaseDirectory
            };
            using var proc = Process.Start(psi);
            if (proc is null) return null;

            var readTask = Task.Run(() => proc.StandardOutput.ReadToEnd());
            if (!proc.WaitForExit(3000))
            {
                try { proc.Kill(); } catch { }
                return null;
            }
            readTask.Wait(500);
            return readTask.IsCompletedSuccessfully ? readTask.Result.Trim().ToLowerInvariant() : null;
        }
        catch { return null; }
    }
}
