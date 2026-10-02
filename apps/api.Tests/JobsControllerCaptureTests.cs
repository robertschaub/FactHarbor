using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text;
using FactHarbor.Api.Controllers;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FactHarbor.Api.Tests;

public sealed class JobsControllerCaptureTests
{
    [Theory]
    [InlineData(null, "SUCCEEDED", "{\"evidenceApplicability\":{\"schemaVersion\":1}}")]
    [InlineData("wrong", "SUCCEEDED", "[1,2]")]
    [InlineData(null, "FAILED", "\"malformed\"")]
    [InlineData("offline-test-key", "SUCCEEDED", "{\"unknownVersion\":99}")]
    [InlineData("offline-test-key", "FAILED", "[1,2]")]
    [InlineData(null, "SUCCEEDED", "null")]
    public async Task EvidenceCapture_IsAdminOnlyAndNotSearchableOrListed(string? key, string status, string captureJson)
    {
        const string secretToken = "captureonlytoken947182";
        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        using var db = new FhDbContext(new DbContextOptionsBuilder<FhDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        var storedNode = new JsonObject {
            ["adminCapture"] = JsonNode.Parse(captureJson),
            ["meta"] = new JsonObject { ["pipeline"] = "claimboundary" }
        };
        if (storedNode["adminCapture"] is JsonObject capture) capture["sourceText"] = secretToken;
        else if (storedNode["adminCapture"] is JsonArray array) array.Add(secretToken);
        else if (storedNode["adminCapture"] is JsonValue) storedNode["adminCapture"] = secretToken;
        var stored = storedNode.ToJsonString();
        var job = new JobEntity { Status = status, ResultJson = stored, InputValue = "Plastik recycling bringt nichts", InputPreview = "Plastik recycling bringt nichts" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        using var services = new ServiceCollection().AddSingleton<IConfiguration>(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Admin:Key"] = "offline-test-key" }).Build()).BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        if (key is not null) context.Request.Headers["X-Admin-Key"] = key;
        var controller = new JobsController(new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo()), db, null!, NullLogger<JobsController>.Instance) {
            ControllerContext = new ControllerContext { HttpContext = context }
        };
        var response = Assert.IsType<OkObjectResult>(await controller.Get(job.JobId));
        var projected = JsonSerializer.SerializeToElement(response.Value).GetProperty("resultJson");
        Assert.Equal(key == "offline-test-key", projected.TryGetProperty("adminCapture", out _));
        Assert.Equal("claimboundary", projected.GetProperty("meta").GetProperty("pipeline").GetString());
        var listed = Assert.IsType<OkObjectResult>(await controller.List());
        if (storedNode["adminCapture"] is not null) Assert.Contains(secretToken, stored);
        Assert.DoesNotContain(secretToken, JsonSerializer.Serialize(listed.Value));
        Assert.DoesNotContain("adminCapture", JsonSerializer.Serialize(listed.Value));
        context.Request.Headers.Remove("X-Admin-Key");
        var searched = Assert.IsType<OkObjectResult>(await controller.List(q: secretToken));
        Assert.Empty(JsonSerializer.SerializeToElement(searched.Value).GetProperty("jobs").EnumerateArray());
        db.ChangeTracker.Clear();
        Assert.Equal(stored, (await db.Jobs.SingleAsync()).ResultJson);
    }

    [Fact]
    public async Task EvidenceCapture_RecordsSerializerExpansionWithoutChangingSerializer()
    {
        var text = string.Concat(Enumerable.Repeat("ação 東京 😀 <>&\"", 18000));
        // Exact JSON.stringify representation of this known fixture (no controls or
        // backslashes). Even UnsafeRelaxedJsonEscaping escapes astral Unicode in .NET.
        var compact = "{\"adminCapture\":{\"evidenceApplicability\":{\"sourceText\":\"" + text.Replace("\"", "\\\"") + "\"}}}";
        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        using var db = new FhDbContext(new DbContextOptionsBuilder<FhDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        var job = new JobEntity { Status = "RUNNING", InputValue = "Plastik recycling bringt nichts", InputPreview = "Plastik recycling bringt nichts" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var service = new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo());
        using var document = JsonDocument.Parse(compact);
        Assert.True(await service.StoreResultAsync(job.JobId, document.RootElement, null));
        db.ChangeTracker.Clear();
        var stored = (await db.Jobs.SingleAsync()).ResultJson!;
        var compactBytes = Encoding.UTF8.GetByteCount(compact);
        var storedBytes = Encoding.UTF8.GetByteCount(stored);
        Assert.Equal(432060, compactBytes); // independently measured with Node JSON.stringify
        Assert.True(compactBytes < 2097152);
        Assert.True(storedBytes > compactBytes);
        Assert.InRange((double)storedBytes / compactBytes, 1, 3); // bound for this fixture only
        Assert.Equal(text, JsonDocument.Parse(stored).RootElement.GetProperty("adminCapture").GetProperty("evidenceApplicability").GetProperty("sourceText").GetString());
        Console.WriteLine($"Diagnostic serialization: compact={compactBytes}, stored={storedBytes}, expansion={(double)storedBytes / compactBytes:F3}");
        using var services = new ServiceCollection().AddSingleton<IConfiguration>(new ConfigurationBuilder().Build()).BuildServiceProvider();
        var controller = new JobsController(service, db, null!, NullLogger<JobsController>.Instance) {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services } }
        };
        var started = System.Diagnostics.Stopwatch.StartNew();
        var listed = Assert.IsType<OkObjectResult>(await controller.List());
        Console.WriteLine($"Diagnostic list fixture: one row, elapsedMs={started.Elapsed.TotalMilliseconds:F3}");
        Assert.DoesNotContain("adminCapture", JsonSerializer.Serialize(listed.Value));
    }

    [Theory]
    [InlineData(null, false, false)]
    [InlineData("wrong", false, false)]
    [InlineData("offline-test-key", true, false)]
    [InlineData(null, false, true)]
    [InlineData("wrong", false, true)]
    [InlineData("offline-test-key", true, true)]
    public async Task Get_ProjectsCaptureByAdminAccessWithoutChangingStoredResult(string? suppliedKey, bool admin, bool firstPass)
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        using var db = new FhDbContext(new DbContextOptionsBuilder<FhDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        var types = new[] { "contract_validation_retry_triggered", "contract_surgical_repair_diagnostic", "contract_completion_diagnostic" };
        var attribution = firstPass ? "initial" : "count_floor_reprompt";
        var summary = new {
            failureMode = firstPass ? null : "contract_violated", stageAttribution = attribution,
            adminCapture = new { steps = new[] { new { step = firstPass ? "initial_contract" : "final_contract", candidates = new[] { new { id = "AC_01", statement = "Plastik recycling bringt nichts" } } } } }
        };
        var stored = JsonSerializer.Serialize(new {
            analysisWarnings = firstPass ? Array.Empty<object>() : types.Select(type => (object)new {
                type, severity = "info", details = new {
                    outcome = "validation_failed",
                    adminCapture = new { steps = new[] { new { candidates = new[] { new { id = "AC_01", statement = "Plastik recycling bringt nichts" } } } } }
                }
            }).Append(new { type = "report_damaged", severity = "error", details = new { contractValidationSummary = summary } }).ToArray(),
            understanding = new { unchanged = true, contractValidationSummary = summary }
        });
        var job = new JobEntity { Status = "SUCCEEDED", ResultJson = stored };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        using var services = new ServiceCollection().AddSingleton<IConfiguration>(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Admin:Key"] = "offline-test-key" }).Build()).BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        if (suppliedKey is not null) context.Request.Headers["X-Admin-Key"] = suppliedKey;
        var controller = new JobsController(new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo()), db, null!, NullLogger<JobsController>.Instance) {
            ControllerContext = new ControllerContext { HttpContext = context }
        };

        var response = Assert.IsType<OkObjectResult>(await controller.Get(job.JobId));
        var result = JsonSerializer.SerializeToElement(response.Value).GetProperty("resultJson");
        foreach (var warning in result.GetProperty("analysisWarnings").EnumerateArray())
        {
            var details = warning.GetProperty("details");
            if (warning.GetProperty("type").GetString() == "report_damaged")
            {
                var warningSummary = details.GetProperty("contractValidationSummary");
                Assert.Equal(admin, warningSummary.TryGetProperty("adminCapture", out _));
                Assert.Equal("contract_violated", warningSummary.GetProperty("failureMode").GetString());
                continue;
            }
            Assert.Equal("validation_failed", details.GetProperty("outcome").GetString());
            Assert.Equal(admin, details.TryGetProperty("adminCapture", out _));
        }
        Assert.True(result.GetProperty("understanding").GetProperty("unchanged").GetBoolean());
        var resultSummary = result.GetProperty("understanding").GetProperty("contractValidationSummary");
        Assert.Equal(admin, resultSummary.TryGetProperty("adminCapture", out _));
        Assert.Equal(attribution, resultSummary.GetProperty("stageAttribution").GetString());
        if (admin) Assert.Equal(JsonSerializer.Serialize(JsonDocument.Parse(stored).RootElement), JsonSerializer.Serialize(result));
        db.ChangeTracker.Clear();
        Assert.Equal(stored, (await db.Jobs.SingleAsync()).ResultJson);
    }
}
