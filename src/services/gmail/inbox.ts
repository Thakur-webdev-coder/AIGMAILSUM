import { getGoogleAccessToken } from '../auth/googleAccessToken';
import { AppError } from '../../types/appError';
import type { InboxEmail, InboxFilter } from '../../features/inbox/types';
import { mapGmailMessageToInbox } from '../../utils/gmail';
import { asRecord, asString } from '../../utils/gmail/guards';
import { getSupabaseClient } from '../supabase/client';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const PAGE_SIZE = 20;
const METADATA_HEADERS = ['From', 'Subject', 'Date'];
const ANALYSIS_FILTERS = new Set<InboxFilter>([
  'Requires Action',
  'AI Analyzed',
]);

export interface InboxPage {
  emails: InboxEmail[];
  nextPageToken?: string;
}

export interface InboxPageRequest {
  pageToken?: string;
  searchQuery?: string;
  filter?: InboxFilter;
}

async function request(
  path: string,
  token: string,
  signal: AbortSignal,
  init?: Omit<RequestInit, 'signal'>,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      signal,
    });
  } catch (error) {
    throw new AppError(
      'NETWORK_ERROR',
      'Unable to reach Gmail. Check your connection and retry.',
      { cause: error },
    );
  }
  if (response.status === 204) {
    return {};
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
      'Gmail could not load your inbox. Please retry.',
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned an invalid response. Please retry.',
      { cause: error },
    );
  }
}

function labelIdsForFilter(filter: InboxFilter): string[] {
  if (filter === 'Unread') {
    return ['INBOX', 'UNREAD'];
  }
  if (filter === 'Important') {
    return ['INBOX', 'IMPORTANT'];
  }
  return ['INBOX'];
}

function quoteGmailSearchValue(value: string): string {
  return `"${value.replace(/["\\]/g, '\\$&')}"`;
}

function buildGmailSearchQuery(searchQuery?: string): string | undefined {
  const trimmed = searchQuery?.trim();
  if (!trimmed) {
    return undefined;
  }
  const phrase = quoteGmailSearchValue(trimmed);
  const terms = trimmed
    .split(/\s+/)
    .map(quoteGmailSearchValue)
    .join(' ');
  return `(${phrase} OR from:${phrase} OR subject:${phrase} OR ${terms})`;
}

function hasActionItems(value: unknown): boolean {
  const record = asRecord(value);
  const importantInformation =
    asRecord(record?.important_information) ??
    asRecord(record?.importantInformation);
  const actionItems =
    importantInformation?.actionItems ??
    importantInformation?.action_items ??
    record?.actionItems ??
    record?.action_items;
  return (
    Array.isArray(actionItems) &&
    actionItems.some(item => asString(item).trim().length > 0)
  );
}

async function getAnalyzedMessageIds(
  ids: readonly string[],
  filter: InboxFilter,
): Promise<Set<string>> {
  if (!ANALYSIS_FILTERS.has(filter) || ids.length === 0) {
    return new Set(ids);
  }
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new AppError(
      'SESSION_EXPIRED',
      'Your session expired. Please sign in again.',
      { cause: userError },
    );
  }
  const { data, error } = await supabase
    .from('email_analyses')
    .select('*')
    .eq('user_id', userData.user.id)
    .in('gmail_message_id', ids);
  if (error) {
    throw new AppError(
      'SUPABASE_ERROR',
      'Unable to load analyzed email records. Please retry.',
      { cause: error },
    );
  }
  const records = Array.isArray(data) ? data : [];
  return new Set(
    records
      .filter(record => filter === 'AI Analyzed' || hasActionItems(record))
      .map(record => asString(asRecord(record)?.gmail_message_id))
      .filter(Boolean),
  );
}

