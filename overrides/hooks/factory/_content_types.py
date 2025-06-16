"""Defines content types for markdown, including admonitions and code blocks."""
from dataclasses import dataclass, field
from enum import StrEnum
from textwrap import dedent
from typing import Annotated, Literal, LiteralString

from overrides.hooks.factory._constants import SPACE
from overrides.hooks.factory._content_interface import ContentBase


type EmptyString = Literal[""]

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


class Paragraphs(tuple):
    """
    Represents a collection of paragraphs, ensuring they are non-empty and stripped of leading/trailing whitespace.
    """
    __slots__ = ()

    def __new__(cls, s: str) -> "Paragraphs":
        """Makes a new instance of Paragraphs from a string."""
        if not s:
            raise ValueError("At least one paragraph must be provided.")
        if paragraphs := tuple(
            dedent(paragraph.strip()) for paragraph in s.split("\n\n") if paragraph.strip()
        ):
            return super().__new__(cls, paragraphs)
        raise ValueError("Paragraphs cannot be empty.")


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
    inline: Annotated[Literal["left", "right"] | LiteralString, field(hash=True)] = ""

    @property
    def inline_statement(self) -> LiteralString | Literal['inline', 'inline end']:
        """Returns the inline statement for the admonition block if applicable.
        """
        if self.inline:
            statement = "inline"
            return statement if self.inline == "left" else f"{statement}{SPACE}end"
        return self.inline

    @property
    def header(self) -> str:
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

    @property
    def plaintext(self) -> str:
        """
        Returns the plaintext representation of the admonition block.
        """
        return f"{self.header}\n\n{self.content}" if self.content else self.header

@dataclass(frozen=True, order=True, kw_only=True, slots=True)
class Codeblock(ContentBase):
    """
    Represents a markdown code block with a specific language.
    """
    language: Annotated[str, field(default="plaintext", hash=True)]
    content: Annotated[Paragraphs, field(hash=True)]
    title: Annotated[str, field(hash=True)] = ""
    _delimiter: str = field(default="```", init=False, repr=False)

    @property
    def header(self) -> str:
        """
        Returns the header for the code block.
        """
        return f"""{self._delimiter}{self.language}{SPACE}"{self.title}" """.strip()
