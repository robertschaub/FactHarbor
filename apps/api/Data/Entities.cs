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

    /// <summary>
    /// Pipeline variant: "orchestrated" (default) or "monolithic_dynamic"
    /// </summary>
    public string PipelineVariant { get; set; } = "orchestrated";

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

    // Stored outputs
    public string? ResultJson { get; set; }
    public string? ReportMarkdown { get; set; }
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
