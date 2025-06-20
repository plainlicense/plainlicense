---
template: main.html
title: Developer Contributions
description: "How developers can contribute to Plain License"
---
# Developer Contributions

We want developers of all skill levels to contribute to Plain License. Whether you're a beginner or an expert, there are many ways you can help us make licenses easier to understand.

- **Submit an Issue**: Suggest a feature improvement, fix a styling or rendering bug, or streamline our [CI][ci] process. You can submit an issue on our [GitHub Issues page][issues]. Be sure to include a clear description of the problem and any suggestions for how to fix it.
- **Submit a Pull Request**: If you're comfortable with Git and GitHub, you can submit a pull request to fix an issue or add a new feature. We welcome contributions of all sizes, from small typo fixes to large feature additions. Any significant changes should start with [an issue][issues] to discuss the proposed changes.
- **Refactor Our Code**: If you're a developer who enjoys refactoring code, we have plenty of opportunities for you to help. Refactoring can help improve the readability, maintainability, and performance of our codebase.

## Getting Started

**We use a special commit message format** to help us keep track of changes. Before you start contributing, please read our [commit message guidelines][commit-guidelines]. If you mess it up, don't worry! We can fix it later. But it's best to get it right the first time.

**Development Environment**. The repo includes a development container for VSCode. This is a Docker container that includes all the tools you need to develop and test the site. To use it, install the [Dev Containers][devcontainer] extension for VSCode. Then, open the repo in VSCode and click on the green button in the bottom right corner of the window, or go to "Remote Explorer" in the left panel. Select "Reopen in Container" from the menu. This will build the container and open a new window with the container running. It may take a few minutes to build the first time.

**Other Environments**. If you don't want to use the dev container, you can run the `bin/setup-repo.sh` script to set up the repo and install the tools you need, which are primarily `bun`, and `uv`, but also include some git hooks and other helpers to make life easier.

## A Tour of Our Codebase

-   **Framework**: We use [Material for][mkmaterial] [MKDocs][mkdocs] to generate our site. For most pages, we write content in Markdown in the [`docs`][docs] folder. The ['mkdocs.yml'][mkdocs-yml] file in the root directory contains the configuration for the site (more on the configuration [below][config]). MKDocs is powered by [Jinja2][jinja] templates, which we use to generate the site's pages. We use some custom templates in the `overrides` folder to customize the site's appearance. If you see something like this in a markdown page: {% raw %}`{{ variable.path }}`{% endraw %}, it's a Jinja2 template variable that gets replaced with the value of `variable.path` when the page is rendered.
-   **Licenses**: Licenses are in .md files by category and license name in the [`licenses`][licenses] folder. Each license file contains the license text and metadata in YAML front matter. We use an MKDocs hook, in [`overrides/hooks/license_factory.py`][licensehook], to generate the license pages from the template and metadata. Most licenses don't have actual markdown content, but if they do, it will render at the top of the page before the standard license layout.
-   **Other Hooks**: We use other hooks for smaller tasks, like updating the changelogs or inserting variables for the jinja environment. All hooks are in the `overrides/hooks` directory and must be Python files.
-   **CI/CD**: We use GitHub Actions for our CI/CD process. The configuration files are in the `.github/workflows`[workflows] directory. Supporting CI/CD scripts are in the [`.github/scripts`][ciscripts] directory. If a script can be reused outside of the CI/CD process, it should be in the `bin` directory.
-   **Overrides**: We use the [`overrides`][overrides] folder to store any files that override the default behavior of MKDocs.  MKDocs looks for files that match the names of its defaults in this folder and automatically uses the overrides in the build process. The `overrides` folder includes:

    - [`overrides`][overrides]: custom page templates. Primary templates are in the main `overrides` folder, while 'partials' are in the [`overrides/partials`][partials] folder. Jinja2 allows for 'template inheritance,' so you can create a base template and extend it in other templates. In practice, jinja2 creates each page from a collection of smaller templates (`partials`), following the blueprint from these 'parent' page templates. Our landing page and license pages use this feature. Importantly, all templates extend `main.html`, which extends `base.html`. Only the parts of the page that change need to be in other templates. `base.html` is not in this folder because it is a default template from the Material for MKDocs theme. It is stored in a submodule in [`external/mkdocs-material/material/templates`][base_template].
    - [`hooks`][hooks]: custom hooks for MKDocs. These are Python files that run at specific points in the build process. We use hooks to assemble license pages, update the changelog, and more.
    - `.icons`: custom icons for the site. We use SVG icons for consistency and scalability.
    - [`partials`][partials]: partial templates for the site. These are smaller templates that can be included in other templates. We use partials for consistent headers, footers, and other elements across the site, or to change the appearance of specific elements on specific pages.

