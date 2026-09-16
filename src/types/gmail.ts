export interface GmailMessageReference {
  id: string;
  threadId: string;
}

export interface GmailListResponse {
  messages?: GmailMessageReference[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePartBody {
  size: number;
  /** Base64url-encoded content; absent for attachments fetched separately. */
  data?: string;
  attachmentId?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail extends GmailMessageReference {
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  /** Epoch milliseconds represented as a string by Gmail. */
  internalDate?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  raw?: string;
}

/** Message ID type shared by presentation callbacks and Gmail models. */
export type GmailMessageId = GmailMessageReference['id'];
