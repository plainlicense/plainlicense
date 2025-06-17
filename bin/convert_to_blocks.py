#!/usr/bin/env python3
"""
Convert Markdown files using older versions of pymdown-extensions to the Blocks API format.

- heavily based on a script by [@hellt](https://github.com/hellt/pymdownx-block-converter) which is itself based on a script by [@tiangolo](https://github.com/tiangolo).
- https://github.com/tiangolo/sqlmodel/pull/712
- https://github.com/tiangolo/sqlmodel/pull/713
- https://github.com/facelessuser/pymdown-extensions/discussions/1973#discussioncomment-7697040

I just cleaned it up a bit and made the patterns compiled global objects for efficiency (so we're not reconstructing them over and over again).
"""
import re
import sys

from pathlib import Path


ADMONITION_PATTERN = re.compile(
        r"!!!\s*(?P<type>[^\n\s\"]*)\s*(\"(?P<title>[^\n\"]*)\")?\n"
        r"(?P<content>(\n|    .*)*)\n*"
    )

DETAILS_QUESTION_MARKS_PATTERN = re.compile(
        r"\?{3}\+?\s*(?P<type>[^\n\s\"]*)\s*(\"(?P<title>[^\n\"]*)\")?\n"
        r"(?P<content>(\n|    .*)*)\n*"
    )

OPEN_PATTERN = re.compile(r"\?{3}(?P<open>\+)?")

SUMMARY_PATTERN = re.compile(r"<summary>((\n|.)*)</summary>")

# https://regex101.com/r/8CWkrH/1
TABS_PATTERN = re.compile(r"===\s?\"(?P<title>.+)\"\n(?P<content>(\n|    .*)*)\n*")

def update_block(content: str, reg_pattern: re.Pattern) -> str:
    """Convert blocks in Markdown files to use the new block format."""
    def replace(match: re.Match) -> str:
        """Replace a block with the new format."""
        type_ = match["type"]
        title = match["title"]
        block = match["content"]
        deindented_block = re.sub(r"^ {4}", "", block, flags=re.MULTILINE)

        inner_match = OPEN_PATTERN.match(match.group())
        question_marks = bool(inner_match)
        open_ = inner_match.group("open") if inner_match else None

        result = "/// details" if question_marks else f"/// {type_}"

        if title:
            result += f" | {title}"

        if question_marks:
            result += f"\n    type: {type_}"

        if open_:
            result += "\n    open: True"

        result += f"\n{deindented_block.strip()}\n"
        result += "///\n\n"
        return result

    new_content = reg_pattern.sub(replace, content)

    return new_content.strip() + "\n"


def update_admonition(content: str) -> str:
    """Convert admonition blocks in Markdown files to use the new block format."""
    return update_block(content, ADMONITION_PATTERN)


def update_details_question_marks(content: str) -> str:
    """Convert details blocks with question marks in Markdown files to use the new block format."""
    return update_block(content, DETAILS_QUESTION_MARKS_PATTERN)


def update_details(content: str) -> str:
    """Convert details blocks in Markdown files to use the new block format."""
    open_true = "    open: True\n"

    new_content = content

    all_starts = re.finditer(r"<details(\s+open.*)?>", content)
    all_ends = re.finditer("</details>", content)
    for start, end in zip(all_starts, all_ends, strict=True):
        sub_content = content[start.start() : end.end()]

        match = SUMMARY_PATTERN.search(sub_content)
        summary = f" | {match[1].strip()}" if match else ""

        sub_content_internal = content[start.end() : end.start()].strip()

        sub_content_no_summary = SUMMARY_PATTERN.sub("", sub_content_internal).strip()

        new_sub_content = (
            f"/// details{summary}\n"
            f"{open_true if 'open' in start.group() else ''}"
            f"{sub_content_no_summary}\n///"
        )

        new_content = new_content.replace(sub_content, new_sub_content)

    return new_content


def update_tabs(content: str) -> str:
    """Convert tabs in Markdown files to use the new block format."""
    def replace(match: re.Match) -> str:
        """Replace a tab block with the new format."""
        title = match["title"]
        block = match["content"]
        deindented_block = re.sub(r"^ {4}", "", block, flags=re.MULTILINE)
        result = "/// tab"
        if title:
            result += f" | {title}"
        result += f"\n{deindented_block.strip()}\n"
        result += "///\n\n"
        return result

    new_content = TABS_PATTERN.sub(replace, content)

    return new_content.strip() + "\n"

def main() -> None:
    """Convert Markdown files to use blocks instead of admonitions, details, and tabs."""
    try:
        target = sys.argv[1]

        if Path(target).is_file():
            md_files = [Path(target)]
        # must be a directory, right?
        else:
            md_files = list(Path(target).glob("**/*.md"))
    except IndexError:
        # backward compatible with initial container configuration
        md_files = list(Path("/docs").glob("**/*.md"))

    for md_file in md_files:
        content = md_file.read_text()

        content = update_admonition(content)
        content = update_details(content)
        content = update_details_question_marks(content)
        content = update_tabs(content)

        md_file.write_text(content)


if __name__ == "__main__":
    main()
