/** Display model supplied by a future data adapter, not a Gmail API response. */
export interface InboxEmail {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  dateTimeLabel: string;
  isRead: boolean;
}

export const inboxFilters = [
  'All',
  'Unread',
  'Important',
  'Requires Action',
  'AI Analyzed',
] as const;

export type InboxFilter = (typeof inboxFilters)[number];

export interface EmailActions {
  onOpenEmail?: (emailId: string) => void;
  onMarkRead?: (emailId: string, isRead: boolean) => void;
}
