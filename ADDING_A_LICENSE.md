# Adding a New License to the Repository - For Maintainers

<!-- TODO: Add a lint to the CI to check this all this actually gets done correctly. -->

I strived to avoid hardcoding any license text in the codebase. For the most part, if the license file is properly formatted, it should be automatically detected. There are a few exceptions. This readme is for the exceptions.

## Adding a License

1.  **The License**. License files consist of YAML frontmatter within a (usually empty) markdown file. The template is [LICENSE_TEMPLATE.md](./LICENSE_TEMPLATE.md). Instructions for this part are in the file itself and the [crafting guide](/helping/craft).

2.  **The License File Location**. The license file should be placed at `content/licenses/{category}/{spdx-id}.md`, where:

    - `{category}` is the category of the license (one of: `permissive`, `copyleft`, `source-available`, `public-domain`, `proprietary`).
    - `{spdx-id}` is the SPDX identifier for the license in lower case (e.g., `mit`, `gpl-3.0`). All spdx-ids are in the [license-list-data submodule](./external/license-list-data/json/licenses.json) or at [spdx.org](https://spdx.org/licenses/).
    - If a license is a Plain License original, the spdx-id should be prefixed with and follow the SPDX convention for naming (e.g., `plain-public-domain`). Don't include a version number in version IDs for Plain License originals -- we're constantly iterating.

3.  **The License File Name**. The license file should be named `{spdx-id}.md` (e.g., `content/licenses/permissive/mit.md`). The canonical URL will be `/licenses/{category}/{spdx-id}` (e.g., `/licenses/permissive/mit`).

4.  **URL Routing is Automatic**. No manual routing configuration is needed. When the site is built, short-slug redirects are automatically generated from the `content/licenses/` directory structure:
    - `/licenses/{spdx-id}` → `/licenses/{category}/{spdx-id}` (e.g., `/licenses/mit` → `/licenses/permissive/mit`)
    - `/{spdx-id}` → `/licenses/{category}/{spdx-id}` (e.g., `/mit` → `/licenses/permissive/mit`)

    This happens in `astro.config.mts` via `getLicenseRedirects()`, which reads all `.md` files from `content/licenses/` at build time.

5.  **Updating the Category Index**. If you're adding a new license, you should also update the relevant category index page in `src/pages/licenses/` (if one exists) to include a link to your new license and a brief description.

6.  **Add a Package to the Workspace**. After adding the license, you should add a package to the workspace. Steps:

    1. Create a new directory in `./packages/` that is the same name as you used for the license file's directory (based on the spdx-id).
    2. Copy the `.license_package_template.json` file from the `./packages/` directory to the new directory you created. (copy it, don't move it). Like so: `cp ./packages/.license_package_template.json ./packages/{spdx-id}/package.json`.
    3. The new name should be `package.json` (not `.license_package_template.json`).
    4. Update the `package.json` file. Literally just find and replace the `{{ SPDX_ID }}` placeholders with the actual SPDX ID for the license you added (or the plain license original approximation), or run: `sed -i 's/{{ SPDX_ID }}/{spdx-id}/g' ./packages/{spdx-id}/package.json` (replace `{spdx-id}` with the actual spdx-id without the curly brackets). So for the MIT license, it would be `sed -i 's/{{ SPDX_ID }}/mit/g' ./packages/mit/package.json`.
    5. Add your new package as a workspace dependency in the root `package.json` file. This is done by adding the following line to the `dependencies` array:

    ```json
    "dependencies": {
        // other dependencies
        // Add your new package here, replace {spdx-id} with the actual spdx-id
        "plain-license-{spdx-id}": "workspace:plain-license-{spdx-id}"
    }
    ```

7.  **Commit and Push**. After making all the changes, commit your changes in the [commit format](./docs/helping/commit.md) and push them to the repository. For the Apache 2.0 license, the commit message would look like this:

    ```git
    new(apache-2.0): add Plain Apache 2.0 license
    ```

    This indicates you are adding a new license (Apache 2.0) to the repository. The `new` type indicates a new license, and the `apache-2.0` scope indicates the specific license being added. This allows our automated release system to version each license separately (the part where you added the workspace package in step 6).

8.  **Create a Pull Request**. After pushing your changes, create a pull request to merge your changes into the main branch of the repository. Use the [`new-license`](.github/PULL_REQUEST_TEMPLATE/2-new-license.md) PR template.
