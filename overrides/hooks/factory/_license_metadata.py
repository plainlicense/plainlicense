"""
License metadata and state management.

This module handles license metadata, version retrieval, tag processing,
and other state management operations.
"""

# Import JSON utilities
import json
import logging

from pathlib import Path
from textwrap import dedent
from typing import Any, Literal

from mkdocs.structure.pages import Page

from overrides.hooks._utils import Status, find_repo_root


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON."""
    return json.loads(path.read_text())

def write_json(path: Path, data: dict[str, Any]) -> None:
    """Writes a JSON."""
    if path.exists():
        path.unlink()
    path.write_text(json.dumps(data, indent=2))

# Get logger
assembly_logger = logging.getLogger("ASSEMBLER")


class LicenseMetadata:
    """Handles license metadata and state management."""

    def __init__(self, page: Page):
        """
        Initialize license metadata.

        Args:
            page: The MkDocs page object containing metadata.
        """
        self.page = page
        self.meta = page.meta
        self._plain_version = None

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

    def get_plain_version(self) -> str:
        """
        Checks the version information in the license's corresponding package.json file and returns the version string.

        Returns:
            str: The version string from the package, or "0.0.0" if the file is missing or the version is not valid.
        """
        if self._plain_version is not None:
            return self._plain_version

        spdx_id = self.meta["spdx_id"].lower()
        package_path = find_repo_root() / "packages" / spdx_id / "package.json"
        assembly_logger.debug("Checking package path: %s", package_path)
        assembly_logger.debug("package_path.exists(): %s", package_path.exists())

        if not package_path.exists():
            self._plain_version = "0.0.0"
            return self._plain_version

        package = load_json(package_path)
        version = package.get("version")
        if not version:
            self._plain_version = "0.0.0"
            return self._plain_version

        if "development" in version and Status.production:
            package["version"] = "0.1.0"
            write_json(package_path, package)
            self._plain_version = "0.1.0"
            return self._plain_version

        self._plain_version = version
        return self._plain_version

    def get_tags(self) -> list[str] | None:
        """
        Retrieves a list of tags from the provided frontmatter data dictionary.

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
            return [self.get_tag_map()[tag] for tag in frontmatter_tags if tag in self.get_tag_map()]
        return None

    def get_title(self, *, original: bool = False) -> str:
        """Returns the title of the license."""
        plain_name = self.meta.get("plain_name", "")
        title = f"The {plain_name}"
        return self.meta.get("original_name", title) if original else title

    def has_official_license(self) -> bool:
        """Returns whether this license has an official version."""
        return bool(self.meta.get("original_license_text", "").strip())

    def get_embed_url(self) -> str:
        """Returns the embed URL for this license."""
        return f"https://plainlicense.org/embed/{self.meta['spdx_id'].lower()}.html"

    def get_not_advice_text(self) -> str:
        """Returns the not advice text for the license."""
        return dedent(f"""\
            We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

            We are normal people making licenses accessible for everyone. We hope our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]({self.meta.get("github_issues_link")} "Submit an issue on GitHub") or [edit this page]({self.meta.get("github_edit_link")} "edit on GitHub").
            """)

    def get_not_official_text(self) -> str:
        """Returns the not official text for the license."""
        if not self.has_official_license():
            return ""

        return dedent(f"""\
        Plain License is not affiliated with the original {self.meta["original_name"].strip()} authors or {self.meta["original_organization"].strip()}. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the {self.meta["plain_name"].strip()}, start by reading the official {self.meta["original_name"].strip()} license text. You can find the official {self.meta["original_name"].strip()} [here]({self.meta["original_url"].strip()} "check out the official {self.meta["original_name"].strip()}"). If you have questions about the {self.meta["original_name"].strip()}, you should talk to a lawyer.
        """)

    def get_embed_link(self) -> str:
        """Returns the embed link for the license."""
        embed_url = self.get_embed_url()
        title = self.get_title()
        page_url = self.page.url

        return dedent(f"""
            # Embedding Your License

            ```html

            <iframe src="{embed_url}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;"
            title="{title}" loading="lazy" sandbox="allow-scripts"
            onload="if(this.contentDocument.body.scrollHeight > 400)
            this.style.height = this.contentDocument.body.scrollHeight + 'px';"
            referrerpolicy="no-referrer-when-downgrade">
                <p>Your browser does not support iframes. View {title} at:
                    <a href="{page_url}">
                        plainlicense.org
                    </a>
                </p>
            </iframe>

            ```
        """).strip()

    def get_embed_instructions(self) -> str:
        """Returns the embed instructions for the license."""
        embed_url = self.get_embed_url()

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

            - For light theme: `src="{embed_url}?theme=light"`
            - For dark theme: `src="{embed_url}?theme=dark"`

            ### Syncing the License Theme with Your Site (more advanced)

            You can optionally sync the license's light/dark theme to your site's theme. You will need to send the embedded license page a message to tell it what theme your site is currently using. You can include this code in your script bundle or HTML:

            ```javascript

            const syncTheme = () => {{
            const iframe = document.getElementById("license-embed");
            const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
            iframe.contentWindow.postMessage({{ theme }}, "https://plainlicense.org");
            }};

            ```

            If your site has a toggle switch for changing themes, you can link it to the embedded license. Set up the toggle to send a `themeChange` event and add a listener to dispatch the same message. We can't provide specific code for that because it depends on your setup.

            Once your toggle switch is set up to send a `themeChange` event, you need to add a listener to dispatch the same message as before:

            ```javascript

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
