"""Constants for the license factory."""
import re

from datetime import UTC, datetime
from re import Pattern
from textwrap import dedent
from typing import ClassVar

from markdown.extensions.attr_list import AttrListTreeprocessor
from markdown.extensions.def_list import DefListProcessor
from markdown.extensions.footnotes import FootnoteBlockProcessor
from pymdownx.blocks import FENCED_BLOCK_RE as FENCED_BLOCK_PATTERN
from pymdownx.blocks import RE_END as BLOCK_END_PATTERN
from pymdownx.blocks import RE_INDENT_YAML_LINE as INDENT_YAML_LINE_PATTERN
from pymdownx.blocks import RE_START as BLOCK_START_PATTERN
from pymdownx.blocks import RE_YAML_END as YAML_END_PATTERN
from pymdownx.blocks import RE_YAML_START as YAML_START_PATTERN
from pymdownx.critic import RE_BLOCK_SEP as BLOCK_SEP_PATTERN
from pymdownx.critic import RE_CRITIC as CRITIC_PATTERN
from pymdownx.critic import RE_CRITIC_BLOCK as CRITIC_BLOCK_PATTERN
from pymdownx.critic import RE_CRITIC_PLACEHOLDER as CRITIC_PLACEHOLDER_PATTERN
from pymdownx.critic import RE_CRITIC_SUB_PLACEHOLDER as CRITIC_SUB_PLACEHOLDER_PATTERN
from pymdownx.mark import MARK as MARK_PATTERN
from pymdownx.snippets import SnippetPreprocessor


type PatternMap = dict[str, Pattern[str]]

class Patterns:
    """
    An arsenal of markdown related regex patterns, ready to deconstruct.

    Imported (external) regex patterns *do not* have named groups. All organic patterns do.
    """
    _abbreviation: ClassVar[Pattern[str]] = re.compile(
        r"""\s*(?P<abbrev_block>\*\[(?P<abbrev>.+?)\]:)\s*(?P<definition>.+?)\n""",
    )
    _annotation: ClassVar[PatternMap] = {
        "inline": re.compile(r"(?<!\n|  )(?P<citation>\((?P<num>[1-9])\))"),
        "block": re.compile(
            r"(?P<citation>(?P<num>[1-9])\.)\s", re.MULTILINE | re.DOTALL
        ),
        "class": re.compile(r"(?P<class>\{\s{0,2}\.annotate\s{0,2}\})"),
        "full": re.compile(
            r"(?P<citation>\([1-4]\)).*?(?P<class>\{\s\.annotate\s\})[\s]{1,4}[1-4]\.\s{1,2}(?P<annotation>.+?)\n",
            re.MULTILINE | re.DOTALL,
        ),
    }

    _attr_list: ClassVar[PatternMap] = {
        "block": AttrListTreeprocessor.BLOCK_RE,
        "header": AttrListTreeprocessor.HEADER_RE,
        "inline": AttrListTreeprocessor.INLINE_RE,
        "name": AttrListTreeprocessor.NAME_RE,
    }

    _block: ClassVar[PatternMap] = {
        "end": BLOCK_END_PATTERN,
        "sep": BLOCK_SEP_PATTERN,
        "start": BLOCK_START_PATTERN,
        "fenced": FENCED_BLOCK_PATTERN,
        "yaml_end": YAML_END_PATTERN,
        "yaml_start": YAML_START_PATTERN,
        "indent_yaml_line": INDENT_YAML_LINE_PATTERN,
    }
    _codeblock: ClassVar[PatternMap] = {
        "block": re.compile(
            r"""
    (
    (?P<first_line>  # The first line of a code block
        (?P<fence_start>```*)  # Start of code block, 3+ backticks
            \s?
        (?P<language> \w+ )?  # Optional language specifier
            \s?
        (?P<title> \"\w+\" | '\w+' )?  # Optional title in quotes
    )
        \n
        (?P<content>.+?)  # Content of the code block
        (?P<fence_end>?P=fence_start) # End of code block
        )
    """,
            re.DOTALL | re.VERBOSE,
        ),
        "inline": re.compile(
            r"(?P<fence_start>`)(?P<bang>[#][!])?(?P<lang>\w+)? ?(?P<content>.+?)(?P<fence_end>`)(?!`)"
        ),
    }
    _critic: ClassVar[PatternMap] = {
        "block_sep": BLOCK_SEP_PATTERN,
        "block": CRITIC_BLOCK_PATTERN,
        "critic": CRITIC_PATTERN,
        "placeholder": CRITIC_PLACEHOLDER_PATTERN,
        "sub_placeholder": CRITIC_SUB_PLACEHOLDER_PATTERN,
    }
    _def_list: ClassVar[PatternMap] = {
        "base": DefListProcessor.RE,
        "no_indent": DefListProcessor.NO_INDENT_RE,
    }
    _footnote: ClassVar[PatternMap] = {
        "block": FootnoteBlockProcessor.RE,
        "initial": re.compile(r".*\[\^(?P<citation>\d+)\](?!:)"),
        "cite": re.compile(
            r"^\s*\[\^(?P<citation>\d+)\]:\s+?(?P<content>.+)\n", re.MULTILINE
        ),
        # footnote including the inline citation, like
        # This is some text[^1]. And some more.. *Arbitrary # of lines later*:
        # [^1]: I'm a footnote.
        "full": re.compile(
            r"(?P<inline>\[\^\d+\])(!?:).+(?P<citation_pair>\1)(?=:)\s+?(?P<content>.+)\n",
            re.MULTILINE | re.DOTALL,
        ),
    }
    _html: ClassVar[PatternMap] = {
        # consumes the entire comment, including the closing tag
        "comment": re.compile(
            r"""
                              (?P<start_tag><!--)
                              (?P<content>.*?)
                              (?P<end_tag>-->)""",
            re.VERBOSE | re.DOTALL | re.MULTILINE,
        ),
        # consumes the entire tag, including the closing tag
        "tag": re.compile(
            r"""
                        # first a single self-closed (sc) tag
                        (?P<sc_start_tag>
                            <
                                (?P<sc_tag_name>\w+)
                                (?P<sc_tag_attrs>.*?)
                            \s*/>
                        ) |
                        # normal tag with attributes
                        (?P<start_tag>
                            <
                                (?P<tag_name>\w+)
                                (?P<tag_attrs>.*?)>
                                    (?P<content>.*?)
                            </
                        (?P<end_tag>?P=tag_name)
                            >
                        )
                    """,
            re.VERBOSE | re.DOTALL | re.MULTILINE,
        ),
    }
    _links: ClassVar[PatternMap] = {
        "cited_ref": re.compile(
            r"""\s*(?P<ref>\[(?P<name>.*?)\])\s*<?(?P<url>.*?)>?\s*(?P<title>["']?.*?["']?)?\s*""", re.MULTILINE
        ),
        "inline_ref": re.compile(r"\s*(?P<text_block>\[?(?P<text>.*?)\])(?P<ref>\[(?P<name>.*?)\])", re.MULTILINE),
        "inline": re.compile(
            r"(?P<text_tag>\[(?P<text>.*?)\]\((?P<url>.*?)\s?(?P<title>.*?)?\))", re.MULTILINE
        ),
    }
    _mark: ClassVar[PatternMap] = {
        "mark": re.compile(MARK_PATTERN, re.DOTALL | re.MULTILINE),
    }
    _markdown: ClassVar[PatternMap] = {
        "format_class": re.compile(r"\{\s?\.\w+\s?\}"),
        "header": re.compile(r"#+ (?P<header>\w+?)\n"),
        # for replacing markdown syntax like **bold**, *italic*, `inline code`
        "image": re.compile(r"!\[(?P<alt_text>.*?)\]\((?P<url>.*?)\)", re.MULTILINE),
        "markdown": re.compile(r"#+ |(\*\*|\*|`)(.*?)\1", re.MULTILINE),
    }
    _snippet: ClassVar[PatternMap] = {
        "snippet": SnippetPreprocessor.RE_SNIPPET,
        "snippet_all": SnippetPreprocessor.RE_ALL_SNIPPETS,
        "snippet_file": SnippetPreprocessor.RE_SNIPPET_FILE,
        "snippet_section": SnippetPreprocessor.RE_SNIPPET_SECTION,
    }
    _year: ClassVar[Pattern] = re.compile(r"\{\{\s*year\s*\}\}")

    def __init__(self):
        """Initialize the Patterns class."""
        self.annotation = type(self)._annotation  # noqa: SLF001
        self.attr_list = type(self)._attr_list  # noqa: SLF001
        self.block = type(self)._block  # noqa: SLF001
        self.codeblock = type(self)._codeblock  # noqa: SLF001
        self.critic = type(self)._critic  # noqa: SLF001
        self.def_list = type(self)._def_list  # noqa: SLF001
        self.html = type(self)._html  # noqa: SLF001
        self.footnote = type(self)._footnote  # noqa: SLF001
        self.mark = type(self)._mark  # noqa: SLF001
        self.snippet = type(self)._snippet  # noqa: SLF001
        self.year = type(self)._year  # noqa: SLF001