async function loadMessage(
  id: string,
  token: string,
  signal: AbortSignal,
): Promise<InboxEmail> {
  const messageParams = new URLSearchParams({
    format: 'metadata',
    fields: 'id,labelIds,snippet,internalDate,payload(headers)',
  });
  METADATA_HEADERS.forEach(header =>
    messageParams.append('metadataHeaders', header),
  );
  const value = await request(
    `/${encodeURIComponent(id)}?${messageParams}`,
    token,
    signal,
  );
  const email = mapGmailMessageToInbox(value);
  if (!email || email.id !== id) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned invalid message metadata. Please retry.',
    );
  }
  return email;
}

async function loadPage(
  token: string,
  requestOptions: InboxPageRequest,
  signal: AbortSignal,
): Promise<InboxPage> {
  const filter = requestOptions.filter ?? 'All';
  const listParams = new URLSearchParams({
    maxResults: String(PAGE_SIZE),
    fields: 'messages(id),nextPageToken',
  });
  labelIdsForFilter(filter).forEach(labelId =>
    listParams.append('labelIds', labelId),
  );
  const gmailQuery = buildGmailSearchQuery(requestOptions.searchQuery);
  if (gmailQuery) {
    listParams.set('q', gmailQuery);
  }
  if (requestOptions.pageToken) {
    listParams.set('pageToken', requestOptions.pageToken);
  }
  const list = asRecord(await request(`?${listParams}`, token, signal));
  if (!list || (list.messages !== undefined && !Array.isArray(list.messages))) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned an invalid inbox page. Please retry.',
    );
  }
  const ids = [
    ...new Set(
      (list.messages ?? []).map((item: unknown) =>
        asString(asRecord(item)?.id),
      ),
    ),
  ];
  if (ids.some(id => !id)) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned an invalid message ID. Please retry.',
    );
  }
  const allowedIds = await getAnalyzedMessageIds(ids, filter);
  const visibleIds = ids.filter(id => allowedIds.has(id));
  const emails: InboxEmail[] = [];
  // Limit concurrent requests; metadata only, never message bodies or attachments.
  for (let offset = 0; offset < visibleIds.length; offset += 5) {
    if (signal.aborted) {
      throw new AppError('NETWORK_ERROR', 'Inbox request cancelled.');
    }
    const results = await Promise.allSettled(
      visibleIds
        .slice(offset, offset + 5)
        .map(id => loadMessage(id, token, signal)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        throw result.reason;
      }
      emails.push(result.value);
    }
  }
  const nextPageToken = asString(list.nextPageToken) || undefined;
  return {
    emails,
    nextPageToken:
      nextPageToken === requestOptions.pageToken ? undefined : nextPageToken,
  };
}

/** Fetch exactly one list page. A rejected Google token gets one refresh attempt. */
export async function fetchInboxPage(
  requestOptions: InboxPageRequest = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<InboxPage> {
  let token = await getGoogleAccessToken();
  if (signal.aborted) {
    throw new AppError('NETWORK_ERROR', 'Inbox request cancelled.');
  }
  try {
    return await loadPage(token, requestOptions, signal);
  } catch (error) {
    if (
      signal.aborted ||
      !(error instanceof AppError) ||
      error.code !== 'GOOGLE_AUTH_ERROR'
    ) {
      throw error;
    }
    token = await getGoogleAccessToken(token);
    if (signal.aborted) {
      throw new AppError('NETWORK_ERROR', 'Inbox request cancelled.');
    }
    return loadPage(token, requestOptions, signal);
  }
}

export async function modifyInboxEmailReadState(
  emailId: string,
  isRead: boolean,
  signal: AbortSignal = new AbortController().signal,
): Promise<void> {
  let token = await getGoogleAccessToken();
  const body = JSON.stringify(
    isRead
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] },
  );
  const modify = (accessToken: string) =>
    request(
      `/${encodeURIComponent(emailId)}/modify?fields=id,labelIds`,
      accessToken,
      signal,
      {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  try {
    await modify(token);
  } catch (error) {
    if (
      signal.aborted ||
      !(error instanceof AppError) ||
      error.code !== 'GOOGLE_AUTH_ERROR'
    ) {
      throw error;
    }
    token = await getGoogleAccessToken(token);
    await modify(token);
  }
}
