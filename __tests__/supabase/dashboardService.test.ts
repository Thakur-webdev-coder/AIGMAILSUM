import {
  fetchAnalysisDashboardData,
  fetchDashboardData,
} from '../../src/services/supabase/dashboard';
import { fetchGmailDashboardCounts } from '../../src/services/gmail/dashboard';
import { getSupabaseClient } from '../../src/services/supabase/client';

jest.mock('../../src/services/gmail/dashboard', () => ({
  fetchGmailDashboardCounts: jest.fn(),
}));
jest.mock('../../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

const getSession = jest.fn();
const from = jest.fn();
const select = jest.fn();
const eqUser = jest.fn();
const eqPriority = jest.fn();
const eqRequiresAction = jest.fn();

const session = {
  access_token: 'session-token',
  user: { id: 'user-id' },
};

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({ data: { session }, error: null });
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: { getSession },
    from,
  });
  (fetchGmailDashboardCounts as jest.Mock).mockResolvedValue({
    totalEmails: 10,
    unreadEmails: 4,
    importantEmails: 2,
  });
});

function mockAnalysisQueries() {
  const aiAnalyzedQuery = {
    eq: jest.fn().mockResolvedValue({ count: 5, data: null, error: null }),
  };
  const highPriorityAfterUser = {
    eq: eqPriority.mockResolvedValue({
      count: 2,
      data: null,
      error: null,
    }),
  };
  const highPriorityQuery = {
    eq: eqUser.mockReturnValue(highPriorityAfterUser),
  };
  const requiresActionAfterUser = {
    eq: eqRequiresAction.mockResolvedValue({
      count: 1,
      data: null,
      error: null,
    }),
  };
  const requiresActionQuery = {
    eq: jest.fn().mockReturnValue(requiresActionAfterUser),
  };
  const actionRowsAfterUser = {
    eq: jest.fn().mockResolvedValue({
      data: [
        {
          gmail_message_id: 'gmail-a',
          action_items: ['Reply', 'Send invoice'],
          important_information: { action_items: [] },
        },
        {
          gmail_message_id: 'gmail-b',
          action_items: [],
        },
      ],
      error: null,
    }),
  };
  const actionRowsQuery = {
    eq: jest.fn().mockReturnValue(actionRowsAfterUser),
  };
  select
    .mockReturnValueOnce(aiAnalyzedQuery)
    .mockReturnValueOnce(highPriorityQuery)
    .mockReturnValueOnce(requiresActionQuery)
    .mockReturnValueOnce(actionRowsQuery);
  from.mockReturnValue({ select });
}

test('loads Supabase analysis counts and pending actions', async () => {
  mockAnalysisQueries();

  await expect(fetchAnalysisDashboardData()).resolves.toEqual({
    highPriorityEmails: 2,
    aiAnalyzedEmails: 5,
    emailsRequiringAction: 1,
    pendingActions: [
      {
        id: 'gmail-a:0:0',
        text: 'Reply',
        relatedMessageId: 'gmail-a',
      },
      {
        id: 'gmail-a:0:1',
        text: 'Send invoice',
        relatedMessageId: 'gmail-a',
      },
    ],
  });
  expect(from).toHaveBeenCalledWith('email_analyses');
  expect(eqUser).toHaveBeenCalledWith('user_id', 'user-id');
  expect(eqPriority).toHaveBeenCalledWith('priority', 'High');
  expect(eqRequiresAction).toHaveBeenCalledWith('requires_action', true);
});

test('combines Gmail and Supabase dashboard data', async () => {
  mockAnalysisQueries();

  await expect(fetchDashboardData()).resolves.toEqual({
    metrics: {
      totalEmails: 10,
      unreadEmails: 4,
      importantEmails: 2,
      highPriorityEmails: 2,
      aiAnalyzedEmails: 5,
      emailsRequiringAction: 1,
    },
    pendingActions: expect.any(Array),
  });
});

test('maps expired session to AppError', async () => {
  getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

  await expect(fetchAnalysisDashboardData()).rejects.toMatchObject({
    code: 'SESSION_EXPIRED',
  });
});

test('does not fabricate counts when Supabase count is missing', async () => {
  const badCountQuery = {
    eq: jest.fn().mockResolvedValue({ count: null, data: null, error: null }),
  };
  const okHighPriorityQuery = {
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 1, data: null, error: null }),
    }),
  };
  const okRowsQuery = {
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
  select
    .mockReturnValueOnce(badCountQuery)
    .mockReturnValueOnce(okHighPriorityQuery)
    .mockReturnValueOnce(okHighPriorityQuery)
    .mockReturnValueOnce(okRowsQuery);
  from.mockReturnValue({ select });

  await expect(fetchAnalysisDashboardData()).rejects.toMatchObject({
    code: 'SUPABASE_ERROR',
  });
});
