import { decodeBase64Url } from './base64Url';
import { asRecord } from './guards';
import { htmlToPlainText, stripHtmlArtifacts } from './html';
import {
  isAttachmentPart,
  MAX_MIME_DEPTH,
  MAX_MIME_PARTS,
  mimeType,
} from './mime';

export interface ParsedGmailBody {
  plainText: string | null;
  /** Decoded, untrusted HTML. Never pass this directly to a WebView. */
  html: string | null;
  /** Complete available display text; never a Gmail snippet. */
  text: string;
}

function emptyBody(): ParsedGmailBody {
  return { plainText: null, html: null, text: '' };
}

function parsePlainText(decoded: string): ParsedGmailBody {
  const cleanedPlainText = stripHtmlArtifacts(decoded);
  const text = cleanedPlainText.trim() ? cleanedPlainText : decoded;
  return { plainText: text, html: null, text };
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function hasText(body: ParsedGmailBody | undefined): body is ParsedGmailBody {
  return Boolean(body?.text.trim());
}

/** Handles nested alternative/mixed/related MIME parts with cycle/depth limits. */
export function parseGmailBody(payload: unknown): ParsedGmailBody {
  const seen = new Set<object>();
  let visited = 0;

  function parse(value: unknown, depth: number): ParsedGmailBody {
    visited += 1;
    const part = asRecord(value);
    if (
      !part ||
      depth > MAX_MIME_DEPTH ||
      visited > MAX_MIME_PARTS ||
      seen.has(part) ||
      isAttachmentPart(part)
    ) {
      return emptyBody();
    }
    seen.add(part);
    const type = mimeType(part);
    if (type === 'text/plain' || type === 'text/html') {
      const decoded = decodeBase64Url(asRecord(part.body)?.data);
      if (decoded === null) {
        return emptyBody();
      }
      return type === 'text/plain'
        ? parsePlainText(decoded)
        : { plainText: null, html: decoded, text: htmlToPlainText(decoded) };
    }
    const singlePartDecoded = decodeBase64Url(asRecord(part.body)?.data);
    if (
      singlePartDecoded !== null &&
      !type &&
      !Array.isArray(part.parts) &&
      !asRecord(part.body)?.attachmentId
    ) {
      return looksLikeHtml(singlePartDecoded)
        ? {
            plainText: null,
            html: singlePartDecoded,
            text: htmlToPlainText(singlePartDecoded),
          }
        : parsePlainText(singlePartDecoded);
    }

    const children: ParsedGmailBody[] = [];
    if (Array.isArray(part.parts)) {
      for (const child of part.parts) {
        if (visited >= MAX_MIME_PARTS) {
          break;
        }
        const parsed = parse(child, depth + 1);
        if (parsed.plainText !== null || parsed.html !== null) {
          children.push(parsed);
        }
      }
    }
    if (type === 'multipart/alternative') {
      const plain =
        children.find(child => child.plainText !== null && child.text.trim()) ??
        children.find(child => child.plainText !== null);
      const html =
        children.find(child => child.html !== null && child.text.trim()) ??
        children.find(child => child.html !== null);
      return {
        plainText: plain?.plainText ?? null,
        html: html?.html ?? null,
        text: (hasText(plain) ? plain.text : undefined) ??
          (hasText(html) ? html.text : undefined) ??
          plain?.text ??
          html?.text ??
          '',
      };
    }
    if (type === 'multipart/related') {
      return children.find(hasText) ?? children[0] ?? emptyBody();
    }
    const plain = children.flatMap(child =>
      child.plainText === null ? [] : [child.plainText],
    );
    const html = children.flatMap(child =>
      child.html === null ? [] : [child.html],
    );
    return {
      plainText: plain.length ? plain.join('\n\n') : null,
      html: html.length ? html.join('\n\n') : null,
      text: children
        .map(child => child.text)
        .filter(Boolean)
        .join('\n\n'),
    };
  }
  return parse(payload, 0);
}
