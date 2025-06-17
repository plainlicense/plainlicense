"""Defines content types for markdown, including admonitions and code blocks."""
from dataclasses import dataclass, field
from enum import StrEnum
from functools import cached_property
from os import PathLike
import re
from textwrap import dedent
from typing import Annotated, ClassVar, Literal, LiteralString, NamedTuple, Self, cast
from unittest import mock

from overrides.hooks.factory._constants import LINEBREAK, PARAGRAPH_BREAK, PATTERNS, SPACE
from overrides.hooks.factory._content_interface import ContentBase


type EmptyString = Literal[""]
type StrPath = str | PathLike[str]

class SelfEnum(StrEnum):
    """
    Base class for self-referential enums.
    """
    def __str__(self) -> str:
        """
        Returns the string representation of the enum value.
        """
        return self.value

class AdmonitionStyle(SelfEnum):
    """Enum representing the style of admonition blocks in markdown."""
    OPEN = "!!!"
    COLLAPSED = "???"
    EXPANDED = "???+"

class Admonition(SelfEnum):
    """
    Enum representing different types of admonitions used in markdown.
    """
    ABSTRACT = "abstract"
    BUG = "bug"
    CAUTION = "caution"
    DANGER = "danger"
    EXAMPLE = "example"
    FAILURE = "failure"
    INFO = "info"
    NOTE = "note"
    QUESTION = "question"
    QUOTE = "quote"
    SUCCESS = "success"
    TIP = "tip"
    WARNING = "warning"

class Footnote(NamedTuple):
    """
    Represents a footnote with full (not inline) footnote.
    """
    citation: int
    content: str

    def __str__(self) -> str:
        """Returns the string representation of the footnote."""
        return f"[^{self.citation}]:{SPACE}{self.content}"

    @classmethod
    def from_footnote_match(cls, match: re.Match[str]) -> "Footnote":
        """
        Creates a Footnote instance from a regex match object produced by `PATTERNS["footnote"]`.

        Args:
            match (re.Match[str]): The regex match object containing footnote data.

        Returns:
            Footnote: An instance of Footnote with citation and content.
        """
        citation = int(match.group(1))
        content = match.group(2).strip()
        return cls(citation, content)

    @classmethod
    def from_annotation_match(cls, match: re.Match[str]) -> "Footnote":
        """
        Creates a Footnote instance from a regex match object produced by `PATTERNS["annotation"]`.

        Args:
            match (re.Match[str]): The regex match object containing annotation data.

        Returns:
            Footnote: An instance of Footnote with citation and content.
        """
        citation = int(match.group("citation").replace("(", "").replace(")", ""))
        content = match.group("annotation").strip()
        return cls(citation, content)

type Footnotes = tuple[Footnote, ...] | None

class Paragraph(str):
    """
    Represents a single paragraph of text, ensuring it is non-empty and stripped of leading/trailing whitespace.
    Added text should be in rich markdown (i.e. mkdocs markdown), as it will be deconstructed into other content types.
    """
    __slots__ = ()
    annotations: tuple[re.Match, ...] | None = None  # Holds any annotations found in the paragraph

    footnote_citations: tuple[re.Match, ...] | None = None  # Footnote citations

    _footnotes: Footnotes | None = None  # Holds annotation references converted to footnotes that are extracted from the paragraph

    def __new__(cls, s: str, annotations: tuple[re.Match[str], ...] | None = None, footnote_citations: tuple[re.Match[str], ...] | None = None) -> "Paragraph":
        """
        Makes a new instance of Paragraph from a string.

        Note: Footnote *citations* are not Footnotes. They're the in-text references to footnotes, which are defined at the end of the document.
        """
        if not s or not s.strip() or not isinstance(s, str):
            raise ValueError("Paragraph cannot be empty.")
        instance = super().__new__(cls, dedent(s.strip()))
        found_annotations = tuple(PATTERNS["annotation"].finditer(instance))
        annotations = annotations or found_annotations if found_annotations else None
        instance.annotations = annotations
        found_footnotes = tuple(PATTERNS["footnote"].finditer(instance))
        instance.footnote_citations = footnote_citations or found_footnotes if found_footnotes else None # type: ignore  # pylance has no idea
        return instance

    def rich_markdown(self) -> str:
        """Returns the rich markdown representation of the paragraph."""
        return self

    def _realign_footnotes(self) -> Self:
        """
        Realigns footnotes to their correct positions based on the annotations.
        """
        if not self.annotations:
            return self
        mock_self = self
        # Replace annotations with footnote references
        # but we may have repeat numbers after this
        annotation_indexes: list[tuple[int, str, range]] = []
        for annotation in self.annotations:
            citation = int(annotation.group("citation").replace("(", "").replace(")", ""))
            # we save the citation, annotation text, and its approximate position
            # text indexes will shift a bit but we just need to know about where it is
            annotation_indexes.append(((citation), annotation.group("annotation").strip(), range(annotation.start(1) - 3, annotation.end(1) + 4)))
            mock_self = mock_self.replace(annotation.group("citation"), f"[^{citation}]").replace(annotation.group("class"), "").replace(annotation.group("annotation"), "")
        # Now we need to realign the footnotes to ensure they are in order
        replace_annotations = []
        for index, match in enumerate(PATTERNS["initial_footnote"].finditer(mock_self), start=1):
            if index == 1 and int(match.group(1)) > 1:
                index = int(match.group(1))
            location = match.start(1)
            mock_self = f"{mock_self[:location]}[^{index}]{mock_self[location + len(match.group(1)):]}"
            if location in [start for _, _, start in annotation_indexes]:
                # if the location is in the annotation indexes, we know it's one of our annotations, and we need to save it as a footnote
                replace_annotations.append(
                    Footnote(
                        citation=index,
                        content=next(annotation[1] for annotation in annotation_indexes if location in annotation[2])
                    )
                )
        self._footnotes = tuple(replace_annotations) if replace_annotations else None
        # Now we can return a new Paragraph instance with the realigned footnotes
        # But we need to keep the annotations for the actual annotations
        return type(self)(mock_self, annotations=None, footnote_citations=tuple(PATTERNS["initial_footnote"].finditer(mock_self)))

    @cached_property
    def markdown(self) -> str:
        """Returns the markdown representation of the paragraph."""
        mock_self = self
        if self.annotations:
            mock_self = self._realign_footnotes()
        return dedent(mock_self.strip())


