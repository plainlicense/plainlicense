"""
If there are any words in our content that we want to consistently replace with simpler versions, define them here.
This is not applied to "official licenses", but is applied to all other content.

NOTE: If you need to use one of these words, surround it with backticks or quotes.
"""

import re

from enum import IntEnum
from functools import cache
from types import LambdaType
from typing import Literal, LiteralString

from rich.console import Console
from rich.style import Style
from rich.text import Text


THAT_PATTERN = re.compile(r"\bthat\b", re.IGNORECASE)

# common suffix patterns for regular words
SUFFIX_MAP: dict[Literal["adjective", "noun", "verb"], dict[str, LiteralString]] = {
    "adjective": {
        "regular": r""
    },
    "noun": {
        "regular": r"(?P<suffix>s|'s|s')?",
        "with_e": r"(?P<suffix>es|'s|es')?",
    },
    "verb": {
        "regular": r"(?P<suffix>s|d)?",
        "with_e": r"(?P<suffix>s|ed)?",
        # this has to be required for the irregular forms
        "irregular": r"(?P<suffix>ies|ied)" # <-- no `?`
    }
}

class ConfidenceLevel(IntEnum):
    """
    Enum for confidence levels.
    """
    VERY_LOW = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3

    def __str__(self) -> str:
        return self.name.lower()

    @classmethod
    def from_string(cls, value: str) -> "ConfidenceLevel":
        # sourcery skip: docstrings-for-functions
        value = value.lower()
        match value:
            case "very low" | "very-low" | "verylow" | "very_low" | "vl":
                return cls.VERY_LOW
            case "low" | "l":
                return cls.LOW
            case "medium" | "med" | "m":
                return cls.MEDIUM
            case "high" | "h":
                return cls.HIGH
            case _:
                raise ValueError(f"Invalid confidence level: {value}")


def get_suffix(word_type: Literal["adjective", "noun", "verb"], *, with_e: bool, irregular: bool) -> LiteralString:
    """
    Get the appropriate suffix pattern based on the word type and whether it ends with 'e' or is irregular.
    """
    if word_type not in ["adjective", "noun", "verb"]:
        raise ValueError(f"Invalid word type: {word_type}")
    if irregular:
        return SUFFIX_MAP[word_type]["irregular"]
    return SUFFIX_MAP[word_type]["with_e"] if with_e else SUFFIX_MAP[word_type]["regular"]


def get_replacement(match: re.Match, replacement: str) -> str:
    """
    Handle case-insensitive replacement for the given match.
    """
    match_word = match["match_word"]
    if match_word.istitle():
        return replacement.title()
    return replacement.upper() if match_word.isupper() else replacement.lower()

@cache
def to_pattern(pattern: str, suffix: Literal["adjective", "noun", "verb"] | None = None, *, with_e: bool = False, irregular: bool = False) -> re.Pattern:
    """
    Convert a string pattern into a compiled regex pattern with optional suffix handling.

    Constructed pattern will not match if the word is surrounded by backticks or quotes. (e.g. `attorney` or "attorney")
    """
    if suffix is not None and suffix not in ["adjective", "noun", "verb"]:
        raise ValueError(f"Invalid suffix type: {suffix}")

    # Build components
    lookbehind = r"(?<![`\"'])"
    word_group = f"(?P<match_word>{pattern})"
    lookahead = r"(?![`\"'])"

        # Single word: add suffix pattern
    suffix_pattern = get_suffix(
            suffix,
            with_e=with_e,
            irregular=irregular
        ) if suffix else r""

    full_pattern = rf"\b{lookbehind}{word_group}{suffix_pattern}{lookahead}\b"

    return re.compile(full_pattern, re.IGNORECASE)

