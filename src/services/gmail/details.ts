import type { EmailDetails } from '../../features/emailDetails/types';
import { AppError } from '../../types/appError';
import { mapGmailMessageToDetails } from '../../utils/gmail';
import { asRecord, asString } from '../../utils/gmail/guards';
import {
  isAttachmentPart,
  MAX_MIME_DEPTH,
  MAX_MIME_PARTS,
  mimeType,
} from '../../utils/gmail/mime';
import { getGoogleAccessToken } from '../auth/googleAccessToken';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

function bodyDataLength(part: Record<string, unknown> | undefined): number {
  return asString(asRecord(part?.body)?.data).length;
}

function describePartShape(
  value: unknown,
  depth = 0,
): Array<{
  depth: number;
  mimeType: string;
  hasBodyData: boolean;
  bodyDataLength: number;
  hasAttachmentId: boolean;
  partsCount: number;
}> {
  if (depth > 4) {
    return [];
  }
  const part = asRecord(value);
  if (!part) {
    return [];
  }
  const body = asRecord(part.body);
  const parts = Array.isArray(part.parts) ? part.parts : [];
  return [
    {
      depth,
      mimeType: mimeType(part) || '(missing)',
      hasBodyData: bodyDataLength(part) > 0,
      bodyDataLength: bodyDataLength(part),
      hasAttachmentId: Boolean(asString(body?.attachmentId).trim()),
      partsCount: parts.length,
    },
    ...parts.flatMap(child => describePartShape(child, depth + 1)),
  ];
}

function logEmptyContentShape(message: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }
  const payload = asRecord(message.payload);
  console.log('Gmail email details mapped with empty content', {
    messageId: asString(message.id),
    payloadMimeType: payload ? mimeType(payload) || '(missing)' : '(missing)',
    payloadHasBodyData: bodyDataLength(payload) > 0,
    payloadBodyDataLength: bodyDataLength(payload),
    partsCount: Array.isArray(payload?.parts) ? payload.parts.length : 0,
    snippetPresent: asString(message.snippet).trim().length > 0,
    snippetLength: asString(message.snippet).length,
    parts: describePartShape(payload),
  });
}

async function requestGmail(
  path: string,
  token: string,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
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
  if (response.status === 404) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'This Gmail message could not be found.',
    );
  }
  if (!response.ok) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail could not load this email. Please retry.',
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned an invalid email response. Please retry.',
      { cause: error },
    );
  }
}

async function requestMessage(
  emailId: string,
  token: string,
  signal: AbortSignal,
): Promise<unknown> {
  const params = new URLSearchParams({
    format: 'full',
    fields:
      'id,labelIds,snippet,internalDate,payload(partId,mimeType,filename,headers,body(size,data,attachmentId),parts)',
  });
  return requestGmail(`/${encodeURIComponent(emailId)}?${params}`, token, signal);
}

async function requestBodyAttachmentData(
  emailId: string,
  attachmentId: string,
  token: string,
  signal: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({ fields: 'data,size' });
  const response = asRecord(
    await requestGmail(
      `/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(
        attachmentId,
      )}?${params}`,
      token,
      signal,
    ),
  );
  return asString(response?.data).trim() || null;
}

function isTextBodyPart(value: unknown): boolean {
  const part = asRecord(value);
  if (!part || isAttachmentPart(part)) {
    return false;
  }
  const type = mimeType(part);
  return type === 'text/plain' || type === 'text/html';
}

async function hydrateExternalTextBodies(
  payload: unknown,
  emailId: string,
  token: string,
  signal: AbortSignal,
): Promise<unknown> {
  const seen = new Set<object>();
  let visited = 0;

  async function hydrate(value: unknown, depth: number): Promise<unknown> {
    visited += 1;
    const part = asRecord(value);
    if (
      !part ||
      depth > MAX_MIME_DEPTH ||
      visited > MAX_MIME_PARTS ||
      seen.has(part)
    ) {
      return value;
    }
    seen.add(part);
    const body = asRecord(part.body);
    const attachmentId = asString(body?.attachmentId).trim();
    const data = asString(body?.data).trim();
    const nextPart: Record<string, unknown> = { ...part };
    if (isTextBodyPart(part) && attachmentId && !data) {
      const hydratedData = await requestBodyAttachmentData(
        emailId,
        attachmentId,
        token,
        signal,
      );
      if (hydratedData) {
        nextPart.body = { ...body, data: hydratedData };
      }
    }
    if (!isAttachmentPart(part) && Array.isArray(part.parts)) {
      nextPart.parts = await Promise.all(
        part.parts.map(child => hydrate(child, depth + 1)),
      );
    }
    return nextPart;
  }

  return hydrate(payload, 0);
}

async function loadEmailDetails(
  emailId: string,
  token: string,
  signal: AbortSignal,
): Promise<EmailDetails> {
  const message = await requestMessage(emailId, token, signal);
  const record = asRecord(message);
  const hydratedMessage = record
    ? {
        ...record,
        payload: await hydrateExternalTextBodies(
          record.payload,
          emailId,
          token,
          signal,
        ),
      }
    : message;
  const details = mapGmailMessageToDetails(hydratedMessage);
  if (!details || details.id !== emailId) {
    throw new AppError(
      'GMAIL_API_ERROR',
      'Gmail returned invalid email details. Please retry.',
    );
  }
  if (!details.contentText.trim() && record) {
    logEmptyContentShape(record);
  }
  return details;
}

/** Fetch one complete Gmail message only. A rejected token gets one refresh. */
export async function fetchEmailDetails(
  emailId: string,
  signal: AbortSignal = new AbortController().signal,
): Promise<EmailDetails> {
  if (!emailId.trim()) {
    throw new AppError('GMAIL_API_ERROR', 'Missing Gmail message ID.');
  }
  let token = await getGoogleAccessToken();
  if (signal.aborted) {
    throw new AppError('NETWORK_ERROR', 'Email request cancelled.');
  }
  try {
    return await loadEmailDetails(emailId, token, signal);
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
      throw new AppError('NETWORK_ERROR', 'Email request cancelled.');
    }
    return loadEmailDetails(emailId, token, signal);
  }
}
