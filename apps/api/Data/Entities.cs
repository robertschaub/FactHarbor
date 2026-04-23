using System.ComponentModel.DataAnnotations;

namespace FactHarbor.Api.Data;

public sealed class JobEntity
{
    [Key]
    public string JobId { get; set; } = Guid.NewGuid().ToString("N");

    public string Status { get; set; } = "QUEUED";
    public int Progress { get; set; } = 0;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;

    public string InputType { get; set; } = "text";
    public string InputValue { get; set; } = "";

    public string? InputPreview { get; set; }

    [MaxLength(64)]
    public string? InviteCode { get; set; }

    /// <summary>
    /// Pipeline variant: "claimboundary" (default)
    /// </summary>
    public string PipelineVariant { get; set; } = "claimboundary";

    // Retry tracking
    /// <summary>
    /// If this job is a retry, the JobId of the root (original) job.
    /// Always points to the root, not the immediate parent.
    /// </summary>
    public string? ParentJobId { get; set; }

    /// <summary>
    /// Number of times this job (or its ancestors) has been retried.
    /// 0 = original job, 1 = first retry, 2 = second retry, etc.
    /// </summary>
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Timestamp when this job was created as a retry of another job
    /// </summary>
    public DateTime? RetriedFromUtc { get; set; }

    /// <summary>
    /// Optional user-provided reason for retry (e.g., "trying different pipeline")
    /// </summary>
    public string? RetryReason { get; set; }

    // Prompt tracking (External Prompt File System)
    /// <summary>SHA-256 hash of the prompt content used for this analysis</summary>
    public string? PromptContentHash { get; set; }
    /// <summary>When the prompt was loaded from file for this analysis</summary>
    public DateTime? PromptLoadedUtc { get; set; }

    /// <summary>
    /// Git commit hash of the deployed code at job creation time.
    /// Allows admins to trace any job back to the exact code version that ran it.
    /// Populated from GIT_COMMIT env var (CI/CD) or `git rev-parse HEAD` (local dev).
    /// </summary>
    public string? GitCommitHash { get; set; }

    /// <summary>
    /// Git commit hash of the web runner that actually executed the latest analysis attempt.
    /// This is updated when the job enters RUNNING, including automatic re-queues after restart.
    /// </summary>
    public string? ExecutedWebGitCommitHash { get; set; }

    // Claim selection (ACS-1)
    public string? ClaimSelectionDraftId { get; set; }
    public string? PreparedStage1Json { get; set; }
    public string? ClaimSelectionJson { get; set; }

    // Stored outputs
    public string? ResultJson { get; set; }
    public string? ReportMarkdown { get; set; }

    /// <summary>
    /// Calculated verdict label (e.g., "TRUE", "MOSTLY-FALSE", "UNVERIFIED")
    /// extracted from ResultJson for display in lists.
    /// </summary>
    public string? VerdictLabel { get; set; }

    /// <summary>
    /// Calculated truth percentage (0-100) extracted from ResultJson.
    /// </summary>
    public int? TruthPercentage { get; set; }

    /// <summary>
    /// Calculated confidence percentage (0-100) extracted from ResultJson.
    /// </summary>
    public int? Confidence { get; set; }

    /// <summary>
    /// When true, this job is hidden from the default jobs list.
    /// Only admins can see and toggle hidden jobs.
    /// </summary>
    public bool IsHidden { get; set; } = false;
}

public sealed class ClaimSelectionDraftEntity
{
    [Key]
    public string DraftId { get; set; } = Guid.NewGuid().ToString("N");

    public string Status { get; set; } = "QUEUED";
    public int Progress { get; set; } = 0;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow.AddHours(24);

    public string OriginalInputType { get; set; } = "text";
    public string ActiveInputType { get; set; } = "text";
    public string OriginalInputValue { get; set; } = "";
    public string ActiveInputValue { get; set; } = "";

    public string PipelineVariant { get; set; } = "claimboundary";
    public string? InviteCode { get; set; }

    public string SelectionMode { get; set; } = "interactive";
    public bool RestartedViaOther { get; set; } = false;
    public int RestartCount { get; set; } = 0;

    public string? LastEventMessage { get; set; }
    public string? DraftStateJson { get; set; }

    public string? DraftAccessTokenHash { get; set; }
    public string? FinalJobId { get; set; }
}

public sealed class JobEventEntity
{
    [Key]
    public long Id { get; set; }

    public string JobId { get; set; } = "";
    public DateTime TsUtc { get; set; } = DateTime.UtcNow;
    public string Level { get; set; } = "info";
    public string Message { get; set; } = "";
}