# sourcery skip: lambdas-should-be-short, no-complex-if-expressions
"""
This dictionary maps regex patterns to replacement functions or strings. Will be used as re.sub() replacement.
"""
BETTER_WORD_MAP: dict[re.Pattern, LambdaType | str] = {
    #* attorney -> lawyer
    to_pattern(r"attorney", "noun"): lambda m: f"lawyer{m.group('suffix') or ''}",

    #* utilize -> use
    to_pattern(r"utilize", "verb"): lambda m: f"{get_replacement(m, 'use')}{m.group('suffix') or ''}",

    #* alter -> change
    to_pattern(r"alter|alteration", "verb", with_e=True): lambda m: f"{get_replacement(m, 'change')}{m.group('suffix') or ''}",

    #* "in order to" -> "to"
    to_pattern(r"in order to"): lambda m: get_replacement(m, "to"),

    #* "in the event that/of" -> "if"
    to_pattern(r"in the event (that|of)"): lambda m: get_replacement(m, "if"),

    #* grant -> give
    to_pattern(r"grant", "noun"): lambda m: f"{get_replacement(m, 'give')}{m.group('suffix') or ''}",

    #* modification -> change
    to_pattern(r"modification", "noun"): lambda m: f"{get_replacement(m, 'change')}{m.group('suffix') or ''}",

    #* modify -> change
    to_pattern(r"modify", "verb"): lambda m: get_replacement(m, 'change'),

    #* modifies/modified -> changes/changed
    to_pattern(r"modif", "verb", irregular=True): lambda m: get_replacement(m, 'changes' if (m['match_word'] + m['suffix']) == 'modifies' else 'changed'),

    #* with respect to -> about
    to_pattern(r"with respect to"): lambda m: get_replacement(m, "about"),

    #* with regard to -> about
    to_pattern(r"with regard to"): lambda m: get_replacement(m, "about"),

    #* "in the course of" -> "during"
    to_pattern(r"in the course of"): lambda m: get_replacement(m, "during"),

    #* permit -> allow
    to_pattern(r"permitt?", "verb", with_e=True): lambda m: f"{get_replacement(m, 'allow')}{m.group('suffix') or ''}",

    #* irrevocable -> permanent
    to_pattern(r"irrevocable", None): lambda m: get_replacement(m, 'permanent'), # disable suffix handling

    #* imply -> suggest
    to_pattern(r"impl", "verb", irregular=True): lambda m: f"{get_replacement(m, 'suggest')}{m.group('suffix') or ''}",

    #* combine -> mix
    to_pattern(r"combine|combination", "verb"): lambda m: f"{get_replacement(m, 'mix')}{('e' + m.group('suffix')) if m.group('suffix') else 'e'}",

    #* applicable -> related
    to_pattern(r"applicable", "adjective"): lambda m: f"{get_replacement(m, 'related')}{m.group('suffix') if 'suffix' in m.groupdict() else ''}",

    #* statute -> law
    to_pattern(r"statute", "noun"): lambda m: f"{get_replacement(m, 'law')}{m.group('suffix') or ''}",
}


def that_alert(write: bool, console: Console, name: str, text: str, *, start_line: int = 1) -> None:    # noqa: FBT001
    """
    Find and call attention to the word "that" in the text.
    Name is used for context in the output.

    Finds instances of the word that and prints it in all caps, surrounded by double tildes (~~) with a line number and context. Used to find overuse of the word "that" in our content.
    """
    if write:
        console.print("[bold red]Write not yet implemented![/bold red]")
    tilde_style = Style(color="#d7d700", blink=True, bold=True)
    that_style = Style(color="#d700d7", blink=False, bold=True)
    text_style = Style(color="#d7d7d7", blink=False, bold=False)
    lines = text.splitlines()
    that_count = 0
    that_lines: list[tuple[int, Text]] = []
    for i, line in enumerate(lines, start=start_line):
        if line.strip() and (found_thats := THAT_PATTERN.findall(line)):
            for that in found_thats:
                that_count += len(found_thats)
                # Replace the word "that" with "THAT" surrounded by tildes
                line = line.replace(that, f" ~~{that.upper()}~~ ")
                assembled = Text(line, style=text_style)
                assembled.highlight_regex(r"~~", tilde_style)
                assembled.highlight_regex(r"THAT", that_style)

                that_lines.append((i, assembled))
    if that_lines:
        console.print(Text.from_markup(f"==== Found [bold red]'that'[/bold red] in [bold cyan]{name}[/bold cyan] in the following places: [red]{len(that_lines)} instances[/red] ===="))
        for line_num, context in that_lines:
            console.print(f"  Line {line_num}:\n {context}", style=text_style, highlight=True)
