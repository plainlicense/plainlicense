# sourcery skip: avoid-global-variables, do-not-use-staticmethod, no-complex-if-expressions, no-relative-imports
"""
Standalone license factory that works without mkdocs dependencies.
Refactored from the original license_factory in the mkdocs hooks.
"""
# ===========================================================================

import json
import re

from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cached_property
from pathlib import Path
from re import Match, Pattern
from textwrap import dedent, indent, wrap
from typing import Any, ClassVar, Literal

import ez_yaml

from funcy import rpartial
from jinja2 import Template, TemplateError


@dataclass
class LicensePageData:
    """Simple data class to replace mkdocs Page object."""
    meta: dict[str, Any]
    markdown: str | None = None
    title: str | None = None
    url: str = ""


def parse_license_file(file_path: Path) -> LicensePageData:
    """Parse a license file and extract frontmatter and content."""
    if not file_path.exists():
        raise FileNotFoundError(f"License file {file_path} does not exist")

    content = file_path.read_text(encoding="utf-8")

    # Extract YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter_yaml = parts[1].strip()
            markdown_content = parts[2].strip()
        else:
            frontmatter_yaml = ""
            markdown_content = content
    else:
        frontmatter_yaml = ""
        markdown_content = content

    # Parse frontmatter
    meta = ez_yaml.to_object(frontmatter_yaml) if frontmatter_yaml else {}
    if not isinstance(meta, dict):
        meta = {}

    # Extract title from meta or markdown
    title = meta.get("title")
    if not isinstance(title, str):
        title = None
    if not title and markdown_content:
        # Try to extract title from first heading
        first_line = markdown_content.split("\n")[0].strip()
        if first_line.startswith("#"):
            title = first_line.lstrip("#").strip()

    return LicensePageData(
        meta=meta,
        markdown=markdown_content,
        title=title,
        url=str(file_path)
    )


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
    if (file := next((f for f in spdx_files if (f.stem.lower() == spdx_id.lower())), None)) and (cleaned_spdx := clean_content(load_json(file))):
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
                return value
        elif isinstance(value, dict):
            return render_mapping(value, context)
        elif isinstance(value, list):
            return [render_mapping(item, context) for item in value]
        else:
            return value

    return {key: render_value(value) for key, value in mapping.items()}


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
    Represents a license's content and metadata, including the license text and associated attributes.
    All license text processing happens here.

    TODO: Break this monster class up into smaller classes...
    """

    _year_pattern: ClassVar[Pattern[str]] = re.compile(r"\{\{\s{1,2}year\s{1,2}\}\}")
    _code_pattern: ClassVar[Pattern[str]] = re.compile(
        r"(`{3}markdown|`{3}plaintext(.*?)`{3})", re.DOTALL
    )
    _definition_pattern = re.compile(
        r"(?P<term>`[\w\s]+`)\s*?\n{1,2}:\s{1,4}(?P<def>[\w\s]+)\n{2}", re.MULTILINE
    )
    _annotation_pattern: ClassVar[Pattern[str]] = re.compile(
        r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
        re.MULTILINE | re.DOTALL,
    )
    _reader_header_pattern: ClassVar[Pattern[str]] = re.compile(
        r'<h2 class="license-first-header">(.*?)</h2>'
    )
    _header_pattern: ClassVar[Pattern[str]] = re.compile(r"#+ (\w+?)\n")
    _markdown_pattern: ClassVar[Pattern[str]] = re.compile(r"#+ |(\*\*|\*|`)(.*?)\1", re.MULTILINE)
    _link_pattern: ClassVar[Pattern[str]] = re.compile(r"\[(.*?)\]\((.*?)\)", re.MULTILINE)
    _image_pattern: ClassVar[Pattern[str]] = re.compile(r"!\[(.*?)\]\((.*?)\)", re.MULTILINE)

    def __init__(self, page: LicensePageData) -> None:
        """
        Initializes a new instance of the class with the provided page object.
        This constructor sets up various attributes related to the page's metadata, including tags,license type, and
        processed license texts, ensuring that the object is ready for further operations.

        Args:
            page (LicensePageData): The page data containing metadata and content related to the license.

        Examples:
            license_instance = LicenseContent(page)
        """
        self.page = page
        self.meta = page.meta
        self.license_type = self.get_license_type()
        self.title = f"The {self.meta['plain_name']}"
        self.year = str(datetime.now(UTC).strftime("%Y"))
        self.reader_license_text: str = self.replace_year(self.meta["reader_license_text"])
        self.markdown_license_text = self.process_mkdocs_to_markdown()
        self.plaintext_license_text = self.process_markdown_to_plaintext()
        self.changelog_text = self.meta.get(
            "changelog", "\n## such empty, much void :nounproject-doge:"
        )
        self.original_license_text = dedent(self.meta.get("original_license_text", ""))
        self.plain_version = self.get_plain_version()
        self.tags = self.get_tags()

        self.has_official = bool(self.original_license_text)

        self.embed_url = f"https://plainlicense.org/embed/{self.meta['spdx_id'].lower()}.html"


    def get_license_type(self) -> Literal["dedication", "license"]:
        """
        Returns the license type based on the license metadata.
        This might seem like overkill, but it was giving me a lot of
        trouble with a single check. I'm probably missing something
        in the order of operations, but this works for now.
        """
        if (
            (
                self.page.title
                and isinstance(self.page.title, str)
                and "domain" in self.page.title.lower()
            )
            or (self.page and "domain" in self.page.url.lower())
            or (self.meta.get("category") and "domain" in self.meta["category"].lower())
        ):
            return "dedication"
        return "license"

    def process_markdown_to_plaintext(self, text: str | None = None) -> str:
        """
        Strips Markdown formatting from the license text to produce a plaintext version.

        Returns:
            str: The processed plaintext version of the Markdown license text.

        Examples:
            plain_text = process_markdown_to_plaintext()
        """
        text = text or self.markdown_license_text
        text = self.process_definitions(text, plaintext=True)
        if headers := self._header_pattern.finditer(text):
            for header in headers:
                text = text.replace(header.group(0), f"{header.group(1).upper()}\n")
        text = type(self)._markdown_pattern.sub(  # noqa: SLF001
            r"\2", text
        )  # Remove headers, bold, italic, inline code
        text = type(self)._link_pattern.sub(r"\1 (\2)", text)  # Handle links  # noqa: SLF001
        text = type(self)._image_pattern.sub(r"\1 (\2)", text)  # Handle images  # noqa: SLF001
        return type(self)._code_pattern.sub(r"===\1===", text)  # Remove code blocks  # noqa: SLF001

    @staticmethod
    def process_definitions(text: str, *, plaintext: bool = False) -> str:
        """
        Identifies and processes definitions in the input text, formatting them appropriately.

        Args:
            text (str): The input text containing definitions to be processed.
            plaintext (bool, optional): A flag indicating whether to
            return definitions in plaintext format.
                Defaults to False.

        Returns:
            str: The processed text with definitions formatted appropriately.
        """
        definition_pattern = LicenseContent._definition_pattern
        if matches := definition_pattern.finditer(text):
            for match in matches:
                term = match.group("term")
                def_text = match.group("def")
                if plaintext:
                    replacement = "\n" + dedent(f"""{term.replace("`", "")} - {def_text}""") + "\n"
                else:
                    replacement = "\n" + dedent(f"""{term}:\n{def_text}""") + "\n"
                text = text.replace(match.group(0), replacement)
        if matches := re.findall(r"\{\s?\.\w+\s?\}", text):
            for match in matches:
                text = text.replace(match, "")
        return text

    def get_plain_version(self) -> str:
        """
        Checks the version information in the license's corresponding package.json file and returns the version string.

        Returns:
            str: The version string from the package, or "0.0.0" if the file is missing or the version is not valid.
        """
        spdx_id = self.meta["spdx_id"].lower()
        # Try to find repo root by looking for package.json or pyproject.toml
        current_path = Path(self.page.url).parent if self.page.url else Path.cwd()
        repo_root = next(
            (
                parent
                for parent in [current_path, *list(current_path.parents)]
                if (parent / "packages").exists()
                or (parent / "pyproject.toml").exists()
            ),
            None,
        )
        if repo_root is None:
            return "0.0.0"

        package_path = repo_root / "packages" / spdx_id / "package.json"
        if not package_path.exists():
            return "0.0.0"

        package = load_json(package_path)
        if (version := package.get("version")) and isinstance(version, str) and re.match(r"^\d+\.\d+\.\d+$", version):
            return version
        return "0.0.0"

    def transform_text_to_footnotes(self, text: str) -> str:
        """
        Transforms text by replacing annotations with footnotes and adding footnote references at the end.

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

        transformed_text = type(self)._annotation_pattern.sub(replacement, text)  # noqa: SLF001
        if footnotes:
            transformed_text += "\n\n"
            for i, footnote in enumerate(footnotes, 1):
                transformed_text += f"[^{i}]: {footnote}\n\n"
        return transformed_text + "\n\n"

    def replace_year(self, text: str) -> str:
        """
        Replaces the year placeholder in the provided text with the current year.

        Args:
            text (str): The text to process and replace the year placeholder.

        Returns:
            str: The text with the year placeholder replaced by the current year.
        """
        return type(self)._year_pattern.sub(self.year, text)  # noqa: SLF001

    def replace_code_blocks(self, text: str) -> str:
        """
        Replaces code blocks in the provided text with a placeholder to prevent Markdown processing.

        Args:
            text (str): The text to process and replace code blocks.

        Returns:
            str: The text with code blocks replaced by a placeholder.
        """
        return type(self)._code_pattern.sub(r"===\1===", text)  # noqa: SLF001

    def process_mkdocs_to_markdown(self) -> str:
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

        Returns:
            str: The processed Markdown text after transformations
            and definitions have been applied.
        """
        text = self.reader_license_text
        text = self.replace_code_blocks(text)
        text = self.transform_text_to_footnotes(text)
        text = type(self)._reader_header_pattern.sub(r"## \1", text)  # noqa: SLF001
        return self.process_definitions(text, plaintext=False)

    def get_tags(self) -> list[str] | None:
        """
        Retrieves a list of tags from the provided frontmatter data dictionary.

        Args:
            frontmatter (dict[str, Any]): A dictionary containing
            frontmatter data that may include tags, conditions,
            permissions, and limitations.

        Returns:
            list[str] | None: A list of mapped tags if found, or None if no valid tags are present.
        """
        possible_tags: list[list[str | None] | None] = [
            self.meta.get("conditions"),
            self.meta.get("permissions"),
            self.meta.get("limitations"),
        ]
        frontmatter_tags = []
        for taglist in possible_tags:
            if taglist:
                frontmatter_tags.extend(taglist)
        if frontmatter_tags:
            return [self.tag_map[tag] for tag in frontmatter_tags if tag in self.tag_map]
        return None

    def _to_plaintext(
        self,
        *,
        content: str | None = None,
        title: str | None = None,
        include_header_block: bool = True,
        include_boilerplate: bool = True,
        tabify: bool = True,
    ) -> str:
        """
        Converts the given content and title to a plaintext representation.
        """
        content = content or self.plaintext_license_text
        title = title or self.title
        header_block = (
            f"\n\n{self.get_header_block('plaintext')}\n\n" if include_header_block else ""
        )
        boilerplate = (
            f"{wrap_text(self.interpretation_block('plaintext'))}\n```\n\n{self.disclaimer_block}\n"
            if include_boilerplate
            else "\n```\n"
        )
        body = wrap_text(dedent(f"\n{content}\n"))
        text = f"""\n\n```plaintext title="{self.title} in plain text"{header_block}{body}{boilerplate}"""
        return (
            self.tabify(text, "plaintext", 1, self.icon_map["plaintext"])
            if tabify
            else text.replace("```plaintext", "").replace("```", "").strip()
        )

    @property
    def plaintext_content(self) -> str:
        """
        Returns the plaintext content of the Plain License version of the license.
        This property provides an unformatted version. For the version on the website, use the `plaintext` property.
        """
        return self._to_plaintext(include_header_block=False, tabify=False)

    @property
    def original_plaintext_content(self) -> str:
        """
        Returns the original license as an unformatted plaintext string.
        For the markdown version used on the website, use `original_license_text`.
        """
        return self._to_plaintext(
            content=self.original_license_text,
            title=self.get_title(original=True),
            include_header_block=False,
            include_boilerplate=False,
            tabify=False,
        )

    def get_title(self, *, original: bool = False) -> str:
        """Returns the title of the license."""
        return self.meta.get("original_name", self.title) if original else self.title

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
        title = f"""{title_indent}=== "{icon}{title}" """
        return f"""{title}\n\n{indent(dedent(text), indentation)}\n"""

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
        ///
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

    def interpretation_block(self, kind: str) -> str:
        """Returns the interpretation block for the license."""
        if not self.has_official:
            return ""
        match kind:
            case "reader":
                return self.blockify(
                    dedent(self.meta.get("interpretation_text", "")),
                    "note",
                    self.meta.get("interpretation_title", ""),
                    4,
                )
            case "markdown":
                return f"### {self.meta.get('interpretation_title')}\n\n" + wrap_text(
                    dedent(self.meta.get("interpretation_text", ""))
                )
            case "plaintext":
                as_plaintext = self.process_markdown_to_plaintext(
                    self.meta.get("interpretation_text", "")
                )
                title = self.meta.get("interpretation_title", "")
                title = re.sub(
                    r"\{\{\s{1,2}plain_name\s\|\strim\s{1,2}\}\}", self.title.upper(), title
                )
                return f"{title.upper()}\n\n{dedent(as_plaintext)}"
        return ""

    def get_header_block(self, kind: Literal["reader", "markdown", "plaintext"]) -> str:
        """Returns the version block for the license."""
        original_version: str = self.meta.get("original_version", "")
        plain_version: str = self.plain_version

        match kind:
            case "reader":
                title = f"\n<h1 class='license-title'>{self.meta['plain_name']}</h1>"
                original_version_html = (
                    f"<span class='original_version'>original version: {original_version}</span><br />"
                    if original_version
                    else ""
                )
                plain_version_html = (
                    f"<span class='plain_version'>plain version: {plain_version}</span>"
                )
                version_info = f"""<div class='version-info'>{original_version_html}{plain_version_html}</div>"""
                return f"""<div class="license-header">{title}{version_info}</div>"""
            case "markdown":
                title = f"\n# {self.meta.get('plain_name')}"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"> {original_text}plain version: {plain_version}\n{title}"
            case _:
                title = f"\n{self.meta.get('plain_name', '').upper()}"
                original_text = (
                    f"original version: {original_version}  |  " if original_version else ""
                )
                return f"{original_text}plain version: {plain_version}\n{title}"

    @cached_property
    def attributes(self) -> dict[str, Any | int | str]:
        """
        Retrieves a dictionary of attributes related to the license.
        This property consolidates various license-related
        information into a single dictionary,
        making it easier to access and manage the relevant data.

        Returns:
            dict[str, Any | int | str]: A dictionary containing attributes such as year,
            markdown and plaintext license texts, plain version, and license type.
        """
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
        return {
            "distribution": "can-share",  # allowances
            "commercial-use": "can-sell",
            "modifications": "can-change",
            "revokable": "can-revoke",
            "relicense": "relicense",
            "disclose-source": "share-source",  # requirements
            "document-changes": "describe-changes",
            "include-copyright": "give-credit",
            "same-license": "share-alike (strict)",
            "same-license--file": "share-alike (relaxed)",
            "same-license--library": "share-alike (relaxed)",
        }

    @cached_property
    def icon_map(self) -> dict[str, str]:
        """Returns the icon map for the license tab icons."""
        return {
            "reader": ":material-book-open-variant:",
            "markdown": ":octicons-markdown-24:",
            "plaintext": ":nounproject-txt:",
            "embed": ":material-language-html5:",
            "changelog": ":material-history:",
            "official": ":material-license:",
        }

    @cached_property
    def not_advice_text(self) -> str:
        """Returns the not advice text for the license."""
        return dedent(f"""\
            We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

            We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]({self.meta.get("github_issues_link")} "Submit an issue on GitHub") or [edit this page]({self.meta.get("github_edit_link")} "edit on GitHub").
            """)

    @cached_property
    def not_official_text(self) -> str:
        """Returns the not official text for the license."""
        if self.has_official:
            return dedent(f"""\
            Plain License is not affiliated with the original {self.meta["original_name"].strip()} authors or {self.meta["original_organization"].strip()}. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

            If you want to use the {self.meta["plain_name"].strip()}, start by reading the official {self.meta["original_name"].strip()} license text. You can find the official {self.meta["original_name"].strip()} [here]({self.meta["original_url"].strip()} "check out the official {self.meta["original_name"].strip()}"). If you have questions about the {self.meta["original_name"].strip()}, you should talk to a lawyer.
            """)
        return ""

    @property
    def disclaimer_block(self) -> str:
        """Returns the disclaimer block for the license."""
        not_advice_title = "legal advice"
        if not self.has_official:
            return self.blockify(
                self.not_advice_text, "tab" if self.has_official else "warning", not_advice_title, 3
            )
        not_advice = self.tabify(self.not_advice_text, not_advice_title, 1)
        not_official_title = f"the official {self.meta.get('original_name')}"
        not_official = self.tabify(self.not_official_text, not_official_title, 1)
        return (
            f"<div class='admonition warning'><p class='admonition-title'>The {self.meta.get('plain_name', '')} isn't...</p>\n\n"
            f"{not_advice}{not_official}</div>"
        )

    @property
    def reader(self) -> str:
        """Returns the reader block for the license."""
        header_block = self.get_header_block("reader")
        if self.has_official:
            text = dedent(f"""
                {header_block}
                {self.reader_license_text}
                {self.interpretation_block("reader")}
                {self.disclaimer_block}
                """)
        else:
            text = dedent(f"""
                {header_block}
                {self.reader_license_text}
                {self.disclaimer_block}
                """)
        return self.tabify(text, "reader", 1, self.icon_map["reader"])

    @property
    def markdown(self) -> str:
        """Returns the markdown block for the license."""
        header_block = self.get_header_block("markdown")
        body = wrap_text(dedent(f"\n{self.markdown_license_text}\n"))
        text = f"""\n\n```markdown title="{self.title} in Github-style markdown"\n\n{header_block}\n\n{body}{wrap_text(self.interpretation_block("markdown"))}\n```\n\n{self.disclaimer_block}\n"""
        return self.tabify(text, "markdown", 1, self.icon_map["markdown"])

    @property
    def plaintext(self) -> str:
        """Returns the plaintext block for the license."""
        return self._to_plaintext()

    @property
    def changelog(self) -> str:
        """Returns the changelog block for the license."""
        return self.tabify(self.changelog_text, "changelog", 1, self.icon_map["changelog"])

    @property
    def official(self) -> str:
        """Returns the official block for the license."""
        if not self.has_official:
            return ""
        text = (
            f"{self.original_license_text}"
            if self.meta.get("link_in_original")
            else f"{self.original_license_text}\n\n{self.meta.get('official_link')}"
        )
        return self.tabify(text, "official", 1, self.icon_map["official"])

    @cached_property
    def embed_link(self) -> str:
        """Returns the embed link for the license."""
        return dedent(f"""
            # Embedding Your License

            ```html title="add this to your site's html"

            <iframe src="{self.embed_url}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;"
            title="{self.title}" loading="lazy" sandbox="allow-scripts"
            onload="if(this.contentDocument.body.scrollHeight > 400)
            this.style.height = this.contentDocument.body.scrollHeight + 'px';"
            referrerpolicy="no-referrer-when-downgrade">
                <p>Your browser does not support iframes. View {self.title} at:
                    <a href="{self.page.url}">
                        plainlicense.org
                    </a>
                </p>
            </iframe>

            ```
        """).strip()

    @cached_property
    def embed_instructions(self) -> str:
        """Returns the embed instructions for the license."""
        return dedent(f"""

            The above code will embed the license in your site. It uses an iframe to display the license as it appears on Plain License. This also sandboxes the license to prevent it from affecting your site.

            1. **Copy the code above** using the copy button
            2. **Paste it** into your HTML where you want the license to appear
            3. **Adjust the size** (optional):

               - The default width is 100% (fills the container)
               - The default height is either the content height or 1024px, whichever is smaller.
               - The next section provides more details on customizing the size.

            ## Customizing Your Embedded License

            ### Changing the Size

            Common size adjustments in the `style` attribute:

            ```html

            <!-- Full width, taller -->
            style="width: 100%; height: 800px;"

            <!-- Fixed width, default height -->
            style="width: 800px; height: 500px;"

            <!-- Full width, minimum height -->
            style="width: 100%; min-height: 500px;"

            ```

            ## Color Scheme Preference

            The embedded license will match your visitors' system preferences for light or dark mode by default.

            ### Forcing a Specific Theme

            To force a specific theme, add `?theme=` to the URL, along with `light` or `dark`:

            - For light theme: `src="{self.embed_url}?theme=light"`
            - For dark theme: `src="{self.embed_url}?theme=dark"`

            ### Syncing the License Theme with Your Site (more advanced)

            You can optionally sync the license's light/dark theme to your site's theme. You will need to send the embedded license page a message to tell it what theme your site is currently using. You can include this code in your script bundle or HTML:

            ```javascript title="sync the light/dark theme with your site"

            const syncTheme = () => {{
            const iframe = document.getElementById("license-embed");
            const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
            iframe.contentWindow.postMessage({{ theme }}, "https://plainlicense.org");
            }};

            ```

            If your site has a toggle switch for changing themes, you can link it to the embedded license. Set up the toggle to send a `themeChange` event and add a listener to dispatch the same message. We can't provide specific code for that because it depends on your setup.

            Once your toggle switch is set up to send a `themeChange` event, you need to add a listener to dispatch the same message as before:

            ```javascript title="toggle license theme with site theme"

            const syncTheme = () => {{
            const iframe = document.getElementById("license-embed");
            const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
            iframe.contentWindow.postMessage({{ theme }}, "https://plainlicense.org");
            }};
            document.addEventListener('themeChange', syncTheme);

            ```

            ## Need Help?

            Bring your questions to our [GitHub Discussions](https://github.com/plainlicense/plainlicense/discussions "visit Plain License's discussions page") for help and support.
            """)

    @property
    def embed(self) -> str:
        """Returns the embed block for the license."""
        return self.tabify(
            f"{self.embed_link}{self.embed_instructions}", "html", 1, self.icon_map["embed"]
        )

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
                f"<span class='detail-title-highlight'>The {self.meta.get('plain_name')}</span>",
                6,
                options={"type": "license"},
            )
        ) + outro
