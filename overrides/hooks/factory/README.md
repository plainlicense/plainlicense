# License Factory Readme

I decided that the License Factory should have its own readme file, as it is a separate component with a lot of parts and features. It grew quickly in size and complexity, oddly enough in an effort to simplify the code and make it easier to use.

Markdown is, to say the least, a very *fluid* format. It lacks standard syntax, and with the sheer number of extensions we use here, it becomes even more fluid. It's a good thing, but it makes reliably parsing and rendering it a challenge. I found granularly deconstructing and reassembling was the most reliable and consistent way to handle it. Otherwise you run into stray formatting issues, or worse, the markdown renderer will just ignore the formatting entirely. This is especially true for the extended markdown we use here, which is not supported by most markdown renderers.

# License Factory

## Building a License

At the basic level, a license consists of parts assembled (here) from multiple sources:

1.  Frontmatter dictionary. This is the data that is passed to the license factory, which is then used to construct the license. *Most of what we need is in here*. The entire "reader_license_text" -- *the* plain license text -- is in here, along with the license title, license URL, and other metadata, and if it's an adapted license, the original license text and similar metadata.
    - The main task is that the reader license text, and *some* of the other metadata keys, is written to take full advantage of not just markdown but *very extended markdown*. We do need to add some data to the reader text (the interpretation statement, which is added to the metadata before we get it here, but lives in `mkdocs.yml`).
    - We need to reconstruct the special markdown into its components so we can also build a github markdown version, and a plain text version (eventually I'd like to add a commonmark and xml version) -- in addition to adding the embedding instructions for the license text in the HTML version, the changelog, and the original license text.
2.  The rendered "boilerplate" metadata. When we get it, this is also already in the frontmatter, but it comes from the `extras` key in the `mkdocs.yml` file, and has to first be rendered in jinja to fill in the license data before it's passed to the license factory. We use the license metadata itself to render the boilerplate before adding it to the license metadata. This is text that is common to all licenses, like our disclaimers.
3.  Other metadata from choosealicense.com, and spdx, which is also added to the frontmatter before we get it.
4.  Data we create or compute from all of that.
5.  Anything in the markdown component of the license page. Most are blank, but some do have license-specific markdown that is added to the license page. Anything here gets prepended to the page. Anything in the frontmatter `outro` key is *appended* to the end of the license page. (that is usually blank to).

The license page itself is structured as follows:

-   header/nav and normal mkdocs elements
-   The license title and "license_description" text.
-   A full page tab element with "reader", "html", "markdown", "plaintext", "changelog", and "original" tabs.
    - The "reader", "markdown", and "plaintext" tabs are the same content, but processed for different formats from the "reader" version. They consist of the license text AND the appended interpretation statement.
    - The "html" tab is boilerplate instructions for embedding the license as an iframe, and license-specific code for embedding the license text in the page.
    - Changelog tab is the changelog for the license, which is also added to the frontmatter before we get it here.
    - The "original" tab is the original license text, which is in the frontmatter, and is only in rendered markdown.
-   Immediately below the tabs, we have an admonition block with two sub-blocks; both are disclaimers. One is the "we aren't lawyers; not legal advice" disclaimer, and the other is the "we have no association with the original license authors or organizations" disclaimer (if it's an adaptation).
-   At the bottom we also add any reference links and footnotes in the license text.
-   Then the standard mkdocs footer.

-   SIDEBAR: The right sidebar contains the license metadata, which is rendered from the frontmatter and the license factory. Below a set of hotlinks to each tab, there are the license tags themselves represented as icons with hover explanations, a standard expandable blurb on how to use the license with an optional appended extra license-specific blurb (extra_how key).

That's the license page. BUT WAIT THERE'S MORE!

-   We also need to generate the "embed" version of the license, which is the reader version formatted as a full HTML page and pushed (virtually, they don't get saved) to the `docs/embeds/` directory as buffers that get built.
-   We also generate standalone versions of the embed, markdown and plaintext versions of the license, pushed to the `assets` directory. Those get saved by version so we can pull them for the CLI tool.
    -   For the CLI tool's readability measures, we need a plaintext version of both our license and the original license with all syntax, links, formatting, etc removed. It's ugly but necessary for the analysis.
"""
