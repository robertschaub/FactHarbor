using FactHarbor.Api.Helpers;
using Xunit;

namespace FactHarbor.Api.Tests.Helpers;

public sealed class AnalyzeInputValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("claimboundary")]
    [InlineData("claimboundary-v2")]
    public void Validate_AcceptsSupportedPipelineVariants(string? pipelineVariant)
    {
        var (valid, error) = AnalyzeInputValidator.Validate(
            "text",
            "Plastic recycling is pointless",
            pipelineVariant);

        Assert.True(valid);
        Assert.Null(error);
    }

    [Fact]
    public void Validate_RejectsUnsupportedPipelineVariant()
    {
        var (valid, error) = AnalyzeInputValidator.Validate(
            "text",
            "Plastic recycling is pointless",
            "claimboundary-v3");

        Assert.False(valid);
        Assert.Equal("Invalid pipelineVariant: must be one of 'claimboundary', 'claimboundary-v2'", error);
    }
}
