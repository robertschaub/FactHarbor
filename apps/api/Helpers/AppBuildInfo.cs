using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;

namespace FactHarbor.Api.Helpers;

/// <summary>
/// Holds build-time metadata resolved once at startup and injected as a singleton.
/// GitCommitHash is stored on every Job at creation so admins can trace any job
/// back to the exact deployed code version that ran it.
///
/// Format:
///   Clean working tree : "{hash}"           e.g. "cdd78d0f"
///   Dirty working tree : "{hash}+{wthash}"  e.g. "cdd78d0f+a3f9b201"
///
/// The working-tree hash is the first 8 hex chars of SHA256("git diff HEAD"),
/// giving a unique, reproducible fingerprint for the exact local change set.
/// Two restarts with identical uncommitted changes produce the same identifier.
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
        try
        {
            var hash = RunGit("rev-parse HEAD");
            if (hash is null || !IsValidHash(hash))
                return new AppBuildInfo(GitCommitHash: null);

            // Check for uncommitted changes. Any output from --porcelain means dirty.
            var porcelain = RunGit("status --porcelain");
            if (!string.IsNullOrWhiteSpace(porcelain))
            {
                // Compute SHA256 of the full diff to get a reproducible fingerprint
                // for the exact working-tree change set. Two restarts with the same
                // uncommitted changes produce the same identifier.
                var wtHash = ComputeWorkingTreeHash();
                return new AppBuildInfo(wtHash is not null ? $"{hash}+{wtHash}" : $"{hash}+dirty");
            }

            return new AppBuildInfo(hash);
        }
        catch { /* git not available or not in a repo */ }

        return new AppBuildInfo(GitCommitHash: null);
    }

    /// <summary>
    /// Returns the first 8 hex chars of SHA256("git diff HEAD"), or null on failure.
    /// Uses a 5-second timeout — diffs can be large.
    /// </summary>
    private static string? ComputeWorkingTreeHash()
    {
        try
        {
            var psi = new ProcessStartInfo("git", "diff HEAD")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = AppContext.BaseDirectory
            };
            using var proc = Process.Start(psi);
            if (proc is null) return null;

            // Stream stdout directly into SHA256 to avoid buffering the full diff in memory.
            using var sha = SHA256.Create();
            var hashTask = Task.Run(() =>
            {
                sha.ComputeHash(proc.StandardOutput.BaseStream);
                return sha.Hash;
            });

            if (!proc.WaitForExit(5000))
            {
                try { proc.Kill(); } catch { }
                return null;
            }
            hashTask.Wait(500);
            if (!hashTask.IsCompletedSuccessfully || hashTask.Result is null) return null;

            return Convert.ToHexString(hashTask.Result)[..8].ToLowerInvariant();
        }
        catch { return null; }
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
