"""
Tab generators for license content.

This module contains individual generators for each type of license tab
(reader, markdown, plaintext, changelog, official, embed).
"""

from textwrap import dedent
from typing import TYPE_CHECKING

from overrides.hooks._utils import wrap_text


if TYPE_CHECKING:
    from overrides.hooks.factory._formatter import Formatter


class BaseTabGenerator:
    """Base class for all tab generators."""

    def __init__(self, formatter: "Formatter", icon: str):
        """
        Initialize tab generator.

        Args:
            formatter: The formatter instance to use for formatting.
            icon: The icon to use for this tab.
        """
        self.formatter = formatter
        self.icon = icon


class ReaderTabGenerator(BaseTabGenerator):
    """Generates the reader tab content."""

    def generate(
        self,
        header_block: str,
        reader_license_text: str,
        interpretation_block: str,
        disclaimer_block: str,
        has_official: bool
    ) -> str:
        """Generate the reader tab content."""
        if has_official:
            text = dedent(f"""
                {header_block}
                {reader_license_text}
                {interpretation_block}
                {disclaimer_block}
                """)
        else:
            text = dedent(f"""
                {header_block}
                {reader_license_text}
                {disclaimer_block}
                """)
        return self.formatter.tabify(text, "reader", 1, self.icon)


class MarkdownTabGenerator(BaseTabGenerator):
    """Generates the markdown tab content."""

    def generate(
        self,
        header_block: str,
        markdown_license_text: str,
        interpretation_block: str,
        disclaimer_block: str
    ) -> str:
        """Generate the markdown tab content."""
        body = wrap_text(dedent(f"\n{markdown_license_text}\n"))
        text = f"""\n\n```markdown \n\n{header_block}\n\n{body}\n{wrap_text(interpretation_block)}\n```\n\n{disclaimer_block}\n"""
        return self.formatter.tabify(text, "markdown", 1, self.icon)


class PlaintextTabGenerator(BaseTabGenerator):
    """Generates the plaintext tab content."""

    def generate(
        self,
        content: str,
        title: str,
        header_block: str,
        interpretation_block: str,
        disclaimer_block: str
    ) -> str:
        """Generate the plaintext tab content."""
        return self.formatter.format_to_plaintext(
            content, title, header_block, interpretation_block, disclaimer_block,
            include_header_block=True, include_boilerplate=True, tabify=True
        )


class ChangelogTabGenerator(BaseTabGenerator):
    """Generates the changelog tab content."""

    def generate(self, changelog_text: str) -> str:
        """Generate the changelog tab content."""
        return self.formatter.tabify(changelog_text, "changelog", 1, self.icon)


class OfficialTabGenerator(BaseTabGenerator):
    """Generates the official license tab content."""

    def generate(self, original_license_text: str, meta: dict, has_official: bool) -> str:
        """Generate the official tab content."""
        if not has_official:
            return ""

        text = (
            f"{original_license_text}"
            if meta.get("link_in_original")
            else f"{original_license_text}\n\n{meta.get('official_link')}"
        )
        return self.formatter.tabify(text, "official", 1, self.icon)


class EmbedTabGenerator(BaseTabGenerator):
    """Generates the embed tab content."""

    def generate(self, embed_link: str, embed_instructions: str) -> str:
        """Generate the embed tab content."""
        return self.formatter.tabify(
            f"{embed_link}{embed_instructions}", "html", 1, self.icon
        )


class TabGeneratorFactory:
    """Factory for creating tab generators."""

    def __init__(self, formatter: "Formatter", icon_map: dict[str, str]):
        """
        Initialize the factory.

        Args:
            formatter: The formatter instance to use.
            icon_map: Dictionary mapping tab types to icons.
        """
        self.formatter = formatter
        self.icon_map = icon_map

    def create_reader_generator(self) -> ReaderTabGenerator:
        """Create a reader tab generator."""
        return ReaderTabGenerator(self.formatter, self.icon_map["reader"])

    def create_markdown_generator(self) -> MarkdownTabGenerator:
        """Create a markdown tab generator."""
        return MarkdownTabGenerator(self.formatter, self.icon_map["markdown"])

    def create_plaintext_generator(self) -> PlaintextTabGenerator:
        """Create a plaintext tab generator."""
        return PlaintextTabGenerator(self.formatter, self.icon_map["plaintext"])

    def create_changelog_generator(self) -> ChangelogTabGenerator:
        """Create a changelog tab generator."""
        return ChangelogTabGenerator(self.formatter, self.icon_map["changelog"])

    def create_official_generator(self) -> OfficialTabGenerator:
        """Create an official tab generator."""
        return OfficialTabGenerator(self.formatter, self.icon_map["official"])

    def create_embed_generator(self) -> EmbedTabGenerator:
        """Create an embed tab generator."""
        return EmbedTabGenerator(self.formatter, self.icon_map["embed"])
