using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Models;
using System.Text.Json;
using System.Globalization;

namespace FactHarbor.Api.Controllers;

[ApiController]
[Route("api/fh/metrics")]
public class MetricsController : ControllerBase
{
    private readonly FhDbContext _db;
    private readonly ILogger<MetricsController> _logger;

    public MetricsController(FhDbContext db, ILogger<MetricsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Store metrics for an analysis job (admin-only)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateMetrics([FromBody] JsonElement metricsPayload)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        try
        {
            // Extract jobId from payload
            if (!metricsPayload.TryGetProperty("jobId", out var jobIdProp))
            {
                return BadRequest(new { error = "Missing jobId in metrics payload" });
            }

            var jobId = jobIdProp.GetString();
            if (string.IsNullOrEmpty(jobId))
            {
                return BadRequest(new { error = "Invalid jobId format" });
            }

            // Verify job exists
            var jobExists = await _db.Jobs.AnyAsync(j => j.JobId == jobId);
            if (!jobExists)
            {
                return NotFound(new { error = $"Job {jobId} not found" });
            }

            // Store metrics
            var metrics = new AnalysisMetrics
            {
                Id = Guid.NewGuid(),
                JobId = jobId,
                MetricsJson = metricsPayload.GetRawText(),
                CreatedUtc = DateTime.UtcNow
            };

            _db.AnalysisMetrics.Add(metrics);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Stored metrics for job {JobId}", jobId);

            return Ok(new { id = metrics.Id, jobId = metrics.JobId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error storing metrics");
            return StatusCode(500, new { error = "Failed to store metrics" });
        }
    }

    /// <summary>
    /// Get metrics for a specific job (admin-only)
    /// </summary>
    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetMetricsByJob(string jobId)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        try
        {
            var metrics = await _db.AnalysisMetrics
                .Where(m => m.JobId == jobId)
                .OrderByDescending(m => m.CreatedUtc)
                .FirstOrDefaultAsync();

            if (metrics == null)
            {
                return NotFound(new { error = $"No metrics found for job {jobId}" });
            }

            return Content(metrics.MetricsJson, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving metrics for job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to retrieve metrics" });
        }
    }

    /// <summary>
    /// Get summary statistics for a date range (admin-only)
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummaryStats(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 100)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        try
        {
            var query = _db.AnalysisMetrics.AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(m => m.CreatedUtc >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(m => m.CreatedUtc <= endDate.Value);
            }

            // Backward-compatible behavior:
            // - limit > 0: cap result set
            // - limit <= 0: uncapped (all matching records in range)
            IQueryable<AnalysisMetrics> orderedQuery = query.OrderByDescending(m => m.CreatedUtc);
            if (limit > 0)
            {
                orderedQuery = orderedQuery.Take(limit);
            }

            var metricsRecords = await orderedQuery
                .Select(m => new { m.MetricsJson, m.CreatedUtc })
                .ToListAsync();

            if (metricsRecords.Count == 0)
            {
                return Ok(new
                {
                    count = 0,
                    avgDuration = 0,
                    avgCost = 0,
                    avgTokens = 0,
                    schemaComplianceRate = 0,
                    gate1PassRate = 0,
                    gate4HighConfidenceRate = 0,
                    failureModes = new
                    {
                        totalWarnings = 0,
                        totalRefusalEvents = 0,
                        totalDegradationEvents = 0,
                        avgRefusalRatePer100LlmCalls = 0.0,
                        avgDegradationRatePer100LlmCalls = 0.0,
                        byProvider = new Dictionary<string, object>(),
                        byStage = new Dictionary<string, object>(),
                        byTopic = new Dictionary<string, object>(),
                    }
                });
            }

            // Parse and aggregate metrics
            double totalDuration = 0;
            double totalCost = 0;
            double totalTokens = 0;
            int schemaCompliantCount = 0;
            double gate1PassSum = 0;
            double gate4HighConfidenceSum = 0;
            int totalWarnings = 0;
            int totalRefusalEvents = 0;
            int totalDegradationEvents = 0;
            double refusalRateSum = 0;
            double degradationRateSum = 0;
            var byProvider = new Dictionary<string, FailureModeCounter>(StringComparer.OrdinalIgnoreCase);
            var byStage = new Dictionary<string, FailureModeCounter>(StringComparer.OrdinalIgnoreCase);
            var byTopic = new Dictionary<string, FailureModeCounter>(StringComparer.OrdinalIgnoreCase);
            int count = 0;

            foreach (var record in metricsRecords)
            {
                try
                {
                    var doc = JsonDocument.Parse(record.MetricsJson);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("totalDurationMs", out var duration))
                    {
                        totalDuration += duration.GetDouble();
                    }

                    if (root.TryGetProperty("estimatedCostUSD", out var cost))
                    {
                        totalCost += cost.GetDouble();
                    }

                    if (root.TryGetProperty("tokenCounts", out var tokens) &&
                        tokens.TryGetProperty("totalTokens", out var total))
                    {
                        totalTokens += total.GetDouble();
                    }

                    // Schema compliance
                    if (root.TryGetProperty("schemaCompliance", out var compliance))
                    {
                        var understandSuccess = compliance.TryGetProperty("understand", out var u) &&
                                              u.TryGetProperty("success", out var us) && us.GetBoolean();
                        var verdictSuccess = compliance.TryGetProperty("verdict", out var v) &&
                                           v.TryGetProperty("success", out var vs) && vs.GetBoolean();
                        if (understandSuccess && verdictSuccess)
                        {
                            schemaCompliantCount++;
                        }
                    }

                    // Gate 1 pass rate
                    if (root.TryGetProperty("gate1Stats", out var gate1))
                    {
                        if (gate1.TryGetProperty("totalClaims", out var totalClaims) &&
                            gate1.TryGetProperty("passedClaims", out var passedClaims))
                        {
                            var gate1Total = totalClaims.GetInt32();
                            var gate1Passed = passedClaims.GetInt32();
                            if (gate1Total > 0)
                            {
                                gate1PassSum += (double)gate1Passed / gate1Total;
                            }
                        }
                    }

                    // Gate 4 high confidence rate
                    if (root.TryGetProperty("gate4Stats", out var gate4))
                    {
                        if (gate4.TryGetProperty("totalVerdicts", out var totalVerdicts) &&
                            gate4.TryGetProperty("highConfidence", out var highConf))
                        {
                            var gate4Total = totalVerdicts.GetInt32();
                            var gate4High = highConf.GetInt32();
                            if (gate4Total > 0)
                            {
                                gate4HighConfidenceSum += (double)gate4High / gate4Total;
                            }
                        }
                    }

                    // Failure mode instrumentation (C18)
                    if (root.TryGetProperty("failureModes", out var failureModes))
                    {
                        if (failureModes.TryGetProperty("totalWarnings", out var fmWarnings))
                        {
                            totalWarnings += ReadInt(fmWarnings);
                        }
                        if (failureModes.TryGetProperty("refusalEvents", out var fmRefusals))
                        {
                            totalRefusalEvents += ReadInt(fmRefusals);
                        }
                        if (failureModes.TryGetProperty("degradationEvents", out var fmDegradation))
                        {
                            totalDegradationEvents += ReadInt(fmDegradation);
                        }
                        if (failureModes.TryGetProperty("refusalRatePer100LlmCalls", out var fmRefusalRate))
                        {
                            refusalRateSum += ReadDouble(fmRefusalRate);
                        }
                        if (failureModes.TryGetProperty("degradationRatePer100LlmCalls", out var fmDegradationRate))
                        {
                            degradationRateSum += ReadDouble(fmDegradationRate);
                        }
                        if (failureModes.TryGetProperty("byProvider", out var fmByProvider))
                        {
                            MergeCounters(fmByProvider, byProvider);
                        }
                        if (failureModes.TryGetProperty("byStage", out var fmByStage))
                        {
                            MergeCounters(fmByStage, byStage);
                        }
                        if (failureModes.TryGetProperty("byTopic", out var fmByTopic))
                        {
                            MergeCounters(fmByTopic, byTopic);
                        }
                    }

                    count++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse metrics record");
                    continue;
                }
            }

            if (count == 0)
            {
                return Ok(new
                {
                    count = 0,
                    avgDuration = 0,
                    avgCost = 0,
                    avgTokens = 0,
                    schemaComplianceRate = 0,
                    gate1PassRate = 0,
                    gate4HighConfidenceRate = 0,
                    failureModes = new
                    {
                        totalWarnings = 0,
                        totalRefusalEvents = 0,
                        totalDegradationEvents = 0,
                        avgRefusalRatePer100LlmCalls = 0.0,
                        avgDegradationRatePer100LlmCalls = 0.0,
                        byProvider = new Dictionary<string, object>(),
                        byStage = new Dictionary<string, object>(),
                        byTopic = new Dictionary<string, object>(),
                    }
                });
            }

            return Ok(new
            {
                count,
                avgDuration = totalDuration / count,
                avgCost = totalCost / count,
                avgTokens = totalTokens / count,
                schemaComplianceRate = (double)schemaCompliantCount / count * 100,
                gate1PassRate = gate1PassSum / count * 100,
                gate4HighConfidenceRate = gate4HighConfidenceSum / count * 100,
                failureModes = new
                {
                    totalWarnings,
                    totalRefusalEvents,
                    totalDegradationEvents,
                    avgRefusalRatePer100LlmCalls = refusalRateSum / count,
                    avgDegradationRatePer100LlmCalls = degradationRateSum / count,
                    byProvider = ToResponseCounters(byProvider),
                    byStage = ToResponseCounters(byStage),
                    byTopic = ToResponseCounters(byTopic),
                },
                startDate = metricsRecords.Last().CreatedUtc,
                endDate = metricsRecords.First().CreatedUtc
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating summary statistics");
            return StatusCode(500, new { error = "Failed to calculate summary statistics" });
        }
    }

    /// <summary>
    /// Get quality health time-series data for monitoring F4/F5/F6 findings (admin-only)
    /// </summary>
    [HttpGet("quality-health")]
    public async Task<IActionResult> GetQualityHealth(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 100)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        try
        {
            var query = _db.AnalysisMetrics.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(m => m.CreatedUtc >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(m => m.CreatedUtc <= endDate.Value);

            var records = await query
                .OrderByDescending(m => m.CreatedUtc)
                .Take(limit)
                .Select(m => new { m.JobId, m.MetricsJson, m.CreatedUtc })
                .ToListAsync();

            var timeSeries = new List<object>();
            double f4RateSum = 0, f5RateSum = 0;
            int f6ActiveCount = 0, f6ImbalanceCount = 0;
            int validCount = 0;

            foreach (var record in records)
            {
                try
                {
                    var doc = JsonDocument.Parse(record.MetricsJson);
                    if (!doc.RootElement.TryGetProperty("qualityHealth", out var qh))
                        continue;

                    var f4Rate = qh.TryGetProperty("f4_rejectionRate", out var f4r) ? ReadDouble(f4r) : 0;
                    var f5Rate = qh.TryGetProperty("f5_blockRate", out var f5r) ? ReadDouble(f5r) : 0;
                    var f6Active = qh.TryGetProperty("f6_partitioningActive", out var f6a) &&
                                   f6a.ValueKind == JsonValueKind.True;
                    var f6Imbalance = qh.TryGetProperty("f6_poolImbalanceDetected", out var f6i) &&
                                      f6i.ValueKind == JsonValueKind.True;

                    timeSeries.Add(new
                    {
                        jobId = record.JobId,
                        timestamp = record.CreatedUtc,
                        f4 = new
                        {
                            insufficientClaims = qh.TryGetProperty("f4_insufficientClaims", out var f4ic) ? ReadInt(f4ic) : 0,
                            totalClaims = qh.TryGetProperty("f4_totalClaims", out var f4tc) ? ReadInt(f4tc) : 0,
                            rejectionRate = f4Rate,
                        },
                        f5 = new
                        {
                            baselessBlocked = qh.TryGetProperty("f5_baselessBlocked", out var f5bb) ? ReadInt(f5bb) : 0,
                            totalAdjustments = qh.TryGetProperty("f5_totalAdjustments", out var f5ta) ? ReadInt(f5ta) : 0,
                            blockRate = f5Rate,
                        },
                        f6 = new
                        {
                            partitioningActive = f6Active,
                            institutionalCount = qh.TryGetProperty("f6_institutionalCount", out var f6inst) ? ReadInt(f6inst) : 0,
                            generalCount = qh.TryGetProperty("f6_generalCount", out var f6gen) ? ReadInt(f6gen) : 0,
                            poolImbalanceDetected = f6Imbalance,
                            balanceRatio = qh.TryGetProperty("f6_balanceRatio", out var f6br) && f6br.ValueKind == JsonValueKind.Number
                                ? ReadDouble(f6br) : (double?)null,
                        },
                    });

                    f4RateSum += f4Rate;
                    f5RateSum += f5Rate;
                    if (f6Active) f6ActiveCount++;
                    if (f6Imbalance) f6ImbalanceCount++;
                    validCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse quality health from metrics record for job {JobId}", record.JobId);
                }
            }

            // Reverse to chronological order for charting
            timeSeries.Reverse();

            return Ok(new
            {
                count = validCount,
                timeSeries,
                aggregates = new
                {
                    f4_avgRejectionRate = validCount > 0 ? f4RateSum / validCount : 0,
                    f5_avgBlockRate = validCount > 0 ? f5RateSum / validCount : 0,
                    f6_partitioningActiveRate = validCount > 0 ? (double)f6ActiveCount / validCount : 0,
                    f6_poolImbalanceRate = validCount > 0 ? (double)f6ImbalanceCount / validCount : 0,
                },
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating quality health metrics");
            return StatusCode(500, new { error = "Failed to calculate quality health metrics" });
        }
    }

    /// <summary>
    /// Delete metrics older than specified days (admin-only)
    /// </summary>
    [HttpDelete("cleanup")]
    public async Task<IActionResult> CleanupOldMetrics([FromQuery] int daysOld = 90)
    {
        if (!AuthHelper.IsAdminKeyValid(Request))
            return Unauthorized(new { error = "Admin key required" });

        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysOld);
            var oldMetrics = await _db.AnalysisMetrics
                .Where(m => m.CreatedUtc < cutoffDate)
                .ToListAsync();

            if (oldMetrics.Count == 0)
            {
                return Ok(new { deleted = 0, message = "No old metrics to delete" });
            }

            _db.AnalysisMetrics.RemoveRange(oldMetrics);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Deleted {Count} metrics older than {Days} days", oldMetrics.Count, daysOld);

            return Ok(new { deleted = oldMetrics.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up old metrics");
            return StatusCode(500, new { error = "Failed to cleanup metrics" });
        }
    }

    private static int ReadInt(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            if (element.TryGetInt32(out var i)) return i;
            if (element.TryGetInt64(out var l)) return Convert.ToInt32(l);
        }
        if (element.ValueKind == JsonValueKind.String &&
            int.TryParse(element.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }
        return 0;
    }

    private static double ReadDouble(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out var d))
        {
            return d;
        }
        if (element.ValueKind == JsonValueKind.String &&
            double.TryParse(element.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }
        return 0;
    }

    private static void MergeCounters(
        JsonElement counterObject,
        Dictionary<string, FailureModeCounter> target)
    {
        if (counterObject.ValueKind != JsonValueKind.Object) return;

        foreach (var item in counterObject.EnumerateObject())
        {
            if (item.Value.ValueKind != JsonValueKind.Object) continue;

            if (!target.TryGetValue(item.Name, out var current))
            {
                current = new FailureModeCounter();
                target[item.Name] = current;
            }

            if (item.Value.TryGetProperty("refusalCount", out var refusalCount))
            {
                current.RefusalCount += ReadInt(refusalCount);
            }
            if (item.Value.TryGetProperty("degradationCount", out var degradationCount))
            {
                current.DegradationCount += ReadInt(degradationCount);
            }
            if (item.Value.TryGetProperty("totalEvents", out var totalEvents))
            {
                current.TotalEvents += ReadInt(totalEvents);
            }
        }
    }

    private static Dictionary<string, object> ToResponseCounters(
        Dictionary<string, FailureModeCounter> counters)
    {
        return counters.ToDictionary(
            kv => kv.Key,
            kv => (object)new
            {
                refusalCount = kv.Value.RefusalCount,
                degradationCount = kv.Value.DegradationCount,
                totalEvents = kv.Value.TotalEvents,
            },
            StringComparer.OrdinalIgnoreCase);
    }

    private sealed class FailureModeCounter
    {
        public int RefusalCount { get; set; }
        public int DegradationCount { get; set; }
        public int TotalEvents { get; set; }
    }
}
