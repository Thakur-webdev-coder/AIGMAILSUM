/** Complete display-ready content supplied by a future email adapter. */
export interface EmailDetails {
  id: string;
  sender: string;
  recipients: readonly string[];
  subject: string;
  dateTimeLabel: string;
  contentText: string;
  isRead: boolean;
  attachments: readonly EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  /** Already formatted by the caller, e.g. in the user's locale. */
  sizeLabel?: string;
}
