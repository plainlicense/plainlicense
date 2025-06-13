"""
Utility functions for hooks.
"""

import os
import re
import sys

from functools import cache
from pathlib import Path
from textwrap import wrap
from typing import TYPE_CHECKING, ClassVar, Literal, NamedTuple, Self

from funcy import rpartial
from mkdocs.structure.pages import Page


# Add the project root to sys.path for imports
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

if TYPE_CHECKING:
    from overrides.hooks.license_factory import LicenseContent


type MkDocsCommand = Literal["gh-deploy", "serve", "build"]

@cache
def license_dirs() -> tuple[Path, ...]:
    """
    Returns the paths to all license *directories* in the repository.

    Returns:
        tuple[Path, ...]: A tuple containing the paths to all license directories.
    """
    cwd = Path.cwd()
    root_dir = (
        cwd
        if cwd.name == "plainlicense" and (cwd / ".git").exists()
        else find_repo_root()
    )
    license_dirs = (root_dir / "docs" / "licenses").glob("*/*/")

    return tuple(license_dirs)

def wrap_text(text: str) -> str:
    """
    Wraps the provided text into formatted paragraphs, handling bullet points separately.

    Args:
        text (str): The text to be wrapped into formatted paragraphs.

    Returns:
        str: The wrapped text with paragraphs and bullet points formatted appropriately.
    """
    wrapper = rpartial(wrap, width=70, break_long_words=False)
    paragraphs = text.split("\n\n")
    bullet_paragraphs = []
    for i, paragraph in enumerate(paragraphs):
        if paragraph.strip().startswith("-"):
            bullets = paragraph.split("\n")
            bullets = [wrapper(bullet) for bullet in bullets if bullet]
            bullet_paragraphs.append((i, bullets))
        else:
            lines = paragraph.split("\n")
            wrapped_lines = [wrapper(line) for line in lines if line]
            bullet_paragraphs.append((i, wrapped_lines))
    paragraphs = [
        paragraph
        for i, paragraph in enumerate(paragraphs)
        if i not in [i for i, _ in bullet_paragraphs]
    ]
    wrapped_paragraphs = ["\n".join(wrapper(paragraph)) for paragraph in paragraphs]
    for i, bullets in bullet_paragraphs:
        bullets = ["\n".join(bullet) for bullet in bullets if bullet]
        wrapped_paragraphs.insert(i, "\n".join(bullets))
    return "\n\n".join(wrapped_paragraphs)


def strip_markdown(text: str) -> str:
    """
    Strips markdown from string.

    Args:
        text (str): The text to strip markdown from.

    Returns:
        str: The text with markdown stripped.
    """
    return text.replace("**", "").replace("*", "").replace("`", "").replace("#", "")


def find_repo_root() -> Path:
    """
    Find the repository's root directory by looking for the .git directory.

    Returns:
        Path: The path to the repository's root directory.

    Raises:
        FileNotFoundError: If the repository root directory cannot be found.
    """
    current_path = Path.cwd()
    while not (current_path / ".git").exists() and "external" not in current_path.parts:
        if current_path.parent == current_path and current_path.name != "plainlicense":
            raise FileNotFoundError("Could not find the repository root directory.")
        if current_path.name == "plainlicense":
            return current_path
        current_path = current_path.parent
    return current_path


def _is_production(command: MkDocsCommand) -> bool:
    """
    Returns True if the environment is production.
    """
    return command in {"build", "gh-deploy"} or os.getenv("GITHUB_ACTIONS") == "true"


def is_license_page(page: Page) -> bool:
    """
    Returns True if the page is a license page.
    """
    _status = Status.ensure_initialized()
    page_name = page.url.split("/")[-2] if len(page.url.split("/")) > 2 else ""
    return bool(page_name and page_name in _status.expected_licenses)


