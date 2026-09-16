import { asRecord, asString } from './guards';

export interface ParsedGmailHeaders {
  from: string;
  to: string;
  subject: string;
  date: string;
}

function headerValues(headers: unknown, name: string): string[] {
  if (!Array.isArray(headers)) {
    return [];
  }
  return headers.flatMap((entry: unknown) => {
    const header = asRecord(entry);
    if (asString(header?.name).trim().toLowerCase() !== name.toLowerCase()) {
      return [];
    }
    const value = asString(header?.value)
      .replace(/\r?\n[ \t]+/g, ' ')
      .trim();
    return value ? [value] : [];
  });
}

export function getGmailHeader(
  headers: unknown,
  name: string,
): string | undefined {
  return headerValues(headers, name)[0];
}

export function extractGmailHeaders(headers: unknown): ParsedGmailHeaders {
  return {
    from: getGmailHeader(headers, 'From') ?? '',
    to: headerValues(headers, 'To').join(', '),
    subject: getGmailHeader(headers, 'Subject') ?? '',
    date: getGmailHeader(headers, 'Date') ?? '',
  };
}

/** Preserve mailbox display strings, including quoted names containing commas. */
export function splitRecipients(value: string): string[] {
  const recipients: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  let angleDepth = 0;
  let commentDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && (quoted || commentDepth > 0)) {
      escaped = true;
    } else if (character === '"' && commentDepth === 0) {
      quoted = !quoted;
    } else if (!quoted) {
      if (character === '(') {
        commentDepth += 1;
      } else if (character === ')') {
        commentDepth = Math.max(0, commentDepth - 1);
      } else if (commentDepth === 0) {
        if (character === '<') {
          angleDepth += 1;
        } else if (character === '>') {
          angleDepth = Math.max(0, angleDepth - 1);
        } else if (character === ',' && angleDepth === 0) {
          const recipient = value.slice(start, index).trim();
          if (recipient) {
            recipients.push(recipient);
          }
          start = index + 1;
        }
      }
    }
  }
  const last = value.slice(start).trim();
  if (last) {
    recipients.push(last);
  }
  return recipients;
}
