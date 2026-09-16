const entities: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bull: '•',
  copy: '©',
  reg: '®',
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (match: string, entity: string) => {
      if (entity.startsWith('#')) {
        const hex = entity[1]?.toLowerCase() === 'x';
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (
          code <= 0 ||
          code > 0x10ffff ||
          (code >= 0xd800 && code <= 0xdfff)
        ) {
          return '\uFFFD';
        }
        return String.fromCodePoint(code);
      }
      return entities[entity] ?? match;
    },
  );
}

export function stripHtmlArtifacts(value: string): string {
  return value
    .replace(/<!--\[if[^\]]*\]><!-->([\s\S]*?)<!--<!\[endif\]-->/gi, '$1')
    .replace(/<!--\[if[^\]]*\]>([\s\S]*?)<!--<!\[endif\]-->/gi, '$1')
    .replace(/<!--\[if[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi, '$1')
    .replace(/<!--\[if[^\]]*\]>/gi, '')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<!\[endif\]--?>/gi, '')
    .replace(/<!\[if[^\]]*\]>/gi, '')
    .replace(/<!\[endif\]>/gi, '');
}

function normalizePlainText(value: string): string {
  return stripHtmlArtifacts(decodeHtmlEntities(value))
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function projectHtmlToText(value: string): string {
  return value
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(
      /<\/?(?:p|div|section|article|header|footer|h[1-6]|ul|ol|li|tr|table|blockquote|pre)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<(?:br|hr)\b[^>]*\/?>/gi, '\n')
    .replace(/<\/t[dh]\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
}

function preserveCommentText(value: string): string {
  return value
    .replace(/<!--\[if[^\]]*\]><!-->/gi, '')
    .replace(/<!--\[if[^\]]*\]>/gi, '')
    .replace(/<!--<!\[endif\]-->/gi, '')
    .replace(/<!\[endif\]--?>/gi, '')
    .replace(/<!\[if[^\]]*\]>/gi, '')
    .replace(/<!\[endif\]>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '$1')
    .replace(/<!--[\s\S]*$/g, '');
}

/** Best-effort plain-text projection, NOT an HTML sanitizer or browser renderer. */
export function htmlToPlainText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const cleanedText = normalizePlainText(projectHtmlToText(stripHtmlArtifacts(value)));
  if (cleanedText) {
    return cleanedText;
  }
  return normalizePlainText(projectHtmlToText(preserveCommentText(value)));
}
