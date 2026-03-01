namespace FactHarbor.Api.Data;

public sealed class InviteCodeUsageEntity
{
    /// <summary>Foreign key to InviteCodeEntity.Code.</summary>
    public string InviteCode { get; set; } = string.Empty;

    /// <summary>UTC date only — time component is always 00:00:00 UTC.</summary>
    public DateTime Date { get; set; }

    public int UsageCount { get; set; } = 0;
}
