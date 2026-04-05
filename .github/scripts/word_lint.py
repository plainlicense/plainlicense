#!/usr/bin/env -S uv run -s
# /// script
# dependencies=["ez_yaml", "gitignore_parser", "rich", "joblib"]
# requires-python=">=3.8"
# ///
# sourcery skip: avoid-builtin-shadow, avoid-global-variables
# ty: ignore[unresolved-import]
"""Lint script for checking word usage and style across the project."""

import argparse
import re
import sys
from functools import partial
from pathlib import Path

from ez_yaml import yaml
from gitignobre_parser import parse_gitignore_str
from joblib import delayed
from joblib.parallel import Parallel
from rich.console import Console
from rich.style import Style

from ._linter_dict import BETTER_WORD_MAP, that_alert
from .update_sponsors import get_frontmatter

console = Console(soft_wrap=True, markup=True)
print = console.print  # noqa: A001  # intentionally shadowing


# Add the project root to sys.path for imports
GH_ROOT = Path(__file__).parent.parent
if str(GH_ROOT) not in sys.path:
    sys.path.insert(0, str(GH_ROOT))

EXTS = (
    ".py",
    ".md",
    ".txt",
    ".html",
    ".ts",
    ".css",
    ".json",
    ".pkl",
    ".toml",
    ".yaml",
    ".yml",
)

ALWAYS_IGNORE = {
    str(path)
    for path in (
        GH_ROOT / "mkdocs.yml",
        GH_ROOT / ".github" / "scripts" / "_inter_dict.py",
        GH_ROOT / ".github" / "scripts" / "word_lint.py",
    )
}

# license path pattern is docs/licenses/category/license_name/index.md
LICENSE_PATHS = tuple((GH_ROOT.parent / "docs" / "licenses").glob("*/*/index.md"))


def parse_args() -> argparse.Namespace:
    """Parse command line arguments for the lint script."""
    parser = argparse.ArgumentParser(
        description="Lint script for checking word usage and style across the project."
    )
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        default=list(GH_ROOT.parent.iterdir()),
        help="Files to lint. If no files are provided, all files in the project will be checked.",
    )
    parser.add_argument(
        "--ignore",
        "-i",
        nargs="*",
        type=list[str],
        default=[],
        help="Files or directories to ignore during linting. Accepts any .gitignore-like patterns.",
    )
    parser.add_argument(
        "--no-better-words",
        "-n",
        action="store_true",
        help="Disable the use of better words.",
    )
    parser.add_argument(
        "--no-that-alert",
        "-t",
        action="store_true",
        help="Disable the 'that' alert.",
    )
    parser.add_argument(
        "--write",
        "-w",
        action="store_true",
        help="Enable writing changes to files for all lints.",
    )
    parser.add_argument(
        "--only-write-better-words",
        "-b",
        action="store_true",
        help="Enable writing changes to files but only for better words.",
    )
    return parser.parse_args()


def get_files(files: list[Path], ignores: list[str]) -> list[Path]:
    """Get a list of files to lint, excluding ignored files."""

    def is_ignored(file: Path) -> bool:
        """Check if a file is ignored based on the provided ignore patterns."""
        return matches(str(file.absolute()))

    matches = parse_gitignore_str("\n".join(ignores), str(GH_ROOT.parent.absolute()))

    result = []
    for file in files:
        if not file.exists():
            continue
        if file.is_dir():
            files.extend(
                f
                for f in file.iterdir()
                if f.is_dir() or (f.is_file() and (f.suffix in EXTS) and f not in files)
            )  # Add all files in the directory to the list
        elif file.exists() and file.is_file() and not is_ignored(file):
            result.append(file)
    return sorted(set(result), key=lambda x: str(x).lower())


def get_gitignores() -> list[str]:
    """Resolve files ignored by .gitignore in the project root."""
    ignore_file = GH_ROOT.parent / ".gitignore"
    if not ignore_file.exists():
        return []

    lines = ignore_file.read_text().splitlines()
    return [
        line.strip()
        for line in lines
        if line.strip() and not line.strip().startswith("#")
    ]


