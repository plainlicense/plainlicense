# New License Pull Request Template

**Only use this template** for **new** licenses**. For other license changes, use the [license-change-template](./1-license-change.md)**.

Thank you for contributing a new license to the Plain License project! Before you hit *submit* on your pull request, please check the following steps to ensure your contribution is complete and follows our guidelines:

You:

-   [ ] Read and tried to follow our [writing guidelines](https://plainlicense.org/helping/write.md) and [brand voice](https://plainlicense.org/helping/voice.md). [^1]
-   [ ] Followed the [adding a license instructions](../../ADDING_A_LICENSE.md). Including:

    - [ ] Created a license file in the correct location (`docs/licenses/{category}/{spdx-id}/index.md`).
    - [ ] Used the correct [SPDX identifier](https://spdx.org/licenses/) for the license in lower case.
    - [ ] Used the template from [`LICENSE_TEMPLATE.md`](../../LICENSE_TEMPLATE.md).
    - [ ] Named the license file `index.md`.
    - [ ] Linked the license file in the root [`mkdocs.yml`](../../mkdocs.yml).
    - [ ] Updated the category index file to include your new license.
    - [ ] Added a package to the workspace with the correct `package.json` using the template from [`.license_package_template.json`](../../packages/.license_package_template.json).
    - [ ] Added your new package to the root [`package.json`](../../package.json) as a workspace dependency.
    - [ ] Added your license to the `LicenseType` enum in `bin/readability.py`.

-   [ ] Were really awesome. :sunglasses:

[^1]: We know writing plainly is hard. Do your best, and we'll help you improve it if needed. Don't worry about perfection; focus on clarity and accessibility.
