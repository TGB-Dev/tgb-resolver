using FluentValidation;

namespace TGB.Resolver.Server.Shared.Validation;

public static class ValidationExtensions
{
  // ReSharper disable UnusedMethodReturnValue.Global
  public static IRuleBuilderOptions<T, string> RequiredLength<T>(
    this IRuleBuilder<T, string> ruleBuilder,
    int minLength,
    int maxLength,
    string requiredMessage,
    string lengthMessage)
  {
    return ruleBuilder
      .NotEmpty().WithMessage(requiredMessage)
      .Length(minLength, maxLength).WithMessage(lengthMessage);
  }

  public static IRuleBuilderOptions<T, string?> OptionalLength<T>(
    this IRuleBuilder<T, string?> ruleBuilder,
    int maxLength,
    string message)
  {
    return ruleBuilder
      .MaximumLength(maxLength).WithMessage(message);
  }
  // ReSharper restore UnusedMethodReturnValue.Global
}