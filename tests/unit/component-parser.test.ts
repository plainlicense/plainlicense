import { describe, it, expect } from 'vitest';
import { parseComponentPlaceholders, markComponentPlaceholders } from '../../src/utils/component-parser.ts';

describe('Component Parser', () => {
  describe('parseComponentPlaceholders', () => {
    it('parses simple attributes with double quotes', () => {
      const content = '{{component:faq id="my-faq" title="Hello World"}}';
      const result = parseComponentPlaceholders(content);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('faq');
      expect(result[0].id).toBe('my-faq');
      expect(result[0].props.title).toBe('Hello World');
    });

    it('parses attributes with single quotes', () => {
      const content = "{{component:faq id='my-faq' title='Hello World'}}";
      const result = parseComponentPlaceholders(content);
      
      expect(result).toHaveLength(1);
      expect(result[0].props.id).toBe('my-faq');
      expect(result[0].props.title).toBe('Hello World');
    });

    it('parses complex JSON strings as props', () => {
      const items = JSON.stringify([
        { q: "What is it?", a: "It's a test." },
        { q: "Does it work?", a: "Yes, it \"works\"." }
      ]);
      const content = `{{component:faq items='${items.replace(/'/g, "\\'")}'}}`;
      const result = parseComponentPlaceholders(content);
      
      expect(result).toHaveLength(1);
      const parsedItems = JSON.parse(result[0].props.items);
      expect(parsedItems).toHaveLength(2);
      expect(parsedItems[1].a).toBe('Yes, it "works".');
    });

    it('handles multiple components in one string', () => {
      const content = '{{component:faq id="1"}}{{component:table id="2"}}';
      const result = parseComponentPlaceholders(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('faq');
      expect(result[1].type).toBe('table');
    });
  });

  describe('markComponentPlaceholders', () => {
    it('converts placeholders to data-prop attributes', () => {
      const content = '{{component:faq id="test" val="foo"}}';
      const result = markComponentPlaceholders(content);
      
      expect(result).toContain('data-pl-component="faq"');
      expect(result).toContain('data-prop-id="test"');
      expect(result).toContain('data-prop-val="foo"');
    });

    it('escapes double quotes in attribute values', () => {
      const content = "{{component:faq title='A \\\"quoted\\\" title'}}";
      const result = markComponentPlaceholders(content);
      
      expect(result).toContain('data-prop-title="A &quot;quoted&quot; title"');
    });
  });
});
