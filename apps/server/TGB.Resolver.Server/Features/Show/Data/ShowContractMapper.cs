using Riok.Mapperly.Abstractions;
using TGB.Resolver.Server.Features.Show.Dto;

namespace TGB.Resolver.Server.Features.Show.Data;

[Mapper]
public static partial class ShowContractMapper
{
  public static partial ShowStateSnapshot ToContract(ShowState source);
}