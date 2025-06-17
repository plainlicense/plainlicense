"""Constants for the license factory."""
import re

from datetime import UTC, datetime
from re import Pattern
from textwrap import dedent


YEAR = datetime.now(UTC).strftime("%Y")

PATTERNS: dict[str, Pattern[str]] = {
    "year": re.compile(r"\{\{\s{1,2}year\s{1,2}\}\}"),
    "code": re.compile(r"(`{3}markdown|`{3}plaintext(.*?)`{3})", re.DOTALL),
    "definition": re.compile(
        r"(?P<term>`[\w\s]+`)\s*?\n{1,2}:\s{1,4}(?P<def>[\w\s]+)\n{2}", re.MULTILINE
    ),
    "annotation": re.compile(
        r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
        re.MULTILINE | re.DOTALL,
    ),
    "format_class": re.compile(r"\{\s?\.\w+\s?\}"),
    "header": re.compile(r"#+ (?P<header>\w+?)\n"),
    "markdown": re.compile(r"#+ |(\*\*|\*|`)(.*?)\1", re.MULTILINE),
    "link": re.compile(r"\[(?P<text>.*?)\]\((?P<url>.*?)\)", re.MULTILINE),
    "image": re.compile(r"!\[(?P<alt_text>.*?)\]\((?P<url>.*?)\)", re.MULTILINE),
    "initial_footnote": re.compile(r".*\[\^(?P<citation>\d+)\](!?:)"),
    "footnote": re.compile(r"^\s*\[\^(?P<citation>\d+)\]:\s*(?P<content>.+)\n", re.MULTILINE),
}

ICON_MAP = {
    "reader": ":material-book-open-variant:",
    "markdown": ":octicons-markdown-24:",
    "plaintext": ":nounproject-txt:",
    "embed": ":material-language-html5:",
    "changelog": ":material-history:",
    "official": ":material-license:",
}

TAG_MAP = {
            "distribution": "can-share",  # allowances
            "commercial-use": "can-sell",
            "modifications": "can-change",
            "revokable": "can-revoke",
            "relicense": "relicense",
            "disclose-source": "share-source",  # requirements
            "document-changes": "describe-changes",
            "include-copyright": "give-credit",
            "same-license": "share-alike (strict)",
            "same-license--file": "share-alike (relaxed)",
            "same-license--library": "share-alike (relaxed)",
}

EMBED_STYLE = dedent("""position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;""")

#================================================
# *           FORMATTING LITERALS
#================================================
"""
Constants for formatting and layout in the license factory.
I found that without them, it was easy for phantom formatting issues to creep in.
"""

SNIPPET = "--8<--"

SPACE = " " # Single space for readability

TAB = SPACE * 4  # Four spaces for indentation

LINEBREAK = "\n"  # Line break for readability

PARAGRAPH_BREAK = LINEBREAK * 2  # Two line breaks for paragraph separation

# Divider for page sections in plaintext, also a yaml divider
PAGE_DIVIDER = dedent("---").strip()