def print_matches(
    pattern: re.Pattern, file: Path, content: str, start_line: int = 1
) -> None:
    """Print matches of a regex pattern in the content."""
    lines = content.splitlines()
    matched = False
    for i, line in enumerate(lines, start_line):
        if match := pattern.search(line):
            if not matched:
                print(
                    f"[cyan]==== Matches Found in {file!s} ====[/cyan]",
                    new_line_start=True,
                )
                matched = True
            replacer = BETTER_WORD_MAP[pattern]
            matchdict = match.groupdict()
            name = f"{file.parent!s}/{file.name}"
            print(
                f"""found match for [bold red]{matchdict["match_word"]}{matchdict.get("suffix", "") if "suffix" in matchdict and matchdict.get("suffix") else ""}[/bold red] at [bold blue]line {i}[/bold blue] in [bold yellow]{name}[/bold yellow].""",
                new_line_start=True,
            )
            print(
                "[white]If write[/white] was enabled (it isn't!), the line would look like this:"
            )
            print(
                f"{pattern.sub(replacer, line)}",
                style=Style(color="#00ff5f", bold=True, italic=True),
            )
            print("")


def handle_license_content(
    write: bool,
    content: str,
    file: Path,
    func: partial[str | None],
    *,
    that_alert: bool = False,
) -> None:  # noqa: FBT001
    """Handle license content files specifically."""
    front_matter, rest_of_content = get_frontmatter(content)
    if not front_matter and not rest_of_content.strip():
        return
    check_keys = (
        "title",
        "description",
        "license_description",
        "reader_license_text",
        "extra_how",
    )
    frontmatter_fields = {
        key: front_matter[key]
        for key in check_keys
        if front_matter.get(key) and isinstance(front_matter.get(key), str)
    }
    if not frontmatter_fields:
        return

    if write and not that_alert:
        new_rest_of_content = rest_of_content
        if (
            rest_of_content.strip()
            and (processed_rest_of_content := func(rest_of_content, rtrn=True))
            and processed_rest_of_content != rest_of_content
        ):
            new_rest_of_content = processed_rest_of_content
            print(f"Updated rest of content in {file.name}")
        if changes := _process_license_content_for_writing(
            front_matter,
            frontmatter_fields,
            file.name,
            func,
        ):
            consolidated_front_matter = {**front_matter, **changes}
            _write_updated_license_file(
                consolidated_front_matter, new_rest_of_content, file
            )
    else:
        # If that_alert is True, we only process the frontmatter fields and rest of content for display
        _process_license_content_for_display(
            content, frontmatter_fields, rest_of_content, func, that_alert=that_alert
        )


def _process_license_content_for_writing(
    front_matter: dict,
    frontmatter_fields: dict[str, str],
    file_name: str,
    func: partial,
) -> dict[str, str]:
    """Process license content for writing changes."""
    changes_made = {}

    # Process frontmatter fields
    for key, value in frontmatter_fields.items():
        if not value or not isinstance(value, str):
            continue
        processed_content = func(value, rtrn=True)
        if processed_content and processed_content != value:
            front_matter[key] = processed_content
            changes_made[key] = (value, processed_content)
            print(f"Updated front matter key '{key}' in {file_name}")

    return changes_made or {}


def _process_license_content_for_display(
    content: str,
    frontmatter_fields: dict,
    rest_of_content: str,
    func: partial,
    *,
    that_alert: bool = False,
) -> None:
    """Process license content for display only (no writing)."""
    raw_lines = tuple(enumerate(content.splitlines(), start=1))

    # Process frontmatter fields
    for key, value in frontmatter_fields.items():
        start_line = next((i for i, line in raw_lines if line.startswith(f"{key}:")), 1)
        func(value, start_line=start_line)

    # Process rest of content
    if rest_of_content:
        start_line = next(
            (i for i, line in raw_lines if line.startswith(rest_of_content[:5])), 1
        )
        func(rest_of_content, start_line=start_line)


