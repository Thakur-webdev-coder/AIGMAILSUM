import { Buffer } from 'buffer';
import type { GmailMessagePart } from '../../src/types/gmail';
import {
  parseGmailBody,
  extractGmailAttachments,
  formatAttachmentSize,
} from '../../src/utils/gmail';

const encode = (text: string) =>
  Buffer.from(text, 'utf8').toString('base64url');
const textPart = (mimeType: string, text: string): GmailMessagePart => ({
  mimeType,
  body: { size: text.length, data: encode(text) },
});

describe('MIME body parsing', () => {
  test('decodes complete UTF-8 text without trimming its line breaks', () => {
    expect(parseGmailBody(textPart('text/plain', 'Hello\n\n世界\n'))).toEqual({
      plainText: 'Hello\n\n世界\n',
      html: null,
      text: 'Hello\n\n世界\n',
    });
  });
  test('returns raw untrusted HTML and a plain-text display projection', () => {
    const html = '<p>Only <b>HTML</b></p>';
    expect(parseGmailBody(textPart('text/html; charset=UTF-8', html))).toEqual({
      plainText: null,
      html,
      text: 'Only HTML',
    });
  });
  test('recurses mixed/alternative/related without duplicating representations or attachments', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'multipart/related',
              parts: [
                textPart('text/html', '<p>HTML alternative</p>'),
                {
                  mimeType: 'image/png',
                  filename: 'image.png',
                  body: { size: 20, attachmentId: 'image-id' },
                },
              ],
            },
            textPart('text/plain', 'Preferred plain'),
          ],
        },
        textPart('text/html', '<p>Extra section</p>'),
        { ...textPart('text/plain', 'Attachment text'), filename: 'notes.txt' },
      ],
    };
    expect(parseGmailBody(payload).text).toBe(
      'Preferred plain\n\nExtra section',
    );
    expect(parseGmailBody(payload).html).toContain('HTML alternative');
    expect(parseGmailBody(payload).text).not.toContain('Attachment text');
  });
  test('falls back to HTML when the alternative plain part is malformed', () => {
    expect(
      parseGmailBody({
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/plain', body: { data: '!!!' } },
          textPart('text/html', '<p>Fallback</p>'),
        ],
      }).text,
    ).toBe('Fallback');
  });
  test('excludes an explicit attachment and its nested message', () => {
    expect(
      parseGmailBody({
        mimeType: 'message/rfc822',
        headers: [{ name: 'Content-Disposition', value: 'attachment' }],
        parts: [textPart('text/plain', 'Attached message')],
      }).text,
    ).toBe('');
  });
  test('accepts Content-Type header when mimeType is absent', () => {
    expect(
      parseGmailBody({
        headers: [{ name: 'content-type', value: 'text/plain; charset=UTF-8' }],
        body: { data: encode('Header type') },
      }).text,
    ).toBe('Header type');
  });
  test.each([
    undefined,
    null,
    {},
    [],
    { parts: 'bad' },
    { mimeType: 'text/plain', body: { data: 4 } },
    { mimeType: 'text/plain', body: { attachmentId: 'external-body' } },
    { mimeType: 'image/png', body: { data: encode('binary') } },
  ])('handles missing/malformed payload %p', payload => {
    expect(parseGmailBody(payload).text).toBe('');
  });
  test('terminates for cyclic and excessively deep payloads', () => {
    const cyclic: GmailMessagePart = { mimeType: 'multipart/mixed', parts: [] };
    cyclic.parts?.push(cyclic, textPart('text/plain', 'Valid sibling'));
    expect(parseGmailBody(cyclic).text).toBe('Valid sibling');
    let deep: GmailMessagePart = textPart('text/plain', 'Too deep');
    for (let index = 0; index < 100; index += 1) {
      deep = { mimeType: 'multipart/mixed', parts: [deep] };
    }
    expect(parseGmailBody(deep).text).toBe('');
  });
});

describe('attachment metadata', () => {
  test('extracts remote and inline attachments, excluding a large external text body', () => {
    const payload = {
      parts: [
        {
          partId: '1',
          filename: 'report.pdf',
          mimeType: 'application/pdf',
          body: { attachmentId: 'remote', size: 2048 },
        },
        {
          partId: '2',
          filename: 'photo.png',
          mimeType: 'image/png',
          headers: [
            {
              name: 'Content-Disposition',
              value: 'inline; filename="photo.png"',
            },
          ],
          body: { size: 4, data: 'AAAA' },
        },
        {
          mimeType: 'text/plain',
          body: { attachmentId: 'body-id', size: 50000 },
        },
      ],
    };
    expect(extractGmailAttachments(payload)).toEqual([
      {
        id: 'remote',
        attachmentId: 'remote',
        partId: '1',
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        inline: false,
      },
      {
        id: '2',
        attachmentId: undefined,
        partId: '2',
        filename: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 4,
        inline: true,
      },
    ]);
  });
  test('uses deterministic path IDs, safe fallback metadata, and cycle protection', () => {
    const payload: Record<string, unknown> = {
      parts: [
        { filename: 'same.txt', body: { size: -1 } },
        { filename: 'same.txt', body: { size: '12' } },
        { headers: [{ name: 'Content-Disposition', value: 'attachment' }] },
      ],
    };
    const results = extractGmailAttachments(payload);
    expect(results.map(item => item.id)).toEqual([
      'part:0.0',
      'part:0.1',
      'part:0.2',
    ]);
    expect(results[0]?.sizeBytes).toBeNull();
    expect(results[2]?.filename).toBe('Unnamed attachment');
    expect(results[2]?.mimeType).toBe('application/octet-stream');
    payload.parts = [payload];
    expect(extractGmailAttachments(payload)).toEqual([]);
    expect(extractGmailAttachments(null)).toEqual([]);
  });
  test.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [1073741824, '1 GB'],
    [null, undefined],
    [-1, undefined],
    [NaN, undefined],
  ])('formats size %p', (size, expected) => {
    expect(formatAttachmentSize(size)).toBe(expected);
  });
});
