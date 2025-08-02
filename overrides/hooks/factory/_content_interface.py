"""Content interface and base class for the license factory."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any
from uuid import uuid4

from overrides.hooks.factory._constants import PAGE_DIVIDER


class Element(IntEnum):
    """
    Enum for different content elements in the license factory.
    """

    PAGE = 1
    TAB = 2
    BLOCK = 3
    TITLE = 4
    HEADING = 5
    SECTION = 6  # no true sectioning, but paragraphs between headings form a section
    PARAGRAPH = 7
    LIST = 8
    LIST_ITEM = 9  # skip to 11.
    # ----- elements *over* 10 are specialized content types -----
    CODE_BLOCK = 11
    DEF_LIST = 12
    ADMONITION = 13
    DETAILS = 14
    # ----- our 20s are for the global children, like footnotes, citations, etc
    FOOTNOTE = 21
    ANNOTATION = 22
    REF_LINK = 23  # bottom of page references, like [some-ref]: <url> "title"
    ABBREVIATION = 24  # like *[HTML]: HyperText Markup Language
    # -------
    CITATION = 26  # child of footnote or annotation, but not a footnote itself
    REF = 27  # child of REF_LINK... note can be multiple refs to the same link
    # ------ 30s are for inline
    INLINE_CODE = 31
    INLINE_LINK = 32
    INLINE_IMAGE = 33
    # ---- 40s are for inline text formatting
    BOLD = 41
    ITALIC = 42
    UNDERLINE = 43  # carat ^^
    STRIKETHROUGH = 44  # tilde ~~
    BOLD_ITALIC = 45  # double asterisks or underscores
    BOLD_UNDERLINE = 46  # double carats and asterisks

    TEXT = 50  # generic text element, simple string container

    def __str__(self) -> str:
        """
        Returns the string representation of the element.
        """
        return self.name.lower()

    @property
    def is_structure(self) -> bool:
        """
        Returns True if the element is a structural content type.
        """
        return self.value < 10

    @property
    def is_top_level(self) -> bool:
        """
        Returns True if the element is a top-level content type.
        """
        return self.value < 20

    @property
    def is_specialized(self) -> bool:
        """
        Returns True if the element is a specialized content type.
        """
        return 10 < self.value < 20

    @property
    def is_reference(self) -> bool:
        """
        Returns True if the element is a reference type.
        """
        return 20 < self.value < 30

    @property
    def is_inline(self) -> bool:
        """
        Returns True if the element is an inline content type.
        """
        return 30 < self.value < 40

    @property
    def is_formatting(self) -> bool:
        """
        Returns True if the element is a text formatting type.
        """
        return 40 < self.value < 50

    @property
    def is_text(self) -> bool:
        """
        Returns True if the element is a text content type.
        """
        return self.value == 50

    @classmethod
    def from_int(cls, value: int) -> "Element":
        """
        Converts an integer to an Element enum.
        """
        try:
            return cls(value)
        except ValueError:
            raise ValueError(f"Invalid Element value: {value}") from None

    @classmethod
    def from_str(cls, value: str) -> "Element":
        """
        Converts a string to an Element enum.
        """
        try:
            return cls[value.strip().replace("-", "_").upper()]
        except KeyError:
            raise ValueError(f"Invalid Element name: {value}") from None


class FormatType(IntEnum):
    """
    Enum for different format types in the license factory.

    Most of these aren't implemented yet, but they are here for future use.
    TODO: Implement the formats as needed.
    """

    STRIPPED = 0  # ✅ for readability metric calculations, not a real format
    PLAINTEXT = 1  # ✅
    RICH_CONSOLE = 2  # rich console markup
    GITHUB = 4  # ✅
    EXTENDED_MARKDOWN = 5  # ✅
    XML = 6  # SPDX XML format - not implemented
    HTML = 7  # HTML format - not implemented
    IFRAME = 8  # HTML iframe format ✅

    def __str__(self) -> str:
        """
        Returns the string representation of the format type.
        """
        return self.name.lower()

    @classmethod
    def from_str(cls, value: str) -> "FormatType":
        """
        Converts a string to a FormatType enum.
        """
        try:
            return cls[value.strip().upper()]
        except KeyError:
            raise ValueError(f"Invalid FormatType name: {value}") from None

    @property
    def implemented(self) -> bool:
        """
        Returns True if the format type is implemented.
        """
        # Currently, all formats are implemented except XML and HTML.
        return self in (
            FormatType.STRIPPED,
            FormatType.PLAINTEXT,
            FormatType.RICH_CONSOLE,
            FormatType.GITHUB,
            FormatType.EXTENDED_MARKDOWN,
            FormatType.IFRAME,
        )


@dataclass(order=True)
class LicenseElement(ABC):
    """
    Base class for content types in the license factory.
    """

    id: str = field(
        default_factory=lambda: str(uuid4()), init=False, repr=True, hash=True
    )
    start_pos: int = field(default=0, init=False, repr=False)
    end_pos: int = field(default=0, init=False, repr=False)
    element: Element | None = field(default=None, init=True, repr=False, hash=True)
    parent: str | None = field(default=None, init=True, repr=False, hash=True)
    children: list[str] = field(default_factory=list, init=True, repr=False, hash=False)

    @abstractmethod
    def __str__(self) -> str:
        """
        Returns the string representation of the content.
        """
        raise NotImplementedError("Subclasses must implement __str__ method.")

    @abstractmethod
    def render(self, format_type: FormatType, context: dict[str, Any]) -> str:
        """
        Renders the content in the specified format.

        TODO: context type is a placeholder for now, it should be defined more specifically.
        """
        raise NotImplementedError("Subclasses must implement render method.")

    @abstractmethod
    def get_dependencies(self) -> list[str]:
        """
        Returns a list of dependencies for the content.
        This could be other content IDs or external resources.
        """
        raise NotImplementedError("Subclasses must implement get_dependencies method.")

class ContentBase(LicenseElement):
    """
    Base class for content types in the license factory.
    Implements common functionality for content types.
    """

    def __str__(self) -> str:
        ...  # This should be overridden in subclasses

    @property
    def plaintext_divider(self) -> str:
        """
        Returns the plaintext divider for the content.
        """
        return PAGE_DIVIDER

    @property
    def plaintext(self) -> str: # type: ignore
        """
        Returns the plaintext representation of the content.
        """
        # This should be overridden in subclasses

    @property
    def markdown(self) -> str: # type: ignore
        """
        Returns the markdown representation of the content.
        """
        # This should be overridden in subclasses

    @property
    def rich_markdown(self) -> str: # type: ignore
        """
        Returns the rich markdown representation of the content.
        """
        # This should be overridden in subclasses
