import type { CollectionFile, Field, FileCollection } from "@sveltia/cms";

/**
 * Shared fields for all site pages edited through the CMS.
 */
const commonPageFields: Field[] = [
  { label: "Title", name: "title", widget: "string", required: true },
  {
    label: "Description",
    name: "description",
    widget: "text",
    required: true,
  },
  {
    label: "Last Updated",
    name: "last_updated",
    widget: "hidden",
    required: false,
    value_type: "date",
    default: "{{datetime | date('YYYY-MM-DDTHH:mm:ssZ') }}",
  },
  {
    label: "Status",
    name: "status",
    widget: "select",
    options: ["draft", "published"],
    default: "draft",
    required: false,
  },
  {
    label: "Body",
    name: "body",
    widget: "richtext",
    editor_components: ["code-block", "image", "footnote"],
  },
];

function page(
  name: string,
  label: string,
  file: string,
  extraFields?: Field[],
): CollectionFile {
  return {
    name,
    label,
    file,
    format: "yaml-frontmatter",
    fields: extraFields
      ? [...commonPageFields, ...extraFields]
      : commonPageFields,
  };
}

export const pagesCollection: FileCollection = {
  name: "pages",
  label: "Site Pages",
  icon: "article",
  files: [
    page("about", "About / Mission", "src/pages/about/index.mdx"),
    page("faq", "FAQ", "src/pages/faq/index.mdx"),
    page("shame", "Hall of Shame", "src/pages/shame.mdx", [
      {
        label: "Draft",
        name: "draft",
        widget: "boolean",
        default: true,
        required: false,
      },
    ]),
    page(
      "helping-index",
      "Contributing Overview",
      "src/pages/helping/index.mdx",
    ),
    page(
      "helping-code",
      "Developer Contributions",
      "src/pages/helping/code.mdx",
    ),
    page("helping-commit", "Commit Guidelines", "src/pages/helping/commit.mdx"),
    page("helping-craft", "License Crafting", "src/pages/helping/craft.mdx"),
    page("helping-donate", "Donate", "src/pages/helping/donate.mdx", [
      {
        label: "Funding Progress ($)",
        name: "funding_progress",
        widget: "number",
        value_type: "int",
        default: 0,
        required: false,
      },
      {
        label: "Funding Goal ($)",
        name: "funding_goal",
        widget: "number",
        value_type: "int",
        default: 5000,
        required: false,
      },
    ]),
    page("helping-legal", "Legal Contributions", "src/pages/helping/legal.mdx"),
    page(
      "helping-translate",
      "Translation Guide",
      "src/pages/helping/translate.mdx",
    ),
    page(
      "helping-voice",
      "Brand Voice Guidelines",
      "src/pages/helping/voice.mdx",
    ),
    page("helping-write", "Writing Guidelines", "src/pages/helping/write.mdx"),
  ],
};
