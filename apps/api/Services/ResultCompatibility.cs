using System.Text.Json;
using System.Text.Json.Nodes;

namespace FactHarbor.Api.Services;

public static class ResultCompatibility
{
    private const string ClaimBoundaryV2Pipeline = "claimboundary-v2";
    private const string ClaimBoundaryV2PrecutoverSchema = "4.0.0-cb-precutover";
    private const string ClaimBoundaryV2CutoverSchema = "4.0.0-cb";
    private const string PublicCutoverApproved = "approved";
    private const string PublicCutoverBlocked = "blocked_precutover";
    private const string PublicCutoverBlockedIssueCode = "v2_public_cutover_blocked";
    private const string PublicCutoverBlockedIssueMessage = "Analyzer V2 result is not approved for public cutover.";
    private static readonly HashSet<string> ClaimBoundaryV2Schemas = new(StringComparer.Ordinal)
    {
        ClaimBoundaryV2PrecutoverSchema,
        ClaimBoundaryV2CutoverSchema,
    };

    public sealed record ResultQuickFields(string? VerdictLabel, int? TruthPercentage, int? Confidence);

    public sealed record PrimaryAnalysisIssue(string? Code, string? Message);

    public static ResultQuickFields ExtractQuickFields(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
            return new ResultQuickFields(null, null, null);

        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            var root = doc.RootElement;

            if (IsClaimBoundaryV2(root))
                return ExtractV2QuickFields(root);

            return ExtractLegacyQuickFields(root);
        }
        catch (Exception)
        {
            return new ResultQuickFields(null, null, null);
        }
    }

    public static PrimaryAnalysisIssue ExtractPrimaryAnalysisIssue(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
            return new PrimaryAnalysisIssue(null, null);

        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            var root = doc.RootElement;

            if (IsClaimBoundaryV2(root))
                return ExtractV2PrimaryAnalysisIssue(root);

            return ExtractLegacyPrimaryAnalysisIssue(root);
        }
        catch (Exception)
        {
            return new PrimaryAnalysisIssue(null, null);
        }
    }

    public static JsonNode? BuildPublicResultJson(string? resultJson, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            var root = doc.RootElement;

            if (isAdmin || !IsClaimBoundaryV2(root) || IsClaimBoundaryV2PublicCutoverApproved(root))
                return JsonNode.Parse(resultJson);

            return BuildBlockedV2PublicProjection(root);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public static string? BuildPublicReportMarkdown(string? resultJson, string? reportMarkdown, bool isAdmin)
    {
        if (isAdmin || !IsBlockedClaimBoundaryV2(resultJson))
            return reportMarkdown;

        return null;
    }

    private static ResultQuickFields ExtractV2QuickFields(JsonElement root)
    {
        if (!IsClaimBoundaryV2PublicCutoverApproved(root))
            return new ResultQuickFields(null, null, null);

        if (!TryGetObject(root, "verdict", out var verdict))
            return new ResultQuickFields(null, null, null);

        return new ResultQuickFields(
            TryGetString(verdict, "label"),
            TryGetInt32(verdict, "truthPercentage"),
            TryGetInt32(verdict, "confidence"));
    }

    private static ResultQuickFields ExtractLegacyQuickFields(JsonElement root)
    {
        var truthPct =
            TryGetInt32(root, "truthPercentage") ??
            TryGetInt32(root, "verdictSummary", "overallVerdict") ??
            TryGetInt32(root, "articleAnalysis", "articleTruthPercentage") ??
            TryGetInt32(root, "twoPanelSummary", "factharborAnalysis", "overallVerdict");

        var confidence =
            TryGetInt32(root, "confidence") ??
            TryGetInt32(root, "verdictSummary", "overallConfidence") ??
            TryGetInt32(root, "twoPanelSummary", "factharborAnalysis", "confidence");

        var label = truthPct.HasValue
            ? MapPercentageToVerdict(truthPct.Value, confidence ?? 0)
            : null;

        return new ResultQuickFields(label, truthPct, confidence);
    }

    private static PrimaryAnalysisIssue ExtractV2PrimaryAnalysisIssue(JsonElement root)
    {
        if (!root.TryGetProperty("warnings", out var warnings) ||
            warnings.ValueKind != JsonValueKind.Array)
        {
            return IsClaimBoundaryV2PublicCutoverApproved(root)
                ? new PrimaryAnalysisIssue(null, null)
                : new PrimaryAnalysisIssue(PublicCutoverBlockedIssueCode, PublicCutoverBlockedIssueMessage);
        }

        foreach (var warning in warnings.EnumerateArray())
        {
            if (!TryGetBoolean(warning, "primaryIssueEligible") ||
                !warning.TryGetProperty("type", out var typeProp) ||
                typeProp.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var type = typeProp.GetString();
            if (string.IsNullOrWhiteSpace(type))
                continue;

            var message = TryGetString(warning, "message") ??
                TryGetString(warning, "materialityRationale");
            return new PrimaryAnalysisIssue(type, message);
        }

        return IsClaimBoundaryV2PublicCutoverApproved(root)
            ? new PrimaryAnalysisIssue(null, null)
            : new PrimaryAnalysisIssue(PublicCutoverBlockedIssueCode, PublicCutoverBlockedIssueMessage);
    }

    private static PrimaryAnalysisIssue ExtractLegacyPrimaryAnalysisIssue(JsonElement root)
    {
        if (!root.TryGetProperty("analysisWarnings", out var warnings) ||
            warnings.ValueKind != JsonValueKind.Array)
        {
            return new PrimaryAnalysisIssue(null, null);
        }

        foreach (var warning in warnings.EnumerateArray())
        {
            if (!warning.TryGetProperty("type", out var typeProp) ||
                typeProp.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var type = typeProp.GetString();
            if (!string.Equals(type, "analysis_generation_failed", StringComparison.Ordinal))
                continue;

            return new PrimaryAnalysisIssue(type, TryGetString(warning, "message"));
        }

        return new PrimaryAnalysisIssue(null, null);
    }

    private static bool IsClaimBoundaryV2(JsonElement root)
    {
        var schemaVersion = TryGetString(root, "_schemaVersion") ??
            TryGetString(root, "meta", "schemaVersion");
        var pipeline = TryGetString(root, "meta", "pipeline");

        return string.Equals(pipeline, ClaimBoundaryV2Pipeline, StringComparison.Ordinal) &&
            schemaVersion is not null &&
            ClaimBoundaryV2Schemas.Contains(schemaVersion);
    }

    private static bool IsBlockedClaimBoundaryV2(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            var root = doc.RootElement;
            return IsClaimBoundaryV2(root) && !IsClaimBoundaryV2PublicCutoverApproved(root);
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool IsClaimBoundaryV2PublicCutoverApproved(JsonElement root)
    {
        var schemaVersion = TryGetString(root, "_schemaVersion") ??
            TryGetString(root, "meta", "schemaVersion");
        var pipeline = TryGetString(root, "meta", "pipeline");
        var publicCutoverStatus = TryGetString(root, "meta", "publicCutoverStatus");

        return string.Equals(schemaVersion, ClaimBoundaryV2CutoverSchema, StringComparison.Ordinal) &&
            string.Equals(pipeline, ClaimBoundaryV2Pipeline, StringComparison.Ordinal) &&
            string.Equals(publicCutoverStatus, PublicCutoverApproved, StringComparison.Ordinal);
    }

    private static JsonNode BuildBlockedV2PublicProjection(JsonElement root)
    {
        var meta = CloneProperty(root, "meta") as JsonObject ?? new JsonObject();
        meta["publicCutoverStatus"] = PublicCutoverBlocked;

        var projection = new JsonObject
        {
            ["_schemaVersion"] = TryGetString(root, "_schemaVersion") ??
                TryGetString(root, "meta", "schemaVersion") ??
                ClaimBoundaryV2PrecutoverSchema,
            ["meta"] = meta,
        };

        var input = CloneProperty(root, "input");
        if (input is not null)
            projection["input"] = input;

        var warnings = CloneProperty(root, "warnings");
        projection["warnings"] = warnings ?? new JsonArray();

        return projection;
    }

    private static JsonNode? CloneProperty(JsonElement root, string propertyName)
    {
        return root.TryGetProperty(propertyName, out var value)
            ? JsonNode.Parse(value.GetRawText())
            : null;
    }

    private static bool TryGetObject(JsonElement root, string propertyName, out JsonElement value)
    {
        if (root.TryGetProperty(propertyName, out value) &&
            value.ValueKind == JsonValueKind.Object)
        {
            return true;
        }

        value = default;
        return false;
    }

    private static string? TryGetString(JsonElement root, string propertyName)
    {
        return root.TryGetProperty(propertyName, out var value) &&
            value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : null;
    }

    private static string? TryGetString(JsonElement root, string first, string second)
    {
        return root.TryGetProperty(first, out var firstValue) &&
            firstValue.ValueKind == JsonValueKind.Object
                ? TryGetString(firstValue, second)
                : null;
    }

    private static int? TryGetInt32(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value) ||
            value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        return value.TryGetInt32(out var intValue)
            ? intValue
            : (int)value.GetDouble();
    }

    private static int? TryGetInt32(JsonElement root, string first, string second)
    {
        return root.TryGetProperty(first, out var firstValue) &&
            firstValue.ValueKind == JsonValueKind.Object
                ? TryGetInt32(firstValue, second)
                : null;
    }

    private static int? TryGetInt32(JsonElement root, string first, string second, string third)
    {
        return root.TryGetProperty(first, out var firstValue) &&
            firstValue.ValueKind == JsonValueKind.Object &&
            firstValue.TryGetProperty(second, out var secondValue) &&
            secondValue.ValueKind == JsonValueKind.Object
                ? TryGetInt32(secondValue, third)
                : null;
    }

    private static bool TryGetBoolean(JsonElement root, string propertyName)
    {
        return root.TryGetProperty(propertyName, out var value) &&
            value.ValueKind == JsonValueKind.True;
    }

    private static string MapPercentageToVerdict(int percentage, int confidence)
    {
        // Must match apps/web/src/lib/analyzer/truth-scale.ts
        // (percentageToClaimVerdict + VERDICT_BANDS + mixed confidence threshold).
        if (percentage >= 86) return "TRUE";
        if (percentage >= 72) return "MOSTLY-TRUE";
        if (percentage >= 58) return "LEANING-TRUE";
        if (percentage >= 43) return confidence >= 45 ? "MIXED" : "UNVERIFIED";
        if (percentage >= 29) return "LEANING-FALSE";
        if (percentage >= 15) return "MOSTLY-FALSE";
        return "FALSE";
    }
}
