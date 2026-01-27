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
    /// Pipeline variant: "orchestrated" (default), "monolithic_canonical", or "monolithic_dynamic"
    /// </summary>
    public string PipelineVariant { get; set; } = "orchestrated";

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
