# sourcery skip: avoid-global-variables, do-not-use-staticmethod, no-complex-if-expressions, no-relative-imports
"""
Assembles license content for all license pages.
"""
# ===========================================================================
#                              TODO
#
# We should:
# - [ ] Break this monster class up into smaller classes... it's unwieldy and messy... but functional
# - [ ] See if we can use pyMarkdown to take more of the license text processing off our hands
# - [ ] Use mkdocs-macros plugin to simplify content generation
# ===========================================================================

import json
import logging
import re
import sys

from copy import copy
from datetime import UTC, datetime
from functools import cached_property
from pathlib import Path
from re import Match, Pattern
from textwrap import dedent, indent
from typing import Any, ClassVar, Literal

import ez_yaml

from jinja2 import Template, TemplateError
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.files import File, Files, InclusionLevel
from mkdocs.structure.pages import Page


# Add the project root to sys.path for imports
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from overrides.hooks._utils import Status, find_repo_root, wrap_text
from overrides.hooks.hook_logger import get_logger


# Change logging level here
_assembly_log_level = logging.WARNING

if not hasattr(__name__, "assembly_logger"):
    assembly_logger = get_logger("ASSEMBLER", _assembly_log_level)


def clean_content(content: dict[str, Any]) -> dict[str, Any] | None:
    """
    Strips whitespace from string values in a dictionary, and from strings in lists.

    Args:
        content (Any): The dictionary to clean.

    Returns:
        dict[str, Any]: The cleaned dictionary with whitespace removed from string values.

    Examples:
        cleaned_content = clean_content({"title": "  Example Title  ", "tags": ["  tag1  ", "tag2 "]})
    """

    def cleaner(value: Any) -> Any:
        """Strips whitespace from a string."""
        if isinstance(value, dict):
            return {k: cleaner(v) for k, v in value.items()}
        if isinstance(value, list):
            return [cleaner(item) for item in value]
        return value.strip() if isinstance(value, str) else value

    return {k: cleaner(v) if v else "" for k, v in content.items()}


def get_extra_meta(spdx_id: str) -> dict[str, Any]:
    """Returns the extra metadata for the license."""
    choose_a_license_files = list(Path("external/choosealicense.com/_licenses").glob("*.txt"))
    new_meta = {}
    if file := next((f for f in choose_a_license_files if f.stem.lower() == spdx_id.lower()), None):
        raw_text = file.read_text()
        if match := re.search(r"---\n(.*?)\n---", raw_text, re.DOTALL):
            frontmatter = ez_yaml.to_object(match[1])
            if isinstance(frontmatter, dict) and (
                cleaned_frontmatter := clean_content(frontmatter)
            ):
                new_meta |= {
                    f"cal_{k}": v for k, v in cleaned_frontmatter.items() if v and k != "using"
                } | cleaned_frontmatter.get("using", {})
    spdx_files = list(Path("external/license-list-data/json/details").glob("*.json"))
    if file := next((f for f in spdx_files if (f.stem.lower() == spdx_id.lower())), None):
        assembly_logger.debug("Found SPDX file: %s", file)
        if cleaned_spdx := clean_content(load_json(file)):
            new_meta |= cleaned_spdx
    return new_meta


def render_mapping(mapping: dict[str, Any], context: dict) -> dict[str, Any]:
    """Renders a dict/mapping with a context."""

    def render_value(value: Any) -> Any:
        """Recursively render a value."""
        if isinstance(value, str):
            try:
                return Template(value).render(**context)
            except (TypeError, TemplateError):
                assembly_logger.exception("Error rendering mapping")
                return value
        elif isinstance(value, dict):
            return render_mapping(value, context)
        elif isinstance(value, list):
            return [render_mapping(item, context) for item in value]
        else:
            return value

    return {key: render_value(value) for key, value in mapping.items()}

def save_license(page: Page) -> None:
    """
    Creates a final license with all finalized information and gives it to `Status` to save.
    """
    final_license = LicenseContent(page)
    if status := Status.status():
        status.add_license(final_license)

