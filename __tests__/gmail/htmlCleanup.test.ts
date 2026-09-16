import { Buffer } from 'buffer';
import { mapGmailMessageToDetails } from '../../src/utils/gmail';
import { htmlToPlainText } from '../../src/utils/gmail/html';

function encoded(value: string): string {
  return Buffer.from(value).toString('base64url');
}

test('removes HTML conditional comment artifacts from displayed content', () => {
  const dto = {
    id: 'conditional',
    payload: {
      mimeType: 'multipart/alternative',
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: encoded('<!--[if !mso]>Visible plain text<![endif]-->'),
          },
        },
        {
          mimeType: 'text/html',
          body: {
            data: encoded('<!--[if !mso]><p>Visible HTML text</p><![endif]-->'),
          },
        },
      ],
    },
  };

  expect(mapGmailMessageToDetails(dto)?.contentText).toBe(
    'Visible plain text',
  );
});

test('HTML-only email produces readable text', () => {
  const dto = {
    id: 'html-only',
    payload: {
      mimeType: 'text/html',
      body: {
        data: encoded(
          '<html><body><h1>Hello Ravina</h1><p>Review the report.</p></body></html>',
        ),
      },
    },
  };

  expect(mapGmailMessageToDetails(dto)?.contentText).toBe(
    'Hello Ravina\n\nReview the report.',
  );
});

test('plain-text email remains unchanged', () => {
  const body = 'Hello Ravina,\n\nPlain text stays as-is.\n  Thanks';
  const dto = {
    id: 'plain',
    payload: {
      mimeType: 'text/plain',
      body: { data: encoded(body) },
    },
  };

  expect(mapGmailMessageToDetails(dto)?.contentText).toBe(body);
});

test('multipart alternative prefers plain text and handles HTML fallback', () => {
  const dto = {
    id: 'alternative',
    payload: {
      mimeType: 'multipart/alternative',
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: encoded('Plain alternative body') },
        },
        {
          mimeType: 'text/html',
          body: { data: encoded('<p>HTML alternative body</p>') },
        },
      ],
    },
  };

  expect(mapGmailMessageToDetails(dto)?.contentText).toBe(
    'Plain alternative body',
  );
});

test('nested multipart HTML email produces readable text', () => {
  const dto = {
    id: 'nested',
    payload: {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/related',
          parts: [
            {
              mimeType: 'text/html',
              body: {
                data: encoded('<div>Nested body</div><div>Second line</div>'),
              },
            },
          ],
        },
      ],
    },
  };

  expect(mapGmailMessageToDetails(dto)?.contentText).toBe(
    'Nested body\n\nSecond line',
  );
});

test('cleanup must not turn conditional HTML content into an empty string', () => {
  expect(
    htmlToPlainText('<!--[if !mso]><p>Visible partial content</p><!--<![endif]-->'),
  ).toBe('Visible partial content');
});

test('falls back when cleaned content becomes empty', () => {
  expect(htmlToPlainText('<!--Fallback body text-->')).toBe(
    'Fallback body text',
  );
});
