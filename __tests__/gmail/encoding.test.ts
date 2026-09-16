import {
  decodeBase64Url,
  extractGmailHeaders,
  getGmailHeader,
  splitRecipients,
  htmlToPlainText,
} from '../../src/utils/gmail';

describe('Base64URL UTF-8 decoding', () => {
  test.each([
    ['', ''],
    ['SGVsbG8', 'Hello'],
    ['SGVsbG8=', 'Hello'],
    ['8J-YgA', '😀'],
    ['4pyT', '✓'],
    ['SGVsbG8Kd29ybGQ', 'Hello\nworld'],
    ['8J+YgA==', '😀'],
  ])('decodes %s', (encoded, expected) => {
    expect(decodeBase64Url(encoded)).toBe(expected);
  });

  test.each([
    undefined,
    null,
    5,
    {},
    'A',
    '!!!!',
    'SG Vs',
    'TQ=',
    'TQ===',
    '=TQ=',
    'TR==',
    '/w==',
    'wK8=',
    '7aCA',
    '9JCAgA',
  ])('rejects malformed encoding or UTF-8: %p', value => {
    expect(decodeBase64Url(value)).toBeNull();
  });
});

describe('Gmail headers', () => {
  test('extracts case-insensitive headers and unfolds continuation lines', () => {
    const headers = [
      { name: ' FROM ', value: ' Sender <from@example.test> ' },
      { name: 'to', value: '"Doe, Jane" <jane@example.test>' },
      { name: 'TO', value: 'second@example.test' },
      { name: 'Subject', value: 'One\r\n two' },
      { name: 'date', value: 'Tue, 02 Jan 2024 10:30:00 +0000' },
    ];
    expect(extractGmailHeaders(headers)).toEqual({
      from: 'Sender <from@example.test>',
      to: '"Doe, Jane" <jane@example.test>, second@example.test',
      subject: 'One two',
      date: 'Tue, 02 Jan 2024 10:30:00 +0000',
    });
    expect(getGmailHeader(headers, 'missing')).toBeUndefined();
  });

  test.each([
    undefined,
    null,
    'headers',
    {},
    [null, 1, { name: 'From', value: 42 }],
  ])('tolerates invalid headers: %p', headers => {
    expect(extractGmailHeaders(headers)).toEqual({
      from: '',
      to: '',
      subject: '',
      date: '',
    });
  });

  test('keeps quoted display names, comments and angle addresses intact', () => {
    expect(
      splitRecipients(
        '"Doe, Jane" <jane@example.test>, Person (team, one) <team@example.test>,',
      ),
    ).toEqual([
      '"Doe, Jane" <jane@example.test>',
      'Person (team, one) <team@example.test>',
    ]);
    expect(splitRecipients('')).toEqual([]);
    expect(splitRecipients('"unterminated, address')).toEqual([
      '"unterminated, address',
    ]);
  });
});

describe('HTML plain-text projection', () => {
  test('preserves block separation, Unicode/entities and removes non-body content', () => {
    expect(
      htmlToPlainText(
        '<head>ignore</head><p>Hello &amp; welcome</p><div>Next<br>line &#x1F600;</div><script>bad()</script><style>x{}</style>',
      ),
    ).toBe('Hello & welcome\n\nNext\nline 😀');
  });
  test('does not reinterpret escaped markup as HTML', () => {
    expect(
      htmlToPlainText('&lt;tag&gt; &quot;x&quot; &apos;y&apos; &nbsp; &#65;'),
    ).toBe('<tag> "x" \'y\'   A');
  });
  test('handles malformed HTML, unknown entities and invalid code points', () => {
    expect(htmlToPlainText('Visible<script>unfinished')).toBe('Visible');
    expect(htmlToPlainText('<!--unfinished')).toBe('');
    expect(htmlToPlainText('&unknown; &#x110000; &#55296;')).toBe(
      '&unknown; � �',
    );
    expect(htmlToPlainText(undefined)).toBe('');
  });
});