def get_changelog_text(spdx_id: str) -> str:
    """
    Returns the changelog text for a license.
    This is used to render the changelog in the license page.
    """
    changelog_path = find_repo_root() / "packages" / "changelogs" / f"{spdx_id}.md"
    if not changelog_path.exists():
        assembly_logger.warning("No changelog found for %s", spdx_id)
        return "\n## such empty, much void :nounproject-doge:"
    return changelog_path.read_text().strip()

def assemble_license_page(config: MkDocsConfig, page: Page, _file: File) -> Page:
    """Returns the rendered boilerplate from the config."""
    if not page.meta:
        assembly_logger.error("No metadata found for %s", page.title)
        return page
    meta = dict(page.meta)
    meta = clean_content(meta)
    if not meta:
        assembly_logger.error("No metadata found for %s", page.title)
        return page
    boilerplate: dict[str, str] = config["extra"]["boilerplate"]
    boilerplate["year"] = boilerplate.get("year", datetime.now(UTC).strftime("%Y")).strip()
    boilerplate = clean_content(boilerplate) or {}
    meta["changelog"] = get_changelog_text(meta.get("spdx_id", page.url.split("/")[-2]))
    page.meta = meta | boilerplate  # type: ignore
    p_license = LicenseContent(page)
    if meta:
        meta |= p_license.attributes
        extra_meta = get_extra_meta(page.meta["spdx_id"])
        meta |= extra_meta
    assembly_logger.debug("Rendering boilerplate for %s", page.title)
    if meta is None:
        meta = {}
    rendered_boilerplate = render_mapping(boilerplate, meta)
    meta |= rendered_boilerplate
    markdown = (page.markdown or "") + p_license.license_content
    markdown = Template(markdown).render(**meta)
    page.meta = meta
    page.markdown = markdown
    save_license(page)  # we'll generate a new license content with the completed page
    return page


def create_page_content(page: Page) -> str:
    """Creates the content for a license page."""
    frontmatter = ez_yaml.to_string(page.meta)
    if not frontmatter.startswith("---"):
        frontmatter = "---\n" + frontmatter
    if not frontmatter.endswith("---"):
        frontmatter += "\n---\n"
    return f"{frontmatter}{page.markdown or ''}"


def create_new_file(page: Page, file: File, config: MkDocsConfig) -> File:
    """Creates a new file object from a page."""
    new_file = File.generated(
        config, file.src_uri, content=create_page_content(page), inclusion=InclusionLevel.INCLUDED
    )
    new_file.page = page
    new_file.page.file = new_file
    return new_file


def get_category(uri: str) -> str | None:
    """Returns the category of the license."""
    if (
        (split := uri.split("/"))
        and len(split) == 4
        and split[1]
        in ["proprietary", "public-domain", "copyleft", "permissive", "source-available"]
    ):
        return split[1]
    return None


def filter_license_files(files: Files) -> Files:
    """Creates a new files object from the license files."""
    license_files = [
        files.src_uris[uri]
        for uri in files.src_uris
        if (files.src_uris[uri] and get_category(uri) and uri.strip().lower().endswith("index.md"))
    ]
    return Files(license_files)


def replace_files(files: Files, new_files: Files) -> Files:
    """Replaces files in the files object."""
    for file in new_files:
        if replaced_file := files.get_file_from_path(file.src_uri):
            files.remove(replaced_file)
        files.append(file)
    return files


def create_license_embed_file(page: Page, config: MkDocsConfig) -> File:
    """Creates an embedded license file."""
    content = f"""---\ntemplate: embedded_license.html\ntitle: {page.title} (embedded)\ndescription: {page.meta["description"]}\nhide: [toc, nav, header, consent, dialog, announce, search, sidebar, source, tabs, skip, ]\n---\n\n{page.meta["embed_file_markdown"]}"""
    stem = page.meta["spdx_id"].lower()
    assembly_logger.debug("Creating embed file for %s", stem)
    return File.generated(
        config, f"embeds/{stem}.md", content=content, inclusion=InclusionLevel.NOT_IN_NAV
    )


