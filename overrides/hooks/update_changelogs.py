"""Updates the changelog for each license page."""

import logging

from mkdocs.config.defaults import MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page

import sys
from pathlib import Path

# Add the project root to sys.path for imports
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from overrides.hooks._utils import find_repo_root, is_license_page
from overrides.hooks.hook_logger import get_logger


if not hasattr(__name__, "changelog_logger"):
    changelog_logger = get_logger("CHANGELOG", logging.WARNING)


@event_priority(50)
def on_pre_page(page: Page, config: MkDocsConfig, files: Files) -> Page:
    """Update the changelog for each license page.

    Also, check for tags in the frontmatter and update them if necessary.
    """
    if not is_license_page(page):
        return page
    license_name = page.meta.get("spdx_id", page.url.split("/")[-2])
    changelog_path = find_repo_root() / "packages" / "changelogs" / f"{license_name}.md"
    changelog_content = (
        changelog_path.read_text()
        if changelog_path.exists()
        else "## such empty, much void :nounproject-doge:"
    )
    changelog_logger.info("Updating changelog for %s", license_name)
    page.meta["changelog"] = changelog_content
    return page