YEAR = datetime.now(UTC).strftime("%Y")

# ================================================
# *           ICON AND TAG MAPPINGS
# ================================================

"""Maps license tabs to their respective icons."""
ICON_MAP = {
    "reader": ":material-book-open-variant:",
    "markdown": ":octicons-markdown-24:",
    "plaintext": ":nounproject-txt:",
    "embed": ":material-language-html5:",
    "changelog": ":material-history:",
    "official": ":material-license:",
}

"""Maps [choosealicense.com](https://choosealicense.com/) tags to Plain License tags."""
TAG_MAP = {
    "distribution": "share-it",  # allowances
    "commercial-use": "sell-it",
    "modifications": "change-it",
    "revokable": "revoke-it",
    "relicense": "relicense-it",
    "disclose-source": "share-your-work",  # requirements
    "document-changes": "describe-changes",
    "include-copyright": "give-credit",
    "same-license": "share-alike (strict)",
    "same-license--file": "share-alike (relaxed)",
    "same-license--library": "share-alike (relaxed)",
}

"""The style parameter values for the embed iframe in the license factory."""
EMBED_STYLE = dedent("""
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 1px solid #E4C580;
        border-radius: 8px;
        overflow: hidden auto;
        """  # minify
        .strip()
        .replace("\n", "")
        .replace(" ", "")
    )

# ================================================
# *           FORMATTING LITERALS
# ================================================
"""
Constants for formatting and layout in the license factory.
I found that without them, it was easy for phantom formatting issues to creep in. This paranoia is what also drives the excessive use of `dedent` in the codebase.
"""

SNIPPET = "--8<--"

SPACE = " "  # Single space for readability

TAB = SPACE * 4  # Four spaces for indentation

LINEBREAK = "\n"  # Line break for readability

PARAGRAPH_BREAK = LINEBREAK * 2  # Two line breaks for paragraph separation

# Divider for page sections in plaintext, also a yaml divider
PAGE_DIVIDER = dedent("---").strip()
