import { Buffer } from 'buffer';
import type { GmailMessageDetail } from '../../src/types/gmail';
import {
  mapGmailMessageToInbox,
  mapGmailMessageToDetails,
  isGmailUnread,
  isGmailRead,
  isGmailImportant,
  formatGmailDate,
  parseDateMillis,
} from '../../src/utils/gmail';

function message(): GmailMessageDetail {
  return {
    id: 'message-test',
    threadId: 'thread-test',
    labelIds: ['INBOX', 'UNREAD', 'IMPORTANT'],
    internalDate: '1704189600000',
    snippet: 'Short &amp; preview',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'From', value: 'Sender <sender@example.test>' },
        {
          name: 'To',
          value: '"Doe, Jane" <jane@example.test>, second@example.test',
        },
        { name: 'Subject', value: 'Test subject' },
        { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            size: 24,
            data: Buffer.from('Complete\nemail body 😀').toString('base64url'),
          },
        },
        {
          filename: 'file.pdf',
          mimeType: 'application/pdf',
          body: { size: 2048, attachmentId: 'attachment-test' },
        },
      ],
    },
  };
}

describe('labels', () => {
  test('uses exact Gmail system labels', () => {
    expect(isGmailUnread(['UNREAD'])).toBe(true);
    expect(isGmailRead(['UNREAD'])).toBe(false);
    expect(isGmailImportant(['IMPORTANT', 'INBOX'])).toBe(true);
    expect(isGmailImportant(['STARRED', 'important'])).toBe(false);
  });
  test.each([undefined, null, {}, 'UNREAD', [null, 1, 'unread']])(
    'handles malformed labelIds %p',
    labels => {
      expect(isGmailUnread(labels)).toBe(false);
      expect(isGmailRead(labels)).toBe(true);
      expect(isGmailImportant(labels)).toBe(false);
    },
  );
});

describe('Email details body fallback edge cases', () => {
  test('maps no-subject short plain text body without dropping content', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'short',
        payload: {
          mimeType: 'text/plain',
          headers: [],
          body: { data: Buffer.from('Hi').toString('base64url') },
        },
      }),
    ).toMatchObject({
      subject: '(No subject)',
      contentText: 'Hi',
    });
  });

  test('maps single-part payload body data', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'single',
        payload: {
          body: { data: Buffer.from('Single-part body').toString('base64url') },
        },
      })?.contentText,
    ).toBe('Single-part body');
  });

  test('maps nested MIME text body', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'nested',
        payload: {
          mimeType: 'multipart/mixed',
          parts: [
            {
              mimeType: 'multipart/alternative',
              parts: [
                {
                  mimeType: 'text/plain',
                  body: {
                    data: Buffer.from('Nested body').toString('base64url'),
                  },
                },
              ],
            },
          ],
        },
      })?.contentText,
    ).toBe('Nested body');
  });

  test('maps HTML-only body', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'html-only',
        payload: {
          mimeType: 'text/html',
          body: { data: Buffer.from('<p>HTML body</p>').toString('base64url') },
        },
      })?.contentText,
    ).toBe('HTML body');
  });

  test('uses snippet only when body extraction is empty', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'snippet-fallback',
        snippet: 'Hi',
        payload: { body: { data: '!!!' } },
      })?.contentText,
    ).toBe('Hi');
  });

  test('falls through empty plain alternative to usable HTML text', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'empty-plain',
        payload: {
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('').toString('base64url') },
            },
            {
              mimeType: 'text/html',
              body: { data: Buffer.from('<p>Hi</p>').toString('base64url') },
            },
          ],
        },
      })?.contentText,
    ).toBe('Hi');
  });

  test('falls through empty related child to usable sibling text', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'empty-related',
        payload: {
          mimeType: 'multipart/related',
          parts: [
            {
              mimeType: 'text/html',
              body: { data: Buffer.from('').toString('base64url') },
            },
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('Hi').toString('base64url') },
            },
          ],
        },
      })?.contentText,
    ).toBe('Hi');
  });

  test('keeps existing normal multipart email unchanged', () => {
    const details = mapGmailMessageToDetails(message());

    expect(details?.contentText).toContain('Complete\nemail body');
    expect(details?.contentText).not.toBe('Short & preview');
  });
});

