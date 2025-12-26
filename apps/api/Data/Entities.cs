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
