import {
  fetchInboxPage,
  modifyInboxEmailReadState,
} from '../../src/services/gmail/inbox';
import { getGoogleAccessToken } from '../../src/services/auth/googleAccessToken';
import { getSupabaseClient } from '../../src/services/supabase/client';

jest.mock('../../src/services/auth/googleAccessToken', () => ({
  getGoogleAccessToken: jest.fn(),
}));
jest.mock('../../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

const fetchMock = jest.fn();
const getUser = jest.fn();
const select = jest.fn();
const eq = jest.fn();
const inFilter = jest.fn();
const from = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock;
  (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token');
  getUser.mockResolvedValue({ data: { user: { id: 'user-test' } }, error: null });
  inFilter.mockResolvedValue({ data: [], error: null });
  eq.mockReturnValue({ in: inFilter });
  select.mockReturnValue({ eq });
  from.mockReturnValue({ select });
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: { getUser },
    from,
  });
});

function response(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function message(id: string, labels: string[] = ['INBOX']) {
  return {
    id,
    labelIds: labels,
    snippet: `${id} &amp; preview`,
    internalDate: '1704189600000',
    payload: {
      headers: [
        { name: 'From', value: `${id} sender <${id}@example.test>` },
        { name: 'Subject', value: `${id} subject` },
        { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
      ],
    },
  };
}

test('fetches one Gmail inbox page and maps metadata into inbox emails', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, {
        messages: [{ id: 'a', threadId: 'ta' }, { id: 'b', threadId: 'tb' }],
        nextPageToken: 'next-token',
      }),
    )
    .mockResolvedValueOnce(response(200, message('a', ['INBOX', 'UNREAD'])))
    .mockResolvedValueOnce(response(200, message('b')));

  const page = await fetchInboxPage({ pageToken: 'page-token' });

  expect(page.nextPageToken).toBe('next-token');
  expect(page.emails).toMatchObject([
    {
      id: 'a',
      sender: 'a sender <a@example.test>',
      subject: 'a subject',
      preview: 'a & preview',
      isRead: false,
    },
    {
      id: 'b',
      sender: 'b sender <b@example.test>',
      subject: 'b subject',
      preview: 'b & preview',
      isRead: true,
    },
  ]);
  const listUrl = new URL(fetchMock.mock.calls[0][0]);
  expect(listUrl.searchParams.get('maxResults')).toBe('20');
  expect(listUrl.searchParams.get('fields')).toBe(
    'messages(id),nextPageToken',
  );
  expect(listUrl.searchParams.getAll('labelIds')).toEqual(['INBOX']);
  expect(listUrl.searchParams.get('pageToken')).toBe('page-token');
  expect(fetchMock.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      headers: { Authorization: 'Bearer access-token' },
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/a?format=metadata'),
    expect.any(Object),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/b?format=metadata'),
    expect.any(Object),
  );
});

test('returns an empty page for an empty Gmail inbox', async () => {
  fetchMock.mockResolvedValueOnce(response(200, {}));

  await expect(fetchInboxPage()).resolves.toEqual({ emails: [] });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('sends Gmail query and label filters for server-side search', async () => {
  fetchMock.mockResolvedValueOnce(response(200, {}));

  await fetchInboxPage({
    searchQuery: 'alice budget',
    filter: 'Unread',
  });

  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.getAll('labelIds')).toEqual(['INBOX', 'UNREAD']);
  expect(url.searchParams.get('q')).toContain('from:"alice budget"');
  expect(url.searchParams.get('q')).toContain('subject:"alice budget"');
});

test('intersects Gmail page IDs with analyzed Supabase records', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, {
        messages: [{ id: 'analyzed' }, { id: 'not-analyzed' }],
      }),
    )
    .mockResolvedValueOnce(response(200, message('analyzed')));
  inFilter.mockResolvedValueOnce({
    data: [{ gmail_message_id: 'analyzed' }],
    error: null,
  });

  const page = await fetchInboxPage({ filter: 'AI Analyzed' });

  expect(from).toHaveBeenCalledWith('email_analyses');
  expect(eq).toHaveBeenCalledWith('user_id', 'user-test');
  expect(inFilter).toHaveBeenCalledWith('gmail_message_id', [
    'analyzed',
    'not-analyzed',
  ]);
  expect(page.emails.map(email => email.id)).toEqual(['analyzed']);
});

test('requires action only includes analyzed records with action items', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, {
        messages: [{ id: 'action' }, { id: 'empty-action' }],
      }),
    )
    .mockResolvedValueOnce(response(200, message('action')));
  inFilter.mockResolvedValueOnce({
    data: [
      {
        gmail_message_id: 'action',
        important_information: { actionItems: ['Reply today'] },
      },
      {
        gmail_message_id: 'empty-action',
        important_information: { actionItems: [] },
      },
    ],
    error: null,
  });

  const page = await fetchInboxPage({ filter: 'Requires Action' });

  expect(page.emails.map(email => email.id)).toEqual(['action']);
});

test('deduplicates duplicate message IDs within one Gmail list page', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, { messages: [{ id: 'same' }, { id: 'same' }] }),
    )
    .mockResolvedValueOnce(response(200, message('same')));

  const page = await fetchInboxPage();

  expect(page.emails).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('refreshes a rejected access token once after Gmail 401', async () => {
  (getGoogleAccessToken as jest.Mock)
    .mockResolvedValueOnce('expired-token')
    .mockResolvedValueOnce('fresh-token');
  fetchMock
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { messages: [{ id: 'fresh' }] }))
    .mockResolvedValueOnce(response(200, message('fresh')));

  const page = await fetchInboxPage();

  expect(page.emails).toHaveLength(1);
  expect(getGoogleAccessToken).toHaveBeenNthCalledWith(2, 'expired-token');
});

test.each([
  [403, 'PERMISSION_DENIED'],
  [500, 'GMAIL_API_ERROR'],
])('maps Gmail HTTP %s to %s', async (status, code) => {
  fetchMock.mockResolvedValueOnce(response(status));

  await expect(fetchInboxPage()).rejects.toMatchObject({ code });
});

test('maps network failures to AppError', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'));

  await expect(fetchInboxPage()).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
  });
});

test.each([
  [true, { removeLabelIds: ['UNREAD'] }],
  [false, { addLabelIds: ['UNREAD'] }],
])('modifies Gmail UNREAD label for read state %s', async (isRead, body) => {
  fetchMock.mockResolvedValueOnce(response(200, { id: 'message-id' }));

  await modifyInboxEmailReadState('message-id', isRead);

  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.pathname).toBe('/gmail/v1/users/me/messages/message-id/modify');
  expect(url.searchParams.get('fields')).toBe('id,labelIds');
  expect(fetchMock.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      body: JSON.stringify(body),
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }),
  );
});
