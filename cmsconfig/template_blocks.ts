import { defineCollection } from "./utils";

export const templateBlocksCollection = defineCollection({
  name: "template-blocks",
  label: "Template Blocks",
  folder: "content/template-blocks",
  create: true,
  format: "yaml-frontmatter",
  extension: "md",
  identifier_field: "block_id",
  sortable_fields: ["category", "version", "block_id"],
  view_groups: [
    {
      field: "category",
      label: "Category",
    },
  ],
  slug: "{{fields.block_id}}",
  fields: [
    {
      label: "Title",
      name: "title",
      widget: "string",
      required: true,
      hint: "The title at the top of the block element when expanded (if applicable)",
    },
    {
      label: "Block ID",
      name: "block_id",
      widget: "string",
      required: true,
      hint: "The css id attribute for the block",
    },
    {
      label: "Block Title",
      name: "block_title",
      widget: "string",
      required: true,
      hint: "The title shown in the block header when the block is collapsed (if applicable)",
    },
    {
      label: "Category",
      name: "category",
      widget: "select",
      options: ["warranty", "permission", "condition", "disclaimer", "notice"],
    },
    {
      label: "Applicable license families",
      name: "families",
      widget: "select",
      multiple: true,
      required: false,
      options: [
        "public-domain",
        "permissive",
        "copyleft",
        "source-available",
        "proprietary",
      ],
    },
    {
      label: "Description",
      name: "description",
      widget: "text",
      required: false,
    },
    {
      label: "Version",
      name: "version",
      widget: "string",
      pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
      required: true,
    },
    {
      label: "UUID",
      name: "uuid",
      widget: "uuid",
      hide: true,
      readonly: true,
    },
    { label: "Body", name: "body", widget: "richtext" },
  ],
});
