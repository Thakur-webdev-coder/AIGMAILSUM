import type { DashboardMetrics, PendingAction } from '../../features/dashboard/types';
import { AppError } from '../../types/appError';
import { asRecord, asString } from '../../utils/gmail/guards';
import { fetchGmailDashboardCounts } from '../gmail/dashboard';
import { getSupabaseClient } from './client';

interface AnalysisDashboardData {
  highPriorityEmails: number;
  aiAnalyzedEmails: number;
  emailsRequiringAction: number;
  pendingActions: PendingAction[];
}

export interface DashboardData {
  metrics: DashboardMetrics;
  pendingActions: PendingAction[];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).map(item => item.trim()).filter(Boolean)
    : [];
}

function actionItemsFromRow(value: unknown): string[] {
  const row = asRecord(value);
  const importantInformation =
    asRecord(row?.important_information) ??
    asRecord(row?.importantInformation);
  return stringArray(
    row?.actionItems ??
      row?.action_items ??
      importantInformation?.actionItems ??
      importantInformation?.action_items ??
      [],
  );
}

function countFromResult(count: number | null): number {
  if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) {
    return count;
  }
  throw new AppError(
    'SUPABASE_ERROR',
    'Supabase returned invalid dashboard counts. Please retry.',
  );
}

async function getUserScopedClient() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new AppError(
      'SESSION_EXPIRED',
      'Your session expired. Please sign in again.',
      { cause: error },
    );
  }
  return { supabase, userId: data.session.user.id };
}

export async function fetchAnalysisDashboardData(): Promise<AnalysisDashboardData> {
  try {
    const { supabase, userId } = await getUserScopedClient();
    const [aiAnalyzed, highPriority, requiresAction, actionRows] =
      await Promise.all([
      supabase
        .from('email_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('email_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('priority', 'High'),
      supabase
        .from('email_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('requires_action', true),
      supabase
        .from('email_analyses')
        .select('gmail_message_id, action_items, important_information')
        .eq('user_id', userId)
        .eq('requires_action', true),
    ]);
    if (
      aiAnalyzed.error ||
      highPriority.error ||
      requiresAction.error ||
      actionRows.error
    ) {
      throw (
        aiAnalyzed.error ??
        highPriority.error ??
        requiresAction.error ??
        actionRows.error
      );
    }
    const pendingActions: PendingAction[] = [];
    const rows = Array.isArray(actionRows.data) ? actionRows.data : [];
    rows.forEach((row, rowIndex) => {
      const record = asRecord(row);
      const relatedMessageId = asString(record?.gmail_message_id).trim();
      const actionItems = actionItemsFromRow(row);
      if (!relatedMessageId || actionItems.length === 0) {
        return;
      }
      actionItems.forEach((text, itemIndex) => {
        pendingActions.push({
          id: `${relatedMessageId}:${rowIndex}:${itemIndex}`,
          text,
          relatedMessageId,
        });
      });
    });
    return {
      highPriorityEmails: countFromResult(highPriority.count),
      aiAnalyzedEmails: countFromResult(aiAnalyzed.count),
      emailsRequiringAction: countFromResult(requiresAction.count),
      pendingActions,
    };
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          'SUPABASE_ERROR',
          'Unable to load dashboard analysis data. Please retry.',
          { cause: error },
        );
  }
}

export async function fetchDashboardData(
  signal: AbortSignal = new AbortController().signal,
): Promise<DashboardData> {
  const [gmailCounts, analysis] = await Promise.all([
    fetchGmailDashboardCounts(signal),
    fetchAnalysisDashboardData(),
  ]);
  return {
    metrics: {
      ...gmailCounts,
      highPriorityEmails: analysis.highPriorityEmails,
      aiAnalyzedEmails: analysis.aiAnalyzedEmails,
      emailsRequiringAction: analysis.emailsRequiringAction,
    },
    pendingActions: analysis.pendingActions,
  };
}
