import type { InboxEmail } from '../../features/inbox/types';
import type { EmailDetails } from '../../features/emailDetails/types';
import { extractGmailAttachments, formatAttachmentSize } from './attachments';
import { parseGmailBody } from './body';
import { formatGmailDate, parseDateMillis } from './dates';
import type { DateFormatOptions } from './dates';
import { asRecord, asString } from './guards';
import { extractGmailHeaders, splitRecipients } from './headers';
import { decodeHtmlEntities } from './html';
import { isGmailRead } from './labels';

function parseMessage(value: unknown, options: DateFormatOptions) {
  const message = asRecord(value);
  const id = asString(message?.id).trim();
  if (!message || !id) {
    return null;
  }
  const payload = asRecord(message.payload);
  const headers = extractGmailHeaders(payload?.headers);
  const date =
    parseDateMillis(message.internalDate) ?? parseDateMillis(headers.date);
  return {
    id,
    message,
    payload,
    headers,
    sender: headers.from || 'Unknown sender',
    subject: headers.subject || '(No subject)',
    dateTimeLabel: formatGmailDate(date, options),
    isRead: isGmailRead(message.labelIds),
  };
}

/** Missing IDs return null; no fabricated IDs, emails, or body content. */
export function mapGmailMessageToInbox(
  value: unknown,
  options: DateFormatOptions = {},
): InboxEmail | null {
  const parsed = parseMessage(value, options);
  if (!parsed) {
    return null;
  }
  const snippet = asString(parsed.message.snippet).trim();
  const preview = snippet
    ? decodeHtmlEntities(snippet)
    : Array.from(
        parseGmailBody(parsed.payload).text.replace(/\s+/g, ' ').trim(),
      )
        .slice(0, 200)
        .join('');
  return {
    id: parsed.id,
    sender: parsed.sender,
    subject: parsed.subject,
    preview,
    dateTimeLabel: parsed.dateTimeLabel,
    isRead: parsed.isRead,
  };
}

export function mapGmailMessageToDetails(
  value: unknown,
  options: DateFormatOptions = {},
): EmailDetails | null {
  const parsed = parseMessage(value, options);
  if (!parsed) {
    return null;
  }
  return {
    id: parsed.id,
    sender: parsed.sender,
    subject: parsed.subject,
    recipients: splitRecipients(parsed.headers.to),
    dateTimeLabel: parsed.dateTimeLabel,
    isRead: parsed.isRead,
    contentText: parseGmailBody(parsed.payload).text,
    attachments: extractGmailAttachments(parsed.payload).map(attachment => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeLabel: formatAttachmentSize(attachment.sizeBytes),
    })),
  };
}
