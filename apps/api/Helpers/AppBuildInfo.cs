using System.Diagnostics;
using System.Security.Cryptography;

namespace FactHarbor.Api.Helpers;

/// <summary>
/// Resolves the current build/repo provenance for API responses and new job rows.
///
/// Format:
///   Clean working tree : "{hash}"           e.g. "cdd78d0f"
///   Dirty working tree : "{hash}+{wthash}"  e.g. "cdd78d0f+a3f9b201"
///
/// The working-tree hash is the first 8 hex chars of SHA256("git diff HEAD"),
/// giving a reproducible fingerprint for the exact tracked-file change set.
///
/// Important behavior:
/// - Production prefers the deployment-injected GIT_COMMIT env var.
/// - Local development falls back to live git resolution.
/// - Resolution is dynamic rather than startup-frozen, so new local commits are
///   visible on newly created jobs without requiring an API restart.
/// </summary>
public sealed class AppBuildInfo
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(30);
    private readonly object _cacheLock = new();
    private string? _cachedGitCommitHash;
    private DateTime _cacheExpiresUtc = DateTime.MinValue;

    public string? GitCommitHash => GetGitCommitHash();

    public string? GetGitCommitHash(bool useCache = true)
    {
        if (!useCache)
            return ResolveCurrentBuildId();

        var now = DateTime.UtcNow;
        lock (_cacheLock)
        {
            if (_cacheExpiresUtc > now)
                return _cachedGitCommitHash;
        }

        var resolved = ResolveCurrentBuildId();
        lock (_cacheLock)
        {
            _cachedGitCommitHash = resolved;
            _cacheExpiresUtc = now + CacheTtl;
        }
        return resolved;
    }

    // A valid full or abbreviated git commit hash is 7-40 lowercase hex chars.
    private static bool IsValidHash(string s) =>
        s.Length >= 7 && s.Length <= 40 && s.All(char.IsAsciiHexDigit);

    private static bool IsValidDirtySuffix(string s) =>
        s.Equals("dirty", StringComparison.OrdinalIgnoreCase) ||
        (s.Length == 8 && s.All(char.IsAsciiHexDigit));

    private static string? NormalizeBuildId(string? value)
    {
        var trimmed = value?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(trimmed))
            return null;

        if (IsValidHash(trimmed))
            return trimmed;

        var plusIndex = trimmed.IndexOf('+');
        if (plusIndex <= 0)
            return null;

        var baseHash = trimmed[..plusIndex];
        var suffix = trimmed[(plusIndex + 1)..];
        if (!IsValidHash(baseHash) || !IsValidDirtySuffix(suffix))
            return null;

        return $"{baseHash}+{suffix}";
    }

    private static string? ResolveCurrentBuildId()
    {
        // 1. Deployment-injected env var — canonical for deployed services.
        var envHash = NormalizeBuildId(Environment.GetEnvironmentVariable("GIT_COMMIT"));
        if (!string.IsNullOrWhiteSpace(envHash))
            return envHash;

        // 2. Local dev fallback: run git with a hard timeout.
        try
        {
            var hash = RunGit("rev-parse HEAD");
            if (hash is null || !IsValidHash(hash))
                return null;

            // Any output from --porcelain means the worktree is dirty.
            var porcelain = RunGit("status --porcelain");
            if (!string.IsNullOrWhiteSpace(porcelain))
            {
                var wtHash = ComputeWorkingTreeHash();
                return wtHash is not null ? $"{hash}+{wtHash}" : $"{hash}+dirty";
            }

            return hash;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Returns the first 8 hex chars of SHA256("git diff HEAD"), or null on failure.
    /// Uses a 5-second timeout since diffs can be large.
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
        catch
        {
            return null;
        }
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
        catch
        {
            return null;
        }
    }
}
