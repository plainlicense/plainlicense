TODO:

- Revamp license construction process
- Finish rewrite of MPL
- Make sure we're set up with the new tags plugin
- Look at by-page or by-section social images
- Review CI pipeline to make sure we're not releasing after errors and without full checks
- Check embed and version output assets

====

The Process

- Identify all Annotations and Footnotes in the document.
- Pull out the full citation text for each Annotation and Footnote as Footnote objects.
- Each Paragraph has references and the Citation objects are created for each reference.

When extracting paragraphs, make sure they are not:

- Empty
- Codeblocks
- Headings
- Lists (note: annotation citations are basically lists, so we need to deconflict this)
- Tables
- Definitions
- Annotations/Footnotes
- Link references
- abbreviations (*[]: syntax)
