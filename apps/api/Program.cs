using FactHarbor.Api.Data;
using FactHarbor.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var provider = builder.Configuration["Db:Provider"]?.ToLowerInvariant() ?? "sqlite";
builder.Services.AddDbContext<FhDbContext>(opt =>
{
    if (provider == "sqlite")
    {
        var cs = builder.Configuration.GetConnectionString("FhDbSqlite");
        opt.UseSqlite(cs);
    }
    else
    {
        throw new InvalidOperationException("Only sqlite is enabled in this POC scaffold.");
    }
});

builder.Services.AddScoped<JobService>();
builder.Services.AddHttpClient<RunnerClient>(client =>
{
    // IMPORTANT:
    // The runner endpoint currently performs the full LLM workflow before responding.
    // 15s is often too short (URL fetch + LLM call + status/result writes).
    // Increase timeout for local/POC so the trigger request does not get canceled prematurely.
    client.Timeout = TimeSpan.FromMinutes(5);
});

var app = builder.Build();

// Create DB automatically for POC (no dotnet-ef required)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FhDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

app.Run();
