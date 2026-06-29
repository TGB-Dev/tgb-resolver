using Riok.Mapperly.Abstractions;
using TGB.Resolver.Server.Contracts.Show;
using TGB.Resolver.Server.Domain.Shows;

namespace TGB.Resolver.Server.Application.Mapping;

[Mapper]
public static partial class ShowContractMapper
{
    public static partial ShowStateSnapshot ToContract(ShowState source);
}
