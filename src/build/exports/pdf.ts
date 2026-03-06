import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import type { ExportContext } from './index.ts';

/**
 * Generates PDF exports using Typst.
 * Uses custom Typst templates for legal document formatting.
 */
export async function generatePDF(ctx: ExportContext) {
  const { licenseId, version, content, metadata, outputDir } = ctx;
  const fileName = `${licenseId}.pdf`;
  const filePath = path.join(outputDir, fileName);
  const typPath = path.join(outputDir, `${licenseId}.typ`);

  const typstDoc = generateTypst(content, metadata, version);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(typPath, typstDoc);

  // LOG FOR DEBUG/TESTING (We can check this in integration tests)
  if (process.env.DEBUG_TYPST) {
    console.log(`Typst source for ${licenseId} contains interactive: ${typstDoc.includes('interactive')}`);
  }

  // Compile with Typst
  return new Promise<void>((resolve, reject) => {
    const child = spawn('typst', ['compile', typPath, filePath]);
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Typst error output for ${licenseId}: ${stderr}`);
      }
      // Clean up .typ file
      await fs.unlink(typPath);
      if (code === 0) {
        console.log(`Generated PDF export: ${filePath}`);
        resolve();
      } else {
        reject(new Error(`Typst failed with code ${code} for ${licenseId}`));
      }
    });
  });
}

function generateTypst(markdown: string, metadata: any, version: string): string {
  const tokens = marked.lexer(markdown);
  let body = '';

  function processTokens(tokens: any[]): string {
    let result = '';
    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
          result += '='.repeat(token.depth) + ' ' + processTokens(token.tokens) + '\n\n';
          break;
        case 'paragraph':
          result += processTokens(token.tokens) + '\n\n';
          break;
        case 'text':
          result += token.tokens ? processTokens(token.tokens) : token.text;
          break;
        case 'strong':
          result += '*' + processTokens(token.tokens) + '*';
          break;
        case 'em':
          result += '_' + processTokens(token.tokens) + '_';
          break;
        case 'list':
          result += token.items.map((item: any) => {
            const bullet = token.ordered ? '+ ' : '- ';
            return bullet + processTokens(item.tokens).trim().replace(/\n/g, '\n  ');
          }).join('\n') + '\n\n';
          break;
        case 'link':
          if (token.href.startsWith('http')) {
            result += `#link("${token.href}")[${processTokens(token.tokens)}]`;
          } else {
            result += processTokens(token.tokens);
          }
          break;
        case 'codespan':
          result += '`' + token.text + '`';
          break;
        case 'code':
          result += '```' + (token.lang || '') + '\n' + token.text + '\n```\n\n';
          break;
        case 'blockquote':
          result += '#quote(block: true)[' + processTokens(token.tokens) + ']\n\n';
          break;
        case 'hr':
          result += '#line(length: 100%, stroke: 0.5pt + gray)\n\n';
          break;
        case 'br':
          result += ' \\ ';
          break;
        case 'space':
          break;
        case 'html':
          // Ignore HTML divs used for mapping
          break;
        default:
          result += token.text || '';
      }
    }
    return result;
  }

  body = processTokens(tokens);

  return `
#set page(
  margin: (x: 1in, y: 1in),
  footer: context [
    #set text(size: 8pt, fill: gray)
    #grid(
      columns: (1fr, 1fr),
      [${metadata.title} - v${version}],
      [#align(right)[Page #counter(page).display()]]
    )
  ]
)
#set text(font: "Libertinus Serif", size: 11pt)
#set par(justify: true, leading: 0.65em)
#show heading: set block(above: 1.5em, below: 1em)

#align(center)[
  #text(size: 24pt, weight: "bold")[${metadata.title}] \
  #text(size: 12pt, fill: gray)[Plain Language Version ${version}]
]

#v(1em)

${body}

#v(2em)
#line(length: 100%, stroke: 0.5pt + gray)
#set text(size: 9pt, fill: gray)
*Disclaimer:* This is a plain language summary and version of the original license. It is intended for accessibility and understanding. 

*Canonical URL:* https://plainlicense.org/licenses/${metadata.slug}
  `;
}

