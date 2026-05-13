using System.Text.Json;
using System.Text.Json.Nodes;
using FactHarbor.Api.Tests;
using FactHarbor.Api.Services;
using Xunit;

namespace FactHarbor.Api.Tests.Services;

public sealed class ResultCompatibilityTests
{
    [Fact]
    public void ExtractQuickFields_V2Fixture_UsesCanonicalVerdictFields()
    {
        var json = FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json");

        var quickFields = ResultCompatibility.ExtractQuickFields(json);

        Assert.Equal("UNVERIFIED", quickFields.VerdictLabel);
        Assert.Equal(50, quickFields.TruthPercentage);
        Assert.Equal(0, quickFields.Confidence);
    }

    [Fact]
    public void ExtractQuickFields_V2_DoesNotDeriveLabelFromTruthPercentage()
    {
        var root = JsonNode.Parse(FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json"))!.AsObject();
        var verdict = root["verdict"]!.AsObject();
        verdict["label"] = "FALSE";
        verdict["truthPercentage"] = 93;
        verdict["confidence"] = 91;

        var quickFields = ResultCompatibility.ExtractQuickFields(root.ToJsonString());

        Assert.Equal("FALSE", quickFields.VerdictLabel);
        Assert.Equal(93, quickFields.TruthPercentage);
        Assert.Equal(91, quickFields.Confidence);
    }

    [Fact]
    public void ExtractQuickFields_LegacyFixture_PreservesLegacyMapping()
    {
        var json = FixtureFiles.ReadAnalyzerV2Fixture("report-result-v1-legacy.fixture.json");

        var quickFields = ResultCompatibility.ExtractQuickFields(json);

        Assert.Equal("UNVERIFIED", quickFields.VerdictLabel);
        Assert.Equal(50, quickFields.TruthPercentage);
        Assert.Equal(0, quickFields.Confidence);
    }

    [Fact]
    public void ExtractQuickFields_LegacyFallbackPaths_PreserveExistingShapeSupport()
    {
        var verdictSummaryJson = JsonSerializer.Serialize(new
        {
            verdictSummary = new
            {
                overallVerdict = 88,
                overallConfidence = 33,
            },
        });

        var verdictSummaryFields = ResultCompatibility.ExtractQuickFields(verdictSummaryJson);

        Assert.Equal("TRUE", verdictSummaryFields.VerdictLabel);
        Assert.Equal(88, verdictSummaryFields.TruthPercentage);
        Assert.Equal(33, verdictSummaryFields.Confidence);

        var articleAnalysisFields = ResultCompatibility.ExtractQuickFields(JsonSerializer.Serialize(new
        {
            articleAnalysis = new
            {
                articleTruthPercentage = 30,
            },
        }));

        Assert.Equal("LEANING-FALSE", articleAnalysisFields.VerdictLabel);
        Assert.Equal(30, articleAnalysisFields.TruthPercentage);
        Assert.Null(articleAnalysisFields.Confidence);

        var twoPanelSummaryFields = ResultCompatibility.ExtractQuickFields(JsonSerializer.Serialize(new
        {
            twoPanelSummary = new
            {
                factharborAnalysis = new
                {
                    overallVerdict = 72,
                    confidence = 61,
                },
            },
        }));

        Assert.Equal("MOSTLY-TRUE", twoPanelSummaryFields.VerdictLabel);
        Assert.Equal(72, twoPanelSummaryFields.TruthPercentage);
        Assert.Equal(61, twoPanelSummaryFields.Confidence);
    }

    [Theory]
    [InlineData(50, 44, "UNVERIFIED")]
    [InlineData(50, 45, "MIXED")]
    public void ExtractQuickFields_LegacyMixedBand_UsesExistingConfidenceThreshold(
        int truthPercentage,
        int confidence,
        string expectedLabel)
    {
        var json = JsonSerializer.Serialize(new
        {
            truthPercentage,
            confidence,
        });

        var quickFields = ResultCompatibility.ExtractQuickFields(json);

        Assert.Equal(expectedLabel, quickFields.VerdictLabel);
        Assert.Equal(truthPercentage, quickFields.TruthPercentage);
        Assert.Equal(confidence, quickFields.Confidence);
    }

    [Fact]
    public void ExtractQuickFields_MalformedOrUnknownJson_ReturnsEmptyFields()
    {
        var malformed = ResultCompatibility.ExtractQuickFields("{");
        var unknown = ResultCompatibility.ExtractQuickFields("""{"status":"ok"}""");

        Assert.Null(malformed.VerdictLabel);
        Assert.Null(malformed.TruthPercentage);
        Assert.Null(malformed.Confidence);
        Assert.Null(unknown.VerdictLabel);
        Assert.Null(unknown.TruthPercentage);
        Assert.Null(unknown.Confidence);
    }

    [Fact]
    public void ExtractPrimaryAnalysisIssue_V2_IgnoresIneligibleWarnings()
    {
        var json = FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json");

        var issue = ResultCompatibility.ExtractPrimaryAnalysisIssue(json);

        Assert.Null(issue.Code);
        Assert.Null(issue.Message);
    }

    [Fact]
    public void ExtractPrimaryAnalysisIssue_V2_ReturnsFirstEligibleWarning()
    {
        var root = JsonNode.Parse(FixtureFiles.ReadAnalyzerV2Fixture("report-result-v2.fixture.json"))!.AsObject();
        var warning = root["warnings"]!.AsArray()[0]!.AsObject();
        warning["type"] = "report_damaged";
        warning["primaryIssueEligible"] = true;
        warning["materialityRationale"] = "The report did not produce a trustworthy verdict.";

        var issue = ResultCompatibility.ExtractPrimaryAnalysisIssue(root.ToJsonString());

        Assert.Equal("report_damaged", issue.Code);
        Assert.Equal("The report did not produce a trustworthy verdict.", issue.Message);
    }

    [Fact]
    public void ExtractPrimaryAnalysisIssue_Legacy_ReturnsAnalysisGenerationFailureOnly()
    {
        var root = JsonNode.Parse(FixtureFiles.ReadAnalyzerV2Fixture("report-result-v1-legacy.fixture.json"))!.AsObject();
        var warnings = root["analysisWarnings"]!.AsArray();
        warnings.Add(new JsonObject
        {
            ["type"] = "analysis_generation_failed",
            ["message"] = "Legacy report generation failed.",
        });

        var issue = ResultCompatibility.ExtractPrimaryAnalysisIssue(root.ToJsonString());

        Assert.Equal("analysis_generation_failed", issue.Code);
        Assert.Equal("Legacy report generation failed.", issue.Message);
    }

    [Fact]
    public void ExtractPrimaryAnalysisIssue_MalformedJson_ReturnsEmptyIssue()
    {
        var issue = ResultCompatibility.ExtractPrimaryAnalysisIssue("{");

        Assert.Null(issue.Code);
        Assert.Null(issue.Message);
    }
}