describe('safe dates', () => {
  test('supports epoch milliseconds, RFC dates, ISO dates and Date objects', () => {
    expect(parseDateMillis('0')).toBe(0);
    expect(parseDateMillis(0)).toBe(0);
    expect(parseDateMillis(new Date(0))).toBe(0);
    expect(parseDateMillis('Thu, 01 Jan 1970 00:00:00 +0000')).toBe(0);
    expect(formatGmailDate('2024-01-02T10:00:00Z')).toBe(
      formatGmailDate(1704189600000),
    );
    expect(formatGmailDate(0)).toContain('1970');
    expect(
      formatGmailDate(1704189600000, { timeZone: 'America/New_York' }),
    ).not.toBe(formatGmailDate(1704189600000));
  });
  test.each([
    undefined,
    null,
    '',
    ' ',
    false,
    {},
    'not a date',
    Infinity,
    NaN,
    1e20,
    new Date(NaN),
  ])('handles invalid date %p', value => {
    expect(parseDateMillis(value)).toBeNull();
    expect(formatGmailDate(value)).toBe('Unknown date');
  });
  test('handles invalid locale/timezone and caller fallback', () => {
    expect(
      formatGmailDate(0, { timeZone: 'invalid', fallback: 'Unavailable' }),
    ).toBe('Unavailable');
    expect(formatGmailDate(0, { locale: 'invalid_locale' })).toBe(
      'Unknown date',
    );
  });
});

describe('DTO display mapping', () => {
  test('maps complete details and list fields without mutating source data', () => {
    const dto = message();
    const before = JSON.stringify(dto);
    expect(mapGmailMessageToInbox(dto)).toEqual({
      id: 'message-test',
      sender: 'Sender <sender@example.test>',
      subject: 'Test subject',
      preview: 'Short & preview',
      dateTimeLabel: formatGmailDate(dto.internalDate),
      isRead: false,
    });
    expect(mapGmailMessageToDetails(dto)).toEqual({
      id: 'message-test',
      sender: 'Sender <sender@example.test>',
      subject: 'Test subject',
      recipients: ['"Doe, Jane" <jane@example.test>', 'second@example.test'],
      dateTimeLabel: formatGmailDate(dto.internalDate),
      isRead: false,
      contentText: 'Complete\nemail body 😀',
      attachments: [
        {
          id: 'attachment-test',
          filename: 'file.pdf',
          mimeType: 'application/pdf',
          sizeLabel: '2 KB',
        },
      ],
    });
    expect(JSON.stringify(dto)).toBe(before);
  });
  test.each([undefined, null, {}, [], { id: '' }, { id: '  ' }, { id: 5 }])(
    'rejects absent or invalid identity %p',
    dto => {
      expect(mapGmailMessageToInbox(dto)).toBeNull();
      expect(mapGmailMessageToDetails(dto)).toBeNull();
    },
  );
  test('maps an ID-only response without inventing content', () => {
    expect(mapGmailMessageToDetails({ id: 'only-id' })).toEqual({
      id: 'only-id',
      sender: 'Unknown sender',
      subject: '(No subject)',
      recipients: [],
      dateTimeLabel: 'Unknown date',
      isRead: true,
      contentText: '',
      attachments: [],
    });
  });
  test('uses Gmail snippet as final safe details fallback when body extraction is empty', () => {
    expect(
      mapGmailMessageToDetails({
        id: 'valid',
        payload: { headers: [null], parts: 'bad', body: 4 },
        labelIds: {},
        snippet: 'Hi',
        internalDate: 'bad',
      })?.contentText,
    ).toBe('Hi');
  });
  test('uses Date header when internalDate is invalid and preserves epoch zero', () => {
    const dto = message();
    dto.internalDate = 'invalid';
    expect(mapGmailMessageToInbox(dto)?.dateTimeLabel).toBe(
      formatGmailDate('2024-01-01T10:00:00Z'),
    );
    dto.internalDate = '0';
    expect(mapGmailMessageToInbox(dto)?.dateTimeLabel).toBe(formatGmailDate(0));
  });
  test('maps HTML-only body and derives a bounded preview if snippet is missing', () => {
    const body = '😀'.repeat(220);
    const dto = {
      id: 'html',
      payload: {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<p>' + body + '</p>').toString('base64url'),
        },
      },
    };
    expect(mapGmailMessageToDetails(dto)?.contentText).toBe(body);
    expect(mapGmailMessageToInbox(dto)?.preview).toBe('😀'.repeat(200));
  });
});