-   **Front-end Scripts**: We use a few front-end scripts to improve the site's appearance and functionality, particularly on the hero landing page and license pages. In the build process, these get compiled and appended to the stock Material for MkDocs javascript (Material for MKDocs's source is included as a submodule in [`external/mkdocs-material/src`][mkdocs-submodule]). **The versions you should edit are in the [`src/assets/javascripts`][typescriptsrc] folder**. These are typescript files that compile to javascript. They compile to the `docs/assets/javascripts` folder. They are pretty simple and well-documented.
-   **Styles**: We significantly customize the default Material for MKDocs theme. Like scripts, the **versions of css files to edit are in the [`src/assets/stylesheets`][stylesheets]** folder. It's probably obvious, each CSS module is clearly named for its purpose (for example `colors.css` has all color styling, `license.css` has all license page styling, `extra.css` has all sitewide general styling changes.). These are all imported into a *generated* `bundle.css`. If you ever need to edit the `bundle.css` you should edit the *template*, which is `src/assets/stylesheets/_bundle_template.css` -- it's like this because that file imports the already bundled Material for MkDocs CSS, which has a hash value that changes, so we retrieve and insert the hash during the build process. At some point, we'd like to refactor to use SASS/SCSS.
-   **Helper Scripts**: Any development helper scripts are in the [`bin`][helperscripts] folder. These are usually python scripts that help with the development process; if you want to make all of our jobs easier, drop a script in here.
-   **Build**: The actual site build and publication process is handled by MkDocs/Jinja2. The front end javascript and styling build process is handled by Esbuild, orchestrated by build scripts in `src/build`. This is loosely based on Material for MkDocs' own internal build process. While the build files are typescript, you don't need to compile them. You can run the build process with `bun run build`. [Bun][bun_home] can dynamically compile and run the typescript.

### The MKDocs Configuration

The [`mkdocs.yml`][mkdocs-yml] file in the root directory is the configuration file for the site. It tells MKDocs how to build the site, what pages to include, and how to format the pages. The configuration file is in [YAML][yamlspec]. We heavily use the `extra` field to pass variables to the Jinja2 templates. This keeps the templates flexible, and allows us to change the site's appearance without changing the templates themselves. It also lets us update only one file when we need to change something site-wide.

[base_template]: <{{ config.repo_url | trim }}/external/mkdocs-material/material/templates/base.html> "Material Theme Base Template"
[bun_home]: <https://bun.sh/> "Bun Home"
[ci]: <https://en.wikipedia.org/wiki/Continual_improvement_process> "Continual Improvement Process"
[ciscripts]: <{{ config.repo_url | trim }}/.github/scripts> "CI/CD Scripts"
[commit-guidelines]: <commit.md> "Commit Message Guidelines"
[config]: <#the-mkdocs-configuration> "MKDocs Configuration"
[devcontainer]: <https://marketplace.visualstudio.com/items/?itemName=ms-vscode-remote.remote-containers> "VSCode Dev Containers"
[docs]: <{{ config.repo_url | trim }}/docs> "Our Docs Folder"
[helperscripts]: <{{ config.repo_url | trim }}/bin> "Helper Scripts Folder"
[hooks]: <{{ config.repo_url | trim }}/overrides/hooks> "Hooks Folder"
[issues]: <{{ config.repo_url | trim }}/issues> "Submit an Issue"
[jinja]: <https://jinja.palletsprojects.com> "Jinja2 documentation"
[licensehook]: <{{ config.repo_url | trim }}/overrides/hooks/license_factory.py> "License Assembly Hook"
[licenses-contributions]: <crafting.md> "Recrafting Licenses"
[licenses]: <{{ config.repo_url | trim }}/docs/licenses> "Licenses Folder"
[mkdocs-submodule]: {{ config.repo_url | trim }}/external/mkdocs-material/src "Material for MkDocs Source"
[mkdocs-yml]: <{{ config.repo_url | trim }}/mkdocs.yml> "our mkdocs.yml configuration file"
[mkdocs]: <https://www.mkdocs.org/> "MkDocs"
[mkmaterial]: <https://squidfunk.github.io/mkdocs-material/> "Material for MkDocs"
[overrides]: <{{ config.repo_url | trim }}/overrides> "Overrides Folder"
[partials]: <{{ config.repo_url | trim }}/overrides/partials> "Partials Folder"
[stylesheets]: <{{ config.repo_url | trim }}/src/assets/stylesheets> "Stylesheets Folder"
[typescriptsrc]: <{{ config.repo_url | trim }}/src/assets/javascripts> "Typescript Source Folder"
[workflows]: <{{ config.repo_url | trim }}/.github/workflows> "GitHub Actions Workflows"
[yamlspec]: <https://yaml.org/> "YAML Specification"
