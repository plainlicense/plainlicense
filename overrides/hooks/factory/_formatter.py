"""
Formatting utilities for license content.

This module handles all formatting operations including tab creation,
block formatting, and header generation.
"""

import re

from textwrap import dedent, indent
from typing import Literal

from overrides.hooks._utils import wrap_text

type BlockType = Literal["admonition", "caption", "definition", "details", "html"]

class Block:
    """Represents a pymdownx blocks API block"""

    def __init__(self, blocktype: BlockType, type_: str, title: str, text: str, count: int = 5, options: dict[str, str | dict[str, str]] | None = None):
        """
        Initialize a Block instance.

        Args:

            type_ (str): The type of block (e.g., 'note', 'warning').
            title (str): The title of the block.
            text (str): The content of the block.
            options (dict, optional): Additional options for the block.
        """
        self.blocktype
        self.type_ = type_
        self.title = title
        self.text = text
        self.options = options or {}
        self.separator = "/"

        self.children = []


class Formatter:
    """Handles all formatting and structure creation operations."""

    def __init__(self, icon_map: dict[str, str]):
        """
        Initialize formatter with icon mappings.

        Args:
            icon_map: Dictionary mapping content types to their icons.
        """
        self.icon_map = icon_map

    @staticmethod
    def tabify(text: str, title: str, level: int = 1, icon: str = "") -> str:
        """
        Returns a tabified block with the provided text.

        Args:
            text (str): The text content to include in the tab.
            title (str): The title of the tab.
            level (int, optional): The level of the tab. Defaults to 1.
            icon (str, optional): The icon to include in the tab. Defaults to "".

        Returns:
            str: The tabified block with the provided text.
        """
        indentation = " " * 4 * level
        title_indent = "" if level == 1 else " " + " " * 4 * (level - 1)
        icon = f"{icon} " if icon else ""
        assembled_title = f"""{title_indent}=== "{icon}{title}" """
        return f"""{assembled_title}\n\n{indent(dedent(text), indentation)}\n"""

    @staticmethod
    def blockify(
        text: str,
        kind: str,
        title: str,
        separator_count: int = 5,
        options: dict[str, str | dict[str, str]] | None = None,
    ) -> str:
        """Returns a blocks api block with the provided text.

        The block format will match:
        /// kind | title
            option1: value
            option2: { key1: value1, key2: value2 }

        text content
        ///  # <-- number of slashes set by the `separator count`
        """
        separator = "/" * separator_count
        option_block = ""

        if options:
            for k, v in options.items():
                if isinstance(v, dict):
                    dict_block = "{ " + ", ".join([f"{kk}: {vv}" for kk, vv in v.items()]) + " }"
                    option_block += f"{' ' * (separator_count + 1)} {k}: {dict_block}\n"
                elif v:
                    option_block += f"{' ' * (separator_count + 1)}{k}: {v}\n"

        return f"""\n{separator} {kind} | {title}\n{option_block}\n{text}\n{separator}\n"""

    def get_header_block(
        self,
        kind: Literal["reader", "markdown", "plaintext"],
        meta: dict,
        plain_name: str,
        plain_version: str
    ) -> str:
        """Returns the version block for the license."""
        original_version: str = meta.get("original_version", "")

        match kind:
            case "reader":
                title = f"\n# {plain_name}\n\n"
                original_version_html = (
                    f"<span class='license original_version'>original version: {original_version}</span><br />"
                    if original_version
                    else ""
                )
                plain_version_html = (
                    f"<span class='license plain_version'>plain version: {plain_version}</span>"
                )
                version_info = f"""<div class='version-info'>{original_version_html}{plain_version_html}</div>"""
                return f"""<div class='license license-header'>{title}{version_info}</div>"""
            case "markdown":
                title = f"\n# {plain_name}\n\n"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"> {original_text}plain version: {plain_version}\n{title}"
            case _:
                title = f"\n{plain_name.upper()}\n\n"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"{original_text}plain version: {plain_version}\n{title}"

    def interpretation_block(self, kind: str, meta: dict, has_official: bool, title: str, plaintext_content: str = "") -> str:
        """Returns the interpretation block for the license."""
        if not has_official:
            return ""

        match kind:
            case "reader":
                return self.blockify(
                    dedent(meta.get("interpretation_text", "")),
                    "note",
                    meta.get("interpretation_title", ""),
                    4,
                )
            case "markdown":
                return f"### {meta.get('interpretation_title')}\n\n" + wrap_text(
                    dedent(meta.get("interpretation_text", ""))
                )
            case "plaintext":
                interpretation_title = meta.get("interpretation_title", "")
                interpretation_title = re.sub(
                    r"\{\{\s{1,2}plain_name\s\|\strim\s{1,2}\}\}", title.upper(), interpretation_title
                )
                # Use provided plaintext content if available
                content = plaintext_content if plaintext_content else dedent(meta.get('interpretation_text', ''))
                return f"{interpretation_title.upper()}\n\n{content}"
        return ""

    def get_disclaimer_block(self, meta: dict, has_official: bool, not_advice_text: str, not_official_text: str) -> str:
        """Returns the disclaimer block for the license."""
        not_advice_title = "legal advice"
        if not has_official:
            return self.tabify(not_advice_text, not_advice_title, 2)

        not_advice = self.tabify(not_advice_text, not_advice_title, 1)
        not_official_title = f"the official {meta.get('original_name')}"
        not_official = self.tabify(not_official_text, not_official_title, 1)
        return (
            f"<div class='admonition warning'><p class='admonition-title'>The {meta.get('plain_name', '')} isn't...</p>\n\n"
            f"{not_advice}{not_official}</div>"
        )

    def format_to_plaintext(
        self,
        content: str,
        title: str,
        header_block: str,
        interpretation_block: str,
        disclaimer_block: str,
        *,
        include_header_block: bool = True,
        include_boilerplate: bool = True,
        tabify: bool = True,
    ) -> str:
        """
        Converts the given content and title to a plaintext representation.
        """
        header_block_text = f"\n\n{header_block}\n\n" if include_header_block else ""
        boilerplate = (
            f"{wrap_text(interpretation_block)}\n```\n\n{disclaimer_block}\n"
            if include_boilerplate
            else "\n```\n"
        )
        body = wrap_text(dedent(f"\n{content}\n"))
        text = f"""\n\n```plaintext{header_block_text}{body}{boilerplate}"""
        return (
            self.tabify(text, "plaintext", 1, self.icon_map["plaintext"])
            if tabify
            else text.replace("```plaintext", "").replace("```", "").strip()
        )
