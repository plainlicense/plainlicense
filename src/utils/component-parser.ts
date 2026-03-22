/**
 * Utility to parse custom component placeholders in markdown.
 * Syntax: {{component:type id="identifier" props="..."}}
 */

export interface ComponentPlaceholder {
  raw: string;
  type: string;
  id?: string;
  props: Record<string, string>;
}

export function parseComponentPlaceholders(
  content: string,
): ComponentPlaceholder[] {
  const regex = /{{component:([a-z-]+)(.*?)}}/g;
  const placeholders: ComponentPlaceholder[] = [];
  let match: RegExpExecArray | null = regex.exec(content);

  while (match !== null) {
    const [raw, type, propsString] = match;
    const props = parseAttributes(propsString);

    placeholders.push({
      raw,
      type,
      id: props.id,
      props,
    });
    match = regex.exec(content);
  }

  return placeholders;
}

/**
 * Robustly parses attributes from a string, supporting single, double,
 * and escaped quotes.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const props: Record<string, string> = {};
  let i = 0;

  while (i < attrString.length) {
    // 1. Skip whitespace
    while (i < attrString.length && /\s/.test(attrString[i])) i++;
    if (i >= attrString.length) break;

    // 2. Parse key
    const keyStart = i;
    while (i < attrString.length && /[a-z0-9_-]/i.test(attrString[i])) i++;
    const key = attrString.substring(keyStart, i);

    if (!key) {
      i++; // Progress if stuck
      continue;
    }

    // 3. Skip whitespace to =
    while (i < attrString.length && /\s/.test(attrString[i])) i++;
    if (i >= attrString.length || attrString[i] !== "=") {
      continue;
    }
    i++; // Skip =

    // 4. Skip whitespace to value
    while (i < attrString.length && /\s/.test(attrString[i])) i++;
    if (i >= attrString.length) break;

    const quote = attrString[i];
    if (quote !== '"' && quote !== "'") {
      // Support unquoted values until next space
      const valStart = i;
      while (i < attrString.length && !/\s/.test(attrString[i])) i++;
      props[key] = attrString.substring(valStart, i);
      continue;
    }
    i++; // Skip opening quote

    let value = "";
    while (i < attrString.length) {
      if (attrString[i] === "\\") {
        // Lookahead to see if we're escaping the current quote type
        if (i + 1 < attrString.length && attrString[i + 1] === quote) {
          value += quote;
          i += 2;
        } else {
          // Keep backslash for other characters (like JSON escapes)
          value += "\\";
          i++;
        }
      } else if (attrString[i] === quote) {
        i++; // Skip closing quote
        break;
      } else {
        value += attrString[i];
        i++;
      }
    }

    props[key] = value;
  }

  return props;
}

/**
 * Replaces placeholders with a unique marker for later injection during rendering.
 * Now uses the robust parser to ensure attributes are correctly transferred.
 */
export function markComponentPlaceholders(content: string): string {
  return content.replace(
    /{{component:([a-z-]+)(.*?)}}/g,
    (_match, type, propsString) => {
      const props = parseAttributes(propsString);
      const attrHtml = Object.entries(props)
        .map(([k, v]) => {
          const cleanValue = v.replace(/\\(.)/g, "$1").replace(/"/g, "&quot;");
          return `data-prop-${k}="${cleanValue}"`;
        })
        .join(" ");

      return `<div data-pl-component="${type}" ${attrHtml}></div>`;
    },
  );
}
