using System;
using System.ComponentModel.DataAnnotations;

namespace FactHarbor.Api.Data;

public sealed class InviteCodeEntity
{
    [Key]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int MaxJobs { get; set; } = 5;

    /// <summary>Max submissions allowed per UTC calendar day. 0 = unlimited.</summary>
    public int DailyLimit { get; set; } = 2;

    /// <summary>Max submissions allowed per rolling 60-minute window. 0 = unlimited.</summary>
    public int HourlyLimit { get; set; } = 5;

    public int UsedJobs { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresUtc { get; set; }
}
