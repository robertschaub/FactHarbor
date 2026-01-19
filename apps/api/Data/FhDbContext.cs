using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Data;

public sealed class FhDbContext : DbContext
{
    public FhDbContext(DbContextOptions<FhDbContext> options) : base(options) { }

    public DbSet<JobEntity> Jobs => Set<JobEntity>();
    public DbSet<JobEventEntity> JobEvents => Set<JobEventEntity>();
    public DbSet<Models.AnalysisMetrics> AnalysisMetrics => Set<Models.AnalysisMetrics>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<JobEntity>(e =>
        {
            e.HasKey(x => x.JobId);
            e.Property(x => x.JobId).ValueGeneratedNever();
            e.Property(x => x.Status).HasMaxLength(32);
            e.Property(x => x.InputType).HasMaxLength(16);
        });

        modelBuilder.Entity<JobEventEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.JobId, x.Id });
            e.Property(x => x.Level).HasMaxLength(16);
        });

        modelBuilder.Entity<Models.AnalysisMetrics>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.JobId);
            e.HasIndex(x => x.CreatedUtc);
        });
    }
}
