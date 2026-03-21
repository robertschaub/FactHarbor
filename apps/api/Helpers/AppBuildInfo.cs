using System.Diagnostics;

namespace FactHarbor.Api.Helpers;

/// <summary>
/// Holds build-time metadata resolved once at startup and injected as a singleton.
/// GitCommitHash is stored on every Job at creation so admins can trace any job
/// back to the exact deployed code version that ran it.
/// </summary>
public sealed record AppBuildInfo(string? GitCommitHash)
{
    // A valid full or abbreviated git commit hash is 7–40 lowercase hex chars.
    private static bool IsValidHash(string s) =>
        s.Length >= 7 && s.Length <= 40 && s.All(char.IsAsciiHexDigit);

    /// <summary>
    /// Resolves the git commit hash by:
    /// 1. Reading the GIT_COMMIT env var (set by CI/CD at deployment)
    /// 2. Falling back to `git rev-parse HEAD` (local dev, 3-second hard timeout)
    /// 3. Returning null if neither is available
    /// </summary>
    public static AppBuildInfo Resolve()
    {
        // 1. Deployment-injected env var — validated before use.
        var envHash = Environment.GetEnvironmentVariable("GIT_COMMIT")?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(envHash) && IsValidHash(envHash))
            return new AppBuildInfo(envHash);

        // 2. Local dev fallback: run git with a hard 3-second wall-clock timeout.
        //    We read stdout on a background thread so WaitForExit(3000) is the real gate.
        //    ReadToEnd() alone would block indefinitely if the process hangs.
        try
        {
            var psi = new ProcessStartInfo("git", "rev-parse HEAD")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = AppContext.BaseDirectory
            };
            using var proc = Process.Start(psi);
            if (proc is not null)
            {
                // Read stdout on a background thread so the WaitForExit timeout is effective.
                var readTask = Task.Run(() => proc.StandardOutput.ReadToEnd());
                if (proc.WaitForExit(3000) && readTask.IsCompletedSuccessfully)
                {
                    var hash = readTask.Result.Trim().ToLowerInvariant();
                    if (IsValidHash(hash))
                        return new AppBuildInfo(hash);
                }
                else
                {
                    // Timed out or read failed — kill the process to avoid zombies.
                    try { proc.Kill(); } catch { }
                }
            }
        }
        catch { /* git not available or not in a repo */ }

        return new AppBuildInfo(GitCommitHash: null);
    }
}
