#!/usr/bin/env python3
"""Run ReSharper inspection and print a compact, grouped SARIF report."""

import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

SOLUTION = Path(__file__).resolve().parent.parent / "TGB.Resolver.Server.slnx"
OUTPUT = Path(__file__).resolve().parent.parent / "inspect.sarif.json"
SETTINGS = Path(__file__).resolve().parent.parent / "TGB.Resolver.Server.slnx.DotSettings"
TOOL_MANIFEST = Path(__file__).resolve().parent.parent / "dotnet-tools.json"


def run_inspect() -> None:
    temporary_output = OUTPUT.with_suffix(".tmp.sarif.json")
    temporary_output.unlink(missing_ok=True)
    command = [
        "dotnet", "jb", "inspectcode", str(SOLUTION), "--swea",
        f"-o={temporary_output}",
    ]
    if SETTINGS.exists():
        command.extend([f"--settings={SETTINGS}", "--no-buildin-settings"])

    print(f"inspectcode: {SOLUTION.name}")
    result = subprocess.run(
        command,
        capture_output=True, text=True, timeout=600, cwd=TOOL_MANIFEST.parent
    )
    if result.returncode != 0 or not temporary_output.exists():
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)

    try:
        with temporary_output.open(encoding="utf-8") as file:
            json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        print("inspectcode did not produce valid SARIF: " + str(error), file=sys.stderr)
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)

    temporary_output.replace(OUTPUT)


def load_results() -> list[dict]:
    try:
        with OUTPUT.open(encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        print(f"inspectcode did not produce valid SARIF: {error}", file=sys.stderr)
        sys.exit(1)

    return data.get("runs", [{}])[0].get("results", [])


def categorize(rule_id: str) -> str:
    if rule_id.startswith("Xaml."):
        return "xaml"
    if rule_id == "InconsistentNaming":
        return "naming"
    if rule_id.startswith("ArrangeObjectCreation") or rule_id in (
        "ConvertToPrimaryConstructor", "ConvertConstructorToMemberInitializers",
        "ConvertClosureToMethodGroup", "ForCanBeConvertedToForeach",
        "MergeIntoPattern", "ReplaceObjectPatternWithVarPattern",
        "RedundantTypeDeclarationBody", "RedundantRecordClassKeyword",
        "RedundantSuppressNullableWarningExpression", "UseObjectOrCollectionInitializer",
        "ArrangeObjectCreationWhenTypeEvident"
    ):
        return "style"
    if rule_id in ("UnusedMember.Global", "UnusedAutoPropertyAccessor.Global",
                    "UnusedType.Global", "UnusedParameter.Global",
                    "UnusedParameterInPartialMethod"):
        return "unused"
    if rule_id in ("MemberCanBePrivate.Global", "MemberCanBePrivate.Local",
                    "PropertyCanBeMadeInitOnly.Global",
                    "VirtualMemberNeverOverridden.Global"):
        return "visibility"
    if rule_id in ("AsyncVoidMethod", "AsyncVoidEventHandlerMethod",
                    "AsyncMethodWithoutAwait"):
        return "async"
    if rule_id in ("MethodHasAsyncOverload",):
        return "api"
    if rule_id in ("ClassNeverInstantiated.Global",):
        return "instantiation"
    if rule_id in ("NullCoalescingConditionIsAlwaysNotNullAccordingToAPIContract",
                    "ParameterHidesMember", "ReturnTypeCanBeNotNullable"):
        return "correctness"
    return "other"


def is_lower_camel(name: str) -> bool:
    return bool(re.match(r"^[a-z][A-Za-z0-9]*$", name))


def should_skip_result(result: dict) -> bool:
    if result.get("ruleId") != "InconsistentNaming":
        return False

    message = result.get("message", {}).get("text", "")
    match = re.search(r"Name '([^']+)'.*Suggested name is '([^']+)'.", message)
    if match is None:
        return False

    current_name, suggested_name = match.groups()
    # We use lowerCamelCase private fields; skip old underscore-prefixed suggestions.
    return suggested_name.startswith("_") and is_lower_camel(current_name)


def get_location(result: dict) -> tuple[str, int]:
    location = result.get("locations", [{}])[0].get("physicalLocation", {})
    uri = location.get("artifactLocation", {}).get("uri", "<unknown>")
    line = location.get("region", {}).get("startLine", 0)
    return uri.replace("solutionDir:", "").lstrip("/\\"), line


def main() -> None:
    run_inspect()
    results = [result for result in load_results() if not should_skip_result(result)]

    if not results:
        print("inspectcode: no issues")
        return

    by_file: dict[str, list[tuple[int, str, str]]] = defaultdict(list)
    categories: dict[str, int] = defaultdict(int)
    rules: dict[str, int] = defaultdict(int)
    for result in results:
        uri, line = get_location(result)
        rule = result.get("ruleId", "<unknown>")
        message = result.get("message", {}).get("text", "")
        by_file[uri].append((line, rule, message))
        categories[categorize(rule)] += 1
        rules[rule] += 1

    print(f"inspectcode: {len(results)} issue(s) in {len(by_file)} file(s)")
    print("categories: " + ", ".join(f"{name}={count}" for name, count in sorted(categories.items())))
    print("rules: " + ", ".join(f"{name}={count}" for name, count in sorted(rules.items())))

    for uri in sorted(by_file):
        print(f"\n{uri}")
        for line, rule, message in sorted(by_file[uri]):
            print(f"  L{line}: {rule}: {message}")


if __name__ == "__main__":
    main()
