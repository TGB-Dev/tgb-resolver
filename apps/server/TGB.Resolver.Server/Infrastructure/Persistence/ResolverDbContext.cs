using Microsoft.EntityFrameworkCore;

namespace TGB.Resolver.Server.Infrastructure.Persistence;

public sealed class ResolverDbContext : DbContext
{
    public ResolverDbContext(DbContextOptions<ResolverDbContext> options)
        : base(options)
    {
    }

    public DbSet<StoredShowState> ShowStates => Set<StoredShowState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StoredShowState>(entity =>
        {
            entity.ToTable("show_states");
            entity.HasKey(row => row.Id);
            entity.Property(row => row.Id).HasMaxLength(64);
            entity.Property(row => row.PayloadJson).IsRequired();
            entity.Property(row => row.UpdatedAtUtc).IsRequired();
        });
    }
}

public sealed class StoredShowState
{
    public string Id { get; set; } = "local-show";

    public int ShowVersion { get; set; }

    public string PayloadJson { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
