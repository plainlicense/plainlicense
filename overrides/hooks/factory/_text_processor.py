"""
Text processing utilities for license content.

This module handles all text transformations including markdown processing,
footnote conversion, and plaintext generation.
"""

from re import Match
from textwrap import dedent

from overrides.hooks.factory._constants import PATTERNS, YEAR


def replace_year(text: str) -> str:
    """
    Replaces the year placeholder in the provided text with the current year.

    Args:
        text (str): The text to process and replace the year placeholder.

    Returns:
        str: The text with the year placeholder replaced by the current year.
    """
    return PATTERNS["year"].sub(YEAR, text)


def replace_code_blocks(text: str) -> str:
    """
    Replaces code blocks in the provided text with a placeholder to prevent Markdown processing.

    Args:
        text (str): The text to process and replace code blocks.

    Returns:
        str: The text with code blocks replaced by a placeholder.
    """
    return PATTERNS["code"].sub(r"===\1===", text)


def process_definitions(text: str, *, plaintext: bool = False) -> str:
    """
    Identifies and processes definitions in the input text, formatting them appropriately.

    Args:
        text (str): The input text containing definitions to be processed.
        plaintext (bool, optional): A flag indicating whether to
            return definitions in plaintext format. Defaults to False.

    Returns:
        str: The processed text with definitions formatted appropriately.
    """
    if matches := PATTERNS["definition"].finditer(text):
        for match in matches:
            term = match.group("term")
            def_text = match.group("def")
            if plaintext:
                replacement = "\n" + dedent(f"""{term.replace("`", "")} - {def_text}""") + "\n"
            else:
                replacement = "\n" + dedent(f"""{term}:\n{def_text}""") + "\n"
            text = text.replace(match.group(0), replacement)

    # Remove any remaining formatting classes
    if matches := PATTERNS["format_class"].finditer(text):
        for match in matches:
            text = text.replace(match, "")
    return text

def transform_text_to_footnotes(text: str) -> str:
    """
    Replaces annotations with footnotes.

    Args:
        text: The text to transform by replacing annotations with footnotes.

    Returns:
        The transformed text with annotations replaced by footnotes and footnote references added at the end.
    """
    footnotes = []

    def replacement(match: Match[str]) -> str:
        """
        Generates a footnote reference and stores the corresponding annotation.
        We replace the annotation with a footnote reference and store the annotation in a list for later use.

        Args:
            match (re.Match): The match object containing the annotation to be processed.

        Returns:
            str: A formatted string representing the footnote reference.
        """
        footnote_num = len(footnotes) + 1
        footnotes.append(match.group("annotation").strip())
        return f"[^{footnote_num}]"

    transformed_text = PATTERNS["annotation"].sub(replacement, text)
    if footnotes:
        transformed_text += "\n\n"
        for i, footnote in enumerate(footnotes, 1):
            transformed_text += f"[^{i}]: {footnote}"
    return transformed_text + "\n\n"

def process_mkdocs_to_markdown(reader_license_text: str) -> str:
    """
    Processes MkDocs content and transforms it into standard
    Markdown (i.e. not markdown with extensions). This function
    converts the text to footnotes, applies a header
    transformation, and processes any definitions present in
    the text to produce a final Markdown string.

    Note: Footnotes aren't *strictly* standard markdown, but
    they still look fine if you're not using a markdown
    processor that supports them. GitHub is the primary use case
    here, and it renders footnotes.

    Args:
        reader_license_text: The reader license text to process.

    Returns:
        str: The processed Markdown text after transformations
        and definitions have been applied.
    """
    text = reader_license_text
    text = replace_code_blocks(text)
    text = transform_text_to_footnotes(text)
    return process_definitions(text, plaintext=False)

def process_markdown_to_plaintext(text: str) -> str:
    """
    Strips Markdown formatting from the license text to produce a plaintext version.

    Args:
        text: The markdown text to convert to plaintext.

    Returns:
        str: The processed plaintext version of the Markdown license text.
    """
    text = process_definitions(text, plaintext=True)
    if headers := PATTERNS["header"].finditer(text):
        for header in headers:
            text = text.replace(header.group(0), f"{header.group(1).upper()}\n")
    text = PATTERNS["markdown"].sub(r"\2", text)  # Remove headers, bold, italic, inline code
    text = PATTERNS["link"].sub(r"\1 (\2)", text)  # Handle links
    text = PATTERNS["image"].sub(r"\1 (\2)", text)  # Handle images
    return PATTERNS["code"].sub(r"===\1===", text)  # Remove code blocks
