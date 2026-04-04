import CMS from "@sveltia/cms";

/**
 * Register custom editor components for the CMS richtext/markdown editor.
 */
export function registerEditorComponents() {
  registerFootnoteComponent();
}

/**
 * Footnote editor component.
 *
 * Inserts a footnote definition block: `[^id]: note text`
 * Authors type `[^id]` inline in their text where the reference should appear,
 * then use this component to create the matching definition.
 *
 * The site's build pipeline (src/utils/footnotes.ts) transforms these into
 * interactive tooltip markup at render time.
 */
function registerFootnoteComponent() {
  CMS.registerEditorComponent({
    id: "footnote",
    label: "Footnote",
    icon: "superscript",
    collapsed: false,
    fields: [
      {
        name: "id",
        label: "Footnote ID",
        widget: "string",
        hint: 'A short identifier (e.g. "1", "fair-use"). Use [^id] in your text to reference it.',
      },
      {
        name: "note",
        label: "Note text",
        widget: "text",
        hint: "The footnote content. Markdown links and emphasis are supported.",
      },
    ],
    pattern: /^\[\^(?<id>[^\]]+)\]:\s+(?<note>.+)$/m,
    toBlock: (data: Record<string, string>) =>
      `[^${data.id}]: ${data.note}`,
    toPreview: (data: Record<string, string>) =>
      `<sup style="color: rgb(21, 219, 149); font-weight: 700;">*</sup> <small style="color: #8b90a0;">[^${data.id}]: ${data.note}</small>`,
  });
}