class LicensePaths(NamedTuple):
    """Represents the paths to various license files. These are saved as static assets for the site for use with `Plainr` and other tooling."""

    full_markdown: Path
    embed_block: Path
    embed_instructions: Path
    mkdocs_markdown: Path
    plaintext: Path
    changelog: Path
    official_markdown: Path
    official_plaintext: Path

    spdx_id: str
    version: str

    embed_pattern: re.Pattern = re.compile(
        r"(<iframe.+</iframe>)", re.DOTALL | re.MULTILINE
    )

    @staticmethod
    def _get_base_path(spdx_id: str, version: str) -> Path:
        """
        Returns the base path for license files.
        """
        return find_repo_root() / "assets" / spdx_id / version

    @classmethod
    def from_license(cls, license_content: "LicenseContent") -> "LicensePaths":
        """
        Creates a LicensePaths instance from a LicenseContent object.

        Args:
            license_content (LicenseContent): The LicenseContent object.

        Returns:
            LicensePaths: The created LicensePaths instance.
        """
        spdx_id = license_content.meta["spdx_id"].lower()
        version = license_content.plain_version
        base_path = cls._get_base_path(spdx_id, version)
        return cls(
            full_markdown=base_path / f"full-markdown-{spdx_id}-{version}.md",
            embed_block=base_path / f"embed-block-{spdx_id}-{version}.html",
            embed_instructions=base_path / f"embed-instructions-{spdx_id}-{version}.md",
            mkdocs_markdown=base_path / f"mkdocs-markdown-{spdx_id}-{version}.md",
            plaintext=base_path / f"plaintext-{spdx_id}-{version}.txt",
            changelog=base_path / f"changelog-{spdx_id}-{version}.md",
            official_markdown=base_path / f"official-markdown-{spdx_id}.md",
            official_plaintext=base_path / f"official-plaintext-{spdx_id}.txt",
            spdx_id=spdx_id,
            version=version,
        )

    def check_for_latest(self) -> None:
        """
        Checks if the license files exist in the expected paths.

        Returns:
            bool: True if all license files exist, False otherwise.
        """
        current_version = tuple(int(v) for v in self.version.split("."))
        license_root = self.full_markdown.parent.parent

        other_versions = []
        for path in license_root.iterdir():
            if path.is_dir() and path.name != self.version and path.name != "latest":
                try:
                    version_tuple = tuple(int(v) for v in path.name.split("."))
                    other_versions.append(version_tuple)
                except ValueError:
                    # Skip directories that don't follow version naming pattern
                    continue

        is_latest = all(
            other_version <= current_version for other_version in other_versions
        )

        if is_latest:
            latest_dir = license_root / "latest"
            if latest_dir.exists():
                latest_dir.unlink()
            latest_dir.symlink_to(self.full_markdown.parent, target_is_directory=True)

    def save_license(self, license_content: "LicenseContent") -> None:
        """
        Saves the license content to the appropriate files.

        Args:
            license_content (LicenseContent): The LicenseContent object to save.
        """
        if not self.full_markdown.parent.exists():
            self.full_markdown.parent.mkdir(parents=True, exist_ok=True)
        self.full_markdown.write_text(license_content.license_content)
        if embed_html := self.embed_pattern.search(license_content.embed_link):
            self.embed_block.write_text(embed_html.group(1))
        self.embed_instructions.write_text(license_content.embed)
        self.mkdocs_markdown.write_text(license_content.reader)
        self.plaintext.write_text(license_content.plaintext_content)
        self.changelog.write_text(license_content.changelog)
        self.official_markdown.write_text(license_content.official)
        self.official_plaintext.write_text(license_content.original_plaintext_content)
        self.check_for_latest()


class Status:
    """
    Simple singleton class to store global status information.
    """

    _instance: ClassVar["Status | None"] = None
    _initialized: ClassVar[bool] = False

    def __new__(cls: type[Self], cmd: MkDocsCommand) -> "Status":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, cmd: MkDocsCommand) -> None:
        """Get this party started."""
        if type(self)._initialized:  # noqa: SLF001
            return
        self.command: MkDocsCommand = cmd
        self._production: bool = _is_production(command=cmd)
        self.expected_licenses: tuple[str, ...] = tuple(
            license_path.name
            for license_path in license_dirs()
            if license_path.exists()
        )
        self.assembled_licenses: list["LicenseContent"] = []
        self._count = 0
        type(self)._instance = self  # type: ignore[assignment]  # noqa: SLF001
        type(self)._initialized = True  # noqa: SLF001

    @property
    def production(self) -> bool:
        """
        Returns the production flag.
        """
        return self._production

    @classmethod
    def status(cls) -> "Status | None":
        """
        Returns the instance.
        """
        return cls._instance
    
    @classmethod
    def ensure_initialized(cls, command: MkDocsCommand = "serve") -> "Status":
        """
        Ensures the Status singleton is initialized and returns it.
        """
        if cls._instance is None:
            cls._instance = cls(command)
        return cls._instance

    def is_expected(self, license_name: str) -> bool:
        """
        Returns True if the license is expected.
        """
        return license_name in self.expected_licenses

    def add_license(self, license_content: "LicenseContent") -> None:
        """
        Adds a LicenseContent object to the assembled licenses.

        Args:
            license_content (LicenseContent): The LicenseContent object to add.

        """
        self.assembled_licenses.append(license_content)
        self._count += 1
        if self.expected_licenses and self._count == len(self.expected_licenses):
            print(
                f"All {self._count} expected licenses have been assembled. Licenses assembled: {self.assembled_licenses}; licenses expected: {self.expected_licenses}."
            )
            self.check_licenses()

    def check_licenses(self) -> None:
        """
        Checks if expected licenses match assembled licenses.

        Raises:
            ValueError: If expected licenses are not set or if assembled licenses do not match expected licenses.
        """
        if not self.expected_licenses:
            raise ValueError("Expected licenses are not set.")
        if not self.assembled_licenses:
            raise ValueError("Assembled licenses are empty.")
        for license_name in self.expected_licenses:
            if not any(lname for lname in self.assembled_licenses if lname.meta["spdx_id"].lower() == license_name.lower()):
                raise ValueError(
                    f"License {license_name} is expected but not found in assembled licenses."
                )
        self._save_licenses()

    def _save_licenses(self) -> None:
        """
        Saves the assembled licenses to the status file.

        Raises:
            ValueError: If expected licenses are not set or if assembled licenses are empty.
        """
        for final_license in self.assembled_licenses:
            license_paths = LicensePaths.from_license(final_license)
            license_paths.save_license(final_license)
