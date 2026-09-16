import { asRecord, asString } from './guards';
import type { UnknownRecord } from './guards';
import { getGmailHeader } from './headers';

export const MAX_MIME_DEPTH = 64;
export const MAX_MIME_PARTS = 10000;

export function mimeType(part: UnknownRecord): string {
  return (
    (
      asString(part.mimeType) ||
      getGmailHeader(part.headers, 'Content-Type') ||
      ''
    )
      .split(';')[0]
      ?.trim()
      .toLowerCase() ?? ''
  );
}

export function isAttachmentPart(part: UnknownRecord): boolean {
  const disposition = getGmailHeader(part.headers, 'Content-Disposition') ?? '';
  const type = mimeType(part);
  return Boolean(
    asString(part.filename).trim() ||
      /^attachment\b/i.test(disposition) ||
      (asString(asRecord(part.body)?.attachmentId) &&
        type !== 'text/plain' &&
        type !== 'text/html' &&
        !type.startsWith('multipart/')),
  );
}

export function* walkMimeParts(
  payload: unknown,
): Generator<{ part: UnknownRecord; path: string }> {
  const stack = [{ value: payload, path: '0', depth: 0 }];
  const seen = new Set<object>();
  let visited = 0;
  while (stack.length > 0 && visited < MAX_MIME_PARTS) {
    const entry = stack.pop();
    if (!entry) {
      break;
    }
    visited += 1;
    const part = asRecord(entry.value);
    if (!part || seen.has(part) || entry.depth > MAX_MIME_DEPTH) {
      continue;
    }
    seen.add(part);
    yield { part, path: entry.path };
    // An attached message is not part of its parent's body or attachment list.
    if (!isAttachmentPart(part) && Array.isArray(part.parts)) {
      const length = Math.min(part.parts.length, MAX_MIME_PARTS - visited);
      for (let index = length - 1; index >= 0; index -= 1) {
        stack.push({
          value: part.parts[index],
          path: entry.path + '.' + index,
          depth: entry.depth + 1,
        });
      }
    }
  }
}
