import {
  analyzeEmailWithEdgeFunction,
  loadSavedEmailAnalysis,
} from '../../src/services/supabase/emailAnalysis';
import { getSupabaseClient } from '../../src/services/supabase/client';
import type { EmailDetails } from '../../src/features/emailDetails/types';

jest.mock('../../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

const getSession = jest.fn();
const invoke = jest.fn();
const from = jest.fn();
const select = jest.fn();
const eqUser = jest.fn();
const eqMessage = jest.fn();
const maybeSingle = jest.fn();

const session = {
  access_token: 'session-token',
  user: { id: 'user-id' },
};

const email: EmailDetails = {
  id: 'gmail-id',
  sender: 'sender@example.test',
  recipients: ['recipient@example.test'],
  subject: 'Subject',
  dateTimeLabel: 'Jan 1, 2024',
  contentText: 'Complete email body',
  isRead: true,
  attachments: [{ id: 'attachment-id', filename: 'file.pdf', mimeType: 'application/pdf' }],
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    gmail_message_id: 'gmail-id',
    summary: 'Saved summary',
    key_points: ['Point one'],
    category: 'Work',
    priority: 'High',
    important_information: {
      deadlines: ['Friday'],
      dates: ['2024-01-01'],
      amounts: ['$20'],
      requirements: ['Send form'],
      links: ['https://example.test'],
      action_items: ['Reply'],
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({ data: { session }, error: null });
  eqMessage.mockReturnValue({ maybeSingle });
  eqUser.mockReturnValue({ eq: eqMessage });
  select.mockReturnValue({ eq: eqUser });
  from.mockReturnValue({ select });
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: { getSession },
    from,
    functions: { invoke },
  });
});

test('loads and validates saved email analysis', async () => {
  maybeSingle.mockResolvedValueOnce({ data: row(), error: null });

  await expect(loadSavedEmailAnalysis('gmail-id')).resolves.toEqual({
    emailId: 'gmail-id',
    summary: 'Saved summary',
    keyPoints: ['Point one'],
    category: 'Work',
    priority: 'High',
    importantInformation: {
      deadlines: ['Friday'],
      dates: ['2024-01-01'],
      amounts: ['$20'],
      requirements: ['Send form'],
      links: ['https://example.test'],
      people: [],
      organizations: [],
      actionItems: ['Reply'],
    },
  });
  expect(from).toHaveBeenCalledWith('email_analyses');
  expect(eqUser).toHaveBeenCalledWith('user_id', 'user-id');
  expect(eqMessage).toHaveBeenCalledWith('gmail_message_id', 'gmail-id');
});

test('invokes Edge Function with Supabase token and reloads saved analysis', async () => {
  maybeSingle
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: row(), error: null });
  invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

  const analysis = await analyzeEmailWithEdgeFunction(email);

  expect(analysis.summary).toBe('Saved summary');
  expect(invoke).toHaveBeenCalledWith('analyze-email', {
    body: {
      gmailMessageId: 'gmail-id',
      gmail_message_id: 'gmail-id',
      sender: 'sender@example.test',
      recipients: ['recipient@example.test'],
      subject: 'Subject',
      content: 'Complete email body',
      contentText: 'Complete email body',
      dateTimeLabel: 'Jan 1, 2024',
      isRead: true,
      attachments: email.attachments,
    },
    headers: { Authorization: 'Bearer session-token' },
  });
});

test('uses existing analysis without invoking AI again', async () => {
  maybeSingle.mockResolvedValueOnce({ data: row(), error: null });

  await expect(analyzeEmailWithEdgeFunction(email)).resolves.toMatchObject({
    emailId: 'gmail-id',
  });
  expect(invoke).not.toHaveBeenCalled();
});

test.each([
  [{ category: 'Sales' }, 'INVALID_AI_RESPONSE'],
  [{ priority: 'Urgent' }, 'INVALID_AI_RESPONSE'],
])('rejects invalid saved AI response %j', async (overrides, code) => {
  maybeSingle.mockResolvedValueOnce({ data: row(overrides), error: null });

  await expect(loadSavedEmailAnalysis('gmail-id')).rejects.toMatchObject({
    code,
  });
});

test('maps expired session to AppError', async () => {
  getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

  await expect(loadSavedEmailAnalysis('gmail-id')).rejects.toMatchObject({
    code: 'SESSION_EXPIRED',
  });
});

test('maps Edge Function failure to AI error', async () => {
  maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  invoke.mockResolvedValueOnce({ data: null, error: new Error('failed') });

  await expect(analyzeEmailWithEdgeFunction(email)).rejects.toMatchObject({
    code: 'AI_API_ERROR',
  });
});

test('requires a saved result after Edge Function completes', async () => {
  maybeSingle
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

  await expect(analyzeEmailWithEdgeFunction(email)).rejects.toMatchObject({
    code: 'INVALID_AI_RESPONSE',
  });
});