def _write_updated_license_file(
    front_matter: dict, rest_of_content: str, file: Path
) -> None:
    """Write the updated license file with new frontmatter and content."""
    new_front_matter = yaml.to_string(front_matter)
    new_content = f"---\n{new_front_matter}---\n{rest_of_content}"
    file.write_text(new_content, encoding="utf-8")
    print(f"Updated {file.name}.")


def write_matches(
    pattern: re.Pattern, file: Path, content: str, *, rtrn: bool = False
) -> str | None:
    """Write matches of a regex pattern in the content."""
    replacer = BETTER_WORD_MAP[pattern]
    modified_content = pattern.sub(replacer, content)
    if rtrn:
        return modified_content
    if modified_content != content:
        try:
            file.write_text(modified_content, encoding="utf-8")
            print(f"Replaced '{pattern.pattern}' with '{replacer}' in {file.name}")
        except Exception as e:
            print(f"Error writing to {file}: {e}")
    return None


def _check_file_in_license_paths(file: Path) -> bool:
    """Check if the file is in the license paths."""
    return any(file.match(str(license_path)) for license_path in LICENSE_PATHS)


def _check_file_for_pattern(
    file: Path, pattern: re.Pattern, content: str, *, write: bool = False
) -> None:
    """Process a single file for better words."""
    if _check_file_in_license_paths(file):
        partial_func = partial(write_matches if write else print_matches, pattern, file)
        handle_license_content(write, content, file, partial_func)
    elif pattern.search(content):
        if write:
            print(f"Writing changes to {file.name} for pattern {pattern.pattern}")
            write_matches(pattern, file, content)
        else:
            print_matches(pattern, file, content)


def _process_file_for_better_words(file: Path, *, write: bool = False) -> None:
    """Process a single file for better words."""
    try:
        content = file.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {file}: {e}")
        return

    modified_content = content
    print(f"Processing {file.name} for better words...")
    for pattern in BETTER_WORD_MAP:
        _check_file_for_pattern(file, pattern, modified_content, write=write)


def process_better_words(files: tuple[Path, ...], *, write: bool = False) -> None:
    """Process files to replace words with better alternatives."""
    parallel = Parallel(n_jobs=-1, prefer="threads")
    parallel(
        delayed(_process_file_for_better_words)(file, write=write) for file in files
    )


def process_that_alert(file: Path, *, write: bool = False) -> None:
    """Process files to check for overuse of the word 'that'."""
    file_name = f"{file.parent.name}/{file.name}"
    content = file.read_text(encoding="utf-8")
    if _check_file_in_license_paths(file):
        func = partial(that_alert, write, console, file_name, content)
        handle_license_content(write, content, file, func)
    else:
        print(f"Processing {file_name} for 'that' alert...")
        that_alert(
            write=write, console=console, name=file_name, text=content, start_line=1
        )


def main(args: argparse.Namespace) -> None:
    """Main function to run the lint script."""
    print("Starting lint script...")
    print(f"Arguments: {args}")
    if not args.files:
        raise ValueError(
            "No files provided for linting. Please specify files or directories to lint."
        )

    if args.no_better_words and args.no_that_alert:
        print(
            "Both --no-better-words and --no-that-alert are set. No linting will be performed."
        )
        sys.exit(0)

    ignores = get_gitignores()
    ignores.extend(set(ALWAYS_IGNORE) | set(args.ignore))
    if files := tuple(get_files(args.files, ignores)):
        print(f"Linting the following files: {', '.join(str(file) for file in files)}")
    else:
        print("No files to lint found. Please check your file paths and ignore rules.")
        sys.exit(0)

    if not args.no_better_words:
        print("Using better words for linting.")
        process_better_words(files, write=args.write or args.only_write_better_words)

    if not args.no_that_alert:
        parallel = Parallel(n_jobs=-1, prefer="threads")
        parallel(
            delayed(process_that_alert)(
                file, write=args.write or args.only_write_better_words
            )
            for file in files
        )

    print("[green]Linting completed successfully.[/green]")


if __name__ == "__main__":
    main(parse_args())
