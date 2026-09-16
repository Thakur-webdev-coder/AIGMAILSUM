import { AppError } from '../../types/appError';
import { asRecord } from '../../utils/gmail/guards';
import { getGoogleAccessToken } from '../auth/googleAccessToken';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/labels';

export interface GmailDashboardCounts {
  totalEmails: number;
  unreadEmails: number;
  importantEmails: number;
}

type GmailLabelCountField = 'messagesTotal' | 'messagesUnread';

async function requestLabelCount(
  labelId: 'INBOX' | 'IMPORTANT',
  countField: GmailLabelCountField,
  token: string,
  signal: AbortSignal,
): Promise<number> {
  let response: Response;
  const params = new URLSearchParams({
    fields: countField,
  });
  try {
    response = await fetch(`${BASE_URL}/${labelId}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
  } catch (error) {
    throw new AppError(
      'NETWORK_ERROR',
      'Unable to reach Gmail. Check your connection and retry.',
      { cause: error },
    );
  }
  if (response.status === 401) {
    throw new AppError(
      'GOOGLE_AUTH_ERROR',
      'Google access expired. Please log out and sign in again.',
    );
  }
  if (response.status === 403) {
    throw new AppError(
      'PERMISSION_DENIED',
      'Gmail denied access. Ensure Gmail permission is granted and the Gmail API is enabled, then retry or sign in again.',
    );
  }
  if (!response.ok) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail could not load dashboard counts. Please retry.',
    );
  }
  let data: ReturnType<typeof asRecord>;
  try {
    data = asRecord(await response.json());
  } catch (error) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned invalid dashboard counts. Please retry.',
      { cause: error },
    );
  }
  const count = data?.[countField];
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned invalid dashboard counts. Please retry.',
    );
  }
  return count;
}

async function loadCounts(
  token: string,
  signal: AbortSignal,
): Promise<GmailDashboardCounts> {
  const [totalEmails, unreadEmails, importantEmails] = await Promise.all([
    requestLabelCount('INBOX', 'messagesTotal', token, signal),
    requestLabelCount('INBOX', 'messagesUnread', token, signal),
    requestLabelCount('IMPORTANT', 'messagesTotal', token, signal),
  ]);
  return { totalEmails, unreadEmails, importantEmails };
}

export async function fetchGmailDashboardCounts(
  signal: AbortSignal = new AbortController().signal,
): Promise<GmailDashboardCounts> {
  let token = await getGoogleAccessToken();
  try {
    return await loadCounts(token, signal);
  } catch (error) {
    if (
      signal.aborted ||
      !(error instanceof AppError) ||
      error.code !== 'GOOGLE_AUTH_ERROR'
    ) {
      throw error;
    }
    token = await getGoogleAccessToken(token);
    return loadCounts(token, signal);
  }
}
