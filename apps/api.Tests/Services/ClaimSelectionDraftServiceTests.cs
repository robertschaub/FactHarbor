using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using FactHarbor.Api.Data;
using FactHarbor.Api.Helpers;
using FactHarbor.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FactHarbor.Api.Tests.Services;

public sealed class ClaimSelectionDraftServiceTests
{
    [Fact]
    public async Task GetDraftAsync_ExpiredActiveDraft_MarksExpiredAndPersists()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var draft = SeedDraft(db, status: "QUEUED", expiresUtc: DateTime.UtcNow.AddMinutes(-1));
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var result = await service.GetDraftAsync(draft.DraftId);

        Assert.NotNull(result);
        Assert.Equal("EXPIRED", result.Status);

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.ClaimSelectionDrafts.FindAsync(draft.DraftId);
        Assert.Equal("EXPIRED", reloaded?.Status);
    }

    [Fact]
    public async Task CreateDraftAsync_NonAdminClaimsInviteSlotAndStoresOnlyTokenHash()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        db.InviteCodes.Add(new InviteCodeEntity
        {
            Code = "INVITE",
            MaxJobs = 10,
            DailyLimit = 10,
            HourlyLimit = 10,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var (result, error, statusCode) = await service.CreateDraftAsync(
            "text",
            "A verifiable claim",
            "interactive",
            "INVITE",
            isAdmin: false);

        Assert.Null(error);
        Assert.Equal(0, statusCode);
        Assert.NotNull(result);

        var draft = await db.ClaimSelectionDrafts.FindAsync(result.DraftId);
        var invite = await db.InviteCodes.FindAsync("INVITE");
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var usage = await db.InviteCodeUsage.FindAsync("INVITE", today);

        Assert.NotNull(draft);
        Assert.NotEqual(result.DraftAccessToken, draft!.DraftAccessTokenHash);
        Assert.Matches("^[a-f0-9]{64}$", draft.DraftAccessTokenHash!);
        Assert.True(service.ValidateAccessToken(draft, result.DraftAccessToken));
        Assert.False(service.ValidateAccessToken(draft, "wrong-token"));
        Assert.False(service.ValidateAccessToken(draft, null));
        Assert.Equal(1, invite?.UsedJobs);
        Assert.Equal(1, usage?.UsageCount);
    }

    [Fact]
    public async Task CreateDraftAsync_HourlyLimitCountsDraftsButNotDraftBackedJobsTwice()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        db.InviteCodes.Add(new InviteCodeEntity
        {
            Code = "INVITE",
            MaxJobs = 10,
            DailyLimit = 10,
            HourlyLimit = 2,
            UsedJobs = 1,
            IsActive = true,
        });
        var existingDraft = SeedDraft(db, inviteCode: "INVITE", createdUtc: DateTime.UtcNow.AddMinutes(-5));
        db.Jobs.Add(new JobEntity
        {
            JobId = Guid.NewGuid().ToString("N"),
            Status = "QUEUED",
            InputType = "text",
            InputValue = "Draft backed job",
            InviteCode = "INVITE",
            ClaimSelectionDraftId = existingDraft.DraftId,
            CreatedUtc = DateTime.UtcNow.AddMinutes(-4),
            UpdatedUtc = DateTime.UtcNow.AddMinutes(-4),
        });
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var (result, error, statusCode) = await service.CreateDraftAsync(
            "text",
            "Another verifiable claim",
            "interactive",
            "INVITE",
            isAdmin: false);

        Assert.NotNull(result);
        Assert.Null(error);
        Assert.Equal(0, statusCode);
        Assert.Equal(2, (await db.InviteCodes.FindAsync("INVITE"))?.UsedJobs);
    }

    [Fact]
    public async Task CreateDraftAsync_InviteSlotContentionRetriesAndThenSucceeds()
    {
        await using var database = await TestDatabase.CreateFileBackedAsync(defaultTimeoutSeconds: 0);
        await using (var seedDb = database.CreateContext())
        {
            seedDb.InviteCodes.Add(new InviteCodeEntity
            {
                Code = "INVITE",
                MaxJobs = 10,
                DailyLimit = 10,
                HourlyLimit = 10,
                IsActive = true,
            });
            await seedDb.SaveChangesAsync();
        }

        await using var lockDb = database.CreateContext();
        await using var tx = await lockDb.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var createTask = Task.Run(async () =>
        {
            await using var workerDb = database.CreateContext();
            var service = CreateDraftService(workerDb);
            return await service.CreateDraftAsync(
                "text",
                "A verifiable claim under contention",
                "interactive",
                "INVITE",
                isAdmin: false);
        });

        await Task.Delay(90);
        await tx.RollbackAsync();

        var (result, error, statusCode) = await createTask;

        Assert.Null(error);
        Assert.Equal(0, statusCode);
        Assert.NotNull(result);

        await using var verifyDb = database.CreateContext();
        Assert.Equal(1, await verifyDb.ClaimSelectionDrafts.CountAsync(d => d.InviteCode == "INVITE"));
        Assert.Equal(1, (await verifyDb.InviteCodes.FindAsync("INVITE"))?.UsedJobs);
    }

    [Fact]
    public async Task UpdateSelectionStateAsync_StaleInteractionDoesNotOverwriteNewerSelection()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var latestInteraction = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
        var draft = SeedDraft(
            db,
            status: "AWAITING_CLAIM_SELECTION",
            draftStateJson: PreparedState(
                ["AC_01", "AC_02"],
                lastSelectionInteractionUtc: latestInteraction,
                selectedClaimIds: ["AC_01"]));
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var (result, error, statusCode) = await service.UpdateSelectionStateAsync(
            draft.DraftId,
            ["AC_02"],
            latestInteraction.AddSeconds(-5));

        Assert.NotNull(result);
        Assert.Null(error);
        Assert.Equal(0, statusCode);

        var selectedClaimIds = ReadSelectedClaimIds(result!.DraftStateJson);
        Assert.Equal(["AC_01"], selectedClaimIds);
    }

    [Fact]
    public async Task PrepareAutoContinueAsync_AwaitingSelectionRejectsChangedInteractionTimestamp()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var currentInteraction = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
        var draft = SeedDraft(
            db,
            status: "AWAITING_CLAIM_SELECTION",
            draftStateJson: PreparedState(
                ["AC_01", "AC_02"],
                lastSelectionInteractionUtc: currentInteraction,
                selectedClaimIds: ["AC_01"]));
        await db.SaveChangesAsync();
        var originalState = draft.DraftStateJson;

        var requestState = PreparedState(
            ["AC_01", "AC_02"],
            lastSelectionInteractionUtc: currentInteraction.AddSeconds(-1),
            selectedClaimIds: ["AC_02"]);
        var service = CreateDraftService(db);

        var (result, error, statusCode) = await service.PrepareAutoContinueAsync(
            draft.DraftId,
            requestState,
            ["AC_02"]);

        Assert.Null(result);
        Assert.Equal(409, statusCode);
        Assert.Equal("Draft selection state changed before automatic continuation could run", error);
        Assert.Equal(originalState, (await db.ClaimSelectionDrafts.FindAsync(draft.DraftId))?.DraftStateJson);
    }

    [Fact]
    public async Task CancelDraftAsync_PreparingDraftReturnsConflictWithoutMutation()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var draft = SeedDraft(db, status: "PREPARING");
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var (result, error, statusCode) = await service.CancelDraftAsync(draft.DraftId);

        Assert.Null(result);
        Assert.Equal("Draft preparation is in progress and cannot be cancelled", error);
        Assert.Equal(409, statusCode);

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.ClaimSelectionDrafts.FindAsync(draft.DraftId);
        Assert.Equal("PREPARING", reloaded?.Status);
        Assert.Null(reloaded?.LastEventMessage);
    }

    [Fact]
    public async Task CancelDraftAsync_FinalJobDraftReturnsExistingDraftWithoutMutation()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var draft = SeedDraft(
            db,
            status: "AWAITING_CLAIM_SELECTION",
            finalJobId: "job-1");
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var (result, error, statusCode) = await service.CancelDraftAsync(draft.DraftId);

        Assert.NotNull(result);
        Assert.Null(error);
        Assert.Equal(0, statusCode);
        Assert.Equal("job-1", result!.FinalJobId);

        await using var verifyDb = database.CreateContext();
        var reloaded = await verifyDb.ClaimSelectionDrafts.FindAsync(draft.DraftId);
        Assert.Equal("AWAITING_CLAIM_SELECTION", reloaded?.Status);
        Assert.Equal("job-1", reloaded?.FinalJobId);
        Assert.Null(reloaded?.LastEventMessage);
    }

    [Fact]
    public async Task ListDraftsForAdminAsync_DefaultActiveListExpiresBeforeCountsAndIncludesHidden()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var expiredQueued = SeedDraft(db, status: "QUEUED", expiresUtc: DateTime.UtcNow.AddMinutes(-1));
        var preparingHidden = SeedDraft(
            db,
            status: "PREPARING",
            activeInputValue: $"{new string('x', 120)}\nsecond line",
            isHidden: true,
            lastEventMessage: "Preparing stage 1");
        var awaiting = SeedDraft(
            db,
            status: "AWAITING_CLAIM_SELECTION",
            draftStateJson: PreparedState(["AC_01"]),
            lastEventMessage: "Prepared claim set awaiting selection.");
        SeedDraft(db, status: "COMPLETED");
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var result = await service.ListDraftsForAdminAsync(AdminDraftQuery());

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.StatusCounts["PREPARING"]);
        Assert.Equal(1, result.StatusCounts["AWAITING_CLAIM_SELECTION"]);
        Assert.Contains(result.Items, item => item.DraftId == preparingHidden.DraftId && item.IsHidden);
        Assert.Contains(result.Items, item => item.DraftId == awaiting.DraftId && item.HasPreparedStage1);
        Assert.All(result.Items, item => Assert.NotEqual(expiredQueued.DraftId, item.DraftId));
        Assert.All(result.Items, item => Assert.NotEqual("COMPLETED", item.Status));
        Assert.All(result.Items, item => Assert.True(item.InputPreview is null || item.InputPreview.Length <= 96));
        Assert.Contains(result.Items, item => item.EventSummary == "Prepared claim set awaiting selection.");

        await using var verifyDb = database.CreateContext();
        var reloadedExpired = await verifyDb.ClaimSelectionDrafts.FindAsync(expiredQueued.DraftId);
        Assert.Equal("EXPIRED", reloadedExpired?.Status);
    }

    [Fact]
    public async Task ListDraftsForAdminAsync_StatusOverridesScopeAndToleratesMalformedDraftState()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var completed = SeedDraft(
            db,
            status: "COMPLETED",
            draftStateJson: "{malformed",
            lastEventMessage: "Completed");
        SeedDraft(db, status: "PREPARING");
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var result = await service.ListDraftsForAdminAsync(AdminDraftQuery(
            scope: "active",
            statuses: ["COMPLETED"]));

        Assert.Equal(1, result.TotalCount);
        var item = Assert.Single(result.Items);
        Assert.Equal(completed.DraftId, item.DraftId);
        Assert.Equal("COMPLETED", item.Status);
        Assert.False(item.HasPreparedStage1);
        Assert.Null(item.LastErrorCode);
        Assert.Equal("Completed", item.EventSummary);
    }

    [Fact]
    public async Task ListDraftsForAdminAsync_FiltersMetadataAndSuppressesFailedEventSummary()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var failedState = new JsonObject
        {
            ["lastError"] = new JsonObject
            {
                ["code"] = "stage1_failed",
                ["message"] = "Raw failure detail",
            },
        }.ToJsonString();
        var target = SeedDraft(
            db,
            status: "FAILED",
            draftStateJson: failedState,
            finalJobId: "job-1",
            isHidden: true,
            lastEventMessage: "Exception detail should stay out of the list",
            selectionMode: "automatic");
        SeedDraft(db, status: "FAILED", draftStateJson: failedState);
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        var result = await service.ListDraftsForAdminAsync(AdminDraftQuery(
            scope: "all",
            hidden: "only",
            linked: "withFinalJob",
            selectionMode: "automatic"));

        var item = Assert.Single(result.Items);
        Assert.Equal(target.DraftId, item.DraftId);
        Assert.Equal("stage1_failed", item.LastErrorCode);
        Assert.Null(item.EventSummary);
    }

    [Fact]
    public async Task StorePreparedResultAsync_MergesPriorLastErrorIntoDeduplicatedFailureHistory()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var failedUtc = DateTime.UtcNow.AddMinutes(-10).ToString("o");
        var priorState = new JsonObject
        {
            ["lastError"] = new JsonObject
            {
                ["code"] = "stage1_contract",
                ["message"] = "Contract failed",
                ["failedUtc"] = failedUtc,
            },
            ["observability"] = new JsonObject
            {
                ["eventMessage"] = "Previous preparation failed",
            },
        }.ToJsonString();
        var draft = SeedDraft(db, status: "PREPARING", draftStateJson: priorState);
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        await service.StorePreparedResultAsync(draft.DraftId, PreparedState(["AC_01"]));

        var reloaded = await db.ClaimSelectionDrafts.FindAsync(draft.DraftId);
        Assert.Equal("AWAITING_CLAIM_SELECTION", reloaded?.Status);

        using var doc = JsonDocument.Parse(reloaded!.DraftStateJson!);
        var history = doc.RootElement.GetProperty("failureHistory");
        Assert.Equal(1, history.GetArrayLength());
        Assert.Equal("stage1_contract", history[0].GetProperty("code").GetString());
        Assert.Equal("Previous preparation failed", history[0].GetProperty("observability").GetProperty("eventMessage").GetString());
    }

    [Fact]
    public async Task StorePreparedResultAsync_TrimsFailureHistoryToFiveAndDeduplicates()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var historyEntries = Enumerable.Range(1, 7)
            .Select(i => (JsonNode?)new JsonObject
            {
                ["code"] = $"E{i}",
                ["message"] = $"Failure {i}",
                ["failedUtc"] = $"2026-04-2{i % 10}T00:00:00.0000000Z",
            })
            .ToArray();
        var priorState = new JsonObject
        {
            ["failureHistory"] = new JsonArray(historyEntries),
            ["lastError"] = new JsonObject
            {
                ["code"] = "E7",
                ["message"] = "Failure 7",
                ["failedUtc"] = "2026-04-27T00:00:00.0000000Z",
            },
        }.ToJsonString();
        var draft = SeedDraft(db, status: "PREPARING", draftStateJson: priorState);
        await db.SaveChangesAsync();

        var service = CreateDraftService(db);
        await service.StorePreparedResultAsync(draft.DraftId, PreparedState(["AC_01"]));

        var reloaded = await db.ClaimSelectionDrafts.FindAsync(draft.DraftId);
        using var doc = JsonDocument.Parse(reloaded!.DraftStateJson!);
        var history = doc.RootElement.GetProperty("failureHistory");
        Assert.Equal(5, history.GetArrayLength());
        Assert.Equal(5, history.EnumerateArray()
            .Select(entry => $"{entry.GetProperty("code").GetString()}|{entry.GetProperty("message").GetString()}|{entry.GetProperty("failedUtc").GetString()}")
            .Distinct()
            .Count());
        Assert.Equal("E3", history[0].GetProperty("code").GetString());
        Assert.Equal("E7", history[4].GetProperty("code").GetString());
    }

    [Fact]
    public async Task CreateJobFromDraftAsync_SecondCallReturnsExistingDraftJob()
    {
        await using var database = await TestDatabase.CreateAsync();
        await using var db = database.CreateContext();
        var draft = SeedDraft(
            db,
            status: "AWAITING_CLAIM_SELECTION",
            draftStateJson: PreparedState(["AC_01"], selectedClaimIds: ["AC_01"]));
        await db.SaveChangesAsync();

        var service = CreateJobService(db);
        var (firstJob, firstError) = await service.CreateJobFromDraftAsync(draft, ["AC_01"]);
        var (secondJob, secondError) = await service.CreateJobFromDraftAsync(draft, ["AC_01"]);

        Assert.Null(firstError);
        Assert.Null(secondError);
        Assert.NotNull(firstJob);
        Assert.NotNull(secondJob);
        Assert.Equal(firstJob!.JobId, secondJob!.JobId);
        Assert.Equal(1, await db.Jobs.CountAsync(j => j.ClaimSelectionDraftId == draft.DraftId));
        Assert.Equal(1, await db.JobEvents.CountAsync(e => e.JobId == firstJob.JobId));
    }

    [Fact]
    public async Task CreateJobFromDraftAsync_ParallelCallsReturnOneDraftJob()
    {
        await using var database = await TestDatabase.CreateFileBackedAsync();
        string draftId;
        await using (var seedDb = database.CreateContext())
        {
            var draft = SeedDraft(
                seedDb,
                status: "AWAITING_CLAIM_SELECTION",
                draftStateJson: PreparedState(["AC_01"], selectedClaimIds: ["AC_01"]));
            draftId = draft.DraftId;
            await seedDb.SaveChangesAsync();
        }

        var tasks = Enumerable.Range(0, 8).Select(_ => Task.Run(async () =>
        {
            await using var workerDb = database.CreateContext();
            var draft = await workerDb.ClaimSelectionDrafts.SingleAsync(d => d.DraftId == draftId);
            var service = CreateJobService(workerDb);
            return await service.CreateJobFromDraftAsync(draft, ["AC_01"]);
        }));

        var results = await Task.WhenAll(tasks);

        Assert.All(results, result => Assert.Null(result.error));
        var jobs = results.Select(result => result.job).ToArray();
        Assert.All(jobs, Assert.NotNull);
        Assert.Single(jobs.Select(job => job!.JobId).Distinct());

        await using var verifyDb = database.CreateContext();
        var finalJobId = jobs[0]!.JobId;
        Assert.Equal(1, await verifyDb.Jobs.CountAsync(j => j.ClaimSelectionDraftId == draftId));
        Assert.Equal(1, await verifyDb.JobEvents.CountAsync(e => e.JobId == finalJobId));
    }

    private static ClaimSelectionDraftService CreateDraftService(
        FhDbContext db,
        IDictionary<string, string?>? config = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(config ?? new Dictionary<string, string?>())
            .Build();
        return new ClaimSelectionDraftService(
            db,
            NullLogger<ClaimSelectionDraftService>.Instance,
            configuration);
    }

    private static JobService CreateJobService(FhDbContext db)
    {
        return new JobService(db, NullLogger<JobService>.Instance, new AppBuildInfo());
    }

    private static AdminDraftListQuery AdminDraftQuery(
        string scope = "active",
        string[]? statuses = null,
        string hidden = "include",
        string linked = "any",
        string? selectionMode = null,
        string? q = null,
        int page = 1,
        int pageSize = 25)
    {
        return new AdminDraftListQuery(
            scope,
            statuses ?? [],
            hidden,
            linked,
            selectionMode,
            q,
            page,
            pageSize);
    }

    private static ClaimSelectionDraftEntity SeedDraft(
        FhDbContext db,
        string status = "QUEUED",
        string? draftStateJson = null,
        string? inviteCode = null,
        DateTime? createdUtc = null,
        DateTime? expiresUtc = null,
        string? finalJobId = null,
        string? activeInputValue = null,
        bool isHidden = false,
        string? lastEventMessage = null,
        string selectionMode = "interactive")
    {
        var created = createdUtc ?? DateTime.UtcNow;
        var draft = new ClaimSelectionDraftEntity
        {
            DraftId = Guid.NewGuid().ToString("N"),
            Status = status,
            Progress = status == "AWAITING_CLAIM_SELECTION" ? 100 : 0,
            OriginalInputType = "text",
            ActiveInputType = "text",
            OriginalInputValue = activeInputValue ?? "A verifiable claim",
            ActiveInputValue = activeInputValue ?? "A verifiable claim",
            PipelineVariant = "claimboundary",
            InviteCode = inviteCode,
            SelectionMode = selectionMode,
            DraftStateJson = draftStateJson,
            FinalJobId = finalJobId,
            LastEventMessage = lastEventMessage,
            IsHidden = isHidden,
            CreatedUtc = created,
            UpdatedUtc = created,
            ExpiresUtc = expiresUtc ?? DateTime.UtcNow.AddHours(1),
        };
        db.ClaimSelectionDrafts.Add(draft);
        return draft;
    }

    private static string PreparedState(
        string[] claimIds,
        DateTime? lastSelectionInteractionUtc = null,
        string[]? selectedClaimIds = null,
        int selectionCap = 5)
    {
        var state = new JsonObject
        {
            ["selectionCap"] = selectionCap,
            ["preparedStage1"] = new JsonObject
            {
                ["preparedUnderstanding"] = new JsonObject
                {
                    ["atomicClaims"] = new JsonArray(
                        claimIds.Select(id => (JsonNode?)new JsonObject { ["id"] = id }).ToArray()),
                },
            },
        };

        if (lastSelectionInteractionUtc.HasValue)
        {
            state["selectionIdleAutoProceedMs"] = 1000;
            state["lastSelectionInteractionUtc"] = DateTime
                .SpecifyKind(lastSelectionInteractionUtc.Value, DateTimeKind.Utc)
                .ToString("o");
        }

        if (selectedClaimIds is not null)
        {
            state["selectedClaimIds"] = JsonStringArray(selectedClaimIds);
        }

        return state.ToJsonString();
    }

    private static string[] ReadSelectedClaimIds(string? draftStateJson)
    {
        using var doc = JsonDocument.Parse(draftStateJson ?? "{}");
        return doc.RootElement.GetProperty("selectedClaimIds")
            .EnumerateArray()
            .Select(item => item.GetString())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Cast<string>()
            .ToArray();
    }

    private static JsonArray JsonStringArray(IEnumerable<string> values)
    {
        return new JsonArray(values.Select(value => (JsonNode?)JsonValue.Create(value)).ToArray());
    }

    private sealed class TestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection? _connection;
        private readonly DbContextOptions<FhDbContext> _options;
        private readonly string? _databasePath;

        private TestDatabase(
            SqliteConnection? connection,
            DbContextOptions<FhDbContext> options,
            string? databasePath = null)
        {
            _connection = connection;
            _options = options;
            _databasePath = databasePath;
        }

        public static async Task<TestDatabase> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var options = new DbContextOptionsBuilder<FhDbContext>()
                .UseSqlite(connection)
                .Options;
            await using var db = new FhDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new TestDatabase(connection, options);
        }

        public static async Task<TestDatabase> CreateFileBackedAsync(int defaultTimeoutSeconds = 30)
        {
            var path = Path.Combine(Path.GetTempPath(), $"factharbor-api-tests-{Guid.NewGuid():N}.db");
            var connectionString = new SqliteConnectionStringBuilder
            {
                DataSource = path,
                DefaultTimeout = defaultTimeoutSeconds,
            }.ToString();
            var options = new DbContextOptionsBuilder<FhDbContext>()
                .UseSqlite(connectionString)
                .Options;
            await using var db = new FhDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new TestDatabase(null, options, path);
        }

        public FhDbContext CreateContext() => new(_options);

        public async ValueTask DisposeAsync()
        {
            if (_connection is not null)
            {
                await _connection.DisposeAsync();
            }

            if (_databasePath is not null)
            {
                TryDelete(_databasePath);
                TryDelete($"{_databasePath}-shm");
                TryDelete($"{_databasePath}-wal");
            }
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }
    }
}
