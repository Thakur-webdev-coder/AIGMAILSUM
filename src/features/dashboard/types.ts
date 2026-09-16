import type { GmailMessageId } from '../../types/gmail';

/** Counts are supplied by a future data layer. null means unavailable, not zero. */
export interface DashboardMetrics {
  totalEmails: number | null;
  unreadEmails: number | null;
  importantEmails: number | null;
  highPriorityEmails: number | null;
  aiAnalyzedEmails: number | null;
  emailsRequiringAction: number | null;
}

export interface PendingAction {
  id: string;
  text: string;
  relatedMessageId: GmailMessageId;
}
