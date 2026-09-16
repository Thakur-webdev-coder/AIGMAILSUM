import { Buffer } from 'buffer';
import { fetchEmailDetails } from '../../src/services/gmail/details';
import { getGoogleAccessToken } from '../../src/services/auth/googleAccessToken';

jest.mock('../../src/services/auth/googleAccessToken', () => ({
  getGoogleAccessToken: jest.fn(),
}));

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock;
  (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token');
});

function response(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

test('fetches one full Gmail message and maps complete details', async () => {
  fetchMock.mockResolvedValueOnce(
    response(200, {
      id: 'message-id',
      threadId: 'thread-id',
      labelIds: ['INBOX', 'UNREAD'],
      internalDate: '1704189600000',
      payload: {
        mimeType: 'multipart/mixed',
        headers: [
          { name: 'From', value: 'Sender <sender@example.test>' },
          { name: 'To', value: 'First <first@example.test>, second@test.dev' },
          { name: 'Subject', value: 'Real subject' },
          { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
        ],
        parts: [
          {
            mimeType: 'multipart/alternative',
            parts: [
              {
                mimeType: 'text/plain',
                body: {
                  data: Buffer.from(
                    'Complete body line 1\nComplete body line 2',
                  ).toString('base64url'),
                },
              },
              {
                mimeType: 'text/html',
                body: {
                  data: Buffer.from('<p>HTML fallback</p>').toString(
                    'base64url',
                  ),
                },
              },
            ],
          },
          {
            partId: '1',
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            body: { size: 2048, attachmentId: 'attachment-id' },
          },
        ],
      },
    }),
  );

  const details = await fetchEmailDetails('message-id');

  expect(details).toMatchObject({
    id: 'message-id',
    sender: 'Sender <sender@example.test>',
    recipients: ['First <first@example.test>', 'second@test.dev'],
    subject: 'Real subject',
    contentText: 'Complete body line 1\nComplete body line 2',
    isRead: false,
    attachments: [
      {
        id: 'attachment-id',
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        sizeLabel: '2 KB',
      },
    ],
  });
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.pathname).toBe('/gmail/v1/users/me/messages/message-id');
  expect(url.searchParams.get('format')).toBe('full');
  expect(url.searchParams.get('fields')).toContain('payload');
  expect(fetchMock.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      headers: { Authorization: 'Bearer access-token' },
    }),
  );
});

test('hydrates external Gmail text body attachments before mapping content', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, {
        id: 'message-id',
        payload: {
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'text/html',
              body: { size: 50000, attachmentId: 'external-html-body' },
            },
          ],
        },
      }),
    )
    .mockResolvedValueOnce(
      response(200, {
        data: Buffer.from('<p>Hydrated HTML body</p>').toString('base64url'),
        size: 25,
      }),
    );

  const details = await fetchEmailDetails('message-id');

  expect(details.contentText).toBe('Hydrated HTML body');
  expect(details.attachments).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const attachmentUrl = new URL(fetchMock.mock.calls[1][0]);
  expect(attachmentUrl.pathname).toBe(
    '/gmail/v1/users/me/messages/message-id/attachments/external-html-body',
  );
});

test('refreshes a rejected access token once after Gmail 401', async () => {
  (getGoogleAccessToken as jest.Mock)
    .mockResolvedValueOnce('expired-token')
    .mockResolvedValueOnce('fresh-token');
  fetchMock
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(
      response(200, {
        id: 'message-id',
        payload: { headers: [] },
      }),
    );

  await expect(fetchEmailDetails('message-id')).resolves.toMatchObject({
    id: 'message-id',
  });
  expect(getGoogleAccessToken).toHaveBeenNthCalledWith(2, 'expired-token');
});

test.each([
  [403, 'PERMISSION_DENIED'],
  [404, 'GMAIL_API_ERROR'],
  [500, 'GMAIL_API_ERROR'],
])('maps Gmail HTTP %s to %s', async (status, code) => {
  fetchMock.mockResolvedValueOnce(response(status));

  await expect(fetchEmailDetails('message-id')).rejects.toMatchObject({ code });
});

test('maps network failures to AppError', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'));

  await expect(fetchEmailDetails('message-id')).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
  });
});
