using Microsoft.EntityFrameworkCore;

namespace TGB.Resolver.Server.Commons.Data;

public sealed class ResolverDbContext(DbContextOptions<ResolverDbContext> options)
  : DbContext(options)
{
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