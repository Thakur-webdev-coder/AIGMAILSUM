import { fetchGmailDashboardCounts } from '../../src/services/gmail/dashboard';
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

test('fetches Gmail dashboard counts without loading mailbox pages', async () => {
  fetchMock
    .mockResolvedValueOnce(response(200, { messagesTotal: 42 }))
    .mockResolvedValueOnce(response(200, { messagesUnread: 7 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 3 }));

  await expect(fetchGmailDashboardCounts()).resolves.toEqual({
    totalEmails: 42,
    unreadEmails: 7,
    importantEmails: 3,
  });

  const urls = fetchMock.mock.calls.map(call => new URL(call[0]));
  expect(urls.map(url => url.pathname)).toEqual([
    '/gmail/v1/users/me/labels/INBOX',
    '/gmail/v1/users/me/labels/INBOX',
    '/gmail/v1/users/me/labels/IMPORTANT',
  ]);
  expect(urls.map(url => url.searchParams.get('fields'))).toEqual([
    'messagesTotal',
    'messagesUnread',
    'messagesTotal',
  ]);
});

test('refreshes rejected Gmail token once', async () => {
  (getGoogleAccessToken as jest.Mock)
    .mockResolvedValueOnce('expired-token')
    .mockResolvedValueOnce('fresh-token');
  fetchMock
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { messagesUnread: 0 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 0 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 1 }))
    .mockResolvedValueOnce(response(200, { messagesUnread: 2 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 3 }));

  await expect(fetchGmailDashboardCounts()).resolves.toEqual({
    totalEmails: 1,
    unreadEmails: 2,
    importantEmails: 3,
  });
  expect(getGoogleAccessToken).toHaveBeenNthCalledWith(2, 'expired-token');
});

test.each([
  [403, 'PERMISSION_DENIED'],
  [500, 'GMAIL_API_ERROR'],
])('maps Gmail HTTP %s to %s', async (status, code) => {
  fetchMock.mockResolvedValueOnce(response(status));

  await expect(fetchGmailDashboardCounts()).rejects.toMatchObject({ code });
});

test('rejects invalid Gmail count responses', async () => {
  fetchMock
    .mockResolvedValueOnce(response(200, {}))
    .mockResolvedValueOnce(response(200, { messagesUnread: 1 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 1 }));

  await expect(fetchGmailDashboardCounts()).rejects.toMatchObject({
    code: 'GMAIL_API_ERROR',
  });
});

test('maps invalid Gmail count JSON to AppError', async () => {
  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    })
    .mockResolvedValueOnce(response(200, { messagesUnread: 1 }))
    .mockResolvedValueOnce(response(200, { messagesTotal: 1 }));

  await expect(fetchGmailDashboardCounts()).rejects.toMatchObject({
    code: 'GMAIL_API_ERROR',
  });
});
