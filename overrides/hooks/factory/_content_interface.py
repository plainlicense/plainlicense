"""Content interface and base class for the license factory."""
from abc import ABC, abstractmethod

from overrides.hooks.factory._constants import PAGE_DIVIDER


class ContentAbc(ABC):
    """
    Base class for content types in the license factory.
    """

    @abstractmethod
    def __str__(self) -> str:
        """
        Returns the string representation of the content.
        """
        raise NotImplementedError("Subclasses must implement __str__ method.")

    @property
    @abstractmethod
    def plaintext_divider(self) -> str:
        """
        Returns the plaintext divider for the content.
        """
        raise NotImplementedError(
            "Subclasses must implement plaintext_divider property."
        )

    @property
    @abstractmethod
    def plaintext(self) -> str:
        """
        Returns the plaintext representation of the content.
        """
        raise NotImplementedError("Subclasses must implement plaintext property.")

    @property
    @abstractmethod
    def markdown(self) -> str:
        """
        Returns the markdown representation of the content.
        """
        raise NotImplementedError("Subclasses must implement markdown property.")

    @property
    @abstractmethod
    def rich_markdown(self) -> str:
        """
        Returns the rich markdown representation of the content.
        """
        raise NotImplementedError("Subclasses must implement rich_markdown property.")

class ContentBase(ContentAbc):
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