class Paragraphs(tuple):
    """
    Represents a collection of paragraphs, ensuring they are non-empty and stripped of leading/trailing whitespace. Added text should be in rich markdown (i.e. mkdocs markdown), as it will be deconstructed into other content types.
    """
    __slots__ = ()

    br: ClassVar[LiteralString] = PARAGRAPH_BREAK

    def __new__(cls, s: str) -> "Paragraphs":
        """Makes a new instance of Paragraphs from a string."""
        if not s:
            raise ValueError("At least one paragraph must be provided.")
        if paragraphs := tuple(
            dedent(paragraph.strip()) for paragraph in s.split("\n\n") if paragraph.strip()
        ):
            return super().__new__(cls, paragraphs)
        raise ValueError("Paragraphs cannot be empty.")

    def rich_markdown(self) -> str:
        """Returns the rich markdown representation of the paragraphs."""
        return type(self).br.join(self)

    def markdown(self) -> str:
        """Returns the markdown representation of the paragraphs."""



@dataclass(frozen=True, order=True, kw_only=True, slots=True)
class AdmonitionBlock(ContentBase):
    """
    Represents a markdown admonition block with a specific type and content.
    """
    type: Annotated[Admonition, field(hash=True)]
    content: Annotated[Paragraphs, field(hash=True)]
    style: Annotated[AdmonitionStyle, field(default=AdmonitionStyle.OPEN, hash=True)]
    admonition: Annotated[Admonition, field(default=Admonition.INFO, hash=True)]
    title: Annotated[str, field(default="", hash=True)]
    inline: Annotated[Literal["left", "right"] | EmptyString, field(hash=True)] = ""

    @property
    def inline_statement(self) -> EmptyString | Literal['inline', 'inline end']:
        """Returns the inline statement for the admonition block if applicable.
        """
        if self.inline:
            statement = "inline"
            return statement if self.inline == "left" else f"{statement}{SPACE}end" # type: ignore  # plain as day to me pylance...
        return self.inline

    @property
    def rich_markdown_header(self) -> str:
        """
        Returns the header for the admonition block.
        """
        inline_block = f"{self.inline_statement}{SPACE}" if self.inline else ""
        return f"""{self.style}{SPACE}{self.admonition}{SPACE}{inline_block}"{self.title}" """.strip()

    @property
    def plaintext_header(self) -> str:
        """
        Returns the plaintext header for the admonition block.
        """
        return f"{self.admonition.name}: {self.title.title()}" if self.title else f"{self.admonition.name}:"

@dataclass(frozen=True, order=True, kw_only=True, slots=True)
class Codeblock(ContentBase):
    """
    Represents a markdown code block with a specific language.
    """
    language: Annotated[str, field(default="plaintext", hash=True)]
    content: Annotated[Paragraphs | None, field(hash=True)]
    title: Annotated[str, field(hash=True)] = ""
    snippet: Annotated[StrPath | None, field(hash=True)] = None
    _delimiter: str = field(default="```", init=False, repr=False)
    plaintext_delimiter: ClassVar[str] = "==="

    def __post_init__(self) -> None:
        """
        Post-initialization to ensure content is a Paragraphs instance.
        """
        if self.content is None and self.snippet is None:
            raise ValueError("Content or snippet must be provided for a code block.")

    @property
    def rich_markdown_header(self) -> str:
        """
        Returns the header for the code block.
        """
        return f"""{self._delimiter}{self.language}{SPACE}"title={self.title}" """.strip()

    @property
    def plaintext_header(self) -> str:
        """
        Returns the plaintext header for the code block.
        """
        if self.language in ["md", "markdown", "plaintext", "text"]:
            if self.title:
                return f"{type(self).plaintext_delimiter}{SPACE}{self.title.title()}:"
            return type(self).plaintext_delimiter
        return f"{type(self).plaintext_delimiter}{SPACE}{self.language.title()}" if self.language else "Code Block"

    @property
    def plaintext(self) -> str:
        """
        Returns the plaintext representation of the code block.
        """
        return f"{self.plaintext_header}{LINEBREAK}{self.content.plaintext}{LINEBREAK}{type(self).plaintext_delimiter}"

@dataclass(frozen=True, order=True, kw_only=True, slots=True)
class Definition(ContentBase):
    """
    Represents a markdown definition.
    """
    term: Annotated[str, field(hash=True)]
    definition: Annotated[str, field(hash=True)]

    @property
    def header(self) -> str:
        """
        Returns the header for the definition.
        """
        return f"{self.term}:\n{SPACE * 4}{self.definition}"