def on_files(files: Files, config: MkDocsConfig) -> Files:
    """
    Replaces license files with generated versions.

    Note: I was doing this after Page creation but it was
    problematic. This is more involved, but the output aligns
    with mkdocs' expectations better. It also makes us less
    vulnerable to changes in mkdocs' internals.

    Args:
        files (Files): The files objects to process.
        config (MkDocsConfig): The configuration settings for MkDocs.

    Returns:
        files: The processed Files with replaced files.

    Raises:
        Exception: If there is an error during template rendering or logging.
    """
    license_files = filter_license_files(copy(files))
    if not license_files:
        assembly_logger.error("No license files found. Files: %s", files)
        raise FileNotFoundError("No license files found.")
    new_license_files = []
    for file in license_files:
        page = Page(None, file, config)
        if not page:
            assembly_logger.error("No page found for file %s", file.src_uri)
            continue
        page.read_source(config)
        assembly_logger.debug("Processing license page %s", page.title)
        updated_page = assemble_license_page(config, page, file)
        new_file = create_new_file(updated_page, file, config)
        new_license_files.extend((new_file, create_license_embed_file(updated_page, config)))
    return replace_files(files, Files(new_license_files))


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON."""
    return json.loads(path.read_text())


def write_json(path: Path, data: dict[str, Any]) -> None:
    """Writes a JSON."""
    if path.exists():
        path.unlink()
    path.write_text(json.dumps(data, indent=2))


class LicenseContent:
    """
    Represents a license's content and metadata, using compositional architecture.

    This class coordinates various specialized components:
    - TextProcessor: Handles all text transformations
    - Formatter: Manages formatting and structure creation
    - LicenseMetadata: Manages metadata and state
    - TabGenerators: Generate individual tab content
    """

    def __init__(self, page: Page) -> None:
        """
        Initializes a new instance of the class with the provided page object.
        Sets up specialized components using composition.

        Args:
            page (Page): The page object containing metadata and content related to the license.
        """
        # Import the new modules
        from .factory._text_processor import TextProcessor
        from .factory._formatter import Formatter
        from .factory._license_metadata import LicenseMetadata
        from .factory._tab_generators import TabGeneratorFactory

        self.page = page
        self.meta = page.meta

        # Initialize components
        self.metadata = LicenseMetadata(page)
        self.text_processor = TextProcessor()
        self.formatter = Formatter(self.metadata.get_icon_map())
        self.tab_factory = TabGeneratorFactory(self.formatter, self.metadata.get_icon_map())

        # Basic properties
        self.license_type = self.metadata.get_license_type()
        self.title = self.metadata.get_title()
        self.year = self.text_processor.year
        self.plain_version = self.metadata.get_plain_version()
        self.tags = self.metadata.get_tags()
        self.has_official = self.metadata.has_official_license()
        self.embed_url = self.metadata.get_embed_url()

        # Process license texts
        raw_reader_text = self.meta["reader_license_text"]
        self.reader_license_text = self.text_processor.replace_year(raw_reader_text)
        self.markdown_license_text = self.text_processor.process_mkdocs_to_markdown(self.reader_license_text)
        self.plaintext_license_text = self.text_processor.process_markdown_to_plaintext(self.markdown_license_text)

        # Other content
        self.changelog_text = self.meta.get("changelog", "\n## such empty, much void :nounproject-doge:")
        self.original_license_text = dedent(self.meta.get("original_license_text", ""))

        self.page_markdown: str | None = None  # added externally after init

        assembly_logger.debug("License content: \n\n%s\n", self.license_content)

    # Delegate methods to appropriate components
    def get_license_type(self) -> Literal["dedication", "license"]:
        """Returns the license type based on the license metadata."""
        return self.metadata.get_license_type()

    def process_markdown_to_plaintext(self, text: str | None = None) -> str:
        """Strips Markdown formatting from the license text to produce a plaintext version."""
        text = text or self.markdown_license_text
        return self.text_processor.process_markdown_to_plaintext(text)

    def process_definitions(self, text: str, *, plaintext: bool = False) -> str:
        """Identifies and processes definitions in the input text."""
        return self.text_processor.process_definitions(text, plaintext=plaintext)

    def get_plain_version(self) -> str:
        """Checks the version information in the license's corresponding package.json file."""
        return self.metadata.get_plain_version()

    def transform_text_to_footnotes(self, text: str) -> str:
        """Transforms text by replacing annotations with footnotes."""
        return self.text_processor.transform_text_to_footnotes(text)

    def replace_year(self, text: str) -> str:
        """Replaces the year placeholder in the provided text with the current year."""
        return self.text_processor.replace_year(text)

    def replace_code_blocks(self, text: str) -> str:
        """Replaces code blocks in the provided text with a placeholder."""
        return self.text_processor.replace_code_blocks(text)

    def process_mkdocs_to_markdown(self) -> str:
        """Processes MkDocs content and transforms it into standard Markdown."""
        assembly_logger.debug(
            "Processing mkdocs-style markdown to regular markdown for %s", self.meta["plain_name"]
        )
        return self.text_processor.process_mkdocs_to_markdown(self.reader_license_text)

    def get_tags(self) -> list[str] | None:
        """Retrieves a list of tags from the provided frontmatter data dictionary."""
        return self.metadata.get_tags()

    def _to_plaintext(
        self,
        *,
        content: str | None = None,
        title: str | None = None,
        include_header_block: bool = True,
        include_boilerplate: bool = True,
        tabify: bool = True,
    ) -> str:
        """Converts the given content and title to a plaintext representation."""
        content = content or self.plaintext_license_text
        title = title or self.title
        header_block = self.get_header_block('plaintext')
        interpretation_block = self.interpretation_block('plaintext')
        disclaimer_block = self.disclaimer_block

        return self.formatter.format_to_plaintext(
            content, title, header_block, interpretation_block, disclaimer_block,
            include_header_block=include_header_block,
            include_boilerplate=include_boilerplate,
            tabify=tabify
        )

    @property
    def plaintext_content(self) -> str:
        """Returns the plaintext content of the Plain License version of the license."""
        return self._to_plaintext(include_header_block=False, tabify=False)

    @property
    def original_plaintext_content(self) -> str:
        """Returns the original license as an unformatted plaintext string."""
        return self._to_plaintext(
            content=self.original_license_text,
            title=self.get_title(original=True),
            include_header_block=False,
            include_boilerplate=False,
            tabify=False,
        )

    def get_title(self, *, original: bool = False) -> str:
        """Returns the title of the license."""
        return self.metadata.get_title(original=original)

    def tabify(self, text: str, title: str, level: int = 1, icon: str = "") -> str:
        """Returns a tabified block with the provided text."""
        return self.formatter.tabify(text, title, level, icon)

    def blockify(
        self,
        text: str,
        kind: str,
        title: str,
        separator_count: int = 5,
        options: dict[str, str | dict[str, str]] | None = None,
    ) -> str:
        """Returns a blocks api block with the provided text."""
        return self.formatter.blockify(text, kind, title, separator_count, options)

    def interpretation_block(self, kind: str) -> str:
        """Returns the interpretation block for the license."""
        # For plaintext, we need to convert markdown to plaintext first
        if kind == "plaintext" and self.has_official:
            interpretation_text = self.meta.get("interpretation_text", "")
            as_plaintext = self.text_processor.process_markdown_to_plaintext(interpretation_text)
            return self.formatter.interpretation_block(kind, self.meta, self.has_official, self.title, as_plaintext)
        return self.formatter.interpretation_block(kind, self.meta, self.has_official, self.title)

    def get_header_block(self, kind: Literal["reader", "markdown", "plaintext"]) -> str:
        """Returns the version block for the license."""
        return self.formatter.get_header_block(kind, self.meta, self.meta.get('plain_name', ''), self.plain_version)

    @cached_property
    def attributes(self) -> dict[str, Any | int | str]:
        """Retrieves a dictionary of attributes related to the license."""
        return {
            "title": self.title,
            "year": self.year,
            "reader_license_text": self.reader_license_text,
            "markdown_license_text": self.markdown_license_text,
            "plaintext_license_text": self.plaintext_license_text,
            "plain_version": self.plain_version,
            "license_type": self.license_type,
            "tags": self.tags,
            "changelog": self.changelog,
            "original_license_text": self.original_license_text,
            "has_official": self.has_official,
            "final_markdown": self.license_content,
            "embed_file_markdown": self.embed_file_markdown,
        }

    @cached_property
    def tag_map(self) -> dict[str, str]:
        """Returns the tag map for the license for setting tags."""
        return self.metadata.get_tag_map()

    @cached_property
    def icon_map(self) -> dict[str, str]:
        """Returns the icon map for the license tab icons."""
        return self.metadata.get_icon_map()

    @cached_property
    def not_advice_text(self) -> str:
        """Returns the not advice text for the license."""
        return self.metadata.get_not_advice_text()

    @cached_property
    def not_official_text(self) -> str:
        """Returns the not official text for the license."""
        return self.metadata.get_not_official_text()

    @property
    def disclaimer_block(self) -> str:
        """Returns the disclaimer block for the license."""
        return self.formatter.get_disclaimer_block(
            self.meta, self.has_official, self.not_advice_text, self.not_official_text
        )

    # Tab generation properties using the new tab generators
    @property
    def reader(self) -> str:
        """Returns the reader block for the license."""
        generator = self.tab_factory.create_reader_generator()
        header_block = self.get_header_block("reader")
        interpretation_block = self.interpretation_block("reader")
        return generator.generate(
            header_block, self.reader_license_text,
            interpretation_block, self.disclaimer_block, self.has_official
        )

    @property
    def markdown(self) -> str:
        """Returns the markdown block for the license."""
        generator = self.tab_factory.create_markdown_generator()
        header_block = self.get_header_block("markdown")
        interpretation_block = self.interpretation_block("markdown")
        return generator.generate(
            header_block, self.markdown_license_text,
            interpretation_block, self.disclaimer_block
        )

    @property
    def plaintext(self) -> str:
        """Returns the plaintext block for the license."""
        generator = self.tab_factory.create_plaintext_generator()
        header_block = self.get_header_block("plaintext")
        interpretation_block = self.interpretation_block("plaintext")
        return generator.generate(
            self.plaintext_license_text, self.title,
            header_block, interpretation_block, self.disclaimer_block
        )

    @property
    def changelog(self) -> str:
        """Returns the changelog block for the license."""
        generator = self.tab_factory.create_changelog_generator()
        return generator.generate(self.changelog_text)

    @property
    def official(self) -> str:
        """Returns the official block for the license."""
        generator = self.tab_factory.create_official_generator()
        return generator.generate(self.original_license_text, self.meta, self.has_official)

    @cached_property
    def embed_link(self) -> str:
        """Returns the embed link for the license."""
        return self.metadata.get_embed_link()

    @cached_property
    def embed_instructions(self) -> str:
        """Returns the embed instructions for the license."""
        return self.metadata.get_embed_instructions()

    @property
    def embed(self) -> str:
        """Returns the embed block for the license."""
        generator = self.tab_factory.create_embed_generator()
        return generator.generate(self.embed_link, self.embed_instructions)

    @property
    def embed_file_markdown(self) -> str:
        """Returns the embed file markdown for the license."""
        text = dedent(f"""
            {self.get_header_block("reader")}
            {self.reader_license_text}
            """)
        return self.blockify(
            text,
            "admonition",
            f"Plain License: <span class='detail-title-highlight'>The {self.meta.get('plain_name')}</span>",
            3,
            options={"type": "license"},
        )

    @property
    def license_content(self) -> str:
        """Returns the content for a license page."""
        tabs = f"{self.reader}\n{self.embed}\n{self.markdown}\n{self.plaintext}\n{self.changelog}"
        if self.has_official:
            tabs += f"\n{self.official}"
        outro = ("\n\n" + self.meta.get("outro", "") + "\n") if self.meta.get("outro") else "\n"
        return (
            self.blockify(
                f"{tabs}",
                "admonition",
                f"The {self.meta.get('plain_name')}",
                6,
                options={"type": "license"},
            )
        ) + outro
