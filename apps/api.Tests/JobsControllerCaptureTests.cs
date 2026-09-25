using System.Text.Json;
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
