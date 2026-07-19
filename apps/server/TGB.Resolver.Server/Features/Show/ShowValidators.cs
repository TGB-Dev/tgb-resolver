using FastEndpoints;
using FluentValidation;
using TGB.Resolver.Server.Commons.Types;
using TGB.Resolver.Server.Features.Show.Dto;
using TGB.Resolver.Server.Shared.Validation;

namespace TGB.Resolver.Server.Features.Show;

public sealed class VersionedCommandRequestValidator : Validator<VersionedCommandRequest>
{
    public VersionedCommandRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
    }
}

public sealed class SeekPlaybackRequestValidator : Validator<SeekPlaybackRequest>
{
    public SeekPlaybackRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.EventId).GreaterThan(0);
    }
}

public sealed class ImportXmlRequestValidator : Validator<ImportXmlRequest>
{
    public ImportXmlRequestValidator()
    {
        RuleFor(x => x.Xml)
            .RequiredLength(1, 10485760, "XML content is required.",
                "XML content must be between 1 and 10MB.");
    }
}

public sealed class ImportBundleRequestValidator : Validator<ImportBundleRequest>
{
    public ImportBundleRequestValidator()
    {
        RuleFor(x => x.Bytes)
            .NotEmpty().WithMessage("Bundle data is required.")
            .Must(IsValidBase64).WithMessage("Bundle data must be a valid Base64 string.");
    }

    private static bool IsValidBase64(string value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        try
        {
            _ = Convert.FromBase64String(value);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

public sealed class ResolveEventRenameRequestValidator : Validator<ResolveEventRenameRequest>
{
    public ResolveEventRenameRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CustomName)
            .OptionalLength(100, "CustomName must not exceed 100 characters.");
    }
}

public sealed class CreateTimelineEventRequestValidator : Validator<CreateTimelineEventRequest>
{
    public CreateTimelineEventRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Type)
            .NotEqual(TimelineEventType.Res)
            .WithMessage("Resolve events are created only by XML import.");
        RuleFor(x => x.RelativeToEventId).GreaterThan(0);
        RuleFor(x => x.CustomName)
            .OptionalLength(100, "CustomName must not exceed 100 characters.");
    }
}

public sealed class MoveTimelineEventRequestValidator : Validator<MoveTimelineEventRequest>
{
    public MoveTimelineEventRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RelativeToEventId).GreaterThan(0);
    }
}

public sealed class SetTimelineModeRequestValidator : Validator<SetTimelineModeRequest>
{
    public SetTimelineModeRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TimelineMode).IsInEnum();
    }
}

public sealed class UpsertAssetRequestValidator : Validator<UpsertAssetRequest>
{
    public UpsertAssetRequestValidator()
    {
        RuleFor(x => x.ShowVersion).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Kind)
            .Must(k => string.Equals(k, "image", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(k, "sfx", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Asset kind must be 'image' or 'sfx'.");
        RuleFor(x => x.Bytes)
            .NotEmpty().WithMessage("Asset data is required.")
            .Must(IsValidBase64).WithMessage("Asset data must be a valid Base64 string.");
        RuleFor(x => x.FileName)
            .RequiredLength(1, 255, "File name is required.",
                "File name must not exceed 255 characters.");
        RuleFor(x => x.ContentType)
            .RequiredLength(1, 100, "Content type is required.",
                "Content type must not exceed 100 characters.");
    }

    private static bool IsValidBase64(string value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        try
        {
            _ = Convert.FromBase64String(value);
            return true;
        }
        catch
        {
            return false;
        }
    }
}