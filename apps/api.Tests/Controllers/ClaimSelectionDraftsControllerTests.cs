using System.Net;
using System.Reflection;
using FactHarbor.Api.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace FactHarbor.Api.Tests.Controllers;

public sealed class ClaimSelectionDraftsControllerTests
{
    [Theory]
    [InlineData(nameof(ClaimSelectionDraftsController.Cancel))]
    [InlineData(nameof(ClaimSelectionDraftsController.HideDraft))]
    [InlineData(nameof(ClaimSelectionDraftsController.UnhideDraft))]
    public void DraftMutationEndpointsUseAnalyzeRateLimit(string methodName)
    {
        var method = typeof(ClaimSelectionDraftsController).GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);

        Assert.NotNull(method);
        var attribute = method!.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(attribute);
        Assert.Equal("AnalyzePerIp", attribute!.PolicyName);
    }

    [Fact]
    public void ResolveSourceIpIgnoresRawForwardedForHeader()
    {
        var method = typeof(ClaimSelectionDraftsController).GetMethod(
            "ResolveSourceIp",
            BindingFlags.Static | BindingFlags.NonPublic);
        Assert.NotNull(method);

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.20");
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.99";

        var sourceIp = method!.Invoke(null, [context.Request]);

        Assert.Equal("203.0.113.20", sourceIp);
    }
}
