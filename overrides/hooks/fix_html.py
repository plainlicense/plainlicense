"""
fix_html.py.

Hook for on post page. Can be used to modify the HTML output of a page.

Currently only searches for NaN values in the HTML output and replaces them with "24".
... it silences a console error.
"""

import logging
import re

from .hook_logger import get_logger
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.pages import Page


# Change logging level here
_assembly_log_level = logging.WARNING

if not hasattr(__name__, "html_logger"):
    html_logger = get_logger("ASSEMBLER", _assembly_log_level)

_nan_pattern = re.compile(r"\"NaN\"")
_replacement_value = '"24"'


def replace_nan(s: str) -> str:
    """Replace NaN values in a string with a replacement value."""
    return _nan_pattern.sub(_replacement_value, s)


def on_post_page(output: str, page: Page, config: MkDocsConfig) -> str:
    """
    Post-process the HTML output for each page.

    Args:
        output (str): The HTML content of the page.
        page (mkdocs.structure.pages.Page): The page object.
        config (dict): The MkDocs config object.

    Returns:
        str: The modified HTML content of the page.
    """
    html_logger.debug("Processing page %s", page.file.src_path)
    output = replace_nan(output)
    html_logger.info("Modified output for page %s", page.file.src_path)
    return output
