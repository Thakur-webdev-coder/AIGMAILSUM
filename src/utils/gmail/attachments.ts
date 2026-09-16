import { asRecord, asString } from './guards';
import { getGmailHeader } from './headers';
import { isAttachmentPart, mimeType, walkMimeParts } from './mime';

export interface GmailAttachmentMetadata {
  id: string;
  attachmentId?: string;
  partId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  inline: boolean;
}

export function extractGmailAttachments(
  payload: unknown,
): GmailAttachmentMetadata[] {
  const attachments: GmailAttachmentMetadata[] = [];
  for (const { part, path } of walkMimeParts(payload)) {
    if (!isAttachmentPart(part)) {
      continue;
    }
    const body = asRecord(part.body);
    const attachmentId = asString(body?.attachmentId).trim() || undefined;
    const partId = asString(part.partId).trim() || undefined;
    const size = body?.size;
    attachments.push({
      id: attachmentId ?? partId ?? 'part:' + path,
      attachmentId,
      partId,
      filename: asString(part.filename).trim() || 'Unnamed attachment',
      mimeType: mimeType(part) || 'application/octet-stream',
      sizeBytes:
        typeof size === 'number' && Number.isSafeInteger(size) && size >= 0
          ? size
          : null,
      inline: /^inline\b/i.test(
        getGmailHeader(part.headers, 'Content-Disposition') ?? '',
      ),
    });
  }
  return attachments;
}

export function formatAttachmentSize(bytes: number | null): string | undefined {
  if (bytes === null || !Number.isSafeInteger(bytes) || bytes < 0) {
    return undefined;
  }
  if (bytes < 1024) {
    return bytes + ' B';
  }
  const unit = bytes < 1024 ** 2 ? 'KB' : bytes < 1024 ** 3 ? 'MB' : 'GB';
  const divisor = unit === 'KB' ? 1024 : unit === 'MB' ? 1024 ** 2 : 1024 ** 3;
  return Math.round((bytes / divisor) * 10) / 10 + ' ' + unit;
}
